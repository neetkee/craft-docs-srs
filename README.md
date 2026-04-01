# craft-docs-srs

A terminal flashcard app that uses [Craft Docs](https://www.craft.do/) collections as card decks. Spaced repetition scheduling is powered by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) — all review state is stored directly in your Craft documents, no external database needed.

## How it works

Each Craft collection becomes a deck. Each item in the collection is one flashcard. A line separator (horizontal rule) splits the item content into front and back — everything before the separator is the front of the card, everything after is the back. The back can be empty. The item title is shown during review. When you add a collection as a deck, the app automatically adds an SRS text property to the collection schema if it doesn't exist. Review metadata is stored in that property.

## Requirements

- [Bun](https://bun.sh/) runtime
- A Craft Docs API URL and key ([API](https://connect.craft.do/api-docs))

## Setup

```sh
bun install
bun start
```

On first launch you'll be prompted to enter your Craft API URL and key. After that, add collections as decks from the dashboard.