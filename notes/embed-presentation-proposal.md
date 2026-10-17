# Standard presentation for embedded files

Status: implemented in `packages/barkdown/src/renderers/embed-frame.tsx` and
`embed-file.ts`, with the HTML, text, media, explorer, preview, example, and
documentation changes described below. The proposal text is kept as the
approved plan. Differences from the plan are listed at the end.

## Assessment

The file renderers work, but each renderer owns too much of its presentation.
Use one shared **embed frame** for the header, controls, viewport, and
status messages. Include HTML, text, and the image, video, and remote iframe
previews in `media.tsx`. Keep content rendering and loading separate from
presentation. Standard presentation does not mean that every embed must use
an iframe or have the same content height.

### Verified current behaviour

- [HTML](../packages/barkdown/src/renderers/html.tsx) has a private
  `HtmlPreview` with Reload, Copy file path, and Open controls. Open creates
  a full-window page that keeps the HTML sandbox.
- [Text](../packages/barkdown/src/renderers/text.tsx) has a separate figure
  and a title-only header. Markdown renders as Markdown. CSV renders as a
  table. Other supported text formats show escaped source.
- HTML and text repeat the asynchronous read and loading-state logic.
- [Media](../packages/barkdown/src/renderers/media.tsx) has a private
  `MediaPreview` with a thumbnail and an expand button. It covers images,
  native video, hosted players, and remote iframes. Previews start collapsed.
  Expanded content mounts on demand and unmounts on collapse, stopping
  playback. Thumbnails can load before expansion. Emoji images remain inline.
- Media uses `span` elements because an image can appear inside a Markdown
  paragraph. A shared frame must preserve valid paragraph markup.
- [Styles](../packages/barkdown/styles.css) repeat frame and header rules.
  HTML has a 320 px minimum height. Text uses a viewport up to 520 px tall.
- [The explorer](../packages/barkdown/src/explorer.tsx) resolves embed content
  from its loaded dataset. Reload currently resolves that loaded snapshot;
  it does not read a saved file from disk again.

## 1. One frame and toolbar

**Type:** Product and Technical. **Priority:** Now.
**Effort:** Medium. **Impact:** High.

**Problem:** The controls depend on the file type. Adding icons separately
would repeat the HTML toolbar and preserve the inconsistency.

**Proposal:** Add one internal module, `renderers/embed-frame.tsx`. It owns
shared header, action, and status presentation. Use it in `html.tsx`,
`text.tsx`, and `media.tsx`. Keep a `figure` for document embeds and a
paragraph-safe `span` for media. Share the actual header and actions rather
than copying their markup into each outer element.

Document embeds use this header:

```text
[MD] notes.md                     [Reload] [Copy file path] [Open]
---------------------------------------------------------------
|                                                             |
|              File-specific rendered content                 |
|                                                             |
---------------------------------------------------------------
```

- Show the filename, including its extension, for local files. Use the existing
  file-type badge. Media keeps its descriptive title and thumbnail.
- Put Reload, Copy source, and Open in the same order for all embeds. Place the
  media expand button beside these actions, not around them. Never nest a
  button or link inside another button.
- Copy the resolved file path for a local source, not the content. Use the
  relative path when the host does not provide the document's local path.
  For remote media, copy the original source URL. Labels must say whether
  the action copies a path or a URL.
- Reload calls the file reader again for document embeds. Media reload follows
  the rules in section 4. While loading, disable only Reload.
- Open shows the same file in a full-window view. Preserve formatted Markdown
  and CSV tables there. Keep HTML sandboxed in the full-window view too.
- Use one loading message, missing-file message, and failed-read message.
  Keep Reload available after an error. Disable Open when there is no content.
- Give each action a tooltip and an accessible label. Include the filename
  in labels so controls remain distinct to screen-reader users.

**Scenario:** Alice reads `examples/embed_examples.md`. Alice copies the path
from `notes.md`, then from `people.csv`. The File Embed frame presents the same
control in the same place for both files. Neither action copies the file body.

**Smallest useful version:** Replace the separate HTML, text, and media
headers with the shared presentation module. Apply it to all six files in
the current example page and add representative media examples. Remove the
old private frame presentation rather than keeping parallel implementations.

**Acceptance check:** Every valid source has the same three actions. Copy
returns the correct path or original URL. Open preserves document formatting
and HTML isolation. Media expand and collapse still work independently.

## 2. One set of layout rules, with different content renderers

**Type:** Product and Technical. **Priority:** Now.
**Effort:** Small after step 1. **Impact:** High.

**Problem:** Separate CSS makes spacing, height, and controls drift between
file types.

**Proposal:** Use one `data-barkdown-embed-*` style contract. Replace the
separate HTML, text, and media frame and toolbar rules; do not add aliases.
Keep content-specific rules for tables, source text, players, and thumbnails.

| Area              | Proposed rule                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Frame             | One border, radius, background, and outer margin.                                                                                  |
| Header            | One compact height and padding. Wrap long filenames. Keep actions together.                                                        |
| Document viewport | Height `min(520px, 60vh)`, minimum 240 px. Scroll inside the frame.                                                                |
| Media viewport    | Keep images in proportion. Use the existing player aspect ratio. Do not force video or images into a document-style scrolling box. |
| Media header      | Keep the thumbnail, title, and expand control. Match the shared action spacing, colour, and focus styles.                          |
| Markdown          | Use BarkDown document typography, with 16 px content padding.                                                                      |
| CSV               | Use BarkDown table styles. Keep horizontal scrolling inside the viewport.                                                          |
| Source text       | Use a monospace font and escaped text, with 16 px padding.                                                                         |
| HTML              | Give the iframe the full viewport. Let the HTML file own its internal layout.                                                      |
| Keyboard          | Make scrollable content focusable and show a visible focus indicator.                                                              |

The shared frame must not insert CSS into companion HTML or grant it access
to the parent page. Markdown must retain sanitization. CSV cells must remain
text, even when a cell contains HTML tags.

**Scenario:** Alice opens the example page on a phone. The Markdown and CSV
frames fit the screen. Alice scrolls a wide CSV table without moving the whole
page sideways.

**Smallest useful version:** One set of frame, header, action, and viewport
rules. Keep renderer-specific styles only for the content that differs.

**Acceptance check:** Check desktop and 390 px-wide views. No page-level
horizontal overflow. Long Markdown and wide CSV content scroll within their
frames. HTML scripts remain isolated.

**Tradeoff:** HTML previews will become taller than the current 320 px default.
This is a deliberate change to give document embeds the same viewport.
Media shares the frame styles but keeps a content-specific viewport.

## 3. Give the host ownership of file reading and navigation

**Type:** Technical. **Priority:** Now, to make the toolbar work correctly.
**Effort:** Medium. **Impact:** High.

**Problem:** A toolbar cannot guarantee a fresh read from a dataset snapshot.
A local disk path is also not a usable browser link.

**Proposal:** Put loading, read failures, and stale-result handling in one
shared read module. Keep disk access and document navigation in the host.

- The host reader must return current file content on each reload request.
  In the explorer, refresh the dataset through the existing source reader.
- The host supplies the resolved copy path and a valid document-view URL.
  Do not guess a browser URL from an absolute filesystem path.
- Use that document-view URL for Markdown, CSV, and text Open actions.
  The full-window view must use the same rendering rules as the embed.
- Keep the existing isolated full-window HTML path. Do not replace it with
  an unsandboxed HTML blob or direct executable file URL.
- Ignore a previous read result when the selected path changes. Catch both
  synchronous reader errors and rejected promises.

**Scenario:** Bob saves a change to `people.csv`. Alice selects Reload.
The host reader reads the saved file again. The table updates without requiring
Alice to reload the whole document. A failed read leaves Reload available.

**Smallest useful version:** Complete this path in the standalone explorer.
Hosts that use BarkDown directly must meet the same reader and navigation
contract. Update their affected call sites when implementing the change;
do not keep an obsolete interface through a compatibility layer.

**Acceptance check:** Change a companion file, select Reload, and confirm the
new content appears. Open Markdown and CSV in full-window views and confirm
their formatting. Check missing and failed reads manually.

## 4. Include media without changing its behaviour

**Type:** Product and Technical. **Priority:** Now.
**Effort:** Medium. **Impact:** High.

**Problem:** `media.tsx` has another private header. Leaving it out would
preserve a third presentation system and inconsistent controls.

**Proposal:** Move the presentation of `MediaPreview` into the shared frame.
Keep provider detection and native image, video, and iframe rendering in
`media.tsx`.

| Media behaviour        | Required result                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Initial state          | Keep the collapsed card with thumbnail and descriptive title.                                                              |
| Expand                 | Mount the full image, video, or player only when expanded.                                                                 |
| Collapse               | Unmount expanded content. Native video and hosted playback stop.                                                           |
| Copy source            | Copy the local path for a local source, or the original URL for a remote source. Do not copy a generated player URL.       |
| Open                   | Open the original image, video, or remote page. For hosted video, use the watch/share URL, not the transformed player URL. |
| Reload while expanded  | Reload or remount that media view. A video reload resets playback position.                                                |
| Reload while collapsed | Invalidate the expanded view for the next expansion. Do not open or start a player. A thumbnail may reload.                |
| Missing source         | Disable Copy and Open. Keep an explicit missing-source message.                                                            |
| Emoji image            | Stay inline, without a card or toolbar.                                                                                    |

Preserve image alt text, media titles, video captions and source children,
fullscreen support, and the existing URL sanitization. Do not add new iframe
permissions or try to bypass a remote site's embedding restrictions.

The shared frame owns layout and controls, not provider-specific loading.
Use native media load/error events where available. Do not claim that an
iframe load event proves a remote player works or that its content is readable.
Do not fetch binary media through the document-text reader.

**Scenario:** Alice expands a hosted video and then collapses it. Playback
stops. Alice selects Copy source while the card is closed. The frame copies
the original watch URL without mounting the player. Bob reloads an expanded
native video; the video view resets, but the surrounding report stays open.

**Smallest useful version:** Use the shared header and actions in the existing
`MediaPreview`, `ImagePreview`, `VideoPreview`, and `IframePreview` paths.
Keep their current collapsed state and provider handling. No new media syntax
or player framework is needed.

**Acceptance check:** Check an image, native video, hosted player, and remote
iframe on desktop and mobile. Check keyboard expansion and independent action
buttons. Confirm collapsed players are not mounted, collapse stops playback,
Copy uses the original source, and emoji remain inline.

## How to write embeds in Markdown

Keep the existing two local-document fence labels and the existing media
syntax. Standardise the frame and controls without adding per-document
formatting options. The file extension selects Markdown, table, or source-text
rendering within `barkdown-text`.

### Example folder

```text
report.md
files/
  diagram.html
  notes.md
  people.csv
  readme.txt
  data.json
  config.yaml
  overview.png
  demo.mp4
```

### Exact source for `report.md`

Write the following directly into the Markdown file. The outer four-backtick
fence below only displays the example; do not copy that outer fence.

````markdown
# Project report

## Interactive diagram

```barkdown-html
files/diagram.html
```

## Formatted notes

```barkdown-text
files/notes.md
```

## People table

```barkdown-text
files/people.csv
```

## Plain text

```barkdown-text
files/readme.txt
```

## JSON source

```barkdown-text
files/data.json
```

## YAML source

```barkdown-text
files/config.yaml
```

## Image

![Project overview](files/overview.png)

## Native video

<video title="Product demo" controls preload="metadata" playsinline src="files/demo.mp4"></video>

## Hosted video

![Recorded walkthrough](https://www.youtube.com/watch?v=VIDEO_ID)

## Remote page

<iframe src="https://example.com/demo" title="Remote demo"></iframe>
````

Replace `VIDEO_ID` with a real video ID and replace the remote-page URL with
the required page. A remote site can block embedding. These URLs demonstrate
syntax; they are not verified media fixtures. The image and video files must
be served by the host, not loaded as UTF-8 text by the folder reader.

### Authoring rules and expected output

| Input                                                             | Result                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `barkdown-html` with an `.html` or `.htm` path                    | Isolated interactive HTML preview.                               |
| `barkdown-text` with an `.md` or `.markdown` path                 | Formatted Markdown, including headings, lists, code, and tables. |
| `barkdown-text` with a `.csv` path                                | A table. The first row supplies the column headings.             |
| `barkdown-text` with `.txt`, `.text`, `.json`, `.yaml`, or `.yml` | Escaped source text.                                             |
| An ordinary `[Notes](files/notes.md)` link                        | A link, not an embed.                                            |
| An ordinary `html`, `markdown`, or `csv` code fence               | Source code, not an external-file embed.                         |

Each document and media embed gets the proposed shared header and actions
automatically. Document embeds stay visible. Media retains its collapsed card
and separate expand control. Authors do not write toolbar HTML, add React
code, or configure each viewport.

| Media source | Markdown or HTML to use                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Image        | `![Descriptive alt text](files/overview.png)`                                                                                  |
| Native video | A raw `<video>` element with `src`, `title`, and `controls`.                                                                   |
| Hosted video | A Markdown image containing a supported watch/share URL, with no explicit Markdown title. The alt text becomes the card title. |
| Remote page  | A raw `<iframe>` element with `src` and `title`.                                                                               |

Put raw video and iframe HTML directly in the document. An `html` code fence
shows their source instead of creating a media preview. Supported hosted
players remain YouTube, Vimeo, Streamable, and Loom.

- Put exactly one unquoted relative path in each embed fence. Do not put file
  contents, extra lines, or settings in the fence.
- Resolve the path from the Markdown file, not from the repository root.
  For example, `reports/report.md` can use `../files/notes.md` when both
  folders are inside the permitted served root.
- Keep the target inside the served folder. Serve a common parent when needed.
  A local embed fence is not a remote-URL embed.
- Put explanatory headings and captions in normal Markdown above the fence.
  The frame itself shows the target filename and file-type badge.
- Use the same syntax for compact and full-window views. Open is a frame
  control, not a second form of Markdown syntax.
- Do not use image syntax such as `![](files/notes.md)` for document embeds.
- HTML permission comes from `barkdown-html`, not from the contents of a text
  file. Markdown and CSV must never gain HTML script permissions.

**Acceptance check:** Copy the source above into `report.md`, create the six
companion files, and preview `report.md`. Check the correct rendering and the
same three controls for each file. Add the two local media files and valid
remote sources to check collapsed cards and their actions. The current example
document should use this same authoring pattern.

## Recommended sequence and scope

Implement steps 1–3 for the existing HTML and text fences, then apply the
shared presentation to `media.tsx` as described in step 4. Each layer must
work before the next is added. The complete scope includes both document
embeds and media previews.

Keep the current Markdown fence, image, video, and iframe syntax. No authoring
change is needed to standardise presentation.

Do not add a renderer registry, per-file configuration, a new UI library,
Download, Copy contents, or extra display modes for this work. Keep Mermaid
controls outside this change. Media shares the frame presentation, not the
document reader or fixed-height document layout.

Update the examples, package README, and current embed skill after the code
works. Verify with the existing commands and manual browser checks. No new
test files are proposed.

## Limits

This proposal is based on the local BarkDown code. Kennel's current reader and
navigation integration was not inspected. Its affected call sites must be
checked before changing a host-facing interface.

## Implementation notes

- The host reader contract keeps the existing `htmlEmbed` and `textEmbed`
  props on `BarkdownMarkdown`. Both use the shared `EmbedReader` type. The
  reader receives `{ reload: true }` when the user selects Reload and must then
  return current file content. The explorer reads the folder again through its
  `BarkdownSource.read()` on reload and uses the loaded dataset for first reads.
- The Copy action resolves the companion or local media path next to
  `headingCopyPath`, the document's local path, and copies the relative path
  when the host gives no document path.
- Text, Markdown, and CSV Open actions use the new optional `embedUrl` prop.
  The explorer supplies its `?file=` document page. `BarkdownDocument` has no
  navigation, so its text Open action stays disabled. HTML Open keeps the
  isolated full-window page with a scripts-only sandbox.
- The explorer's full document view shows `.csv` files as tables and other text
  files as escaped source through the same `TextContent` renderer as the embed.
- The preview app serves image and video files from the previewed folder at
  their document-relative paths by redirecting to Vite's `/@fs` route.
