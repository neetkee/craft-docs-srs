import { colors } from "../theme"

interface HeaderProps {
  right?: string
  children: React.ReactNode
}

export function Header({ right, children }: HeaderProps) {
  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <text>{children}</text>
        {right && <text fg={colors.dim}>{right}</text>}
      </box>
      <box height={1} width="100%" backgroundColor={colors.overlay} />
    </box>
  )
}
