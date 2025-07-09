<template>
  <div class="result-item">
    <div class="result-character">{{subjectData?.characters}}</div>
    <div class="result-info">
      <span class="ending-level">{{endingLevelText}}</span>
      <svg class="arrow" :class="levelUp ? 'up' : ''" view-box="0 0 20 20" height="20" width="20">
        <path :d="levelUp ? mdiUpArrowThick : mdiDownArrowThick" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useStudyStore } from "../stores/study";
import { SRSLevel, SRSLevelText, SubjectType, SubmittedReviewData } from "../types"

const { item } = defineProps<{
  item: SubmittedReviewData
}>()
const studyStore = useStudyStore()


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

const subjectData = computed(() => {
  return Object.values(studyStore.resultRecord).find(r => r.assignment_id == item.assignment_id)
})

const levelUp = item.starting_srs_stage < item.ending_srs_stage
const endingLevel   = SRSLevelToText(item.ending_srs_stage)
const endingLevelText = SRSLevelToLeveledText(item.ending_srs_stage)

const arrowColor = levelUp ? 'var(--success-color)' : 'var(--error-color)'
const containerBorder = computed(() => `3px solid ${levelColors[endingLevel.toLowerCase() as Lowercase<SRSLevelText>]}`)
const containerBoxShadow = computed(() => `inset 0px 0px 10px ${levelColors[endingLevel.toLowerCase() as Lowercase<SRSLevelText>]}`)
const characterColor = computed(() => {
  if(!subjectData.value) return ""
  return colors[subjectData.value.subjectData.subject_type]
})

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

function SRSLevelToLeveledText(level: SRSLevel): string {
  switch(level){
    case SRSLevel.Locked:
      return "Locked" // Shouldn't ever happen
    case SRSLevel.Apprentice_1:
      return "Apprentice ⁰⁄₄"
    case SRSLevel.Apprentice_2:
      return "Apprentice ¹⁄₄"
    case SRSLevel.Apprentice_3:
      return "Apprentice ²⁄₄"
    case SRSLevel.Apprentice_4:
      return "Apprentice ³⁄₄"
    case SRSLevel.Guru_1:
      return "Guru ⁰⁄₂"
    case SRSLevel.Guru_2:
      return "Guru ¹⁄₂"
    case SRSLevel.Master:
      return "Master ⁰⁄₁"
    case SRSLevel.Enlightened:
      return "Enlightened ⁰⁄₁"
    case SRSLevel.Burned:
      return "Burned 🔥"
  }
}

const mdiUpArrowThick = 'M14 20h-4v-9l-3.5 3.5l-2.42-2.42L12 4.16l7.92 7.92l-2.42 2.42L14 11z'
const mdiDownArrowThick = 'M10 4h4v9l3.5-3.5l2.42 2.42L12 19.84l-7.92-7.92L6.5 9.5L10 13z'
</script>

<style scoped>
.result-item {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  padding: 0.5rem 1.5rem;
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

.ending-level {
  display: flex;
  align-items: center;
  line-height: 10px;
}

.arrow {
  fill: v-bind(arrowColor);
  font-size: 1.5rem;
  transform: translateY(-3px);
}

.arrow.up {
  transform: translateY(-5px);
}
</style>
