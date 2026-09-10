import { resolve } from "node:path";
import { barkdownPlugin } from "@raggle-ai/barkdown/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    barkdownPlugin(process.env.BARKDOWN_PREVIEW_ROOT ?? resolve("../../test")),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});