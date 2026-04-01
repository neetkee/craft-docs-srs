import { describe, it, expect } from "bun:test"
import { Rating } from "ts-fsrs"
import { parseSrsMetadata, parseCards, countCards, filterDueCards } from "./cards"
import type { SrsMetadata, Card } from "./cards"
import type { CollectionItem, ContentBlock } from "./craft-api"
import { serializeMetadata, toFsrsCard, rateCard } from "./srs"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetadata(overrides: Partial<SrsMetadata> = {}): SrsMetadata {
  return {
    state: "REVIEW",
    step: 0,
    stability: 5.5,
    difficulty: 4.2,
    due: 1711822800,
    lastReview: 1711136400,
    reps: 10,
    lapses: 2,
    scheduledDays: 8,
    ...overrides,
  }
}

/** Round float fields to 4 decimal places to match serialization precision */
function roundMetadata(meta: SrsMetadata): SrsMetadata {
  return {
    ...meta,
    stability: parseFloat(meta.stability.toFixed(4)),
    difficulty: parseFloat(meta.difficulty.toFixed(4)),
  }
}

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

// ---------------------------------------------------------------------------
// 1. parseSrsMetadata
// ---------------------------------------------------------------------------

describe("parseSrsMetadata", () => {
  it("parses a valid metadata string with all 9 fields", () => {
    const input = "REVIEW|0|5.5|4.2|1711822800|1711136400|10|2|8"
    const result = parseSrsMetadata(input)
    expect(result).toEqual({
      state: "REVIEW",
      step: 0,
      stability: 5.5,
      difficulty: 4.2,
      due: 1711822800,
      lastReview: 1711136400,
      reps: 10,
      lapses: 2,
      scheduledDays: 8,
    })
  })

  it("returns null for invalid state", () => {
    expect(parseSrsMetadata("INVALID|0|5.5|4.2|100|100|1|0|1")).toBeNull()
  })

  it("returns null for too few fields", () => {
    expect(parseSrsMetadata("REVIEW|0|5.5|4.2|100|100|1|0")).toBeNull()
  })

  it("returns null for too many fields", () => {
    expect(parseSrsMetadata("REVIEW|0|5.5|4.2|100|100|1|0|1|extra")).toBeNull()
  })

  it("returns null for non-numeric fields", () => {
    expect(parseSrsMetadata("REVIEW|abc|5.5|4.2|100|100|1|0|1")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseSrsMetadata("")).toBeNull()
  })

  it("parses all four valid states", () => {
    for (const state of ["NEW", "LEARNING", "REVIEW", "RELEARNING"] as const) {
      const result = parseSrsMetadata(`${state}|0|1.0|1.0|100|100|0|0|0`)
      expect(result).not.toBeNull()
      expect(result!.state).toBe(state)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. serializeMetadata
// ---------------------------------------------------------------------------

describe("serializeMetadata", () => {
  it("produces correct pipe-delimited string", () => {
    const meta = makeMetadata()
    const result = serializeMetadata(meta)
    expect(result).toBe("REVIEW|0|5.5|4.2|1711822800|1711136400|10|2|8")
  })

  it("strips trailing zeros from floats", () => {
    const meta = makeMetadata({ stability: 5.0, difficulty: 3.0 })
    const result = serializeMetadata(meta)
    expect(result).toContain("|5|3|")
  })
})

// ---------------------------------------------------------------------------
// 3. Round-trip: serialize → parse
// ---------------------------------------------------------------------------

describe("round-trip serialize/parse", () => {
  it("produces identical metadata after serialize then parse", () => {
    const original = makeMetadata()
    const serialized = serializeMetadata(original)
    const parsed = parseSrsMetadata(serialized)
    expect(parsed).toEqual(original)
  })

  it("round-trips all states", () => {
    for (const state of ["NEW", "LEARNING", "REVIEW", "RELEARNING"] as const) {
      const original = makeMetadata({ state })
      const parsed = parseSrsMetadata(serializeMetadata(original))
      expect(parsed).toEqual(original)
    }
  })
})

// ---------------------------------------------------------------------------
// 4. toFsrsCard
// ---------------------------------------------------------------------------

describe("toFsrsCard", () => {
  it("returns empty card for null metadata", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const card = toFsrsCard(null, now)
    expect(card.state).toBe(0) // State.New
    expect(new Date(card.due).getTime()).toBe(now.getTime())
  })

  it("maps all fields correctly for existing metadata", () => {
    const now = new Date("2025-04-01T00:00:00Z")
    const meta = makeMetadata({
      state: "REVIEW",
      stability: 5.5,
      difficulty: 4.2,
      due: Math.floor(new Date("2025-03-30T00:00:00Z").getTime() / 1000),
      lastReview: Math.floor(new Date("2025-03-20T00:00:00Z").getTime() / 1000),
      reps: 10,
      lapses: 2,
      scheduledDays: 8,
      step: 0,
    })
    const card = toFsrsCard(meta, now)
    expect(card.state).toBe(2) // State.Review
    expect(card.stability).toBe(5.5)
    expect(card.difficulty).toBe(4.2)
    expect(card.reps).toBe(10)
    expect(card.lapses).toBe(2)
    expect(card.scheduled_days).toBe(8)
    expect(card.learning_steps).toBe(0)
    // elapsed_days = floor((now - lastReview) / 86400) = 12
    expect(card.elapsed_days).toBe(12)
    // due and last_review are Date objects from epoch seconds
    expect(card.due).toEqual(new Date("2025-03-30T00:00:00Z"))
    expect(card.last_review).toEqual(new Date("2025-03-20T00:00:00Z"))
  })
})

// ---------------------------------------------------------------------------
// 5. rateCard
// ---------------------------------------------------------------------------

describe("rateCard", () => {
  const now = new Date("2025-01-01T12:00:00Z")

  it("new card rated Good → LEARNING, reps=1, lapses=0", () => {
    const result = rateCard(null, Rating.Good, now)
    expect(result.state).toBe("LEARNING")
    expect(result.reps).toBe(1)
    expect(result.lapses).toBe(0)
  })

  it("new card rated Again → LEARNING, lapses=0 (first review is not a lapse)", () => {
    const result = rateCard(null, Rating.Again, now)
    expect(result.state).toBe("LEARNING")
    expect(result.lapses).toBe(0)
  })

  it("new card rated Easy → REVIEW (skips learning)", () => {
    const result = rateCard(null, Rating.Easy, now)
    expect(result.state).toBe("REVIEW")
    expect(result.reps).toBe(1)
  })

  it("REVIEW card rated Again → RELEARNING, lapses increment", () => {
    const meta = makeMetadata({ state: "REVIEW", lapses: 2 })
    const reviewNow = new Date(meta.due * 1000)
    const result = rateCard(meta, Rating.Again, reviewNow)
    expect(result.state).toBe("RELEARNING")
    expect(result.lapses).toBe(3)
  })

  it("REVIEW card rated Good → stays REVIEW, stability increases", () => {
    const meta = makeMetadata({ state: "REVIEW", stability: 5.5 })
    const reviewNow = new Date(meta.due * 1000)
    const result = rateCard(meta, Rating.Good, reviewNow)
    expect(result.state).toBe("REVIEW")
    expect(result.stability).toBeGreaterThan(meta.stability)
    expect(result.due).toBeGreaterThan(Math.floor(reviewNow.getTime() / 1000))
  })

  it("returns all 9 fields as proper types", () => {
    const result = rateCard(null, Rating.Good, now)
    expect(typeof result.state).toBe("string")
    expect(["NEW", "LEARNING", "REVIEW", "RELEARNING"]).toContain(result.state)
    expect(typeof result.step).toBe("number")
    expect(typeof result.stability).toBe("number")
    expect(typeof result.difficulty).toBe("number")
    expect(typeof result.due).toBe("number")
    expect(typeof result.lastReview).toBe("number")
    expect(typeof result.reps).toBe("number")
    expect(typeof result.lapses).toBe("number")
    expect(typeof result.scheduledDays).toBe("number")
    expect(Number.isFinite(result.stability)).toBe(true)
    expect(Number.isFinite(result.difficulty)).toBe(true)
    expect(Number.isFinite(result.due)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. parseCards
// ---------------------------------------------------------------------------

describe("parseCards", () => {
  it("splits content at line separator into front and back", () => {
    const blocks = [
      makeBlock({ id: "f1", textStyle: "body", markdown: "Front text" }),
      makeBlock({ id: "hr", type: "line", markdown: "*****" }),
      makeBlock({ id: "b1", textStyle: "body", markdown: "Back text" }),
    ]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards).toHaveLength(1)
    expect(cards[0].frontBlocks).toHaveLength(1)
    expect(cards[0].frontBlocks[0].markdown).toBe("Front text")
    expect(cards[0].backBlocks).toHaveLength(1)
    expect(cards[0].backBlocks[0].markdown).toBe("Back text")
  })

  it("item without line separator → all blocks are front, back is empty", () => {
    const blocks = [
      makeBlock({ id: "f1", textStyle: "body", markdown: "Only front" }),
      makeBlock({ id: "f2", textStyle: "body", markdown: "More front" }),
    ]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards).toHaveLength(1)
    expect(cards[0].frontBlocks).toHaveLength(2)
    expect(cards[0].backBlocks).toHaveLength(0)
  })

  it("reads SRS metadata from item properties", () => {
    const blocks = [makeBlock({ id: "f1", textStyle: "body", markdown: "Front" })]
    const cards = parseCards("col-1", [makeItem(blocks, "item-1", "REVIEW|0|5.5|4.2|1711822800|1711136400|10|2|8")])
    expect(cards[0].metadata).not.toBeNull()
    expect(cards[0].metadata!.state).toBe("REVIEW")
  })

  it("no srs property → metadata is null", () => {
    const blocks = [makeBlock({ id: "f1", textStyle: "body", markdown: "Front" })]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards[0].metadata).toBeNull()
  })

  it("multiple items → multiple cards", () => {
    const item1 = makeItem([makeBlock({ id: "f1", textStyle: "body", markdown: "Front 1" })], "item-1")
    const item2 = makeItem([makeBlock({ id: "f2", textStyle: "body", markdown: "Front 2" })], "item-2")
    const cards = parseCards("col-1", [item1, item2])
    expect(cards).toHaveLength(2)
    expect(cards[0].itemId).toBe("item-1")
    expect(cards[1].itemId).toBe("item-2")
  })

  it("sets documentName from item title", () => {
    const item: CollectionItem = { id: "i1", title: "My Document", properties: {}, content: [] }
    const cards = parseCards("col-1", [item])
    expect(cards[0].documentName).toBe("My Document")
  })

  it("sets collectionId on cards", () => {
    const cards = parseCards("col-42", [makeItem([])])
    expect(cards[0].collectionId).toBe("col-42")
  })

  it("separator at start → empty front, all blocks as back", () => {
    const blocks = [
      makeBlock({ id: "hr", type: "line", markdown: "*****" }),
      makeBlock({ id: "b1", textStyle: "body", markdown: "Back" }),
    ]
    const cards = parseCards("col-1", [makeItem(blocks)])
    expect(cards[0].frontBlocks).toHaveLength(0)
    expect(cards[0].backBlocks).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 7. countCards
// ---------------------------------------------------------------------------

describe("countCards", () => {
  it("counts new, due, and total correctly", () => {
    const now = Math.floor(Date.now() / 1000)
    const cards: Card[] = [
      { itemId: "1", frontBlocks: [], backBlocks: [], metadata: null, documentName: "D", collectionId: "c" },
      { itemId: "2", frontBlocks: [], backBlocks: [], metadata: makeMetadata({ due: now - 100 }), documentName: "D", collectionId: "c" },
      { itemId: "3", frontBlocks: [], backBlocks: [], metadata: makeMetadata({ due: now + 100000 }), documentName: "D", collectionId: "c" },
    ]
    const counts = countCards(cards)
    expect(counts.newCount).toBe(1)
    expect(counts.dueCount).toBe(1)
    expect(counts.totalCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 8. filterDueCards
// ---------------------------------------------------------------------------

describe("filterDueCards", () => {
  it("includes new cards and due cards, excludes future cards", () => {
    const now = Math.floor(Date.now() / 1000)
    const cards: Card[] = [
      { itemId: "i1", frontBlocks: [], backBlocks: [], metadata: null, documentName: "Doc1", collectionId: "c" },
      { itemId: "i2", frontBlocks: [], backBlocks: [], metadata: makeMetadata({ due: now - 100 }), documentName: "Doc2", collectionId: "c" },
      { itemId: "i3", frontBlocks: [], backBlocks: [], metadata: makeMetadata({ due: now + 100000 }), documentName: "Doc3", collectionId: "c" },
    ]
    const due = filterDueCards(cards)
    expect(due).toHaveLength(2)
    expect(due.map((c) => c.documentName)).toEqual(["Doc1", "Doc2"])
  })
})

// ---------------------------------------------------------------------------
// 9. Time-dependent behavior
// ---------------------------------------------------------------------------

describe("time-dependent behavior", () => {
  it("elapsed_days increases when time passes between reviews", () => {
    const t0 = new Date("2025-01-01T12:00:00Z")
    const meta1 = rateCard(null, Rating.Good, t0)

    // Advance 1 day
    const t1 = new Date(t0.getTime() + 86400 * 1000)
    const fsrsCard = toFsrsCard(meta1, t1)
    expect(fsrsCard.elapsed_days).toBe(1)

    // Advance 10 days
    const t10 = new Date(t0.getTime() + 10 * 86400 * 1000)
    const fsrsCard10 = toFsrsCard(meta1, t10)
    expect(fsrsCard10.elapsed_days).toBe(10)
  })

  it("on-time REVIEW rating increases stability", () => {
    // Get a card into REVIEW state by rating Easy
    const t0 = new Date("2025-01-01T12:00:00Z")
    const meta = rateCard(null, Rating.Easy, t0)
    expect(meta.state).toBe("REVIEW")
    const stabilityBefore = meta.stability

    // Review on schedule
    const reviewTime = new Date(meta.due * 1000)
    const afterReview = rateCard(meta, Rating.Good, reviewTime)
    expect(afterReview.state).toBe("REVIEW")
    expect(afterReview.stability).toBeGreaterThan(stabilityBefore)
  })

  it("countCards respects due timestamp relative to now", () => {
    const makeCard = (due: number): Card => ({
      itemId: "1", frontBlocks: [], backBlocks: [], metadata: makeMetadata({ due }), documentName: "D", collectionId: "c",
    })
    expect(countCards([makeCard(1000)]).dueCount).toBe(1)
    expect(countCards([makeCard(4102444800)]).dueCount).toBe(0) // 2100-01-01
  })

  it("filterDueCards respects due timestamp", () => {
    const makeCard = (due: number): Card => ({
      itemId: "i1", frontBlocks: [], backBlocks: [], metadata: makeMetadata({ due }), documentName: "Doc", collectionId: "c",
    })
    expect(filterDueCards([makeCard(1000)])).toHaveLength(1) // far past → due
    expect(filterDueCards([makeCard(4102444800)])).toHaveLength(0) // far future → not due
  })
})

// ---------------------------------------------------------------------------
// 10. Full lifecycle
// ---------------------------------------------------------------------------

describe("full lifecycle: rate → serialize → parse → rate again", () => {
  it("survives multiple review cycles with advancing time", () => {
    let now = new Date("2025-01-01T12:00:00Z")

    // First review: new card rated Good
    let meta = rateCard(null, Rating.Good, now)
    expect(meta.state).toBe("LEARNING")

    // Serialize and parse — round before comparing since serialize truncates to 4 decimals
    let serialized = serializeMetadata(meta)
    let parsed = parseSrsMetadata(serialized)
    expect(parsed).toEqual(roundMetadata(meta))

    // Second review: advance time, rate Good again
    now = new Date(meta.due * 1000 + 1000) // just after due
    meta = rateCard(parsed!, Rating.Good, now)

    // Should progress further in learning or into review
    serialized = serializeMetadata(meta)
    parsed = parseSrsMetadata(serialized)
    expect(parsed).toEqual(roundMetadata(meta))

    // Keep reviewing until we reach REVIEW state
    for (let i = 0; i < 10; i++) {
      if (meta.state === "REVIEW") break
      now = new Date(meta.due * 1000 + 1000)
      meta = rateCard(meta, Rating.Good, now)
      serialized = serializeMetadata(meta)
      parsed = parseSrsMetadata(serialized)
      expect(parsed).toEqual(roundMetadata(meta))
    }

    expect(meta.state).toBe("REVIEW")
    expect(meta.reps).toBeGreaterThanOrEqual(2)
    expect(meta.scheduledDays).toBeGreaterThan(0)
  })

  it("lapse cycle: REVIEW → RELEARNING → back to REVIEW", () => {
    const t0 = new Date("2025-01-01T12:00:00Z")

    // Get to REVIEW via Easy
    let meta = rateCard(null, Rating.Easy, t0)
    expect(meta.state).toBe("REVIEW")
    const repsBeforeLapse = meta.reps

    // Lapse: rate Again
    let now = new Date(meta.due * 1000)
    meta = rateCard(meta, Rating.Again, now)
    expect(meta.state).toBe("RELEARNING")
    expect(meta.lapses).toBe(1)

    // Round-trip
    let parsed = parseSrsMetadata(serializeMetadata(meta))
    expect(parsed).toEqual(roundMetadata(meta))

    // Recover: rate Good until back in REVIEW
    for (let i = 0; i < 10; i++) {
      if (meta.state === "REVIEW") break
      now = new Date(meta.due * 1000 + 1000)
      meta = rateCard(meta, Rating.Good, now)
      parsed = parseSrsMetadata(serializeMetadata(meta))
      expect(parsed).toEqual(roundMetadata(meta))
    }

    expect(meta.state).toBe("REVIEW")
    expect(meta.lapses).toBe(1)
  })
})
