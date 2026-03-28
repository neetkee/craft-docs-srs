import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { colors } from "../theme"
import { Header } from "../components/Header"
import { HotkeyBar } from "../components/HotkeyBar"

interface Deck {
  name: string
  newCount: number
  dueCount: number
  totalCount: number
}

const MOCK_DECKS: Deck[] = [
  { name: "DSA Basics", newCount: 3, dueCount: 1, totalCount: 12 },
  { name: "System Design", newCount: 5, dueCount: 2, totalCount: 8 },
  { name: "TypeScript Advanced", newCount: 0, dueCount: 0, totalCount: 4 },
]

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

interface DashboardScreenProps {
  onAddDeck: () => void
}

export function DashboardScreen({ onAddDeck }: DashboardScreenProps) {
  const renderer = useRenderer()
  const decks = MOCK_DECKS
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    if (key.name === "q") {
      renderer.destroy()
      return
    }
    if (key.sequence === "a") {
      onAddDeck()
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

        {decks.length === 0 ? (
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
                    key={i}
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
