import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  esbuild: {
    charset: "ascii",
    jsxDev: false,
  },
  plugins: [
    react(),
    {
      name: "barkdown-extension-assets",
      async closeBundle() {
        await cp("manifest.json", "extension-dist/manifest.json");
        await cp("images", "extension-dist/images", { recursive: true });
        await cp("src/background.js", "extension-dist/background.js");
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: /^react(\/.*)?$/,
        replacement: `${resolve("node_modules/react")}$1`,
      },
      {
        find: /^react-dom(\/.*)?$/,
        replacement: `${resolve("node_modules/react-dom")}$1`,
      },
    ],
    dedupe: ["react", "react-dom"],
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve("src/content.tsx"),
      formats: ["iife"],
      fileName: () => "content.js",
      name: "BarkdownExtension",
    },
    outDir: "extension-dist",
    rollupOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css") ? "style.css" : "assets/[name][extname]",
      },
    },
  },
});
