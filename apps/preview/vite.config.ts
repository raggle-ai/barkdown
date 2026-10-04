import { resolve } from "node:path";
import { homedir } from "node:os";
import { barkdownPlugin } from "@raggle-ai/barkdown/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    barkdownPlugin(process.env.BARKDOWN_PREVIEW_ROOT ?? resolve("../../examples")),
  ],
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
