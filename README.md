# BarkDown

**Your markdown's best friend.**

BarkDown fetches your markdown files and transforms them into beautifully rendered HTML - right in your browser. Like a loyal pup, it's always ready to help you preview your docs.

[Get it for Chrome][webstore]

## Features

- **Auto-reload** - BarkDown watches your files and refreshes automatically
- **Custom themes** - Pick a style that suits you, or bring your own CSS
- **GitHub Flavored Markdown** - Full GFM support, just like you'd expect
- **Export to HTML** - Copy nicely formatted HTML with one click
- **KaTeX support** - Beautiful math rendering
- **MathJax support** - Even more math options
- **Mermaid diagrams** - Flowcharts, sequence diagrams, and more

## Quick Start

1. Install BarkDown from the [Chrome Web Store][webstore]
2. Go to `chrome://extensions` and enable "Allow access to file URLs"  
   ![fileurls](http://i.imgur.com/qth3K.png)
3. Open any `.md` file in Chrome
4. Watch BarkDown fetch you a beautiful preview!

## Math Syntax

BarkDown uses KaTeX to render mathematical expressions. To avoid conflicts with standard Markdown syntax, some LaTeX delimiters are disabled by default but can be enabled in the options.

### Inline Math

| Syntax | Notes |
|--------|-------|
| `$math$` | Requires LaTeX delimiters enabled. Escape dollar signs with `\$` |
| `\(math\)` | Requires LaTeX delimiters enabled |
| `\\(math\\)` | Works by default |
| `` $`math`$ `` | Works by default |

### Display Math

| Syntax | Notes |
|--------|-------|
| `\[math\]` | Requires LaTeX delimiters enabled |
| `\\[math\\]` | Works by default |
| `$$math$$` | Works by default |
| ` ```math ` | Code block style, works by default |

## Credits

BarkDown is built on the shoulders of these awesome open source projects:

- [Marked][marked] - Fast markdown parser
- [markdown preview][mp] - The original inspiration
- [Mermaid][mermaid] - Diagrams and charts
- [MathJax][mathjax] - Math rendering engine

## Links

- [Change Log](https://github.com/volca/markdown-preview/wiki/Changelog)

---

*Made with tail wags by [Raggle](https://raggle.ai)*

[webstore]: https://chrome.google.com/webstore/detail/markdown-preview-plus/febilkbfcbhebfnokafefeacimjdckgl
[marked]: https://github.com/chjj/marked
[mp]: https://github.com/borismus/markdown-preview
[mermaid]: https://github.com/mermaid-js/mermaid
[mathjax]: https://github.com/mathjax/MathJax
