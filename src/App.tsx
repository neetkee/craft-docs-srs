import { useState } from "react"
import { loadConfig, isConfigComplete, saveConfig } from "./config"
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

  if (screen === "addDeck") {
    const config = loadConfig()!
    return (
      <AddDeckScreen
        addedIds={config.collectionIds}
        onSelect={async (collectionId) => {
          const current = loadConfig()!
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
        collectionId={reviewCollectionId}
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
      onAddDeck={() => setScreen("addDeck")}
      onDeleteDeck={async (collectionId) => {
        const current = loadConfig()!
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
