import "@raggle-ai/barkdown/styles.css";
import "@raggle-ai/barkdown/explorer.css";

import { BarkdownContent } from "@raggle-ai/barkdown";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import readme from "../../README.md?raw";

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
    <main
      className="document"
      style={{
        minHeight: "calc(100vh - 48px)",
      }}
    >
      <BarkdownContent mode="markdown" value={readme} />
    </main>
  </StrictMode>,
);
