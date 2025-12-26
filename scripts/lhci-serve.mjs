#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";

const port = Number.parseInt(process.env.LHCI_PORT ?? "8081", 10);
const dir = process.env.LHCI_DIR ?? "dist";
const checkIntervalMs = Number.parseInt(
  process.env.LHCI_READY_INTERVAL_MS ?? "250",
  10,
);
const requestTimeoutMs = Number.parseInt(
  process.env.LHCI_READY_REQUEST_TIMEOUT_MS ?? "2000",
  10,
);

const server = spawn("npx", ["http-server", dir, "-p", String(port), "-s"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

let ready = false;
let exited = false;
let intervalId = null;

const readyUrl = `http://localhost:${port}/`;

const checkReady = () =>
  new Promise((resolve) => {
    const req = http.request(
      readyUrl,
      { method: "HEAD", timeout: requestTimeoutMs },
      (res) => {
        res.resume();
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
    req.end();
  });

const signalReady = () => {
  if (ready) return;
  ready = true;
  if (intervalId) clearInterval(intervalId);
  console.log("READY");
};

intervalId = setInterval(async () => {
  if (ready || exited) return;
  const ok = await checkReady();
  if (ok) signalReady();
}, checkIntervalMs);

const shutdown = () => {
  if (server.exitCode === null) server.kill("SIGTERM");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("exit", (code, signal) => {
  exited = true;
  if (!ready) {
    const meta = signal ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    console.error(`[LHCI] server exited before ready (${meta})`);
  }
  process.exit(code ?? 1);
});
