import { listCollections, fetchCollectionItems, type CollectionItem } from "./craft-api"

export interface SrsMetadata {
  state: string
  step: number
  stability: number
  difficulty: number
  due: number
  lastReview: number
}

export interface Card {
  headingBlockId: string
  metadataBlockId: string | null
  question: string
  metadata: SrsMetadata | null
}

export interface DeckInfo {
  id: string
  name: string
  newCount: number
  dueCount: number
  totalCount: number
}

export type DecksResult =
  | { ok: true; data: DeckInfo[] }
  | { ok: false; error: string }

export function parseSrsMetadata(markdown: string): SrsMetadata | null {
  let text = markdown.trim()
  if (text.startsWith("<caption>") && text.endsWith("</caption>")) {
    text = text.slice("<caption>".length, -"</caption>".length).trim()
  }
  if (!text.startsWith("srs: ")) return null
  const fields = text.slice("srs: ".length).split("|")
  if (fields.length !== 6) return null
  const state = fields[0]
  const step = parseInt(fields[1], 10)
  const stability = parseFloat(fields[2])
  const difficulty = parseFloat(fields[3])
  const due = parseInt(fields[4], 10)
  const lastReview = parseInt(fields[5], 10)
  if ([step, stability, difficulty, due, lastReview].some((v) => isNaN(v))) return null
  return { state, step, stability, difficulty, due, lastReview }
}

const HEADING_STYLES = new Set(["h1", "h2", "h3", "h4"])

export function parseCards(items: CollectionItem[]): Card[] {
  const cards: Card[] = []
  for (const item of items) {
    const blocks = item.content
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!HEADING_STYLES.has(block.textStyle)) continue
      const question = block.markdown.replace(/^#+\s*/, "")
      let metadata: SrsMetadata | null = null
      let metadataBlockId: string | null = null
      const next = blocks[i + 1]
      if (next && next.textStyle === "caption") {
        metadata = parseSrsMetadata(next.markdown)
        if (metadata) metadataBlockId = next.id
      }
      cards.push({ headingBlockId: block.id, metadataBlockId, question, metadata })
    }
  }
  return cards
}

export function countCards(cards: Card[]): { newCount: number; dueCount: number; totalCount: number } {
  const now = Math.floor(Date.now() / 1000)
  let newCount = 0
  let dueCount = 0
  for (const card of cards) {
    if (card.metadata === null) {
      newCount++
    } else if (card.metadata.due <= now) {
      dueCount++
    }
  }
  return { newCount, dueCount, totalCount: cards.length }
}

export async function loadDecks(apiUrl: string, apiKey: string, collectionIds: string[]): Promise<DecksResult> {
  if (collectionIds.length === 0) return { ok: true, data: [] }

  const collectionsResult = await listCollections(apiUrl, apiKey)
  if (!collectionsResult.ok) return collectionsResult

  const matching = collectionsResult.data.filter((c) => collectionIds.includes(c.id))

  const results = await Promise.all(
    matching.map(async (collection) => {
      const itemsResult = await fetchCollectionItems(apiUrl, apiKey, collection.id)
      if (!itemsResult.ok) return { ok: false as const, error: itemsResult.error }
      const cards = parseCards(itemsResult.data)
      const counts = countCards(cards)
      return { ok: true as const, data: { id: collection.id, name: collection.name, ...counts } }
    }),
  )

  for (const r of results) {
    if (!r.ok) return r
  }

  return { ok: true, data: results.map((r) => (r as { ok: true; data: DeckInfo }).data) }
}
