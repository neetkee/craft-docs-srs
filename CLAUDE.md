# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run**: `bun run src/index.tsx`
- **Dev (watch)**: `bun --watch run src/index.tsx`
- **Type-check**: `npx tsc --noEmit`

No build step — Bun runs TypeScript directly.

## Architecture

TUI spaced-repetition app that turns Craft Docs collections into flashcard decks. No external database — all SRS state is stored inline in Craft documents as caption blocks.

### Screen routing

`App.tsx` is a state machine routing between 4 screens: setup → dashboard → addDeck/review. Screen transitions use `useState` with a `refreshKey` counter to force remounts when data changes.

### Module dependency flow

```
config.ts (apiUrl, apiKey, collectionIds from ~/.config/craft-docs-srs/config.json)
    ↓
craft-api.ts (CraftClient object created via createCraftClient(apiUrl, apiKey))
    ↓
cards.ts (parse collection items → Card/ReviewCard by detecting heading blocks)
    ↓
srs.ts (ts-fsrs wrapper: rate cards, serialize/deserialize metadata)
    ↓
CraftClient (persist metadata back as caption blocks via insertBlock/updateBlock)
```

App.tsx creates a `CraftClient` from config and passes it to screens as a prop. Screens never read config for API credentials directly.

### Card model

Each heading block (h1–h4) in a collection item starts a new card. An optional caption block immediately after the heading holds SRS metadata (`srs: STATE|step|stability|difficulty|due|lastReview|reps|lapses|scheduledDays`). All blocks until the next heading are the answer.

## Conventions

- **Result types**: All API/async operations return `Result<T>` (defined in `craft-api.ts` as `{ ok: true; data: T } | { ok: false; error: string }`). Always check `.ok` before accessing data.
- **Colors**: Import from `theme.ts` (Catppuccin Mocha palette). Never hardcode hex values in screens/components.
- **Screen pattern**: Each screen follows the same structure — `useEffect` for data loading, `useKeyboard` for input, layout with `Header` + content + `HotkeyBar` in a centered 80-col `<box>`.
- **Markdown rendering**: Use OpenTUI's `<markdown>` component with `syntaxStyle` and `treeSitterClient` from `@opentui/core` for formatted text and syntax-highlighted code.
- **Metadata persistence**: Existing cards use `PUT /blocks` with `<caption>...</caption>` wrapping. New cards use `POST /blocks` with `textStyle: "caption"`, `color: colors.caption`.