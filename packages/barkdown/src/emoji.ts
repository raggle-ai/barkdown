import { gemoji } from "gemoji"

type MdastNode = {
  type: string
  value?: string
  children?: MdastNode[]
  url?: string
  alt?: string
  title?: string | null
  data?: {
    hProperties?: Record<string, unknown>
  }
}

const shortcodePattern = /:\+1:|:-1:|:[\w+-]+:/g
const githubEmojiBase =
  "https://github.githubassets.com/images/icons/emoji/unicode"

const shortcodeToEmoji = new Map(
  gemoji.flatMap((entry) =>
    entry.names.map((name) => [
      name,
      {
        description: entry.description,
        emoji: entry.emoji,
      },
    ]),
  ),
)

function githubEmojiUrl(emoji: string): string {
  const codepoints = Array.from(emoji)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter((codepoint) => codepoint && codepoint !== "fe0f")
    .join("-")
  return `${githubEmojiBase}/${codepoints}.png?v8`
}

function shortcodeImage(shortcode: string): MdastNode | false {
  const name = shortcode.slice(1, -1)
  const entry = shortcodeToEmoji.get(name)
  if (!entry) return false
  return {
    type: "image",
    url: githubEmojiUrl(entry.emoji),
    alt: shortcode,
    title: entry.description,
    data: {
      hProperties: {
        className: "barkdown-emoji",
        draggable: false,
        loading: "lazy",
      },
    },
  }
}

function replaceTextNode(node: MdastNode): MdastNode[] {
  const value = node.value
  if (node.type !== "text" || !value) return [node]

  const output: MdastNode[] = []
  let lastIndex = 0

  for (const match of value.matchAll(shortcodePattern)) {
    const shortcode = match[0]
    const index = match.index ?? 0
    const image = shortcodeImage(shortcode)
    if (!image) continue

    if (index > lastIndex) {
      output.push({ type: "text", value: value.slice(lastIndex, index) })
    }
    output.push(image)
    lastIndex = index + shortcode.length
  }

  if (lastIndex === 0) return [node]
  if (lastIndex < value.length) {
    output.push({ type: "text", value: value.slice(lastIndex) })
  }
  return output
}

function replaceChildren(node: MdastNode): void {
  if (!node.children) return

  const children: MdastNode[] = []
  for (const child of node.children) {
    if (child.type === "text") {
      children.push(...replaceTextNode(child))
    } else {
      replaceChildren(child)
      children.push(child)
    }
  }
  node.children = children
}

export function remarkGithubEmojiImages() {
  return (tree: MdastNode) => {
    replaceChildren(tree)
  }
}
