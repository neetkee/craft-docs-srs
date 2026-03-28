import { useState } from "react"
import { loadConfig, isConfigComplete, saveConfig } from "./config"
import { SetupScreen } from "./screens/SetupScreen"
import { DashboardScreen } from "./screens/DashboardScreen"
import { AddDeckScreen } from "./screens/AddDeckScreen"

export function App() {
  const [screen, setScreen] = useState<"setup" | "dashboard" | "addDeck">(() =>
    isConfigComplete(loadConfig()) ? "dashboard" : "setup"
  )

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
          setScreen("dashboard")
        }}
        onCancel={() => setScreen("dashboard")}
      />
    )
  }

  return <DashboardScreen onAddDeck={() => setScreen("addDeck")} />
}
