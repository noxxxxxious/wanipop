<template>
  <div class="submission-item-wrapper">
    <div class="characters">
      {{ submissionItem.characters }}
    </div>
    <div class="meanings">
      <div class="accepted-meanings">
        <span class="soft-text">Accepted Meanings</span><br>{{submissionItem.subjectData.meanings.filter(m => m.accepted_answer).map(m => m.meaning).join(', ')}}</div>
      <div class="submitted-meaning">
        <span class="soft-text">Submitted Meaning</span><br>{{submissionItem.meaning_attempt}}</div>
    </div>
    <div v-if="submissionItem.subjectData.readings" class="readings">
      <div class="accepted-readings">
        <span class="soft-text">Accepted Readings</span><br>
        <span
            v-for="reading in submissionItem.subjectData.readings.filter(r => r.accepted_answer)"
            :class="'reading ' + (reading.type ?? '')"
          >
            {{ getReadingText(reading) }}
          </span>
      </div>
      <div class="submitted-reading">
        <span class="soft-text">Submitted Reading</span><br>{{submissionItem.reading_attempt}}</div>
    </div>
    <div class="switch-container">
      <label class="switch">
        <input type="checkbox" v-model="isCorrect" @change="flipResult">
        <span class="slider"></span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Reading, ReviewResult, SubjectType } from '../types'
import * as wanakana from 'wanakana'

import { useStudyStore } from '../stores/study'
const studyStore = useStudyStore()

const props = defineProps<{
  submissionItem: ReviewResult
}>()

const colors: Record<SubjectType, string> = {
  radical:         "var(--radical)", // Catppuccin Macchiato “Blue”
  kanji:           "var(--kanji)", // Catppuccin Macchiato “Yellow”
  vocabulary:      "var(--vocabulary)", // Catppuccin Macchiato “Green”
  kana_vocabulary: "var(--kana_vocabulary)", // Catppuccin Macchiato “Teal”
}

const isCorrect = ref(false)
const correctOrIncorrectColor = computed(() => {
  if(!isCorrect.value) {
    return 'var(--error-color)'
  } else {
    return 'var(--success-color)'
  }
})

const characterColor = computed(() => colors[props.submissionItem.subjectData.subject_type])
const containerBorder = computed(() => `3px solid ${correctOrIncorrectColor.value}`)

onMounted(() => {
  isCorrect.value = props.submissionItem.meaning === 'correct' && (!props.submissionItem.reading || props.submissionItem.reading === 'correct')
})

function getReadingText(reading: Reading) {
  if(reading.type == 'onyomi') {
    return wanakana.toKatakana(reading.reading as string)
  } else {
    return reading.reading as string
  }
}

function flipResult() {
  studyStore.resultRecordFlipBySubjectId(props.submissionItem.subject_id, !isCorrect.value)
}
</script>

<style scoped>
.submission-item-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  padding: 10px 1rem;
  border-radius: 10px;
  margin-bottom: 10px;
  transition: border 0.4s ease;
  border: v-bind(containerBorder);
  gap: 1rem;
}

.characters {
  display: flex;
  align-items: center;
  font-size: 3rem;
  color: v-bind(characterColor);
  flex-grow: 1;
}

.meanings,
.readings {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  max-width: 10rem;
  gap: 1rem;
}

.soft-text {
  color: var(--soft-text);
  text-decoration: underline;
}

.reading {
  color: var(--success-color);
}

.reading:not(:last-child)::after {
  color: var(--text-color);
  content: "、";
}

.onyomi {
  color: var(--warning-color);
}

.submitted-meaning,
.submitted-reading {
  color: var(--info-color);
}

.switch-container {
  display: flex;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 60px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--container-background);
  border-radius: 7px;
}

.slider::before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s ease;
  border-radius: 5px;
}

input:checked + .slider::before {
  transform: translateY(-25px);
  background-color: var(--success-color);
}

input:not(:checked) + .slider::before {
  background-color: var(--error-color);
}

input:focus + .slider {
  box-shadow: 0px 2px 2px rgba(0,0,0,0.3),
    inset 0px 0px 2px var(--text-color);
}
</style>
