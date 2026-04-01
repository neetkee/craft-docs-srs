import { describe, it, expect } from "bun:test"
import { parseCards, loadDecks } from "./cards"
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

function makeItem(blocks: ContentBlock[], id = "item-1", srs?: string): CollectionItem {
  return { id, title: "Test Item", properties: srs ? { srs } : {}, content: blocks }
}

function makeMockClient(overrides: Partial<CraftClient> = {}): CraftClient {
  return {
    listCollections: () => Promise.resolve({ ok: true as const, data: [] }),
    fetchCollectionItems: () => Promise.resolve({ ok: true as const, data: [] }),
    fetchCollectionSchema: () => Promise.resolve({ ok: true as const, data: { key: "k", name: "N", contentPropDetails: { key: "title", name: "Title" }, properties: [] } }),
    updateCollectionSchema: () => Promise.resolve({ ok: true as const, data: undefined }),
    updateCollectionItem: () => Promise.resolve({ ok: true as const, data: undefined }),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Parsing edge cases
// ---------------------------------------------------------------------------

describe("parseCards edge cases", () => {
  it("item with no blocks → card with empty front and back", () => {
    const cards = parseCards("col-1", [makeItem([])])
    expect(cards).toHaveLength(1)
    expect(cards[0].frontBlocks).toHaveLength(0)
    expect(cards[0].backBlocks).toHaveLength(0)
  })

  it("item with only body blocks (no separator) → all blocks are front", () => {
    const blocks = [
      makeBlock({ id: "b1", textStyle: "body", markdown: "Just text" }),
      makeBlock({ id: "b2", textStyle: "body", markdown: "More text" }),
    ]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards).toHaveLength(1)
    expect(cards[0].frontBlocks).toHaveLength(2)
    expect(cards[0].backBlocks).toHaveLength(0)
  })

  it("separator at start → empty front, all blocks as back", () => {
    const blocks = [
      makeBlock({ id: "hr", type: "line", markdown: "*****" }),
      makeBlock({ id: "b1", textStyle: "body", markdown: "Back content" }),
    ]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards[0].frontBlocks).toHaveLength(0)
    expect(cards[0].backBlocks).toHaveLength(1)
  })

  it("only first separator splits front and back, subsequent separators are part of back", () => {
    const blocks = [
      makeBlock({ id: "f1", textStyle: "body", markdown: "Front" }),
      makeBlock({ id: "hr1", type: "line", markdown: "*****" }),
      makeBlock({ id: "b1", textStyle: "body", markdown: "Back part 1" }),
      makeBlock({ id: "hr2", type: "line", markdown: "*****" }),
      makeBlock({ id: "b2", textStyle: "body", markdown: "Back part 2" }),
    ]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards[0].frontBlocks).toHaveLength(1)
    expect(cards[0].backBlocks).toHaveLength(3)
  })

  it("multiple items produce cards from all items", () => {
    const item1 = makeItem([makeBlock({ id: "b1", textStyle: "body", markdown: "Front 1" })], "item-1")
    const item2 = makeItem([makeBlock({ id: "b2", textStyle: "body", markdown: "Front 2" })], "item-2")
    const cards = parseCards("col-1", [item1, item2])
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
    const item1: CollectionItem = makeItem(
      [makeBlock({ id: "f1", textStyle: "body", markdown: "Front" })],
      "i1",
      `REVIEW|0|5.5|4.2|${now - 100}|${now - 1000}|10|2|8`,
    )
    const item2: CollectionItem = makeItem(
      [makeBlock({ id: "f2", textStyle: "body", markdown: "Front 2" })],
      "i2",
    )
    const item3: CollectionItem = makeItem(
      [makeBlock({ id: "f3", textStyle: "body", markdown: "Front 3" })],
      "i3",
    )

    const client = makeMockClient({
      listCollections: () => Promise.resolve({ ok: true as const, data: collections }),
      fetchCollectionItems: (id) => {
        if (id === "c1") return Promise.resolve({ ok: true as const, data: [item1, item2] })
        if (id === "c2") return Promise.resolve({ ok: true as const, data: [item3] })
        return Promise.resolve({ ok: true as const, data: [] })
      },
    })

    const result = await loadDecks(client, ["c1", "c2"])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toHaveLength(2)
    // Deck 1: item1 (due, has metadata with past due date) + item2 (new, no metadata)
    expect(result.data[0]).toEqual({ id: "c1", name: "Deck 1", newCount: 1, dueCount: 1, totalCount: 2 })
    // Deck 2: item3 (new)
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
