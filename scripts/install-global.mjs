#!/usr/bin/env node
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const bin = resolve(process.env.HOME ?? "", ".local/bin/barkdown");
const preview = resolve(root, "scripts/preview.mjs");
const marker = "# Installed by barkdown/scripts/install-global.mjs";
const wrapper = `#!/bin/sh
${marker}
exec node "${preview}" "$@"
`;

try {
  const current = await readFile(bin, "utf8");
  if (!current.includes(marker)) {
    console.error(`${bin} already exists and was not installed by BarkDown.`);
    console.error("Remove it or choose a different command name.");
    process.exit(1);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await mkdir(dirname(bin), { recursive: true });
await writeFile(bin, wrapper, "utf8");
await chmod(bin, 0o755);

console.log(`Installed barkdown at ${bin}`);
console.log("Run: barkdown <markdown-file>");
