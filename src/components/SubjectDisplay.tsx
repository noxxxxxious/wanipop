import { SubjectType } from "../types"

interface SubjectDisplayProps {
  type: SubjectType
  children?: React.ReactNode
}

const colors: Record<SubjectType, string> = {
  radical:         "var(--radical)", // Catppuccin Macchiato “Blue”
  kanji:           "var(--kanji)", // Catppuccin Macchiato “Yellow”
  vocabulary:      "var(--vocabulary)", // Catppuccin Macchiato “Green”
  kana_vocabulary: "var(--kana_vocabulary)", // Catppuccin Macchiato “Teal”
}

export function SubjectDisplay({
  type,
  children
}: SubjectDisplayProps) {
  const style: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: colors[type],
    fontSize: '5rem',
    height: '5rem'
  }

  return <div id="subject-display" style={style}>
    {children ?? <em>No review item to display...</em>}
  </div>
}

