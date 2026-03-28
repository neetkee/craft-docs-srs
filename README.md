# craft-docs-srs

A terminal flashcard app that uses [Craft Docs](https://www.craft.do/) collections as card decks. Spaced repetition scheduling is powered by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) — all review state is stored directly in your Craft documents, no external database needed.

## How it works

Each Craft collection becomes a deck. Inside a collection item, every heading (h1–h4) defines a flashcard — the heading is the question, and everything below it until the next heading is the answer. Review metadata is saved as caption blocks in the document itself.

## Requirements

- [Bun](https://bun.sh/) runtime
- A Craft Docs API URL and key ([API](https://connect.craft.do/api-docs))

## Setup

```sh
bun install
bun start
```

On first launch you'll be prompted to enter your Craft API URL and key. After that, add collections as decks from the dashboard.