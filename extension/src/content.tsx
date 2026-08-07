import "@raggle-ai/barkdown/styles.css"
import "@raggle-ai/barkdown/explorer.css"

import { documentKind } from "@raggle-ai/barkdown/documents"
import { BarkdownExplorer, type BarkdownSource } from "@raggle-ai/barkdown/explorer"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { requestPreview } from "./preview"

const url = new URL(window.location.href)
const path = decodeURIComponent(url.pathname)
const name = path.split("/").filter(Boolean).at(-1) ?? "Documents"
const kind = documentKind(name)
const localFolder = url.protocol === "file:" && url.pathname.endsWith("/")

function mount(source: BarkdownSource) {
  document.title = `${name} · BarkDown`
  document.head.querySelectorAll("style, link[rel=stylesheet]").forEach((node) => node.remove())
  document.body.replaceChildren()
  const root = document.createElement("div")
  root.id = "barkdown-root"
  document.body.append(root)

  createRoot(root).render(
    <StrictMode>
      <BarkdownExplorer brand="BarkDown" source={source} />
    </StrictMode>,
  )
}

if (localFolder) {
  document.title = `${name} · BarkDown`
  void requestPreview(url.href, chrome.runtime.sendMessage).then(
    (destination) => window.location.replace(destination),
    (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error("Could not open the folder viewer")
      mount({ read: async () => Promise.reject(error) })
    },
  )
} else if (kind) {
  const content =
    kind === "html"
      ? `<!doctype html>\n${document.documentElement.outerHTML}`
      : document.body.innerText
  const root = path.slice(0, Math.max(1, path.lastIndexOf("/")))
  const source: BarkdownSource = {
    async read() {
      return { root, documents: [{ path: name, content, kind }] }
    },
  }

  if (url.protocol === "file:" && kind !== "text") {
    void requestPreview(url.href, chrome.runtime.sendMessage).then((destination) => {
      window.location.replace(destination)
    })
  }

  mount(source)
}
