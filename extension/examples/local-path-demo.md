# Local Path Link Demo

This file shows how bare local absolute paths become clickable buttons in BarkDown.

The project source lives at /Users/andrewmaguire/LOCAL/Github/raggle-ai-kennel — click it to open that folder.

## Examples

A trailing slash marks a folder: /Users/andrewmaguire/LOCAL/Github/barkdown/ opens the barkdown repo root.

A nested file path: /Users/andrewmaguire/LOCAL/Github/main/raggle/projects/kennel/custom-folder-css-plan.md should open the plan document.

## Punctuation is preserved

Trailing punctuation stays outside the link:

- Open /Users/andrewmaguire/LOCAL/Github/raggle-ai-kennel.
- See /Users/andrewmaguire/LOCAL/Github/raggle-ai-kennel, then continue.
- (barkdown lives at /Users/andrewmaguire/LOCAL/Github/barkdown)

## Code blocks are NOT linkified

```
Run /Users/andrew/bin/tool to build.
```

The path inside a fenced code block stays as plain text.

## Paths in backticks ARE linkified

The linked source is at `/Users/andrewmaguire/LOCAL/Github/raggle-ai-kennel`.

See [the project](/Users/andrew/project) — existing markdown links keep their own href.

## Inline with other text

You can find the config at /Users/andrewmaguire/LOCAL/Github/raggle-ai-kennel/kennel.json and edit it there.
