import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { colors } from "../theme"
import { Header } from "../components/Header"
import { HotkeyBar } from "../components/HotkeyBar"
import { loadConfig } from "../config"
import { listCollections, type Collection } from "../craft-api"

interface AddDeckScreenProps {
  onSelect: (collectionId: string) => void
  onCancel: () => void
  addedIds: string[]
}

export function AddDeckScreen({ onSelect, onCancel, addedIds }: AddDeckScreenProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const config = loadConfig()
    if (!config) return
    listCollections(config.craftApiUrl, config.craftApiKey).then((result) => {
      if (result.ok) {
        setCollections(result.data)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
  }, [])

  const selectableIndices = collections
    .map((c, i) => (!addedIds.includes(c.id) ? i : -1))
    .filter((i) => i !== -1)

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
      return
    }
    if (key.name === "return") {
      if (selectableIndices.length > 0) {
        const collection = collections[selectableIndices[selectedIndex]]
        if (collection) onSelect(collection.id)
      }
      return
    }
    if (key.name === "up") {
      setSelectedIndex((i) => Math.max(0, i - 1))
      return
    }
    if (key.name === "down") {
      setSelectedIndex((i) => Math.min(selectableIndices.length - 1, i + 1))
      return
    }
  })

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={colors.bg} justifyContent="center" alignItems="center">
      <box flexDirection="column" width={80} gap={1}>
        <Header>
          <strong><span fg={colors.accent}>Add deck</span></strong>
        </Header>

        {loading ? (
          <text fg={colors.dim}>Loading collections...</text>
        ) : error ? (
          <text fg={colors.err}>{error}</text>
        ) : collections.length === 0 ? (
          <text fg={colors.dim}>No collections found</text>
        ) : (
          <box flexDirection="column" gap={0}>
            {collections.map((collection, i) => {
              const added = addedIds.includes(collection.id)
              const selectablePos = selectableIndices.indexOf(i)
              const selected = !added && selectablePos === selectedIndex

              return (
                <box
                  key={collection.id}
                  flexDirection="row"
                  justifyContent="space-between"
                  backgroundColor={selected ? colors.surface : undefined}
                  paddingX={1}
                >
                  <text>
                    {added ? (
                      <>
                        <span fg={colors.accent}>✓ </span>
                        <span fg={colors.dim}>{collection.name}</span>
                      </>
                    ) : (
                      <>
                        <span fg={colors.lavender}>{selected ? "▸ " : "  "}</span>
                        {selected
                          ? <strong><span fg={colors.text}>{collection.name}</span></strong>
                          : <span fg={colors.sub}>{collection.name}</span>
                        }
                      </>
                    )}
                  </text>
                  <text fg={colors.dim}>
                    {added ? "added" : `${collection.itemCount} items`}
                  </text>
                </box>
              )
            })}
          </box>
        )}

        <HotkeyBar hints={[
          { key: "↑↓", action: "navigate" },
          { key: "enter", action: "select" },
          { key: "esc", action: "cancel" },
        ]} />
      </box>
    </box>
  )
}
