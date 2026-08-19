import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve } from "node:path";

import { extensions } from "./documents.js";
import { readFolder } from "./node.js";

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
        if (request.url?.split("?")[0] !== "/api/documents") {
          next();
          return;
        }

        try {
          const url = new URL(request.url ?? "/", "http://127.0.0.1");
          const root = resolve(url.searchParams.get("path") ?? folder);
          watch(root);
          response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          });
          response.end(JSON.stringify(await readFolder(root)));
        } catch (error) {
          response.writeHead(500, {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          });
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
