import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { documentKind } from "@raggle-ai/barkdown/documents";
import { barkdownPlugin } from "@raggle-ai/barkdown/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const folder = resolve(
  process.env.BARKDOWN_PREVIEW_ROOT ?? resolve("../../examples"),
);

/**
 * Serves images, video, and other non-document files that a previewed
 * document references with a relative path. The request path is resolved
 * inside the previewed folder and redirected to Vite's /@fs route, which
 * handles content types and range requests. Documents stay on /api/documents.
 * This runs before Vite's single-page fallback, which would otherwise answer
 * every media request with index.html. Only existing files under the folder
 * are redirected, so app files are not shadowed.
 */
function folderMedia(root: string): Plugin {
  return {
    name: "barkdown-preview-media",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          next();
          return;
        }
        let file: string;
        try {
          const pathname = decodeURIComponent(
            new URL(request.url ?? "/", "http://127.0.0.1").pathname,
          );
          file = resolve(root, `.${pathname}`);
          if (
            !file.startsWith(`${root}${sep}`) ||
            documentKind(file) ||
            !(await stat(file)).isFile()
          ) {
            next();
            return;
          }
        } catch {
          next();
          return;
        }
        response.writeHead(302, { Location: `/@fs${encodeURI(file)}` });
        response.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), barkdownPlugin(folder), folderMedia(folder)],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    fs: {
      // Let /@fs media paths serve from anywhere under the user's home so local
      // files in arbitrary previewed folders (notes referencing output videos
      // elsewhere on the machine) render inside the preview app.
      allow: [homedir()],
    },
  },
});
