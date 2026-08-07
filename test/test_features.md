# BarkDown feature render test

This document checks the current BarkDown renderer. It uses only supported
Markdown features, so the page should render without broken controls, old image
paths, or extension-only UI claims.

---

## Emoji support 🚀

Emoji shortcodes use GitHub-compatible names. The renderer converts them to
inline Unicode emoji.

- :smile: Smile
- :heart: Heart
- :thumbsup: Thumbs up
- :fire: Fire
- :star: Star
- :warning: Warning
- :white_check_mark: Check mark
- :x: Cross
- :rocket: Rocket
- :bulb: Light bulb
- :coffee: Coffee
- :pizza: Pizza
- :tada: Party
- :bug: Bug
- :gear: Gear
- :lock: Lock
- :key: Key
- :zap: Lightning

### More emoji

| Category | Examples |
| --- | --- |
| Faces | Grin, joy, heart eyes, thinking, sunglasses |
| Animals | Dog, cat, unicorn, butterfly, fox |
| Food | Apple, burger, cake, beer, wine |
| Nature | Sun, rainbow, snowflake, fire, ocean |
| Objects | Computer, phone, camera, scissors, wrench |

---

## Code blocks with copy buttons

Hover over a code block to show the copy button.

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let index = 0; index < 10; index += 1) {
  console.log(`F(${index}) = ${fibonacci(index)}`);
}
```

```python
def quicksort(items):
    if len(items) <= 1:
        return items

    pivot = items[len(items) // 2]
    left = [item for item in items if item < pivot]
    middle = [item for item in items if item == pivot]
    right = [item for item in items if item > pivot]
    return quicksort(left) + middle + quicksort(right)
```

```css
.card {
  display: grid;
  gap: 12px;
  border-radius: 12px;
  background: white;
  padding: 24px;
}
```

---

## Task lists

### Project setup

- [x] Initialize repository
- [x] Set up development environment
- [x] Configure linting
- [ ] Write documentation
- [ ] Add tests

### Feature coverage

- [x] Code copy buttons
- [x] Emoji characters
- [x] GFM tables
- [x] Task lists
- [x] Escaped unsafe HTML
- [ ] Diagram rendering
- [ ] Math rendering

---

## Tables

| Feature | Status | Priority |
| --- | --- | --- |
| Copy button | :white_check_mark: Done | High |
| Emoji | :white_check_mark: Done | High |
| GFM table | :white_check_mark: Done | High |
| Task list | :white_check_mark: Done | Medium |
| Escaped HTML | :white_check_mark: Done | High |
| Mermaid diagrams | Not enabled | Medium |
| KaTeX math | Not enabled | Medium |

---

## Links

Relative links to other documents should open inside the viewer:

- [Basic Markdown test](test_basic.md)
- [GFM table test](test_gfm.md)
- [Task list test](test_task_list.md)

External links should stay normal:

- [Markdown Guide](https://www.markdownguide.org/)

---

## Unsafe HTML stays text

Raw HTML is not executed by the React Markdown renderer. This is intentional.

```html
<script>alert("This must not run");</script>
```

---

## All together :tada:

- [x] :rocket: Emoji in task lists
- [x] :star: Clear text hierarchy
- [ ] :construction: Work in progress item

> :bulb: Tip: Keep test documents aligned with the renderer that displays them.

```javascript
const features = [
  "copyButton",
  "emoji",
  "gfmTables",
  "taskLists",
  "safeHtml",
];

console.log(`${features.length} features covered`);
```

**The end** 👋
