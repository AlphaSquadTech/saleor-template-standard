import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// Allowlist of permitted webhook domains for SSRF protection.
// Optional: if ALLOWED_WEBHOOK_DOMAINS is empty, webhook delivery is disabled by default.
const ALLOWED_WEBHOOK_DOMAINS =
  process.env.ALLOWED_WEBHOOK_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean) || [];

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string[];
  replyTo?: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const toRaw = process.env.SMTP_TO?.trim();

  if (!host || !portRaw || !from || !toRaw) return null;

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) return null;

  const secure =
    (process.env.SMTP_SECURE || "").trim().toLowerCase() === "true" || port === 465;

  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;
  const replyTo = process.env.SMTP_REPLY_TO?.trim() || undefined;

  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!to.length) return null;

  return { host, port, secure, user, pass, from, to, replyTo };
}

function subjectFor(formType: string, pageSlug?: string) {
  const base = process.env.EMAIL_SUBJECT_PREFIX?.trim() || "";
  const prefix = base ? `${base} ` : "";
  const suffix = pageSlug ? ` (${pageSlug})` : "";
  return `${prefix}New ${formType} submission${suffix}`;
}

function renderEmailText(params: {
  formType: string;
  pageSlug?: string;
  data: unknown;
  timestamp?: string;
  ip?: string | null;
  ua?: string | null;
}) {
  const safeJson = JSON.stringify(params.data ?? {}, null, 2);
  return [
    `Form type: ${params.formType}`,
    params.pageSlug ? `Page slug: ${params.pageSlug}` : null,
    params.timestamp ? `Timestamp: ${params.timestamp}` : null,
    params.ip ? `IP: ${params.ip}` : null,
    params.ua ? `User-Agent: ${params.ua}` : null,
    "",
    "Data:",
    safeJson,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmailHtml(text: string) {
  return `<pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(
    text
  )}</pre>`;
}

function isValidWebhookUrl(webhookUrl: string): boolean {
  if (!webhookUrl || typeof webhookUrl !== "string") return false;
  if (!ALLOWED_WEBHOOK_DOMAINS.length) return false;

  try {
    const url = new URL(webhookUrl);

    // Only allow HTTPS for security.
    if (url.protocol !== "https:") return false;

    // Block common internal hostnames / private ranges.
    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^\[fc/i,
      /^\[fd/i,
      /^\[fe80:/i,
    ];
    if (blockedPatterns.some((pattern) => pattern.test(hostname))) return false;

    // Allowlist match.
    return ALLOWED_WEBHOOK_DOMAINS.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formType, pageSlug, data, metadata, timestamp } = body as {
      formType?: string;
      pageSlug?: string;
      data?: unknown;
      metadata?: { webhookUrl?: string } | null;
      timestamp?: string;
    };

    const safeFormType = String(formType || "unknown");
    const safePageSlug = pageSlug ? String(pageSlug) : undefined;

    console.log("Form submission received:", {
      formType: safeFormType,
      pageSlug: safePageSlug,
      timestamp,
    });

    const results: {
      smtp?: "sent" | "skipped" | "failed";
      webhook?: "sent" | "skipped" | "failed";
    } = {};

    // Optional webhook delivery (disabled unless allowlist configured).
    const webhookUrl = metadata?.webhookUrl;
    if (webhookUrl && isValidWebhookUrl(webhookUrl)) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formType: safeFormType,
            pageSlug: safePageSlug,
            data,
            timestamp,
          }),
        });
        results.webhook = "sent";
      } catch (err) {
        console.error("Webhook error:", err);
        results.webhook = "failed";
      }
    } else {
      results.webhook = "skipped";
    }

    // SMTP delivery (optional; enabled via env).
    const smtp = getSmtpConfig();
    if (!smtp) {
      results.smtp = "skipped";
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
        });

        const ip = request.headers.get("x-forwarded-for");
        const ua = request.headers.get("user-agent");
        const text = renderEmailText({
          formType: safeFormType,
          pageSlug: safePageSlug,
          data,
          timestamp,
          ip,
          ua,
        });

        await transporter.sendMail({
          from: smtp.from,
          to: smtp.to,
          subject: subjectFor(safeFormType, safePageSlug),
          text,
          html: renderEmailHtml(text),
          replyTo: smtp.replyTo,
        });

        results.smtp = "sent";
      } catch (err) {
        console.error("SMTP error:", err);
        results.smtp = "failed";
      }
    }

    const delivered = results.smtp === "sent" || results.webhook === "sent";
    const hasAnyDeliveryConfigured =
      results.smtp !== "skipped" || (ALLOWED_WEBHOOK_DOMAINS.length > 0 && results.webhook !== "skipped");

    if (hasAnyDeliveryConfigured && !delivered) {
      return NextResponse.json(
        { success: false, message: "Form submitted but delivery failed", results },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Form submitted successfully",
      results,
    });
  } catch (error) {
    console.error("Form submission error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit form" },
      { status: 500 }
    );
  }
}

