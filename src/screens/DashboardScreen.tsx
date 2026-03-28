import { useEffect, useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { colors } from "../theme"
import { Header } from "../components/Header"
import { HotkeyBar } from "../components/HotkeyBar"
import { loadConfig } from "../config"
import type { CraftClient } from "../craft-api"
import { loadDecks, type DeckInfo } from "../cards"

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

interface DashboardScreenProps {
  client: CraftClient
  onAddDeck: () => void
  onDeleteDeck: (collectionId: string) => void
  onReview: (collectionId: string) => void
}

export function DashboardScreen({ client, onAddDeck, onDeleteDeck, onReview }: DashboardScreenProps) {
  const renderer = useRenderer()
  const [decks, setDecks] = useState<DeckInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const config = loadConfig()
    if (!config || config.collectionIds.length === 0) {
      setLoading(false)
      return
    }
    loadDecks(client, config.collectionIds).then((result) => {
      if (result.ok) {
        setDecks(result.data)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
  }, [])

  useKeyboard((key) => {
    if (key.name === "q") {
      renderer.destroy()
      return
    }
    if (key.sequence === "a") {
      onAddDeck()
      return
    }
    if (key.sequence === "r" && decks.length > 0) {
      const deck = decks[selectedIndex]
      if (deck) onReview(deck.id)
      return
    }
    if (key.sequence === "d" && decks.length > 0) {
      const deck = decks[selectedIndex]
      if (deck) onDeleteDeck(deck.id)
      return
    }
    if (decks.length === 0) return
    if (key.name === "up") {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.name === "down") {
      setSelectedIndex((i) => Math.min(decks.length - 1, i + 1))
    }
  })

  const totalNew = decks.reduce((sum, d) => sum + d.newCount, 0)
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0)
  const totalCards = decks.reduce((sum, d) => sum + d.totalCount, 0)

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={colors.bg} justifyContent="center" alignItems="center">
      <box flexDirection="column" width={80} gap={1}>
        <Header right={formatDate(new Date())}>
          <strong><span fg={colors.title}>craft-docs-srs</span></strong>
        </Header>

        {loading ? (
          <text fg={colors.dim}>Loading decks...</text>
        ) : error ? (
          <text fg={colors.err}>{error}</text>
        ) : decks.length === 0 ? (
          <box justifyContent="center" alignItems="center" flexDirection="column" gap={1}>
            <text fg={colors.dim}>No decks yet</text>
            <text>
              <span fg={colors.sub}>Press </span>
              <strong><span fg={colors.text}>[a]</span></strong>
              <span fg={colors.sub}> to add a Craft collection</span>
            </text>
          </box>
        ) : (
          <>
            <box>
              <text>
                <span fg={colors.dim}>{decks.length} decks · </span>
                <span fg={colors.title}>{totalNew} new</span>
                <span fg={colors.dim}> · </span>
                <span fg={colors.warn}>{totalDue} due</span>
                <span fg={colors.dim}> · {totalCards} total</span>
              </text>
            </box>

            <box flexDirection="column" gap={0}>
              {decks.map((deck, i) => {
                const selected = i === selectedIndex
                return (
                  <box
                    key={deck.id}
                    flexDirection="row"
                    justifyContent="space-between"
                    backgroundColor={selected ? colors.surface : undefined}
                    paddingX={1}
                  >
                    <text>
                      <span fg={colors.lavender}>{selected ? "▸ " : "  "}</span>
                      {selected
                        ? <strong><span fg={colors.text}>{deck.name}</span></strong>
                        : <span fg={colors.sub}>{deck.name}</span>
                      }
                    </text>
                    <text>
                      {deck.newCount > 0 && (
                        <>
                          <span fg={colors.title}>{deck.newCount} new</span>
                          <span fg={colors.dim}> · </span>
                        </>
                      )}
                      {deck.dueCount > 0 && (
                        <>
                          <span fg={colors.warn}>{deck.dueCount} due</span>
                          <span fg={colors.dim}> · </span>
                        </>
                      )}
                      <span fg={colors.dim}>{deck.totalCount} total</span>
                    </text>
                  </box>
                )
              })}
            </box>
          </>
        )}

        <HotkeyBar hints={decks.length === 0
          ? [
              { key: "a", action: "add deck" },
              { key: "q", action: "quit" },
            ]
          : [
              { key: "↑↓", action: "navigate" },
              { key: "r", action: "review" },
              { key: "a", action: "add deck" },
              { key: "d", action: "delete" },
              { key: "q", action: "quit" },
            ]
        } />
      </box>
    </box>
  )
}
