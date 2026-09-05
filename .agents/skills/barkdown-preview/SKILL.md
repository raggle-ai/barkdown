---
name: barkdown-preview
description: Launch and verify BarkDown previews for Markdown, HTML, and text files or folders, including phone-accessible LAN links.
---

# BarkDown Preview

Use this skill when the user asks to preview a Markdown, HTML, or text file in
this repository, test the BarkDown preview viewer, or make a link they can open
on a phone.

## Commands

- Use `barkdown <file-or-folder>` when the global command is installed.
- Use `pnpm preview <file-or-folder>` from the repository root when you need the
  repo-local command.
- Use `pnpm install:global` to install or refresh the `barkdown` command in
  `~/.local/bin`.

Both preview commands build `@raggle-ai/barkdown`, start Vite on all network
interfaces, and print a URL with:

- `path=<absolute-folder>` for the served folder
- `file=<relative-file>` for the selected document, when a file was supplied

## Verify

Before you report a preview link:

1. Check that the command printed a LAN URL.
2. Check the page:

   ```bash
   curl -fsSI --connect-timeout 3 --max-time 5 "http://127.0.0.1:<port>/"
   ```

3. Check the document API:

   ```bash
   curl -fsS --connect-timeout 3 --max-time 5 "http://127.0.0.1:<port>/api/documents?path=<encoded-folder>"
   ```

4. Confirm that `root` is the requested folder and that the expected file is in
   `documents`.

If curl to the LAN address fails on the host computer but `127.0.0.1` works, do
not assume the preview is broken. The LAN URL can still work from a phone on the
same network.

## Browser Testing

When the user asks to test in Browser:

1. Start the preview command for the requested file or folder.
2. Open the localhost URL in Browser.
3. Verify visible content, `?file=` direct selection, side bar navigation, and
   the browser console.
4. Stop only the preview process that this task started.

## Output

Return the mobile URL and state that the preview server is running. For LAN
links, state that the phone and computer must use the same local network.
