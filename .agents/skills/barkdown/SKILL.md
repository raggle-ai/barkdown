---
name: barkdown
description: Write Markdown that renders correctly in BarkDown — Obsidian-parity media embeds (markdown-image video links, iframes, images, inline MP4, hosted players) — and launch/verify BarkDown previews for Markdown, HTML, text, or folders, including phone-accessible LAN links.
---

# BarkDown

Two jobs: (1) write or update Markdown files so media renders and looks
correct in BarkDown, (2) launch and verify BarkDown previews.

## Writing media Markdown

BarkDown markdown mode renders every image and video as a **collapsed
thumbnail + title row** (`@raggle-ai/barkdown` ≥ 0.4.0). Clicking expands it;
expanding a video autoplays, collapsing it stops playback. Write media this way:

### Images

```markdown
![Short descriptive alt text](https://example.com/picture.jpg)
```

Use real, descriptive alt text — it becomes the preview title when no
`title` attribute exists. For raw `<img>` tags prefer adding a `title`
attribute (it becomes the card title):

```html
<img src="https://example.com/picture.jpg" title="Poster title" width="480" alt="Descriptive alt">
```

### Inline MP4 video

```html
<video title="Visible card title" controls preload="metadata" playsinline width="800" src="https://…/video.mp4"></video>
```

Key attributes BarkDown relies on:

- `title` — the collapsed card title (falls back to the filename in the URL).
- `controls` — always include; documents must not force playback.
- `preload="metadata"` — keeps large files from fully downloading pre-play.
- `playsinline` — required for mobile autoplay.
- `poster="https://…image.jpg"` — still image on the thumbnail; omit it and
  BarkDown fetches the video's first frame as the thumbnail instead.

Source-element form is also supported:

```html
<video title="Title" controls preload="metadata" playsinline>
  <source src="https://…/video.mp4" type="video/mp4">
</video>
```

Do not use `autoplay`, `on*` handlers, or `javascript:` URLs — the sanitiser
strips them.

### Hosted players (YouTube, Vimeo, Streamable, Loom)

Two syntaxes render hosted players; pick by content type:

**Obsidian parity — markdown-image embed.** Obsidian renders
`![](https://youtube.com/watch?v=…)` as a video player, and BarkDown matches:
the collapsed card shows the platform thumbnail and the player loads on
expand. This is the syntax to use in plain Markdown/Obsidian-portable files:

```markdown
![](https://www.youtube.com/watch?v=VIDEO_ID)
```

An explicit markdown `title` (`![alt](url "Some title")`) opts back out to
plain image behaviour, so an author can force image treatment of a video URL.

**Raw-HTML embed.** Paste the platform URL into `<video src>`; BarkDown swaps
in the hosted player on expand:

```html
<video title="Talk title" controls preload="metadata" playsinline src="https://www.youtube.com/watch?v=VIDEO_ID"></video>
```

`youtu.be/<id>`, `youtube.com/watch?v=<id>`, `youtube.com/embed/<id>`,
`vimeo.com/<id>`, `streamable.com/<id>`, and `loom.com/share/<id>` all work.
Collapsed cards title as "YouTube video <id>" / "Vimeo video <id>" when no
explicit title exists, with the platform thumbnail when one is fetchable.
Vimeo/Streamable/Loom thumbnails render blank in the collapsed row (their
APIs require a request) — include a `poster` to keep a proper thumbnail when
one is available.

### Iframe web-page embeds

Obsidian's documented `<iframe src="…">` embed syntax is supported. BarkDown
renders it as a collapsed card; the document loads only when expanded:

```html
<iframe title="Visible card title" src="https://example.com/embed"></iframe>
```

Give every iframe an explicit `title` — it becomes the card title; without it
the card derives a name from the URL path. Only `src`, `width`, `height`,
`allowFullScreen`, and `title` survive sanitisation; `sandbox`, `allow`,
`referrerpolicy`, and `on*` handlers are always stripped.

### Not supported

`![[file.jpg]]` wikilink embeds (Obsidian's primary local-file syntax) do not
render — write markdown-image or raw-HTML syntax instead. Local files in
documents use the `/@fs/` form below.

### URL and hosts

Only reference media URLs that are verified reachable — fetch each URL with
a ranged GET before writing it into a file, and keep a fallback if the host
could disappear. Known-good examples used in `examples/test_media.md`:

- Big Buck Bunny 720p/10s: `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4`
- Full BBB movie: `https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4`
- Wikimedia images: use the **full-size original** path
  (`upload.wikimedia.org/wikipedia/commons/c/c5/File.jpg`); thumb paths can
  return 400.
- Do not use `commondatastorage.googleapis.com/gtv-videos-bucket` — it now
  returns 403 for everything.

Local files during preview: reference them with Vite's `/@fs/absolute/path`
form; those paths only work inside the local preview app, so note that in
the document.

## Preview commands

- `barkdown <file-or-folder>` when the global command is installed.
- `pnpm preview <file-or-folder>` from this repository root for the
  repo-local command (example docs live in `examples/`).
- `bun dev` in `apps/preview/` runs the standalone preview app, serving
  `test/` by default.
- `pnpm install:global` installs/refreshes `barkdown` in `~/.local/bin`.

Both preview commands build `@raggle-ai/barkdown`, serve Vite on all
interfaces, and print a URL with `path=<absolute-folder>` and, when a file
was supplied, `file=<relative-file>`.

## Verify

Before reporting a preview link:

1. Check the command printed a LAN URL.
2. `curl -fsSI --connect-timeout 3 --max-time 5 "http://127.0.0.1:<port>/"`.
3. `curl -fsS --connect-timeout 3 --max-time 5 "http://127.0.0.1:<port>/api/documents?path=<encoded-folder>"`
   and confirm `root` matches the requested folder and the expected file is
   in `documents`.

If the LAN curl fails on the host but `127.0.0.1` works, the LAN URL can
still work from a phone on the same network.

## Browser testing

1. Start the preview command for the requested file or folder.
2. Open the localhost URL in Browser.
3. Verify visible content, media collapsed rows, expand/autoplay behaviour,
   side-bar navigation, and the console.
4. Stop only the preview process this task started.

## Output

Return the preview URL (and mobile URL for LAN links, stating both machines
need the same local network) and note that the preview server is running.
