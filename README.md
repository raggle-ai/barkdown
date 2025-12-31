# BarkDown

**Your markdown's best friend.**

BarkDown fetches your markdown files and transforms them into beautifully rendered HTML - right in your browser. Like a loyal pup, it's always ready to help you preview your docs.

> **Note:** BarkDown is not yet published on the Chrome Web Store. See [Local Installation](#local-installation) below.

## Features

- **Auto-reload** - BarkDown watches your files and refreshes automatically
- **Custom themes** - Pick a style that suits you, or bring your own CSS
- **GitHub Flavored Markdown** - Full GFM support, just like you'd expect
- **Export to HTML** - Copy nicely formatted HTML with one click
- **Copy to Clipboard** - Quickly copy raw markdown content
- **Dark/Light mode** - Toggle between themes with one click
- **KaTeX support** - Beautiful math rendering
- **MathJax support** - Even more math options
- **Mermaid diagrams** - Flowcharts, sequence diagrams, and more
- **Font size controls** - Adjust text size for comfortable reading
- **Focus mode** - Dim surrounding content to focus on what you're reading
- **Reading progress** - Track your progress through long documents

## Local Installation

Since BarkDown is not yet available on the Chrome Web Store, you can install it locally:

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/raggle/barkdown.git
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions` in your browser
   - Or go to Menu > More Tools > Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `barkdown` folder you cloned/downloaded

5. **Enable file access**
   - Find BarkDown in your extensions list
   - Click "Details"
   - Enable "Allow access to file URLs"

6. **Start using BarkDown**
   - Open any `.md` file in Chrome
   - Watch BarkDown fetch you a beautiful preview!

## Updating

To update your local installation:

```bash
cd barkdown
git pull origin main
```

Then go to `chrome://extensions` and click the refresh icon on the BarkDown extension.

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

- [Change Log](CHANGELOG.md)
- [Wiki / Documentation](docs/WIKI.md)

---

*Made with tail wags by [Raggle](https://raggle.co)*

[marked]: https://github.com/chjj/marked
[mp]: https://github.com/borismus/markdown-preview
[mermaid]: https://github.com/mermaid-js/mermaid
[mathjax]: https://github.com/mathjax/MathJax
