import { useState } from "react"
import { loadConfig, isConfigComplete } from "./config"
import { colors } from "./theme"
import { SetupScreen } from "./screens/SetupScreen"

export function App() {
  const [screen, setScreen] = useState<"setup" | "dashboard">(() =>
    isConfigComplete(loadConfig()) ? "dashboard" : "setup"
  )

  if (screen === "setup") {
    return <SetupScreen onComplete={() => setScreen("dashboard")} />
  }

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={colors.bg}
      justifyContent="center"
      alignItems="center"
    >
      <text fg={colors.text}>Dashboard coming soon</text>
    </box>
  )
}
