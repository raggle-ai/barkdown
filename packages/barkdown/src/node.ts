import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import { documentKind, type BarkdownKind } from "./documents.js";

export type BarkdownFile = {
  path: string;
  content: string;
  kind: BarkdownKind;
};

export type BarkdownFolder = {
  root: string;
  documents: BarkdownFile[];
};

const skipped = new Set([".git", ".turbo", "dist", "node_modules"]);

export async function readFolder(root: string): Promise<BarkdownFolder> {
  const folder = resolve(root);

  async function read(directory: string): Promise<BarkdownFile[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const found = await Promise.all(
      entries
        .filter((entry) => !skipped.has(entry.name))
        .map(async (entry): Promise<BarkdownFile[]> => {
          const path = resolve(directory, entry.name);
          if (entry.isDirectory()) return read(path);
          if (!entry.isFile()) return [];
          const kind = documentKind(entry.name);
          if (!kind) return [];
          return [
            {
              path: relative(folder, path).split(sep).join("/"),
              content: await readFile(path, "utf8"),
              kind,
            },
          ];
        }),
    );
    return found.flat();
  }

  return {
    root: folder,
    documents: (await read(folder)).sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  };
}
