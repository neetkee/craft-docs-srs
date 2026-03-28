import { useState } from "react"
import { loadConfig, isConfigComplete } from "./config"
import { SetupScreen } from "./screens/SetupScreen"
import { DashboardScreen } from "./screens/DashboardScreen"

export function App() {
  const [screen, setScreen] = useState<"setup" | "dashboard">(() =>
    isConfigComplete(loadConfig()) ? "dashboard" : "setup"
  )

  if (screen === "setup") {
    return <SetupScreen onComplete={() => setScreen("dashboard")} />
  }

  return <DashboardScreen />
}
