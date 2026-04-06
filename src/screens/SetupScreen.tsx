import { useRef, useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { colors } from "../theme"
import { saveConfig } from "../config"
import { validateConnection } from "../craft-api"
import { Header } from "../components/Header"
import { HotkeyBar } from "../components/HotkeyBar"

interface SetupScreenProps {
  onComplete: () => void
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const renderer = useRenderer()
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const apiUrlRef = useRef("")
  const apiKeyRef = useRef("")
  const [focusedField, setFocusedField] = useState<"url" | "key">("url")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<"url" | "key" | null>(null)

  async function handleConnect() {
    if (loading) return

    const trimmedUrl = apiUrlRef.current.trim()
    const trimmedKey = apiKeyRef.current.trim()

    if (!trimmedUrl) {
      setError("API URL is required")
      setErrorField("url")
      setFocusedField("url")
      return
    }
    if (!trimmedKey) {
      setError("API key is required")
      setErrorField("key")
      setFocusedField("key")
      return
    }

    setLoading(true)
    setError(null)
    setErrorField(null)

    const result = await validateConnection(trimmedUrl, trimmedKey)
    if (result.ok) {
      await saveConfig({ craftApiUrl: trimmedUrl, craftApiKey: trimmedKey, spaceId: result.data.space.id, collectionIds: [] })
      onComplete()
    } else {
      setError(result.error)
      setErrorField("key")
      setFocusedField("key")
      setLoading(false)
    }
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      renderer.destroy()
      return
    }
    if (key.name === "tab") {
      setFocusedField((f) => (f === "url" ? "key" : "url"))
      return
    }
  })

  const urlBorderColor = errorField === "url" ? colors.err : colors.overlay
  const keyBorderColor = errorField === "key" ? colors.err : colors.overlay

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={colors.bg} justifyContent="center" alignItems="center">
      <box flexDirection="column" width={80} gap={1}>
        <Header>
          <strong><span fg={colors.title}>craft-docs-srs</span></strong>
          <span fg={colors.dim}> v0.1.0</span>
        </Header>

        <text fg={colors.sub}>Connect to your Craft space</text>
        <text fg={colors.err}>{error || " "}</text>

        <box flexDirection="column">
          <text fg={focusedField === "url" ? colors.text : colors.dim}>API URL</text>
          <input
            value={apiUrl}
            onChange={(v) => { apiUrlRef.current = v; setApiUrl(v) }}
            onSubmit={() => setFocusedField("key")}
            focused={focusedField === "url"}
            textColor={colors.text}
            cursorColor={colors.lavender}
          />
        </box>

        <box flexDirection="column">
          <text fg={focusedField === "key" ? colors.text : colors.dim}>API key</text>
          <input
            value={apiKey}
            onChange={(v) => { apiKeyRef.current = v; setApiKey(v) }}
            onSubmit={() => handleConnect()}
            focused={focusedField === "key"}
            textColor={colors.text}
            cursorColor={colors.lavender}
          />
        </box>

        <box flexDirection="row" alignItems="center">
          <box backgroundColor={loading ? colors.dim : colors.title} paddingX={2}>
            <text fg={colors.bg}>
              <strong>{loading ? "Connecting..." : error ? "Retry" : "Connect"}</strong>
            </text>
          </box>
        </box>

        <HotkeyBar
          hints={[
            { key: "tab", action: "switch field" },
            { key: "enter", action: "submit" },
            { key: "esc", action: "quit" },
          ]}
        />
      </box>
    </box>
  )
}
