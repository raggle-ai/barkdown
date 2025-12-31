# New Features Test Document

This document tests all the enhanced features in BarkDown - your markdown's best friend.

---

## Emoji Support :rocket:

Emojis can be used inline using `:shortcode:` syntax:

- :smile: Smile
- :heart: Heart  
- :thumbsup: Thumbs up
- :fire: Fire
- :star: Star
- :warning: Warning
- :check: Check mark
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

### More Emojis

| Category | Examples |
|----------|----------|
| Faces | :grin: :joy: :heart_eyes: :thinking: :sunglasses: |
| Animals | :dog: :cat: :unicorn: :butterfly: :fox: |
| Food | :apple: :hamburger: :cake: :beer: :wine_glass: |
| Nature | :sunny: :rainbow: :snowflake: :fire: :ocean: |
| Objects | :computer: :phone: :camera: :scissors: :wrench: |

---

## Code Blocks with Copy Button and Line Numbers

Hover over code blocks to see the copy button:

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate first 10 fibonacci numbers
for (let i = 0; i < 10; i++) {
    console.log(`F(${i}) = ${fibonacci(i)}`);
}
```

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Example usage
numbers = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(numbers))
```

```css
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
```

---

## Heading Anchor Links

Hover over any heading to see the anchor link (# symbol). Click to copy the link!

### This is a Third Level Heading

#### This is a Fourth Level Heading

##### This is a Fifth Level Heading

---

## Task List with Progress

### Project Setup
- [x] Initialize repository
- [x] Set up development environment
- [x] Configure linting
- [ ] Write documentation
- [ ] Add tests

### Feature Implementation
- [x] Copy code button
- [x] Line numbers
- [x] Emoji support
- [x] Anchor links
- [x] Task progress
- [x] Reading time
- [x] Image lightbox
- [x] Keyboard shortcuts
- [x] Search overlay
- [x] Print styles
- [x] PDF export
- [x] Back to top button
- [x] Reading progress bar
- [x] TOC scroll sync
- [x] Font size controls
- [x] Focus mode
- [x] Reading position memory

### Bug Fixes
- [ ] Fix alignment issue
- [ ] Resolve memory leak
- [x] Update dependencies

---

## Image Lightbox

Click on any image to view it in full size:

![Sample Image](../images/shot.png)

---

## Keyboard Shortcuts

The following keyboard shortcuts are available:

| Key | Action |
|-----|--------|
| `/` | Open search overlay |
| `t` | Scroll to top |
| `b` | Scroll to bottom |
| `f` | Toggle focus mode |
| `Esc` | Close lightbox/search |
| `Enter` | Jump to next search result |

---

## Search Feature

Press `/` to open the search overlay and find text in the document.

Try searching for:
- "emoji"
- "keyboard"
- "feature"
- "code"

---

## Collapsible Sections

<details>
<summary>Click to expand this section</summary>

This content is hidden by default and can be expanded by clicking on the summary.

You can put any content here:
- Lists
- Code blocks
- Images
- Tables

```javascript
console.log("Hidden code!");
```

</details>

<details>
<summary>Another collapsible section</summary>

More hidden content here. This is useful for:

1. FAQ sections
2. Detailed explanations
3. Optional information
4. Reducing page clutter

</details>

---

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Copy Button | :check: Done | High |
| Line Numbers | :check: Done | High |
| Emoji | :check: Done | High |
| Anchors | :check: Done | Medium |
| Task Progress | :check: Done | Medium |
| Lightbox | :check: Done | Medium |
| Search | :check: Done | Low |
| Shortcuts | :check: Done | Low |
| Back to Top | :check: Done | High |
| Progress Bar | :check: Done | High |
| TOC Sync | :check: Done | Medium |
| Font Size | :check: Done | Medium |
| Focus Mode | :check: Done | Medium |
| Position Memory | :check: Done | Low |

---

## Export Menu :arrow_down:

Click the **⋮** button in the top-right corner to open the export menu with these options:

| Option | Description |
|--------|-------------|
| **Export PDF** | Opens print dialog to save as PDF |
| **Copy HTML** | Copies the rendered HTML to clipboard (clean, without UI elements) |
| **Copy Markdown** | Copies the original markdown source |
| **Copy URL** | Copies the current page URL |

The print/PDF styles will:
- Hide UI elements (buttons, dark mode toggle, etc.)
- Use clean, readable fonts
- Add link URLs after links
- Avoid page breaks inside code blocks

---

## Math Support (if KaTeX enabled)

Inline math: $E = mc^2$

Block math:
$$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$$

---

## Reading Time

The reading time is automatically calculated and displayed at the top of the document.
It's based on an average reading speed of 200 words per minute.

---

## Dark Mode

Click the sun/moon toggle button in the top-right corner to switch between light and dark modes.
Your preference is saved automatically.

---

## New UI Controls :sparkles:

Look at the right side of the screen! You'll find several new controls:

### Reading Progress Bar
At the very top of the page, there's a thin progress bar that shows how far you've scrolled through the document.

### Font Size Controls (A- A A+)
Three buttons to decrease, reset, or increase the font size. Your preference is saved!

### Focus Mode Button (◎)
Click the target icon (or press `f`) to enable focus mode. In focus mode, only the paragraph you're hovering over is fully visible - everything else is dimmed. Great for distraction-free reading!

### Back to Top Button (↑)
When you scroll down, a blue circular button appears in the bottom-right corner. Click it to smoothly scroll back to the top.

### Reading Position Memory
The extension automatically remembers where you left off reading. When you return to a document, it will scroll to your last position!

---

## Scroll Sync with TOC

If you have Table of Contents enabled in the extension options, the current section will be highlighted in the TOC as you scroll through the document. Try scrolling and watch the TOC update!

---

## All Together Now! :tada:

This section combines multiple features:

- [x] :rocket: Emoji in task lists
- [x] :star: Stars everywhere!
- [ ] :construction: Work in progress

> :bulb: **Pro tip**: Use keyboard shortcuts for faster navigation!

```javascript
// :fire: Hot code coming through!
const features = [
    'copyButton',      // :clipboard:
    'lineNumbers',     // :1234:
    'emojis',          // :smile:
    'anchors',         // :link:
    'taskProgress',    // :chart:
    'readingTime',     // :clock:
    'lightbox',        // :camera:
    'shortcuts',       // :keyboard:
    'search',          // :mag:
    'print',           // :printer:
    'backToTop',       // :arrow_up:
    'progressBar',     // :chart:
    'tocSync',         // :bookmark:
    'fontControls',    // :capital_abcd:
    'focusMode',       // :dart:
    'positionMemory'   // :floppy_disk:
];

console.log(`${features.length} features implemented! :tada:`);
```

---

**The End** :wave:
