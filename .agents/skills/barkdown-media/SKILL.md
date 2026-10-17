---
name: barkdown-media
description: Write image, video, hosted-player, and remote iframe embeds for the BarkDown preview. Show the exact Markdown or raw HTML to put in a document, the preview command, and the expected collapsed and expanded results.
---

# BarkDown Media

Images, videos, and raw iframes start as collapsed thumbnail-and-title rows.
The expanded content mounts on opening and unmounts on closing. GitHub emoji
images are the exception: they remain inline.

Save the document as `.md` or `.markdown` so the preview loads it as Markdown.

## Write embeds in `report.md`

Copy the content inside each example directly into the Markdown file. Do not
include the surrounding `markdown` or `html` example fences. In particular,
`<img>`, `<video>`, and `<iframe>` must be raw HTML in the document, not code
blocks. Leave blank lines around each embed.

The URLs below show syntax. Replace them with verified content URLs.

## Images

```markdown
![Site plan](https://example.com/site-plan.png)

![Site plan](https://example.com/site-plan.png "Ground floor")
```

The title order is explicit title, alt text, then URL filename. Use descriptive
alt text even when a title is present.

```html
<img
  src="https://example.com/site-plan.png"
  title="Ground floor"
  alt="Site plan"
  width="480"
/>
```

Obsidian `![[file.png]]` embeds are not supported. Use a Markdown image or
`<img>` instead.

## Native video

```html
<video
  title="Product demonstration"
  controls
  preload="metadata"
  playsinline
  poster="https://example.com/poster.jpg"
  src="https://example.com/demo.mp4"
></video>
```

A source child is also supported:

```html
<video title="Product demonstration" controls preload="metadata" playsinline>
  <source src="https://example.com/demo.mp4" type="video/mp4" />
  <track
    src="https://example.com/captions.vtt"
    kind="captions"
    srclang="en"
    label="English"
  />
</video>
```

- Include `controls`, `preload="metadata"`, and `playsinline`.
- An explicit title overrides the URL filename.
- A poster supplies the thumbnail. Without one, a muted metadata-preload video
  is used; do not promise that every browser can show a first-frame thumbnail.
- On expansion, the renderer adds controls, inline playback, and autoplay.
  Browser autoplay rules still apply. Collapse stops playback by unmounting.
- Do not add document `autoplay` or event handlers. Markdown sanitization removes
  them.

## Hosted video

Use an image embed with no Markdown title to request a supported player:

```markdown
![Talk recording](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
```

Alt text supplies the card title. An empty alt falls back to the provider name
and ID. A non-empty explicit title, as in `![Talk](url "Image")`, forces image
behavior instead of a player.

Supported source URL forms:

- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://vimeo.com/NUMERIC_ID`
- `https://streamable.com/VIDEO_ID`
- `https://www.loom.com/share/HEX_ID`

You can also put these URLs in `<video title="Talk" src="..."></video>`.
YouTube watch/share URLs get a YouTube thumbnail. The other forms may have no
thumbnail. The hosted-video branch ignores `poster`; it does not use the native
video thumbnail logic. Hosted players load on expansion, but autoplay is not
added to their URLs.

## Remote iframe

```html
<iframe
  title="Reference page"
  src="https://example.com/embed"
  width="800"
  height="450"
></iframe>
```

Give each iframe a title. Without one, the renderer derives a title from the
provider or URL. It mounts the document only on expansion and adds fullscreen
support. A remote site can still block embedding.

Markdown accepts iframe `src`, `width`, `height`, `allowFullScreen`, and
`title`, plus permitted global attributes. It strips author-supplied `sandbox`,
`allow`, `referrerpolicy`, and event handlers. Raw remote iframe content is not
the isolated local HTML visualization path.

For local HTML sections and their different sandbox rules, use
[barkdown-html](../barkdown-html/SKILL.md).

## URLs and checks

Check actual media URLs before adding them to a document:

```bash
curl --fail --location --range 0-1023 --max-time 15 --output /dev/null "$URL"
```

Check the content type too; a successful HTML error page is not a media file.
Local Vite previews can use `/@fs/absolute/path/to/file.png` when Vite permits
that file. This is preview-specific, not a portable document URL. The explorer
does not rewrite ordinary relative media paths to the document folder.

## Preview and expected result

From the repository root, run:

```bash
pnpm preview /absolute/path/to/report.md
```

Open the printed URL. Each image, video, or remote iframe starts as a collapsed
row with a title. Click the row to open its content:

| Embed                              | Expected expanded result                     |
| ---------------------------------- | -------------------------------------------- |
| Markdown image or `<img>`          | The full image                               |
| Native `<video>`                   | A video with controls; playback is attempted |
| Supported hosted-video image embed | The provider's video player                  |
| Remote `<iframe>`                  | The remote page, if it permits framing       |

Close the row and check that video playback stops. If HTML source appears
instead of a row, remove the `html` fence around the tags.

Use [barkdown-preview](../barkdown-preview/SKILL.md) to verify the preview URL.
Implementation references:
[media.tsx](../../../packages/barkdown/src/renderers/media.tsx) and the
sanitizer in [react.tsx](../../../packages/barkdown/src/react.tsx).
See [test_media.md](../../../examples/test_media.md) for existing media sources.
