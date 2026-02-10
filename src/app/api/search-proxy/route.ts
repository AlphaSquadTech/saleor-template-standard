import { NextRequest, NextResponse } from "next/server";

// Use the same base configured for the app
const BASE_URL = process.env.NEXT_PUBLIC_SEARCH_URL || "";

export async function GET(req: NextRequest) {
  let target = "unknown";
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path) {
      return NextResponse.json({ message: "Missing 'path' query param" }, { status: 400 });
    }
    if (!BASE_URL) {
      return NextResponse.json({ message: "Missing NEXT_PUBLIC_SEARCH_URL" }, { status: 500 });
    }

    target = `${BASE_URL}${path}`;
    
    // Create timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const upstream = await fetch(target, {
      // Forward GET as-is. Add headers if needed.
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const text = await upstream.text();
    
    if (!upstream.ok) {
      console.error(`[Search Proxy] Upstream error: ${upstream.status} - ${text}`);
    }
    
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    console.error(`[Search Proxy] Error:`, e);
    return NextResponse.json({ 
      message: msg, 
      target 
    }, { status: 502 });
  }
}
