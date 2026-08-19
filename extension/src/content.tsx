import "@raggle-ai/barkdown/styles.css";
import "@raggle-ai/barkdown/explorer.css";

import { documentKind } from "@raggle-ai/barkdown/documents";
import {
  BarkdownExplorer,
  type BarkdownDataset,
  type BarkdownSource,
} from "@raggle-ai/barkdown/explorer";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type BarkdownTheme = "paper" | "warm" | "dark" | "sage";

type BarkdownSettings = {
  showLinkIcons: boolean;
  theme: BarkdownTheme;
};

const settingsKey = "barkdown-settings";
const defaultSettings: BarkdownSettings = {
  showLinkIcons: true,
  theme: "paper",
};

const url = new URL(window.location.href);
const path = decodeURIComponent(url.pathname);
const name = path.split("/").filter(Boolean).at(-1) ?? "Documents";
const kind = documentKind(name);
const localFolder = url.protocol === "file:" && url.pathname.endsWith("/");
const initialLinks = [
  ...document.querySelectorAll<HTMLAnchorElement>("a[href]"),
].map((link) => link.href);

function mount(source: BarkdownSource) {
  document.title = `${name} · BarkDown`;
  document.head
    .querySelectorAll("style, link[rel=stylesheet]")
    .forEach((node) => node.remove());
  document.body.replaceChildren();
  const root = document.createElement("div");
  root.id = "barkdown-root";
  document.body.append(root);

  createRoot(root).render(
    <StrictMode>
      <BarkdownPage source={source} />
    </StrictMode>,
  );
}

function BarkdownPage({ source }: { source: BarkdownSource }) {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    let cancelled = false;
    void chrome.storage.local.get(settingsKey).then((items) => {
      if (cancelled) return;
      setSettings(parseSettings(items[settingsKey]));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`barkdown-theme barkdown-theme-${settings.theme}`}>
      <BarkdownExplorer
        brand="BarkDown"
        sidebarTools={
          <BarkdownOptions settings={settings} onSettings={setSettings} />
        }
        showLinkIcons={settings.showLinkIcons}
        source={source}
      />
    </div>
  );
}

function BarkdownOptions({
  settings,
  onSettings,
}: {
  settings: BarkdownSettings;
  onSettings: (settings: BarkdownSettings) => void;
}) {
  const update = (next: BarkdownSettings) => {
    onSettings(next);
    void chrome.storage.local.set({ [settingsKey]: next });
  };

  return (
    <details className="barkdown-options">
      <summary>Options</summary>
      <div className="barkdown-options-panel">
        <label>
          <input
            type="checkbox"
            checked={settings.showLinkIcons}
            onChange={(event) =>
              update({
                ...settings,
                showLinkIcons: event.currentTarget.checked,
              })
            }
          />
          Show link icons
        </label>
        <label>
          Color setup
          <select
            value={settings.theme}
            onChange={(event) =>
              update({
                ...settings,
                theme: event.currentTarget.value as BarkdownTheme,
              })
            }
          >
            <option value="paper">Paper</option>
            <option value="warm">Warm</option>
            <option value="sage">Sage</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </details>
  );
}

async function readLocalFolder(): Promise<BarkdownDataset> {
  const seen = new Set<string>();
  const documents = await readFolder(url.href, seen);

  return {
    root: path,
    documents,
  };
}

async function readFolder(
  folder: string,
  seen: Set<string>,
): Promise<BarkdownDataset["documents"]> {
  if (seen.has(folder)) return [];
  seen.add(folder);

  const links = folder === url.href ? initialLinks : await folderLinks(folder);
  const documents = await Promise.all(
    links.map(async (link) => {
      const href = new URL(link, folder);
      if (href.protocol !== "file:") return [];
      if (!decodeURIComponent(href.pathname).startsWith(path)) return [];
      if (href.href === folder || href.pathname.endsWith("/..")) return [];
      if (href.pathname.endsWith("/")) return readFolder(href.href, seen);

      const relative = decodeURIComponent(href.pathname).slice(path.length);
      if (!relative || relative.startsWith("/")) return [];
      const itemKind = documentKind(relative);
      if (!itemKind) return [];
      const response = await fetch(href.href);
      if (!response.ok) return [];
      return [
        { path: relative, content: await response.text(), kind: itemKind },
      ];
    }),
  );

  return documents.flat();
}

async function folderLinks(folder: string): Promise<string[]> {
  const response = await fetch(folder);
  if (!response.ok) return [];
  const html = await response.text();
  const page = new DOMParser().parseFromString(html, "text/html");
  return [...page.querySelectorAll<HTMLAnchorElement>("a[href]")].map(
    (link) => new URL(link.getAttribute("href") ?? "", folder).href,
  );
}

function parseSettings(value: unknown): BarkdownSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const candidate = value as Partial<BarkdownSettings>;
  const theme = ["paper", "warm", "dark", "sage"].includes(
    candidate.theme ?? "",
  )
    ? candidate.theme!
    : defaultSettings.theme;
  return {
    showLinkIcons: candidate.showLinkIcons !== false,
    theme,
  };
}

if (localFolder) {
  document.title = `${name} · BarkDown`;
  mount({ read: readLocalFolder });
} else if (kind && !(url.protocol === "file:" && kind === "html")) {
  const content =
    kind === "html"
      ? `<!doctype html>\n${document.documentElement.outerHTML}`
      : document.body.innerText;
  const root = path.slice(0, Math.max(1, path.lastIndexOf("/")));
  const source: BarkdownSource = {
    async read() {
      return { root, documents: [{ path: name, content, kind }] };
    },
  };

  mount(source);
}
