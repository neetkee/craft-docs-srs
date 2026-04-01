# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run**: `bun run src/index.tsx`
- **Dev (watch)**: `bun --watch run src/index.tsx`
- **Type-check**: `npx tsc --noEmit`

No build step — Bun runs TypeScript directly.

## Architecture

TUI spaced-repetition app that turns Craft Docs collections into flashcard decks. No external database — all SRS state is stored in a collection text property.

### Screen routing

`App.tsx` is a state machine routing between 4 screens: setup → dashboard → addDeck/review. Screen transitions use `useState` with a `refreshKey` counter to force remounts when data changes.

### Module dependency flow

```
config.ts (apiUrl, apiKey, collectionIds from ~/.config/craft-docs-srs/config.json)
    ↓
craft-api.ts (CraftClient object created via createCraftClient(apiUrl, apiKey))
    ↓
cards.ts (parse collection items → Card by splitting at line separator)
    ↓
srs.ts (ts-fsrs wrapper: rate cards, serialize/deserialize metadata)
    ↓
CraftClient (persist metadata via updateCollectionItem)
```

App.tsx creates a `CraftClient` from config and passes it to screens as a prop. Screens never read config for API credentials directly.

### Card model

Each collection item is one card. A line separator block (`type: "line"`) splits the content into front and back — blocks before the separator are the front, blocks after are the back. The back can be empty. The item title is shown as the document name during review. SRS metadata is stored in the collection's `SRS` text property (`STATE|step|stability|difficulty|due|lastReview|reps|lapses|scheduledDays`). When a collection is added as a deck, the app ensures the SRS property exists in the schema.

## Conventions

- **Result types**: All API/async operations return `Result<T>` (defined in `craft-api.ts` as `{ ok: true; data: T } | { ok: false; error: string }`). Always check `.ok` before accessing data.
- **Colors**: Import from `theme.ts` (Catppuccin Mocha palette). Never hardcode hex values in screens/components.
- **Screen pattern**: Each screen follows the same structure — `useEffect` for data loading, `useKeyboard` for input, layout with `Header` + content + `HotkeyBar` in a centered 80-col `<box>`.
- **Markdown rendering**: Use OpenTUI's `<markdown>` component with `syntaxStyle` and `treeSitterClient` from `@opentui/core` for formatted text and syntax-highlighted code.
- **Metadata persistence**: SRS metadata is saved via `PUT /collections/{id}/items` into the `srs` property. When adding a deck, the schema is checked/updated to include an SRS text property.