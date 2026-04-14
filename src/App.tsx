import { useState } from "react"
import { loadConfig, isConfigComplete, saveConfig, getMaxNewCardsPerDay } from "./config"
import { createCraftClient } from "./craft-api"
import { SetupScreen } from "./screens/SetupScreen"
import { DashboardScreen } from "./screens/DashboardScreen"
import { AddDeckScreen } from "./screens/AddDeckScreen"
import { ReviewScreen } from "./screens/ReviewScreen"

export function App() {
  const [screen, setScreen] = useState<"setup" | "dashboard" | "addDeck" | "review">(() =>
    isConfigComplete(loadConfig()) ? "dashboard" : "setup"
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [reviewCollectionId, setReviewCollectionId] = useState("")

  if (screen === "setup") {
    return <SetupScreen onComplete={() => setScreen("dashboard")} />
  }

  const config = loadConfig()
  if (!config) {
    setScreen("setup")
    return null
  }

  const client = createCraftClient(config.craftApiUrl, config.craftApiKey)
  const maxNewCardsPerDay = getMaxNewCardsPerDay(config)

  if (screen === "addDeck") {
    return (
      <AddDeckScreen
        client={client}
        addedIds={config.collectionIds}
        onSelect={async (collectionId) => {
          const current = loadConfig()
          if (!current) { setScreen("setup"); return }
          await saveConfig({
            ...current,
            collectionIds: [...current.collectionIds, collectionId],
          })
          setRefreshKey((k) => k + 1)
          setScreen("dashboard")
        }}
        onCancel={() => setScreen("dashboard")}
      />
    )
  }

  if (screen === "review") {
    return (
      <ReviewScreen
        client={client}
        collectionId={reviewCollectionId}
        spaceId={config.spaceId}
        maxNewCardsPerDay={maxNewCardsPerDay}
        onDone={() => {
          setRefreshKey((k) => k + 1)
          setScreen("dashboard")
        }}
      />
    )
  }

  return (
    <DashboardScreen
      key={refreshKey}
      client={client}
      maxNewCardsPerDay={maxNewCardsPerDay}
      onAddDeck={() => setScreen("addDeck")}
      onDeleteDeck={async (collectionId) => {
        const current = loadConfig()
        if (!current) { setScreen("setup"); return }
        await saveConfig({
          ...current,
          collectionIds: current.collectionIds.filter((id) => id !== collectionId),
        })
        setRefreshKey((k) => k + 1)
      }}
      onReview={(collectionId) => {
        setReviewCollectionId(collectionId)
        setScreen("review")
      }}
    />
  )
}
