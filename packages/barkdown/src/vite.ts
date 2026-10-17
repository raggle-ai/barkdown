import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve } from "node:path";

import { extensions } from "./documents.js";
import { readFolder, readRange } from "./node.js";

type Server = {
  watcher: {
    add(path: string): void;
    on(event: "all", handler: (event: string, path: string) => void): void;
  };
  ws: { send(payload: { type: "full-reload" }): void };
  middlewares: {
    use(
      handler: (
        request: IncomingMessage,
        response: ServerResponse,
        next: () => void,
      ) => Promise<void>,
    ): void;
  };
};

/**
 * Development server routes for the explorer:
 *
 * - `GET /api/documents?root=<folder>&head=<bytes>` lists the folder. With
 *   `head`, Markdown and text files above that size return only their first
 *   lines plus a `partial` record.
 * - `GET /api/document?root=<folder>&file=<path>&start=<line>&end=<line>`
 *   returns one inclusive line range of a document.
 *
 * `path` is accepted as an alias of `root`. Without either, the configured
 * folder is used.
 */
export function barkdownPlugin(root: string) {
  const folder = resolve(root);

  return {
    name: "barkdown-documents",
    configureServer(server: Server) {
      const watched = new Set<string>();
      const watch = (root: string) => {
        if (watched.has(root)) return;
        watched.add(root);
        for (const extension of extensions) {
          server.watcher.add(resolve(root, `**/*${extension}`));
        }
      };
      watch(folder);
      server.watcher.on("all", (event, path) => {
        if (!extensions.has(extname(path).toLowerCase())) return;
        if (event !== "add" && event !== "change" && event !== "unlink") return;
        server.ws.send({ type: "full-reload" });
      });
      server.middlewares.use(async (request, response, next) => {
        const route = request.url?.split("?")[0];
        if (route !== "/api/documents" && route !== "/api/document") {
          next();
          return;
        }

        try {
          const url = new URL(request.url ?? "/", "http://127.0.0.1");
          const rootParam =
            url.searchParams.get("root") ??
            url.searchParams.get("path") ??
            folder;
          const root = resolve(rootParam);
          watch(root);
          const payload =
            route === "/api/document"
              ? await readRange(root, url.searchParams.get("file") ?? "", {
                  startLine: Number(url.searchParams.get("start") ?? 1),
                  endLine: Number(
                    url.searchParams.get("end") ?? Number.MAX_SAFE_INTEGER,
                  ),
                })
              : await readFolder(root, {
                  headBytes: url.searchParams.has("head")
                    ? Number(url.searchParams.get("head"))
                    : undefined,
                });
          response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          });
          response.end(JSON.stringify(payload));
        } catch (error) {
          if (!response.headersSent) {
            response.writeHead(500, {
              "Cache-Control": "no-store",
              "Content-Type": "application/json; charset=utf-8",
            });
          }
          response.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Could not read documents.",
            }),
          );
        }
      });
    },
  };
}
