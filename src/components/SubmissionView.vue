<template>
  <h4>Study Results</h4>
  <SubmissionItem
    v-for="submissionItem in submissionItems"
    :key="submissionItem.subject_id"
    :submissionItem="submissionItem"
  />
  <div class="button-row">
    <button class="submit-button" @click="$emit('on-submit')">
      <span>Submit</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudyStore } from '../stores/study'

import SubmissionItem from './SubmissionItem.vue'

const studyStore = useStudyStore()

const submissionItems = computed(() => Object.values(studyStore.resultRecord))
</script>

<style scoped>
.button-row {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}
.submit-button {
  all: unset;
  border: 3px solid var(--info-color);
  color: var(--info-color);
  border-radius: 5px;
  width: 12rem;
  height: 3rem;
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset 0px 0px 10px var(--info-color);
}

.submit-button > span {
  transform: translateY(3px);
}

.submit-button:not(:disabled):hover {
  cursor: pointer;
}

.submit-button:hover,
.submit-button:focus {
  border: 3px solid var(--info-color);
  background-color: var(--info-color);
  color: var(--background-color);
}
</style>
