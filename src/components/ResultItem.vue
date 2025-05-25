<template>
  <div class="result-item">
    <div class="result-character">{{item.subject_data.characters}}</div>
    <div class="result-info">
      <span class="ending-level">{{endingLevel}}</span>
      <span class="arrow">⇑</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ResultDisplay, SRSLevel, SRSLevelText, SubjectType } from "../types"

const { item } = defineProps<{
  item: ResultDisplay
}>()

const colors: Record<SubjectType, string> = {
  radical:         "var(--radical)", // Catppuccin Macchiato “Blue”
  kanji:           "var(--kanji)", // Catppuccin Macchiato “Yellow”
  vocabulary:      "var(--vocabulary)", // Catppuccin Macchiato “Green”
  kana_vocabulary: "var(--kana_vocabulary)", // Catppuccin Macchiato “Teal”
}

const levelColors: Record<Lowercase<SRSLevelText>, string> = {
  locked:          "",
  apprentice:      "var(--apprentice)",
  guru:            "var(--guru)",
  master:          "var(--master)",
  enlightened:     "var(--enlightened)",
  burned:          "var(--burned)",
}


const levelUp = item.starting_srs_stage < item.ending_srs_stage
const endingLevel   = SRSLevelToText(item.ending_srs_stage)
const arrowColor = levelUp ? 'var(--success-color)' : 'var(--error-color)'
const characterColor = computed(() => colors[item.subject_data.subject_type])
const containerBorder = computed(() => `3px solid ${levelColors[endingLevel.toLowerCase() as Lowercase<SRSLevelText>]}`)
const containerBoxShadow = computed(() => `inset 0px 0px 10px ${levelColors[endingLevel.toLowerCase() as Lowercase<SRSLevelText>]}`)

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

</script>

<style scoped>
.result-item {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  padding: 0.5rem 2rem;
  border: v-bind(containerBorder);
  box-shadow: v-bind(containerBoxShadow);
}

.result-character {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 3rem;
  color: v-bind(characterColor);
}

.result-info {
  display: flex;
  justify-content: center;
  align-items: center;
}

.arrow {
  color: v-bind(arrowColor);
}
</style>
