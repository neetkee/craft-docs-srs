# Business Logic Reference

This document captures all domain and business logic for the craft-docs-srs application — a spaced repetition system that uses Craft Docs collections as card decks.

---

## Core Concept

The app turns Craft Docs **collections** into flashcard **decks**. Each collection item's content blocks are parsed into individual cards. Spaced repetition metadata is stored inline as caption blocks within the Craft document itself — no external database.

---

## Data Models

### Config

Stored at `~/.config/craft-docs-srs/config.json`.

```json
{
  "craftApiUrl": "https://...",
  "craftApiKey": "Bearer token",
  "collectionIds": ["id1", "id2"]
}
```

- Config is **valid/complete** when both `craftApiUrl` and `craftApiKey` are non-null and non-blank.
- `collectionIds` is the list of Craft collection IDs the user has added as decks.
- Adding/removing a deck creates a new config with the updated list and persists it immediately.

---

## Card Storage Model (Craft Docs)

Cards live inside Craft collection items. One item can contain **multiple cards**.

### Structure

```
[Heading block]          ← Question (h1–h4)
[Caption block]          ← Optional SRS metadata
[Text/code blocks...]    ← Answer (until next heading)
[Heading block]          ← Next card's question
...
```

- **Question**: Any heading block (h1–h4) starts a new card. The heading text (minus `#` prefixes) is the question.
- **Metadata**: An optional caption block immediately after the heading.
- **Answer**: All blocks between this heading and the next heading.

### SRS Metadata Format

Stored as caption block markdown. Craft API wraps caption markdown in `<caption>...</caption>` tags.

```
srs: STATE|step|stability|difficulty|due|lastReview
```

Example: `srs: LEARNING|1|3.2602|4.8846|1748329742|1748329142`

| Field      | Type   | Description                           |
|------------|--------|---------------------------------------|
| STATE      | enum   | FSRS state: NEW, LEARNING, REVIEW, RELEARNING |
| step       | int    | Current learning step                 |
| stability  | double | Memory stability (formatted to 4 decimal places, trailing zeros stripped) |
| difficulty | double | Card difficulty (formatted same way)  |
| due        | long   | Next review due date (epoch seconds)  |
| lastReview | long   | Last review timestamp (epoch seconds) |

Parsing rules:
- Strip `<caption>...</caption>` tags if present
- Must start with `srs: ` prefix
- Pipe-separated, exactly 6 fields
- Returns null on any parse failure (malformed = treated as no metadata)

---

## Craft API Integration

Base URL and API key come from config. All requests use Bearer token auth. You can refer to the Craft API Reference.md file if needed.

### Endpoints Used

| Method | Path                           | Purpose                        |
|--------|--------------------------------|--------------------------------|
| GET    | `/connection`                  | Validate API credentials       |
| GET    | `/collections`                 | List all collections           |
| GET    | `/collections/{id}/items`      | Get items with content blocks  |
| POST   | `/blocks`                      | Insert new blocks              |
| PUT    | `/blocks`                      | Update existing blocks         |

### API Response Shapes

**GET /connection** 
```
{ space: { id, name, timezone, time, friendlyDate }, utc: { time }, urlTemplates: { app } }
```

**GET /collections**
```
{ items: [{ id, name, itemCount, documentId }] }
```

**GET /collections/{id}/items**
```
{ items: [{ id, title, properties: {}, content: [{ id, type, textStyle, markdown }] }] }
```

**POST /blocks** 
```
{ blocks: [{ type, markdown, textStyle, color }], position: { position, siblingId } }
```

**PUT /blocks** 
```
{ blocks: [{ id, markdown, color }] }
```

---

## Business Logic Flows

### 1. Onboarding (First Run)

**Trigger**: Config is not complete (missing URL or key).

1. User provides API URL and API key.
2. Validate by calling `GET /connection`. If it return error, credentials are invalid — prompt again.
3. Save config with credentials and empty `collectionIds` list.
4. Proceed to main menu.

### 2. Load Decks

**Purpose**: Show configured decks with card counts.

1. Read `collectionIds` from config. If empty, return empty list.
2. Fetch all collections from `GET /collections`.
3. Filter to only those whose ID is in `collectionIds`.
4. For each matching collection:
   a. Fetch items via `GET /collections/{id}/items`.
   b. Parse all cards from all items.
   c. Count cards:
      - **New**: `metadata == null`
      - **Due**: `metadata != null && metadata.due <= now`
      - **Total**: all cards

### 3. Add Deck

**Purpose**: Add a Craft collection as a new deck.

1. Fetch all collections from `GET /collections`.
2. Exclude collections already in `config.collectionIds`.
3. User selects from the filtered list.
4. Append selected collection ID to config's `collectionIds`.
5. Save updated config to disk.

### 4. Remove Deck

1. Remove collection ID from config's `collectionIds`.
2. Save updated config to disk.
3. This does NOT delete any data in Craft — just stops tracking the collection.

### 5. Load Due Cards for Review

**Purpose**: Get all cards that need review right now.

1. Fetch items via `GET /collections/{collectionId}/items`.
2. Parse all cards from all items.
3. For each card:
   - If **no metadata**: card is new. Create a fresh FSRS Card (default state). Card is **due immediately**.
   - If **has metadata**: reconstruct FSRS Card from stored state. Card is due if `due <= now`.
4. Return only due cards as `ReviewCard` list.

### 6. Rate a Card (Core SRS)

**Purpose**: Record the user's rating and schedule the next review.

**Ratings** (mapped from user input 1-4):
| Key | Rating | Meaning                    |
|-----|--------|----------------------------|
| 1   | EASY   | Knew it instantly          |
| 2   | GOOD   | Knew it with some thought  |
| 3   | HARD   | Barely remembered          |
| 4   | AGAIN  | Didn't remember            |

**Process**:

1. Get the updated Card with new state, stability, difficulty, due date, etc.
2. Create `SrsMetadata` from the updated Card.
3. Serialize metadata to string format.
4. Persist to Craft:
   - **Existing card** (has `metadataBlockId`): `PUT /blocks` — update the caption block. Wrap markdown in `<caption>...</caption>` tags to preserve caption text style.
   - **New card** (no `metadataBlockId`): `POST /blocks` — insert a new caption block positioned **after** the heading block. Block properties: `type: "text"`, `textStyle: "caption"`, `color: "#999999"`.

### 7. Review Session Flow

1. Load due cards for the selected deck.
2. If no due cards, show "no cards to review" and return.
3. For each card in order:
   a. Show the question.
   b. Wait for user to reveal the answer.
   c. Show answer content blocks.
   d. User rates 1-4.
   e. Rate the card (persists immediately to Craft).
4. After all cards: show session summary (total reviewed).

---

## Key Design Decisions

1. **No external database**: All SRS state lives in the Craft document as inline caption blocks. The only local persistence is the config file.
2. **Immediate persistence**: Each card rating is saved to Craft immediately, not batched. If the app crashes mid-session, already-rated cards retain their state.
3. **Multi-card items**: A single Craft collection item can contain multiple cards (one per heading).
4. **Metadata color**: SRS metadata caption blocks use gray color `#999999` to visually distinguish them from content.
5. **Caption tag wrapping**: When updating existing metadata, markdown must be wrapped in `<caption>...</caption>` tags to preserve the caption text style in Craft. New inserts use `textStyle: "caption"` instead.
