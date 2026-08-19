import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../extension-dist/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", root), "utf8"),
);
const scripts = manifest.content_scripts.flatMap((entry) => entry.js ?? []);

for (const script of scripts) {
  const bytes = await readFile(new URL(script, root));
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  assert.ok(bytes.length, `${script} must not be empty`);
  for (const character of source) {
    const codePoint = character.codePointAt(0);
    const isNoncharacter =
      (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
      (codePoint & 0xfffe) === 0xfffe;
    assert.ok(
      !isNoncharacter,
      `${script} contains Unicode noncharacter U+${codePoint.toString(16).toUpperCase()}`,
    );
  }
  await access(new URL(script, root));
}

console.log(
  `Validated ${scripts.length} Chrome-compatible UTF-8 content script`,
);
