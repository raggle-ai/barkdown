#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const root = resolve(new URL("..", import.meta.url).pathname);
const input = process.argv[2] ?? ".";
const target = resolve(process.cwd(), input);

if (!existsSync(target)) {
  console.error(`No file or folder exists at ${target}`);
  process.exit(1);
}

const stat = statSync(target);
const folder = stat.isDirectory() ? target : dirname(target);
const selected = stat.isDirectory()
  ? undefined
  : relative(folder, target).split(sep).join("/");
const port = await freePort(Number(process.env.PORT) || 5173);
const host = lanAddress();
const params = new URLSearchParams();

const build = spawnSync("pnpm", ["--filter", "@raggle-ai/barkdown", "build"], {
  cwd: root,
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

params.set("path", folder);
if (selected) params.set("file", selected);

const url = `http://${host}:${port}/?${params.toString()}`;

console.log(`Previewing ${stat.isDirectory() ? folder : target}`);
console.log(`Open on mobile: ${url}`);
console.log("The phone and this computer must use the same local network.");

const child = spawn(
  "pnpm",
  [
    "--filter",
    "@raggle-ai/barkdown-extension",
    "exec",
    "vite",
    "serve",
    "preview",
    "--host",
    "0.0.0.0",
    "--port",
    String(port),
    "--config",
    "vite.config.ts",
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      BARKDOWN_PREVIEW_ROOT: folder,
    },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

function lanAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return "127.0.0.1";
}

async function freePort(start) {
  for (let port = start; port < start + 100; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error(`No open port found from ${start} to ${start + 99}`);
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}
