import { useEffect, useState, useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import { SyntaxStyle, RGBA, getTreeSitterClient } from "@opentui/core"
import { colors } from "../theme"
import { Header } from "../components/Header"
import { HotkeyBar } from "../components/HotkeyBar"
import { loadConfig } from "../config"
import { fetchCollectionItems, insertBlock, updateBlock } from "../craft-api"
import { parseReviewCards, filterDueCards, type ReviewCard } from "../cards"
import { rateCard, serializeMetadata, Rating } from "../srs"

type Phase = "loading" | "question" | "answer" | "saving" | "complete" | "empty" | "error"

interface ReviewScreenProps {
  collectionId: string
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
})

export function ReviewScreen({ collectionId, onDone }: ReviewScreenProps) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewed, setReviewed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const config = loadConfig()
    if (!config) {
      setError("Config not found")
      setPhase("error")
      return
    }
    fetchCollectionItems(config.craftApiUrl, config.craftApiKey, collectionId).then((result) => {
      if (!result.ok) {
        setError(result.error)
        setPhase("error")
        return
      }
      const due = filterDueCards(parseReviewCards(result.data))
      if (due.length === 0) {
        setPhase("empty")
        return
      }
      setCards(due)
      setPhase("question")
    })
  }, [])

  const card = cards[currentIndex] ?? null

  const answerMarkdown = useMemo(() => {
    if (!card) return ""
    return card.answerBlocks.map((b) => b.markdown).join("\n\n")
  }, [card])

  async function handleRate(rating: Rating) {
    if (!card) return
    setPhase("saving")
    const config = loadConfig()!
    const now = new Date()
    const newMetadata = rateCard(card.metadata, rating, now)
    const serialized = serializeMetadata(newMetadata)

    if (card.metadataBlockId) {
      await updateBlock(config.craftApiUrl, config.craftApiKey, {
        blockId: card.metadataBlockId,
        markdown: `<caption>${serialized}</caption>`,
        color: "#999999",
      })
    } else {
      await insertBlock(config.craftApiUrl, config.craftApiKey, {
        markdown: serialized,
        textStyle: "caption",
        color: "#999999",
        afterBlockId: card.headingBlockId,
      })
    }

    const next = currentIndex + 1
    setReviewed((r) => r + 1)
    if (next >= cards.length) {
      setPhase("complete")
    } else {
      setCurrentIndex(next)
      setPhase("question")
    }
  }

  useKeyboard((key) => {
    if (phase === "empty" || phase === "complete" || phase === "error") {
      if (key.name === "return" || key.name === "escape") {
        onDone()
      }
      return
    }
    if (phase === "question") {
      if (key.name === "space") setPhase("answer")
      if (key.name === "escape") onDone()
      return
    }
    if (phase === "answer") {
      if (key.sequence === "1") handleRate(Rating.Easy)
      else if (key.sequence === "2") handleRate(Rating.Good)
      else if (key.sequence === "3") handleRate(Rating.Hard)
      else if (key.sequence === "4") handleRate(Rating.Again)
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

        {phase === "question" && card && (
          <box flexDirection="column" gap={1}>
            <markdown content={`## ${card.question}`} syntaxStyle={syntaxStyle} treeSitterClient={treeSitterClient} fg={colors.text} />
          </box>
        )}

        {(phase === "answer" || phase === "saving") && card && (
          <box flexDirection="column" gap={1}>
            <markdown content={`## ${card.question}`} syntaxStyle={syntaxStyle} treeSitterClient={treeSitterClient} fg={colors.text} />
            <box height={1} overflow="hidden">
              <text fg={colors.overlay}>{"─".repeat(200)}</text>
            </box>
            <markdown content={answerMarkdown} syntaxStyle={syntaxStyle} treeSitterClient={treeSitterClient} fg={colors.text} />
          </box>
        )}

        {phase === "complete" && (
          <box flexDirection="column" gap={1} alignItems="center">
            <text fg={colors.accent}>Session complete</text>
            <text fg={colors.sub}>{reviewed} card{reviewed !== 1 ? "s" : ""} reviewed</text>
          </box>
        )}

        <HotkeyBar hints={
          phase === "question"
            ? [{ key: "space", action: "reveal" }, { key: "esc", action: "quit" }]
            : phase === "answer"
            ? [
                { key: "1", action: "easy" },
                { key: "2", action: "good" },
                { key: "3", action: "hard" },
                { key: "4", action: "again" },
                { key: "esc", action: "quit" },
              ]
            : phase === "saving"
            ? [{ key: "...", action: "saving" }]
            : [{ key: "enter", action: "back" }]
        } />
      </box>
    </box>
  )
}
