import type { CraftClient, CollectionItem, ContentBlock, Result } from "./craft-api"

export type SrsState = "NEW" | "LEARNING" | "REVIEW" | "RELEARNING"

export interface SrsMetadata {
  state: SrsState
  step: number
  stability: number
  difficulty: number
  due: number
  lastReview: number
  reps: number
  lapses: number
  scheduledDays: number
}

export interface Card {
  headingBlockId: string
  metadataBlockId: string | null
  question: string
  metadata: SrsMetadata | null
}

export interface ReviewCard extends Card {
  answerBlocks: ContentBlock[]
  itemId: string
  documentName: string
}

export interface DeckInfo {
  id: string
  name: string
  newCount: number
  dueCount: number
  totalCount: number
}

const VALID_STATES = new Set<string>(["NEW", "LEARNING", "REVIEW", "RELEARNING"])

export function parseSrsMetadata(markdown: string): SrsMetadata | null {
  let text = markdown.trim()
  if (text.startsWith("<caption>") && text.endsWith("</caption>")) {
    text = text.slice("<caption>".length, -"</caption>".length).trim()
  }
  if (!text.startsWith("srs: ")) return null
  const fields = text.slice("srs: ".length).split("|")
  if (fields.length !== 9) return null
  const state = fields[0]
  if (!VALID_STATES.has(state)) return null
  const step = parseInt(fields[1], 10)
  const stability = parseFloat(fields[2])
  const difficulty = parseFloat(fields[3])
  const due = parseInt(fields[4], 10)
  const lastReview = parseInt(fields[5], 10)
  const reps = parseInt(fields[6], 10)
  const lapses = parseInt(fields[7], 10)
  const scheduledDays = parseInt(fields[8], 10)
  if ([step, stability, difficulty, due, lastReview, reps, lapses, scheduledDays].some((v) => isNaN(v))) return null

  return { state: state as SrsState, step, stability, difficulty, due, lastReview, reps, lapses, scheduledDays }
}

const HEADING_STYLES = new Set(["h1", "h2", "h3", "h4"])

function parseItemCards(items: CollectionItem[]): ReviewCard[] {
  const cards: ReviewCard[] = []
  for (const item of items) {
    const blocks = item.content
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!HEADING_STYLES.has(block.textStyle)) continue
      const question = block.markdown.replace(/^#+\s*/, "")
      let metadata: SrsMetadata | null = null
      let metadataBlockId: string | null = null
      let answerStart = i + 1
      const next = blocks[i + 1]
      if (next && next.textStyle === "caption") {
        metadata = parseSrsMetadata(next.markdown)
        if (metadata) {
          metadataBlockId = next.id
          answerStart = i + 2
        }
      }
      const answerBlocks: ContentBlock[] = []
      for (let j = answerStart; j < blocks.length; j++) {
        if (HEADING_STYLES.has(blocks[j].textStyle)) break
        answerBlocks.push(blocks[j])
      }
      cards.push({ headingBlockId: block.id, metadataBlockId, question, metadata, answerBlocks, itemId: item.id, documentName: item.title })
    }
  }
  return cards
}

export function parseCards(items: CollectionItem[]): Card[] {
  return parseItemCards(items)
}

export function parseReviewCards(items: CollectionItem[]): ReviewCard[] {
  return parseItemCards(items)
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

export function filterDueCards(cards: ReviewCard[]): ReviewCard[] {
  const now = Math.floor(Date.now() / 1000)
  return cards.filter((c) => c.metadata === null || c.metadata.due <= now)
}

export async function loadDecks(client: CraftClient, collectionIds: string[]): Promise<Result<DeckInfo[]>> {
  if (collectionIds.length === 0) return { ok: true, data: [] }

  const collectionsResult = await client.listCollections()
  if (!collectionsResult.ok) return collectionsResult

  const matching = collectionsResult.data.filter((c) => collectionIds.includes(c.id))

  const results = await Promise.all(
    matching.map(async (collection) => {
      const itemsResult = await client.fetchCollectionItems(collection.id)
      if (!itemsResult.ok) return { ok: false as const, error: itemsResult.error }
      const cards = parseCards(itemsResult.data)
      const counts = countCards(cards)
      return { ok: true as const, data: { id: collection.id, name: collection.name, ...counts } }
    }),
  )

  for (const r of results) {
    if (!r.ok) return r
  }

  return { ok: true, data: results.filter((r): r is { ok: true; data: DeckInfo } => r.ok).map((r) => r.data) }
}
