import { useState } from "react"
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
  const [focusedField, setFocusedField] = useState<"url" | "key">("url")
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<"url" | "key" | null>(null)

  async function handleConnect() {
    if (loading) return

    const trimmedUrl = apiUrl.trim()
    const trimmedKey = apiKey.trim()

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
      await saveConfig({ craftApiUrl: trimmedUrl, craftApiKey: trimmedKey, collectionIds: [] })
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
    if (key.name === "return") {
      handleConnect()
      return
    }
    if (key.name === "tab") {
      if (key.shift) {
        setFocusedField((f) => (f === "key" ? "url" : "key"))
      } else if (focusedField === "url") {
        setFocusedField("key")
      } else {
        setShowKey((s) => !s)
      }
      return
    }

    // Manual key capture when key field is focused and masked
    if (focusedField === "key" && !showKey) {
      if (key.name === "backspace") {
        setApiKey((v) => v.slice(0, -1))
      } else if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        setApiKey((v) => v + key.sequence)
      }
    }
  })

  const urlBorderColor = errorField === "url" ? colors.err : colors.overlay
  const keyBorderColor = errorField === "key" ? colors.err : colors.overlay

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={colors.bg}>
      <Header>
        <strong><span fg={colors.title}>craft-docs-srs</span></strong>
        <span fg={colors.dim}> v0.1.0</span>
      </Header>

      <box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column" gap={1}>
        <box
          border
          borderStyle="rounded"
          borderColor={colors.overlay}
          flexDirection="column"
          padding={2}
          width={60}
          gap={1}
        >
          <text fg={colors.sub}>Connect to your Craft space</text>

          {error && (
            <box border borderColor={colors.err} backgroundColor={colors.surface} padding={1}>
              <text fg={colors.err}>{error}</text>
            </box>
          )}

          {/* API URL field */}
          <box flexDirection="column">
            <text fg={colors.dim}>API URL</text>
            <box border borderColor={urlBorderColor} backgroundColor={colors.surface}>
              <input
                value={apiUrl}
                onChange={setApiUrl}
                focused={focusedField === "url"}
                textColor={colors.text}
                cursorColor={colors.lavender}
              />
            </box>
          </box>

          {/* API Key field */}
          <box flexDirection="column">
            <box flexDirection="row" justifyContent="space-between">
              <text fg={colors.dim}>API key</text>
              <text fg={colors.dim}>[tab] {showKey ? "hide" : "show"}</text>
            </box>
            <box border borderColor={keyBorderColor} backgroundColor={colors.surface}>
              {focusedField === "key" && !showKey ? (
                <text fg={colors.text}>
                  {"·".repeat(apiKey.length)}
                  <span fg={colors.lavender}>█</span>
                </text>
              ) : showKey ? (
                <input
                  value={apiKey}
                  onChange={setApiKey}
                  focused={focusedField === "key"}
                  textColor={colors.text}
                  cursorColor={colors.lavender}
                />
              ) : (
                <text fg={colors.text}>{"·".repeat(apiKey.length)}</text>
              )}
            </box>
          </box>

          {/* Action row */}
          <box flexDirection="row" justifyContent="space-between" alignItems="center">
            <box backgroundColor={loading ? colors.dim : colors.title} paddingX={2}>
              <text fg={colors.bg}>
                <strong>{loading ? "Connecting..." : error ? "Retry" : "Connect"}</strong>
              </text>
            </box>
            <text fg={colors.dim}>[enter] submit · [esc] quit</text>
          </box>
        </box>

        <text fg={colors.dim}>
          Credentials saved to <span fg={colors.sub}>~/.config/craft-docs-srs/config.json</span>
        </text>
      </box>

      <HotkeyBar
        hints={[
          { key: "tab", action: "switch field" },
          { key: "enter", action: "submit" },
          { key: "esc", action: "quit" },
        ]}
      />
    </box>
  )
}
