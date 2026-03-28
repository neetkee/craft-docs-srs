import { colors } from "../theme"

interface HotkeyBarProps {
  hints: Array<{ key: string; action: string }>
}

export function HotkeyBar({ hints }: HotkeyBarProps) {
  return (
    <box flexDirection="column">
      <box height={1} overflow="hidden">
        <text fg={colors.overlay}>{"─".repeat(200)}</text>
      </box>
      <text>
        {hints.map((hint, i) => (
          <span key={i}>
            {i > 0 && <span fg={colors.dim}> · </span>}
            <span fg={colors.text}>[{hint.key}]</span>
            <span fg={colors.dim}> {hint.action}</span>
          </span>
        ))}
      </text>
    </box>
  )
}
