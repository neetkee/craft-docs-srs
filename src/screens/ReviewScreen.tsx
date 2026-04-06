import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { SyntaxStyle, RGBA, getTreeSitterClient } from "@opentui/core"
import { colors } from "../theme"
import { Header } from "../components/Header"
import { HotkeyBar } from "../components/HotkeyBar"
import type { CraftClient } from "../craft-api"
import { parseCards, filterDueCards, type Card } from "../cards"
import { rateCard, serializeMetadata, Rating } from "../srs"

type Phase = "loading" | "front" | "back" | "saving" | "complete" | "empty" | "error"

interface ReviewScreenProps {
  client: CraftClient
  collectionId: string
  spaceId: string
  onDone: () => void
}

const treeSitterClient = getTreeSitterClient()

const syntaxStyle = SyntaxStyle.fromStyles({
  keyword: { fg: RGBA.fromHex(colors.mauve), bold: true },
  string: { fg: RGBA.fromHex(colors.accent) },
  comment: { fg: RGBA.fromHex(colors.dim), italic: true },
  number: { fg: RGBA.fromHex(colors.peach) },
  type: { fg: RGBA.fromHex(colors.title) },
  function: { fg: RGBA.fromHex(colors.title) },
  operator: { fg: RGBA.fromHex(colors.teal) },
  default: { fg: RGBA.fromHex(colors.text) },
  "markup.italic": { italic: true },
  "markup.strong": { bold: true },
  "markup.raw": { fg: RGBA.fromHex(colors.peach) },
  "markup.link": { fg: RGBA.fromHex(colors.title) },
  "markup.link.url": { fg: RGBA.fromHex(colors.title), underline: true },
  "markup.link.label": { fg: RGBA.fromHex(colors.title) },
  "markup.strikethrough": { dim: true },
  "markup.heading": { fg: RGBA.fromHex(colors.title), bold: true },
  "markup.heading.1": { fg: RGBA.fromHex(colors.title), bold: true },
  "markup.heading.2": { fg: RGBA.fromHex(colors.title), bold: true },
  "markup.heading.3": { fg: RGBA.fromHex(colors.title), bold: true },
  "markup.heading.4": { fg: RGBA.fromHex(colors.title), bold: true },
})

function renderBlock(block: { id: string; type: string; markdown: string }) {
  if (block.type === "code") {
    return (
      <box key={block.id} backgroundColor={colors.surface} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
        <markdown content={block.markdown} syntaxStyle={syntaxStyle} treeSitterClient={treeSitterClient} fg={colors.text} />
      </box>
    )
  }
  return (
    <markdown key={block.id} content={block.markdown} syntaxStyle={syntaxStyle} treeSitterClient={treeSitterClient} fg={colors.text} />
  )
}

export function ReviewScreen({ client, collectionId, spaceId, onDone }: ReviewScreenProps) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewed, setReviewed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.fetchCollectionItems(collectionId).then((result) => {
      if (!result.ok) {
        setError(result.error)
        setPhase("error")
        return
      }
      const due = filterDueCards(parseCards(collectionId, result.data))
      if (due.length === 0) {
        setPhase("empty")
        return
      }
      setCards(due)
      setPhase("front")
    })
  }, [])

  const card = cards[currentIndex] ?? null

  function handleSkip() {
    const next = currentIndex + 1
    if (next >= cards.length) {
      setPhase("complete")
    } else {
      setCurrentIndex(next)
      setPhase("front")
    }
  }

  function handleOpen() {
    if (!card || !spaceId) return
    Bun.spawn(["open", `craftdocs://open?spaceId=${spaceId}&blockId=${card.itemId}`])
  }

  async function handleRate(rating: Rating) {
    if (!card) return
    setPhase("saving")
    const now = new Date()
    const newMetadata = rateCard(card.metadata, rating, now)
    const serialized = serializeMetadata(newMetadata)

    const saveResult = await client.updateCollectionItem(collectionId, card.itemId, { srs: serialized })

    if (!saveResult.ok) {
      setError(saveResult.error)
      setPhase("error")
      return
    }

    const next = currentIndex + 1
    setReviewed((r) => r + 1)
    if (next >= cards.length) {
      setPhase("complete")
    } else {
      setCurrentIndex(next)
      setPhase("front")
    }
  }

  useKeyboard((key) => {
    if (phase === "empty" || phase === "complete" || phase === "error") {
      if (key.name === "return" || key.name === "escape") {
        onDone()
      }
      return
    }
    if (phase === "front") {
      if (key.name === "space") setPhase("back")
      if (key.sequence === "s") handleSkip()
      if (key.sequence === "o") handleOpen()
      if (key.name === "escape") onDone()
      return
    }
    if (phase === "back") {
      if (key.sequence === "1") handleRate(Rating.Easy)
      else if (key.sequence === "2") handleRate(Rating.Good)
      else if (key.sequence === "3") handleRate(Rating.Hard)
      else if (key.sequence === "4") handleRate(Rating.Again)
      else if (key.sequence === "s") handleSkip()
      else if (key.sequence === "o") handleOpen()
      else if (key.name === "escape") onDone()
      return
    }
  })

  const progress = cards.length > 0 ? `${currentIndex + 1}/${cards.length}` : ""

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={colors.bg} justifyContent="center" alignItems="center">
      <box flexDirection="column" width={80} gap={1}>
        <Header right={progress}>
          <strong><span fg={colors.accent}>Review</span></strong>
        </Header>

        {phase === "loading" && (
          <text fg={colors.dim}>Loading cards...</text>
        )}

        {phase === "error" && (
          <box flexDirection="column" gap={1}>
            <text fg={colors.err}>{error}</text>
          </box>
        )}

        {phase === "empty" && (
          <box flexDirection="column" gap={1} alignItems="center">
            <text fg={colors.dim}>No cards to review</text>
            <text fg={colors.sub}>All caught up!</text>
          </box>
        )}

        {phase === "front" && card && (
          <box flexDirection="column" gap={1}>
            <text fg={colors.dim}>{card.documentName}</text>
            {card.frontBlocks.map(renderBlock)}
          </box>
        )}

        {(phase === "back" || phase === "saving") && card && (
          <box flexDirection="column" gap={1}>
            <text fg={colors.dim}>{card.documentName}</text>
            {card.frontBlocks.map(renderBlock)}
            {card.backBlocks.length > 0 && (
              <>
                <box height={1} overflow="hidden">
                  <text fg={colors.overlay}>{"─".repeat(200)}</text>
                </box>
                {card.backBlocks.map(renderBlock)}
              </>
            )}
          </box>
        )}

        {phase === "complete" && (
          <box flexDirection="column" gap={1} alignItems="center">
            <text fg={colors.accent}>Session complete</text>
            <text fg={colors.sub}>{reviewed} card{reviewed !== 1 ? "s" : ""} reviewed</text>
          </box>
        )}

        {phase !== "loading" && (
          <HotkeyBar hints={
            phase === "front"
              ? [{ key: "space", action: "reveal" }, { key: "s", action: "skip" }, { key: "o", action: "open" }, { key: "esc", action: "quit" }]
              : phase === "back"
              ? [
                  { key: "1", action: "easy" },
                  { key: "2", action: "good" },
                  { key: "3", action: "hard" },
                  { key: "4", action: "again" },
                  { key: "s", action: "skip" },
                  { key: "o", action: "open" },
                  { key: "esc", action: "quit" },
                ]
              : phase === "saving"
              ? [{ key: "...", action: "saving" }]
              : [{ key: "enter", action: "back" }]
          } />
        )}
      </box>
    </box>
  )
}
