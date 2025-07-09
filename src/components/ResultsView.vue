<template>
  <div class="results-view">
    <template v-for="result in successfulSubmissions">
      <ResultItem :item="result" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ResultItem from './ResultItem.vue'

import { useStudyStore } from '../stores/study'
const studyStore = useStudyStore()

const successfulSubmissions = computed(() => {
  console.log(studyStore.studyResults)
  return studyStore.studyResults.filter(r => r.type == 'success').map(r => r.data)
})
</script>

<style scoped>
.results-view {
  display: flex;
  flex-wrap: wrap;
  margin: auto;
  margin-top: 10px;
  width: 100%;
  gap: 1rem;
  justify-content: center;
}
</style>
