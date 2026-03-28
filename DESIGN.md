# craft-docs-srs — TUI Design Specification

Target framework: **opentui** (TypeScript, Bun runtime).

## Color Palette

Catppuccin Mocha-inspired. Use these constants throughout.

| Token       | Hex       | Usage                                |
|-------------|-----------|--------------------------------------|
| `bg`        | `#1e1e2e` | Screen background                    |
| `surface`   | `#313244` | Cards, input fields, selected rows   |
| `overlay`   | `#45475a` | Borders, dividers, inactive elements |
| `text`      | `#cdd6f4` | Primary text                         |
| `sub`       | `#a6adc8` | Secondary text, descriptions         |
| `dim`       | `#6c7086` | Hints, labels, disabled text         |
| `title`     | `#89b4fa` | App title, "new" count, easy grade   |
| `accent`    | `#a6e3a1` | Success, "good" grade, session done  |
| `warn`      | `#f9e2af` | "due" count, "hard" grade            |
| `err`       | `#f38ba8` | Errors, "again" grade                |
| `lavender`  | `#b4befe` | Cursor, selection indicator          |
| `mauve`     | `#cba6f7` | Code keywords                        |
| `teal`      | `#94e2d5` | Code fields/properties               |
| `peach`     | `#fab387` | Code literals                        |

## Global Layout Pattern

Every screen follows the same vertical structure:

```
┌──────────────────────────────────────────────┐
│ HEADER        title left, context right       │
│ ─────────────────────────────────────────     │
│                                               │
│ CONTENT AREA          (flex: 1, scrollable)   │
│                                               │
│                                               │
│                                               │
│ ─────────────────────────────────────────     │
│ HOTKEY BAR            pinned to bottom        │
└──────────────────────────────────────────────┘
```

- **Header**: left-aligned title (colored), right-aligned context info (dim). Followed by a horizontal divider (`overlay` color).
- **Content area**: fills remaining space, scrollable if needed.
- **Hotkey bar**: separated by top divider, always at bottom. Keys shown as `[key]` in `text` color, descriptions in `dim`. Keys separated by ` · `.

## Screen 1: Setup (first launch)

Shown when no config file exists at `~/.config/craft-srs/config.json`.

### Header
- Title: `craft-docs-srs` in `title` color, bold
- Version: `v0.1.0` in `dim` color, next to title

### Content
A bordered box (1px `overlay` border, 6px radius, 16–20px padding, max-width ~480 chars):

- Subtitle: "Connect to your Craft space" in `sub` color
- **API URL field**:
  - Label: "API URL" in `dim`
  - Input box: `surface` background, `overlay` border, text in `text` color
  - Cursor: `lavender` block cursor (`█`)
- **API key field**:
  - Label: "API key" in `dim`
  - Input box: same styling, content masked as dots (`····`)
  - Right-aligned hint: `[tab] show` in `dim`, 11px — toggles visibility
- **Action row**:
  - `Connect` button: `title` bg, `bg` text color, bold, 4px radius, 4×16px padding
  - Hint text: `[enter] submit · [esc] quit` in `dim`

Below the box: "Credentials saved to `~/.config/craft-srs/config.json`" in `dim`, path in `sub`.

### Behavior
- Tab switches focus between URL and key fields
- `[tab]` on key field toggles mask/reveal
- `[enter]` validates and attempts connection
- On success → Dashboard screen
- On failure → show inline error (see Screen 2)

## Screen 2: Setup Error

Same layout as Screen 1, with these changes:

- **Error banner** appears inside the box, above the fields:
  - Background: `err` at 10% opacity
  - Border: 1px `err`
  - Text: error message in `err`, 12px
  - Example: "Could not connect — check your API key"
- The failing field gets a **red border** (`err` instead of `overlay`)
- Focus returns to the failing field
- Button text changes to "Retry"

## Screen 3: Dashboard (main screen)

### Header
- Left: `craft-docs-srs` in `title`, bold
- Right: current date (e.g., "March 28, 2026") in `dim`

### Summary Bar
Below the header divider, a single row of aggregate stats, 12px, in `dim`:

```
3 decks · 8 new · 3 due · 24 total
```

- "new" count colored `title`
- "due" count colored `warn`
- "total" count in `dim`
- Separated by ` · `

### Deck List
Each deck is a row. Selected row has `surface` background + 4px radius.

Row layout (flex, horizontal):
```
[▸] Deck Name                    2 new · 1 due · 5 total
```

- Selection indicator: `▸` in `lavender` for selected, space for others
- Deck name: `text` color, bold for selected, `sub` for unselected
- Stats right-aligned, 12px:
  - `new` count in `title`
  - `due` count in `warn` (omitted if 0)
  - `total` in `dim`
  - Separated by ` · `
- Row spacing: 2px gap between rows

### Hotkey Bar
```
[↑↓] navigate · [r] review · [a] add deck · [d] delete · [q] quit
```

### Behavior
- Arrow keys move selection
- `[r]` starts review session on selected deck (only if deck has new or due cards)
- `[a]` opens Add Deck picker
- `[d]` deletes selected deck (with confirmation)
- `[q]` exits the app

## Screen 4: Empty State

Same header as Dashboard. Content area centered vertically and horizontally:

```
No decks yet
Press [a] to add a Craft collection
```

- "No decks yet" in `dim`, 14px
- Instruction in `sub`, 12px, `[a]` in `text` bold

### Hotkey Bar
```
[a] add deck · [q] quit
```

## Screen 5: Add Deck (collection picker)

### Header
- "Add deck" in `accent`, bold

### Search Field
Below header, an input with search icon:
```
⌕ dsa█
```
- `surface` background, `overlay` border, 4px radius
- Search icon `⌕` in `dim`
- Input text in `text`, cursor in `lavender`
- Typing filters the list (fuzzy match)

### Collection List
Below a divider. Each item is a row:

**Available collection (selectable):**
```
▸ DSA Problems                              5 items
```
- `▸` in `lavender`, name in `text` bold (if selected), item count in `dim`
- Selected row: `surface` background

**Already-added collection (dimmed):**
```
✓ DSA Basics                                added
```
- `✓` in `accent`, name in `sub`, "added" in `dim`
- Entire row at 40% opacity
- Not selectable (skipped during navigation)

### Hotkey Bar
```
[↑↓] navigate · [enter] select · [esc] cancel
```

### Behavior
- Typing in search field filters collections
- Only non-added collections are selectable
- `[enter]` adds the collection as a deck → return to Dashboard
- `[esc]` cancels → return to Dashboard

## Screen 6: Review — Front (question)

### Header
- Left: `Review: {deck name}` in `accent`, bold
- Right: `{current} / {total}` in `dim`

### Progress Bar
A row of segments, one per card in the session:
- 3px height, 2px gap between segments
- Current card: `title` color
- Completed cards: colored by grade (`accent` for good/easy, `warn` for hard, `err` for again)
- Upcoming cards: `overlay` color
- All segments have 2px border-radius

### Card Area
A bordered box (1px `overlay`, 6px radius, 24px padding), centered both vertically and horizontally within the content area. Minimum height ~200px.

Inside, centered:
- **Question text**: `text` color, 16px, bold
- **Optional subtitle**: below the question, `dim`, 12px (e.g. "What is it? How does it work?" — derived from sub-headings or first line)

### Hotkey Bar
```
[space] reveal · [s] skip · [q] quit session
```

## Screen 7: Review — Back (answer)

### Header & Progress Bar
Same as Screen 6.

### Content (no bordered card — flows freely)

**Question section:**
- Label: "QUESTION" in `dim`, 12px, uppercase
- Text: question in `text`, bold
- Margin-bottom 16px

**Divider:** 1px `overlay` line

**Answer section:**
- Label: "ANSWER" in `dim`, 12px, uppercase
- Content flows naturally from the Craft document:
  - Regular text in `sub`
  - Code blocks: `surface` background, 4px radius, 12px padding, monospace
  - Code syntax highlighting uses `mauve` (keywords), `title` (function names), `teal` (fields/properties), `peach` (literals), `dim` (line numbers)
  - Lists, bold, etc. rendered as appropriate

### Rating Buttons
Above the hotkey bar, a row of 4 equal-width boxes:

| Key   | Label   | Color   | Interval preview |
|-------|---------|---------|------------------|
| `[1]` | again   | `err`   | e.g. "1m"        |
| `[2]` | hard    | `warn`  | e.g. "6m"        |
| `[3]` | good    | `accent`| e.g. "1d"        |
| `[4]` | easy    | `title` | e.g. "4d"        |

Each box:
- 1px border in its grade color, 4px radius
- Label: grade color, bold
- Interval: `dim`, 11px, below label
- 8px padding, centered text
- 8px gap between boxes

### Hotkey Bar
```
[s] skip · [q] quit session
```

### Behavior
- Pressing 1–4 grades the card, advances to next
- `[s]` skips without grading
- `[q]` ends session early → Session Complete with partial results

## Screen 8: Session Complete

### Header
- `Review: {deck name}` in `accent`, bold
- Divider below

### "Session complete" heading
In `accent`, bold, 14px.

### Metric Cards
Row of 3 boxes, equal width, 12px gap:

Each box: `surface` background, 6px radius, 12px padding, centered:
- Number: `text` color, 20px, bold (recall % uses `accent`)
- Label: `dim`, 12px

| Metric   | Value example |
|----------|---------------|
| reviewed | 3             |
| skipped  | 0             |
| recall   | 87%           |

Recall = percentage of cards graded good or easy.

### Grade Breakdown
Bordered box (1px `overlay`, 6px radius, 12px padding):

```
again     0    (err color)
hard      1    (warn color)
good      2    (accent color)
easy      0    (title color)
```

Each row: label left in `dim`, count right in grade color, 12px font, 4px margin.

### Next Review Info
Below the breakdown: "Next review: tomorrow, 1 card due" — "Next review:" in `dim`, date info in `sub`.

### Hotkey Bar
```
[enter] return to dashboard
```

## Navigation Flow

```
Launch
  ├─ No config → Setup → (success) → Dashboard
  │                     → (error)  → Setup Error → retry
  └─ Has config → Dashboard
                    ├─ [a] → Add Deck picker → (select) → Dashboard
                    │                        → (esc)    → Dashboard
                    ├─ [r] → Review Front → [space] → Review Back → [1-4] → next card or Session Complete
                    │                     → [s]     → next card or Session Complete
                    │                     → [q]     → Session Complete
                    ├─ [d] → confirm delete → Dashboard
                    └─ [q] → exit
```

## Conventions

- All text is **sentence case** (never Title Case or ALL CAPS), except acronyms (DSA, SRS, API).
- Hotkey hints always use the format `[key] action` — key in `text` color, action in `dim`.
- Time intervals: use short format — "1m" (1 minute), "10m", "1d" (1 day), "4d", "2w", "1mo", "3mo".
- Numbers in stats are never decimals except recall percentage (one decimal if needed).
- Empty states always include a hint pointing to the relevant action.
- Errors are inline, never modal/popup — shown within the current screen context.
- Code blocks preserve the original language's syntax highlighting.
