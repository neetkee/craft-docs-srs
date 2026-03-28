import { colors } from "../theme"

interface HeaderProps {
  right?: string
  children: React.ReactNode
}

export function Header({ right, children }: HeaderProps) {
  return (
    <box flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text>{children}</text>
        {right && <text fg={colors.dim}>{right}</text>}
      </box>
      <box height={1} overflow="hidden">
        <text fg={colors.overlay}>{"─".repeat(200)}</text>
      </box>
    </box>
  )
}
