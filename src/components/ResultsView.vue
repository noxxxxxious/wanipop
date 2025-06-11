<template>
  <div class="results-view">
    <template v-for="result in studyStore.studyResults">
      <ResultItem :item="result" />
    </template>
  </div>
</template>

<script setup lang="ts">
import ResultItem from './ResultItem.vue'

import { useStudyStore } from '../stores/study'
const studyStore = useStudyStore()
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
