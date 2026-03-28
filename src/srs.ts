import { fsrs, createEmptyCard, Rating, State, type Card as FsrsCard, type CardInput } from "ts-fsrs"
import type { SrsMetadata } from "./cards"

export { Rating }

const f = fsrs()

const STATE_MAP: Record<string, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
}

const STATE_NAMES: Record<number, string> = {
  [State.New]: "NEW",
  [State.Learning]: "LEARNING",
  [State.Review]: "REVIEW",
  [State.Relearning]: "RELEARNING",
}

export function toFsrsCard(metadata: SrsMetadata | null, now: Date): CardInput | FsrsCard {
  if (!metadata) return createEmptyCard(now)
  return {
    state: STATE_MAP[metadata.state] ?? State.New,
    stability: metadata.stability,
    difficulty: metadata.difficulty,
    due: new Date(metadata.due * 1000),
    last_review: new Date(metadata.lastReview * 1000),
    learning_steps: metadata.step,
    reps: 0,
    lapses: 0,
    elapsed_days: 0,
    scheduled_days: 0,
  }
}

export function rateCard(metadata: SrsMetadata | null, rating: Rating, now: Date): SrsMetadata {
  const card = toFsrsCard(metadata, now)
  const result = f.next(card, now, rating as Exclude<Rating, Rating.Manual>)
  const updated = result.card
  return {
    state: STATE_NAMES[updated.state] ?? "NEW",
    step: updated.learning_steps,
    stability: updated.stability,
    difficulty: updated.difficulty,
    due: Math.floor(updated.due.getTime() / 1000),
    lastReview: Math.floor((updated.last_review?.getTime() ?? now.getTime()) / 1000),
  }
}

function formatNum(n: number): string {
  return parseFloat(n.toFixed(4)).toString()
}

export function serializeMetadata(metadata: SrsMetadata): string {
  return `srs: ${metadata.state}|${metadata.step}|${formatNum(metadata.stability)}|${formatNum(metadata.difficulty)}|${metadata.due}|${metadata.lastReview}`
}
