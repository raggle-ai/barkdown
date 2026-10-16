---
name: barkdown-math
description: Write math sections for the BarkDown preview. Show the exact Markdown delimiters for inline formulas, display formulas, matrices, and escaped currency, plus the preview command and expected result.
---

# BarkDown Math

Write TeX math between dollar delimiters in a Markdown file. The BarkDown
preview renders the formulas with KaTeX; no companion HTML file is needed.

## Write this in `report.md`

```markdown
The inline formula is $E = mc^2$.

$$
f(x) = \frac{1}{1 + x^2}
$$

$$
\begin{bmatrix}
1 & 2 \\
3 & 4
\end{bmatrix}
$$

The price is \$20.
```

Copy the example contents into the file without the surrounding `markdown`
fence. A code fence would display the formula source instead of typesetting it.

- Put display `$$` delimiters on separate lines and leave blank lines around
  the block.
- Use KaTeX-supported commands. This is not a full LaTeX document compiler.
- Escape dollar signs used for currency. Put literal programming syntax with
  dollar signs inside code spans or fenced code blocks.
- Math can appear in GFM table cells. Keep display formulas outside tables.
- Use `.md` or `.markdown` for this preview format, not MDX.

## Preview and expected result

From the repository root, run:

```bash
pnpm preview /absolute/path/to/report.md
```

Open the printed URL. The first formula appears inside the sentence. The
fraction and matrix appear as separate display formulas. The price remains
literal currency. Check formula overflow and any KaTeX error text.

Use [barkdown-preview](../barkdown-preview/SKILL.md) to verify the preview URL.
Implementation reference: the Markdown plugins in
[react.tsx](../../../packages/barkdown/src/react.tsx). More syntax examples:
[test_katex.md](../../../examples/test_katex.md).
