#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const reportsDir = path.join(repoRoot, "reports", "lighthouse");

function parseArgs(argv) {
  const options = {
    preset: "mobile",
    path: "/",
    host: "127.0.0.1",
    port: 3000,
    runs: 1,
    skipBuild: false,
    skipStart: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }
    if (arg === "--skip-start") {
      options.skipStart = true;
      continue;
    }
    if (!arg.startsWith("--")) continue;

    const [rawKey, rawValue] = arg.slice(2).split("=");
    const value = rawValue ?? "";

    switch (rawKey) {
      case "preset":
        options.preset = value || options.preset;
        break;
      case "path":
        options.path = value || options.path;
        break;
      case "host":
        options.host = value || options.host;
        break;
      case "port":
        options.port = Number(value || options.port);
        break;
      case "runs":
        options.runs = Number(value || options.runs);
        break;
      default:
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/run-lighthouse.mjs [options]

Options:
  --preset=mobile|desktop|all   Which Lighthouse preset to run. Default: mobile
  --path=/route                 Route to test. Default: /
  --host=127.0.0.1              Host for local server. Default: 127.0.0.1
  --port=3000                   Port for local server. Default: 3000
  --runs=3                      Number of repeated runs per preset. Default: 1
  --skip-build                  Reuse the current production build
  --skip-start                  Assume a production server is already running
  --help                        Show this help

Examples:
  npm run lighthouse:mobile
  npm run lighthouse -- --preset=all --path=/category/suspension --runs=3
  npm run lighthouse -- --preset=mobile --path=/ --skip-build --skip-start
`);
}

function normalizeRoute(route) {
  if (!route) return "/";
  return route.startsWith("/") ? route : `/${route}`;
}

function slugifyRoute(route) {
  return normalizeRoute(route)
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "home";
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, ...options.env },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function resolveLighthouseCli() {
  const candidates = [
    path.join(repoRoot, "node_modules", "lighthouse", "cli", "index.js"),
    path.join(repoRoot, "node_modules", ".bin", "lighthouse"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // keep trying
    }
  }

  throw new Error(
    "Could not find the Lighthouse CLI. Run `npm install` before using the local Lighthouse scripts.",
  );
}

function buildLighthouseArgs(url, preset, outputBase) {
  const args = [
    url,
    "--only-categories=performance",
    "--output=html",
    "--output=json",
    `--output-path=${outputBase}`,
    "--quiet",
    "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage",
  ];

  if (preset === "desktop") {
    args.push("--preset=desktop");
  } else {
    args.push(
      "--form-factor=mobile",
      "--screenEmulation.mobile=true",
      "--throttling-method=simulate",
    );
  }

  return args;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!["mobile", "desktop", "all"].includes(options.preset)) {
    throw new Error(`Unsupported preset "${options.preset}"`);
  }

  if (!Number.isInteger(options.port) || options.port <= 0) {
    throw new Error(`Invalid port "${options.port}"`);
  }

  if (!Number.isInteger(options.runs) || options.runs <= 0) {
    throw new Error(`Invalid runs value "${options.runs}"`);
  }

  const route = normalizeRoute(options.path);
  const baseUrl = `http://${options.host}:${options.port}`;
  const targetUrl = new URL(route, `${baseUrl}/`).toString();
  const presets =
    options.preset === "all" ? ["mobile", "desktop"] : [options.preset];

  await mkdir(reportsDir, { recursive: true });

  if (!options.skipBuild) {
    console.log("\n[lh] Building production app...\n");
    await runCommand("npm", ["run", "build"]);
  }

  let serverProcess = null;

  try {
    if (!options.skipStart) {
      console.log(`\n[lh] Starting production server on ${baseUrl}...\n`);
      serverProcess = spawn(
        "npm",
        ["run", "start", "--", "--hostname", options.host, "--port", String(options.port)],
        {
          cwd: repoRoot,
          stdio: "inherit",
          env: process.env,
        },
      );

      serverProcess.on("error", (error) => {
        console.error("[lh] Failed to start local server:", error);
      });

      await waitForServer(baseUrl);
    } else {
      console.log(`\n[lh] Reusing existing server at ${baseUrl}...\n`);
      await waitForServer(baseUrl, 10_000);
    }

    const lighthouseCli = await resolveLighthouseCli();
    const routeSlug = slugifyRoute(route);

    for (const preset of presets) {
      for (let runIndex = 1; runIndex <= options.runs; runIndex += 1) {
        const reportBase = path.join(
          reportsDir,
          `${timestamp()}-${routeSlug}-${preset}-run${runIndex}`,
        );

        console.log(`\n[lh] Running ${preset} Lighthouse for ${targetUrl} (run ${runIndex}/${options.runs})...\n`);
        await runCommand(
          process.execPath,
          [lighthouseCli, ...buildLighthouseArgs(targetUrl, preset, reportBase)],
          { env: { FORCE_COLOR: "1" } },
        );
        console.log(`[lh] Reports saved to ${reportBase}.html and ${reportBase}.report.json`);
      }
    }

    console.log(`\n[lh] Done. Open the HTML reports in ${reportsDir}\n`);
  } finally {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await sleep(1_000);
      if (!serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
    }
  }
}

main().catch((error) => {
  console.error(`\n[lh] ${error.message}\n`);
  process.exitCode = 1;
});
