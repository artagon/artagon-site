// LAYOUT-08A/B: smoke the real server samples against a disposable copied build.
import { describe, expect, it } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const available = (name: string) => spawnSync("which", [name]).status === 0;

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((done, fail) => server.close((err) => err ? fail(err) : done()));
  return address.port;
}

function get(port: number, path: string, tls: boolean): Promise<{ status: number; body: string }> {
  return new Promise((done, fail) => {
    const req = (tls ? httpsRequest : httpRequest)({ host: "127.0.0.1", port, path, rejectUnauthorized: false }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (part: string) => { body += part; });
      res.on("end", () => done({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", fail);
    req.end();
  });
}

async function exercise(port: number, tls: boolean, process: ChildProcess, expected404: string) {
  let result: Awaited<ReturnType<typeof get>> | undefined;
  for (let n = 0; n < 50; n++) {
    if (process.exitCode !== null) throw new Error(`Server exited ${process.exitCode}`);
    try { result = await get(port, "/", tls); break; } catch { await new Promise((done) => setTimeout(done, 100)); }
  }
  expect(result?.status).toBe(200);
  expect([200, 301, 308]).toContain((await get(port, "/platform", tls)).status);
  expect((await get(port, "/platform/", tls)).status).toBe(200);
  expect((await get(port, "/icons/icon-32.png", tls)).status).toBe(200);
  const missing = await get(port, "/no-such-route-12345", tls);
  expect(missing.status).toBe(404);
  expect(missing.body).toBe(expected404);
}

async function stop(child: ChildProcess | undefined) {
  if (child && child.exitCode === null) {
    const exited = new Promise<void>((done) => child.once("close", () => done()));
    child.kill("SIGTERM");
    await exited;
  }
}

describe("deployment samples", () => {
  it.runIf(available("caddy"))("serves the built site and 404 document with Caddy", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "caddy-smoke-"));
    let child: ChildProcess | undefined;
    try {
      const dist = join(tmp, "dist");
      cpSync(join(root, ".build/dist"), dist, { recursive: true });
      const port = await freePort();
      const config = readFileSync(join(root, "deploy/Caddyfile"), "utf8")
        .replace("artagon.com, www.artagon.com {", `http://127.0.0.1:${port} {`)
        .replace(/  tls \{[\s\S]*?\n  \}\n/, "")
        .replace("/var/www/artagon-web/dist", dist);
      const configPath = join(tmp, "Caddyfile");
      writeFileSync(configPath, config);
      expect(spawnSync("caddy", ["validate", "--config", configPath]).status).toBe(0);
      child = spawn("caddy", ["run", "--config", configPath], { stdio: "ignore" });
      await exercise(port, false, child, readFileSync(join(dist, "404.html"), "utf8"));
    } finally { await stop(child); rmSync(tmp, { recursive: true, force: true }); }
  }, 30_000);

  it.runIf(available("nginx") && available("openssl"))("serves the built site and 404 document with nginx", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "nginx-smoke-"));
    let child: ChildProcess | undefined;
    try {
      const dist = join(tmp, "dist");
      cpSync(join(root, ".build/dist"), dist, { recursive: true });
      const cert = join(tmp, "cert.pem");
      const key = join(tmp, "key.pem");
      expect(spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-subj", "/CN=localhost", "-days", "1"], { stdio: "ignore" }).status).toBe(0);
      const port = await freePort();
      const original = readFileSync(join(root, "deploy/nginx.conf"), "utf8");
      const server = original.slice(original.indexOf("server { listen 443"))
        .replace("listen 443 ssl http2;", `listen 127.0.0.1:${port} ssl; ssl_certificate ${cert}; ssl_certificate_key ${key};`)
        .replace("/var/www/artagon-web/dist", dist);
      const config = join(tmp, "nginx.conf");
      writeFileSync(config, `pid ${tmp}/nginx.pid; error_log ${tmp}/error.log; events {} http { ${server} }`);
      expect(spawnSync("nginx", ["-t", "-c", config, "-p", `${tmp}/`]).status).toBe(0);
      child = spawn("nginx", ["-c", config, "-p", `${tmp}/`, "-g", "daemon off;"], { stdio: "ignore" });
      await exercise(port, true, child, readFileSync(join(dist, "404.html"), "utf8"));
    } finally { await stop(child); rmSync(tmp, { recursive: true, force: true }); }
  }, 30_000);
});
