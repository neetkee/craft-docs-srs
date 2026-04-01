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
  itemId: string
  frontBlocks: ContentBlock[]
  backBlocks: ContentBlock[]
  metadata: SrsMetadata | null
  documentName: string
  collectionId: string
}

export interface DeckInfo {
  id: string
  name: string
  newCount: number
  dueCount: number
  totalCount: number
}

const VALID_STATES = new Set<string>(["NEW", "LEARNING", "REVIEW", "RELEARNING"])

export function parseSrsMetadata(text: string): SrsMetadata | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const fields = trimmed.split("|")
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

function isSeparator(block: ContentBlock): boolean {
  return block.type === "line"
}

export function parseCards(collectionId: string, items: CollectionItem[]): Card[] {
  const cards: Card[] = []
  for (const item of items) {
    const blocks = item.content
    const separatorIndex = blocks.findIndex(isSeparator)
    const frontBlocks = separatorIndex === -1 ? blocks : blocks.slice(0, separatorIndex)
    const backBlocks = separatorIndex === -1 ? [] : blocks.slice(separatorIndex + 1)
    const metadata = item.properties.srs ? parseSrsMetadata(item.properties.srs) : null
    cards.push({ itemId: item.id, frontBlocks, backBlocks, metadata, documentName: item.title, collectionId })
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

export function filterDueCards(cards: Card[]): Card[] {
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
      const cards = parseCards(collection.id, itemsResult.data)
      const counts = countCards(cards)
      return { ok: true as const, data: { id: collection.id, name: collection.name, ...counts } }
    }),
  )

  for (const r of results) {
    if (!r.ok) return r
  }

  return { ok: true, data: results.filter((r): r is { ok: true; data: DeckInfo } => r.ok).map((r) => r.data) }
}
