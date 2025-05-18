import { ResultDisplay, SRSLevel, SRSLevelText, SubjectType } from "../types"

function SRSLevelToText(level: SRSLevel): SRSLevelText {
  switch(level){
    case SRSLevel.Locked:
      return SRSLevelText.Locked
    case SRSLevel.Apprentice_1:
    case SRSLevel.Apprentice_2:
    case SRSLevel.Apprentice_3:
    case SRSLevel.Apprentice_4:
      return SRSLevelText.Apprentice
    case SRSLevel.Guru_1:
    case SRSLevel.Guru_2:
      return SRSLevelText.Guru
    case SRSLevel.Master:
      return SRSLevelText.Master
    case SRSLevel.Enlightened:
      return SRSLevelText.Enlightened
    case SRSLevel.Burned:
      return SRSLevelText.Burned
  }
}

const colors: Record<SubjectType, string> = {
  radical:         "var(--radical)", // Catppuccin Macchiato “Blue”
  kanji:           "var(--kanji)", // Catppuccin Macchiato “Yellow”
  vocabulary:      "var(--vocabulary)", // Catppuccin Macchiato “Green”
  kana_vocabulary: "var(--kana_vocabulary)", // Catppuccin Macchiato “Teal”
}

const levelColors: Record<Lowercase<SRSLevelText>, string> = {
  apprentice:      "var(--apprentice)",
  guru:            "var(--guru)",
  master:          "var(--master)",
  enlightened:     "var(--enlightened)",
  burned:          "var(--burned)",
}

interface ResultItemProps {
  item: ResultDisplay,
}

export function ResultItem({
  item
}: ResultItemProps) {
  const levelUp = item.starting_srs_stage < item.ending_srs_stage
  const endingLevel   = SRSLevelToText(item.ending_srs_stage)

  const characterColor = colors[item.subject_data.subject_type]

  const characterStyle: React.CSSProperties = {
    color: characterColor
  }

  const containerStyle: React.CSSProperties = {
    border: `3px solid ${levelColors[endingLevel.toLowerCase() as Lowercase<SRSLevelText>]}`,
    boxShadow: `inset 0px 0px 10px ${levelColors[endingLevel.toLowerCase() as Lowercase<SRSLevelText>]}`,
  }

  if(levelUp) {
    return (
      <div className="result-item" style={containerStyle}>
        <div className="result-character" style={characterStyle}>{item.subject_data.characters}</div>
        <div className="result-info">
          {endingLevel}<span style={{color: 'var(--success-color)'}}>⇑</span>
        </div>
      </div>
    )
  } else {
    return (
      <div className="result-item" style={containerStyle}>
        <div className="result-character" style={characterStyle}>{item.subject_data.characters}</div>
        <div className="result-info">
          {endingLevel}<span style={{color: 'var(--error-color)'}}>⇓</span>
        </div>
      </div>
    )
  }
}

