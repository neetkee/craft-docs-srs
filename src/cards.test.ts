import { describe, it, expect } from "bun:test"
import { parseCards, parseReviewCards, loadDecks } from "./cards"
import type { CraftClient, CollectionItem, ContentBlock, Collection } from "./craft-api"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock(overrides: Partial<ContentBlock> & { id?: string } = {}): ContentBlock {
  return {
    id: overrides.id ?? "block-1",
    type: "text",
    textStyle: "body",
    markdown: "",
    ...overrides,
  }
}

function makeItem(blocks: ContentBlock[], id = "item-1"): CollectionItem {
  return { id, title: "Test Item", properties: {}, content: blocks }
}

function makeMockClient(overrides: Partial<CraftClient> = {}): CraftClient {
  return {
    listCollections: () => Promise.resolve({ ok: true as const, data: [] }),
    fetchCollectionItems: () => Promise.resolve({ ok: true as const, data: [] }),
    insertBlock: () => Promise.resolve({ ok: true as const, data: "new-id" }),
    updateBlock: () => Promise.resolve({ ok: true as const, data: undefined }),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Parsing edge cases
// ---------------------------------------------------------------------------

describe("parseCards edge cases", () => {
  it("item with no blocks → no cards", () => {
    const cards = parseCards([makeItem([])])
    expect(cards).toHaveLength(0)
  })

  it("item with only body blocks (no headings) → no cards", () => {
    const blocks = [
      makeBlock({ id: "b1", textStyle: "body", markdown: "Just text" }),
      makeBlock({ id: "b2", textStyle: "body", markdown: "More text" }),
    ]
    const cards = parseCards([makeItem(blocks)])
    expect(cards).toHaveLength(0)
  })

  it("consecutive headings with no answer blocks between them", () => {
    const blocks = [
      makeBlock({ id: "h1", textStyle: "h1", markdown: "# Q1" }),
      makeBlock({ id: "h2", textStyle: "h2", markdown: "## Q2" }),
      makeBlock({ id: "h3", textStyle: "h3", markdown: "### Q3" }),
    ]
    const cards = parseReviewCards([makeItem(blocks)])
    expect(cards).toHaveLength(3)
    expect(cards[0].answerBlocks).toHaveLength(0)
    expect(cards[1].answerBlocks).toHaveLength(0)
    expect(cards[2].answerBlocks).toHaveLength(0)
  })

  it("multiple items produce cards from all items", () => {
    const item1 = makeItem([makeBlock({ id: "h1", textStyle: "h1", markdown: "# Q1" })], "item-1")
    const item2 = makeItem([makeBlock({ id: "h2", textStyle: "h2", markdown: "## Q2" })], "item-2")
    const cards = parseReviewCards([item1, item2])
    expect(cards).toHaveLength(2)
    expect(cards[0].itemId).toBe("item-1")
    expect(cards[1].itemId).toBe("item-2")
  })
})

// ---------------------------------------------------------------------------
// loadDecks
// ---------------------------------------------------------------------------

describe("loadDecks", () => {
  it("returns empty array for empty collectionIds", async () => {
    const client = makeMockClient()
    const result = await loadDecks(client, [])
    expect(result).toEqual({ ok: true, data: [] })
  })

  it("propagates error when listCollections fails", async () => {
    const client = makeMockClient({
      listCollections: () => Promise.resolve({ ok: false as const, error: "auth failed" }),
    })
    const result = await loadDecks(client, ["c1"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe("auth failed")
  })

  it("propagates error when fetchCollectionItems fails for one collection", async () => {
    const collections: Collection[] = [
      { id: "c1", name: "Deck 1", itemCount: 2, documentId: "d1" },
      { id: "c2", name: "Deck 2", itemCount: 1, documentId: "d2" },
    ]
    const client = makeMockClient({
      listCollections: () => Promise.resolve({ ok: true as const, data: collections }),
      fetchCollectionItems: (id) => {
        if (id === "c2") return Promise.resolve({ ok: false as const, error: "items fetch failed" })
        return Promise.resolve({ ok: true as const, data: [] })
      },
    })
    const result = await loadDecks(client, ["c1", "c2"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe("items fetch failed")
  })

  it("returns correct DeckInfo for multiple collections", async () => {
    const collections: Collection[] = [
      { id: "c1", name: "Deck 1", itemCount: 2, documentId: "d1" },
      { id: "c2", name: "Deck 2", itemCount: 1, documentId: "d2" },
    ]
    const now = Math.floor(Date.now() / 1000)
    const item1: CollectionItem = makeItem([
      makeBlock({ id: "h1", textStyle: "h1", markdown: "# Q1" }),
      makeBlock({ id: "h2", textStyle: "h2", markdown: "## Q2" }),
      makeBlock({ id: "cap", textStyle: "caption", markdown: `srs: REVIEW|0|5.5|4.2|${now - 100}|${now - 1000}|10|2|8` }),
    ], "i1")
    const item2: CollectionItem = makeItem([
      makeBlock({ id: "h3", textStyle: "h1", markdown: "# Q3" }),
    ], "i2")

    const client = makeMockClient({
      listCollections: () => Promise.resolve({ ok: true as const, data: collections }),
      fetchCollectionItems: (id) => {
        if (id === "c1") return Promise.resolve({ ok: true as const, data: [item1] })
        if (id === "c2") return Promise.resolve({ ok: true as const, data: [item2] })
        return Promise.resolve({ ok: true as const, data: [] })
      },
    })

    const result = await loadDecks(client, ["c1", "c2"])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toHaveLength(2)
    // Deck 1: Q1 (new, no metadata) + Q2 (due, has metadata with past due date)
    expect(result.data[0]).toEqual({ id: "c1", name: "Deck 1", newCount: 1, dueCount: 1, totalCount: 2 })
    // Deck 2: Q3 (new)
    expect(result.data[1]).toEqual({ id: "c2", name: "Deck 2", newCount: 1, dueCount: 0, totalCount: 1 })
  })

  it("only fetches items for matching collectionIds", async () => {
    const collections: Collection[] = [
      { id: "c1", name: "Deck 1", itemCount: 1, documentId: "d1" },
      { id: "c2", name: "Deck 2", itemCount: 1, documentId: "d2" },
      { id: "c3", name: "Deck 3", itemCount: 1, documentId: "d3" },
    ]
    const fetchedIds: string[] = []
    const client = makeMockClient({
      listCollections: () => Promise.resolve({ ok: true as const, data: collections }),
      fetchCollectionItems: (id) => {
        fetchedIds.push(id)
        return Promise.resolve({ ok: true as const, data: [] })
      },
    })

    await loadDecks(client, ["c1", "c3"])

    expect(fetchedIds.sort()).toEqual(["c1", "c3"])
  })

  it("returns empty data when no collections match", async () => {
    const collections: Collection[] = [
      { id: "c1", name: "Deck 1", itemCount: 1, documentId: "d1" },
    ]
    const client = makeMockClient({
      listCollections: () => Promise.resolve({ ok: true as const, data: collections }),
    })

    const result = await loadDecks(client, ["non-existent"])
    expect(result).toEqual({ ok: true, data: [] })
  })
})
