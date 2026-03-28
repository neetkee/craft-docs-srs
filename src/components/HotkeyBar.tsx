import { colors } from "../theme"

interface HotkeyBarProps {
  hints: Array<{ key: string; action: string }>
}

export function HotkeyBar({ hints }: HotkeyBarProps) {
  return (
    <box flexDirection="column" width="100%">
      <box height={1} width="100%" backgroundColor={colors.overlay} />
      <box paddingX={1}>
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
    </box>
  )
}
