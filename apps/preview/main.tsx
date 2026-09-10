import "@raggle-ai/barkdown/styles.css";
import "@raggle-ai/barkdown/explorer.css";

import {
  BarkdownExplorer,
  type BarkdownDataset,
} from "@raggle-ai/barkdown/explorer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root");
}

document.body.style.margin = "0";
document.body.style.background = "#f7f7f8";
document.body.style.color = "#222";
document.body.style.fontFamily =
  'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

createRoot(root).render(
  <StrictMode>
    <BarkdownExplorer
      brand="BarkDown"
      source={{
        async read(): Promise<BarkdownDataset> {
          const params = new URLSearchParams(window.location.search);
          const path = params.get("path");
          const query = path ? `?path=${encodeURIComponent(path)}` : "";
          const response = await fetch(`/api/documents${query}`, {
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error("Could not load preview files.");
          }
          return response.json() as Promise<BarkdownDataset>;
        },
      }}
    />
  </StrictMode>,
);
