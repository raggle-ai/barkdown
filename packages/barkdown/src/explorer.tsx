import type { AnchorHTMLAttributes, MouseEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Menu,
  PanelLeftClose,
  Search,
  X,
} from "lucide-react"
import { parseDocument } from "yaml"

import {
  documentKind,
  documentMatches,
  documentPath,
  documentUrl,
  type BarkdownKind,
} from "./documents.js"
import { BarkdownContent } from "./react.js"

export type BarkdownDocument = {
  path: string
  content: string
  kind: BarkdownKind
}

export type BarkdownDataset = {
  root: string
  documents: BarkdownDocument[]
}

export type BarkdownSource = {
  read(): Promise<BarkdownDataset>
  openRoot?(): Promise<void>
}

export type BarkdownExplorerProps = {
  brand?: string
  source: BarkdownSource
}

type FolderNode = {
  folders: Map<string, FolderNode>
  documents: BarkdownDocument[]
}

type Metadata = {
  body: string
  entries: [string, unknown][]
}

const queryPath = () => documentPath(window.location.search)

export const documentTitle = (path: string) => {
  const value = path
    .split("/")
    .at(-1)!
    .replace(/\.(?:html?|markdown|md|text|txt)$/i, "")
    .replaceAll(/[-_]/g, " ")
    .replace(/^\d{4} \d{2} \d{2} /, "")
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

export const folderName = (path: string) => {
  const clean = path.replace(/[\\/]+$/, "")
  return clean.split(/[\\/]/).at(-1) || path
}

function tree(documents: BarkdownDocument[]) {
  const root: FolderNode = { folders: new Map(), documents: [] }
  for (const document of documents) {
    const parts = document.path.split("/")
    let node = root
    for (const part of parts.slice(0, -1)) {
      const child = node.folders.get(part) ?? {
        folders: new Map(),
        documents: [],
      }
      node.folders.set(part, child)
      node = child
    }
    node.documents.push(document)
  }
  return root
}

function metadata(content: string): Metadata {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(content)
  if (!match) return { body: content, entries: [] }
  const parsed = parseDocument(match[1] ?? "")
  const value: unknown = parsed.errors.length ? undefined : parsed.toJS()
  const entries =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value)
      : []
  return { body: content.slice(match[0].length), entries }
}

export function BarkdownExplorer({
  brand = "Barkdown",
  source,
}: BarkdownExplorerProps) {
  const [data, setData] = useState<BarkdownDataset>()
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(queryPath)
  const [query, setQuery] = useState("")
  const [sidebar, setSidebar] = useState(false)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void source
      .read()
      .then((result) => {
        setData(result)
        setSelected((current) => {
          if (
            current &&
            result.documents.some((item) => item.path === current)
          ) {
            return current
          }
          return (
            result.documents.find(
              (item) => item.path.toLowerCase() === "readme.md",
            )?.path ??
            result.documents[0]?.path ??
            null
          )
        })
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error ? reason.message : "Could not load files.",
        )
      })
  }, [source])

  useEffect(() => {
    const update = () => setSelected(queryPath())
    window.addEventListener("popstate", update)
    return () => window.removeEventListener("popstate", update)
  }, [])

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSidebar(true)
        requestAnimationFrame(() => search.current?.focus())
      }
    }
    window.addEventListener("keydown", focus)
    return () => window.removeEventListener("keydown", focus)
  }, [])

  const document = data?.documents.find((item) => item.path === selected)
  const content = useMemo(
    () =>
      document?.kind === "markdown"
        ? metadata(document.content)
        : { body: document?.content ?? "", entries: [] },
    [document],
  )
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return data?.documents ?? []
    return (data?.documents ?? []).filter((item) =>
      documentMatches(item, value),
    )
  }, [data, query])
  const rootName = data ? folderName(data.root) : brand
  const openRoot = source.openRoot
    ? () => {
        void source.openRoot?.()
      }
    : undefined

  const open = (path: string) => {
    const url = documentUrl(window.location.href, path)
    window.history.pushState(null, "", url)
    setSelected(path)
    setSidebar(false)
    window.scrollTo({ top: 0 })
    documentElement()?.focus({ preventScroll: true })
  }

  const documentElement = () =>
    window.document.querySelector<HTMLElement>("#document")

  const relativeLink = ({
    href,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const handle = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || !href || !document) return
      if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return
      const clean = href.split("#")[0]?.split("?")[0]
      if (!clean || !documentKind(clean)) return
      const base = document.path.split("/").slice(0, -1).join("/")
      const resolved = new URL(
        clean,
        `https://kennel.local/${base}/`,
      ).pathname.slice(1)
      if (!data?.documents.some((item) => item.path === resolved)) return
      event.preventDefault()
      open(resolved)
    }

    return <a {...props} href={href} onClick={handle} />
  }

  return (
    <main className="shell barkdown-explorer">
      <button
        className="mobile-menu"
        type="button"
        aria-label="Open file browser"
        onClick={() => setSidebar(true)}
      >
        <Menu aria-hidden="true" />
      </button>

      {sidebar ? (
        <button
          className="scrim"
          type="button"
          aria-label="Close file browser"
          onClick={() => setSidebar(false)}
        />
      ) : null}

      <aside className={sidebar ? "sidebar is-open" : "sidebar"}>
        <header className="brand">
          {openRoot ? (
            <button
              className="mark"
              type="button"
              aria-label={`Open ${rootName} folder`}
              title={data?.root}
              onClick={openRoot}
            >
              <FolderOpen aria-hidden="true" />
            </button>
          ) : (
            <div className="mark" aria-hidden="true">
              <Folder aria-hidden="true" />
            </div>
          )}
          <div className="brand-copy">
            <strong>{rootName}</strong>
            <span>
              {data ? `${data.documents.length} documents` : "Document viewer"}
            </span>
          </div>
          <button
            className="icon-button desktop-close"
            type="button"
            aria-label="Close file browser"
            onClick={() => setSidebar(false)}
          >
            <PanelLeftClose aria-hidden="true" />
          </button>
          <button
            className="icon-button mobile-close"
            type="button"
            aria-label="Close file browser"
            onClick={() => setSidebar(false)}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <label className="search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search files</span>
          <input
            ref={search}
            type="search"
            placeholder="Search files"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>⌘K</kbd>
        </label>

        <nav className="files" aria-label="Documents">
          {!data && !error ? <FileSkeleton /> : null}
          {error ? <p className="sidebar-message">{error}</p> : null}
          {data && filtered.length === 0 ? (
            <p className="sidebar-message">No files match this search.</p>
          ) : null}
          {query ? (
            filtered.map((item) => (
              <DocumentButton
                key={item.path}
                document={item}
                selected={selected === item.path}
                onOpen={open}
                showPath
              />
            ))
          ) : data ? (
            <FolderTree
              node={tree(filtered)}
              selected={selected}
              onOpen={open}
            />
          ) : null}
        </nav>

        {openRoot ? (
          <button
            className="root-path"
            type="button"
            title={data?.root}
            onClick={openRoot}
          >
            <FolderOpen aria-hidden="true" />
            <span>{data?.root ?? "Reading folder…"}</span>
          </button>
        ) : (
          <footer className="root-path" title={data?.root}>
            <Folder aria-hidden="true" />
            <span>{data?.root ?? "Reading folder…"}</span>
          </footer>
        )}
      </aside>

      <section className="workspace">
        {document ? (
          <>
            <header className="document-header">
              <div className="header-title">
                <FileText aria-hidden="true" />
                <span>{documentTitle(document.path)}</span>
              </div>
              <div className="breadcrumbs" aria-label="File path">
                {document.path.split("/").map((part, index, parts) => (
                  <span key={`${part}-${index}`}>
                    {index ? <ChevronRight aria-hidden="true" /> : null}
                    <span
                      className={index === parts.length - 1 ? "current" : ""}
                    >
                      {part}
                    </span>
                  </span>
                ))}
              </div>
            </header>
            <article
              id="document"
              className={
                document.kind === "html" ? "document is-html" : "document"
              }
              tabIndex={-1}
            >
              {content.entries.length ? (
                <Frontmatter entries={content.entries} />
              ) : null}
              {document.kind === "html" ? (
                <iframe
                  className="html-document"
                  sandbox=""
                  srcDoc={document.content}
                  title={documentTitle(document.path)}
                />
              ) : document.kind === "markdown" ? (
                <BarkdownContent
                  collapsibleHeadings
                  mode="markdown"
                  value={content.body}
                  components={{ a: relativeLink }}
                />
              ) : (
                <pre className="text-document">{document.content}</pre>
              )}
            </article>
          </>
        ) : (
          <Empty loading={!data && !error} error={error} />
        )}
      </section>
    </main>
  )
}

function Frontmatter({ entries }: { entries: [string, unknown][] }) {
  const [open, setOpen] = useState(
    () => !window.matchMedia("(max-width: 760px)").matches,
  )

  return (
    <details
      className="frontmatter"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>Document details</span>
        <small>{entries.length} fields</small>
        <ChevronDown aria-hidden="true" />
      </summary>
      <dl>
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll(/[-_]/g, " ")}</dt>
            <dd>
              {Array.isArray(value) ? (
                <span className="metadata-tags">
                  {value.map((item) => (
                    <span key={String(item)}>{String(item)}</span>
                  ))}
                </span>
              ) : typeof value === "boolean" ? (
                value ? (
                  "Yes"
                ) : (
                  "No"
                )
              ) : typeof value === "object" && value ? (
                JSON.stringify(value)
              ) : (
                String(value ?? "")
              )}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

function FolderTree({
  node,
  selected,
  onOpen,
}: {
  node: FolderNode
  selected?: string | null
  onOpen: (path: string) => void
}) {
  return (
    <>
      {[...node.folders].map(([name, child]) => (
        <details key={name} open>
          <summary>
            <ChevronRight className="chevron" aria-hidden="true" />
            <Folder aria-hidden="true" />
            <span>{name}</span>
          </summary>
          <div className="folder-children">
            <FolderTree node={child} selected={selected} onOpen={onOpen} />
          </div>
        </details>
      ))}
      {node.documents.map((item) => (
        <DocumentButton
          key={item.path}
          document={item}
          selected={selected === item.path}
          onOpen={onOpen}
        />
      ))}
    </>
  )
}

function DocumentButton({
  document,
  selected,
  onOpen,
  showPath = false,
}: {
  document: BarkdownDocument
  selected: boolean
  onOpen: (path: string) => void
  showPath?: boolean
}) {
  return (
    <button
      className={selected ? "file is-selected" : "file"}
      type="button"
      aria-current={selected ? "page" : undefined}
      onClick={() => onOpen(document.path)}
    >
      <FileText aria-hidden="true" />
      <span>
        <strong>{documentTitle(document.path)}</strong>
        {showPath ? <small>{document.path}</small> : null}
      </span>
    </button>
  )
}

function FileSkeleton() {
  return (
    <div className="skeleton" aria-label="Loading files">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function Empty({ loading, error }: { loading: boolean; error: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText aria-hidden="true" />
      </div>
      <h1>
        {loading
          ? "Reading documents"
          : error
            ? "Folder unavailable"
            : "No documents"}
      </h1>
      <p>
        {loading
          ? "The document browser is preparing the folder."
          : error || "Add a Markdown, HTML, or text file and refresh the page."}
      </p>
    </div>
  )
}
