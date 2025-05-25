<template>
  <main class="container">
    <h1>WaniPOP!</h1>
    <section class="app-wrapper">
      <div v-if="showSettings">
        <SettingsView />
      </div>
      <div v-else-if="fetchingReviews && !finishedStudySession">
        Loading review items...
      </div>
      <div v-else-if="finishedStudySession && fetchingResults">
        Submitting results to WaniKani...
      </div>
      <div v-else-if="finishedStudySession">
        🎉 Study completed! 🎉<br>
        Close the window when you're done!
        <ResultsView />
      </div>
      <QuizView @completed-study="getResults" v-else />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event';
import { ResultDisplay, ReviewCard, ReviewTask, SubmittedReviewData } from './types'

import SettingsView from './components/SettingsView.vue';
import ResultsView from './components/ResultsView.vue';
import QuizView from './components/QuizView.vue';

import { useStudyStore } from './stores/study';
const studyStore = useStudyStore()

const fetchingReviews = ref(false)
const finishedStudySession = ref(false)
const fetchingResults = ref(false)
const showSettings = ref(true)

onMounted(() => {
  // startSession()
  // listen('reset-session', () => startSession())
})

async function startSession() {
  studyStore.resetStore()
  fetchingReviews.value = true
  finishedStudySession.value = false
  const batch = await invoke('get_review_batch') as ReviewCard[]
  console.log('Fetching reviews...')

  const reviewItems = {} as Record<number, ReviewCard>
  const reviewStack = [] as ReviewTask[]

  batch.forEach(reviewItem => {
    reviewItems[reviewItem.subject_id] = reviewItem

    switch(reviewItem.subject_type) {
      case 'radical':
      case 'kana_vocabulary':
        const newTask: ReviewTask = {
          review_type: 'meaning',
          review_item: reviewItem
        }
        reviewStack.push(newTask)
        break
      case 'kanji':
      case 'vocabulary':
        const newMeaningTask: ReviewTask = {
          review_type: 'meaning',
          review_item: reviewItem
        }
        const newReadingTask: ReviewTask = {
          review_type: 'reading',
          review_item: reviewItem
        }
        reviewStack.push(newReadingTask, newMeaningTask)
        break
    }
  })
  studyStore.setReviewItems(reviewItems)
  studyStore.setReviewStack(reviewStack)
  fetchingReviews.value = false
}

async function getResults() {
  fetchingResults.value = true
  finishedStudySession.value = true
  const payload = studyStore.getSubmittableResults()
  console.info('Submitting the following results: ', payload)
  const response = await invoke("submit_review_batch", { payload }) as SubmittedReviewData[]
  console.info('Received response from Wanikani: ', response)
  const results: ResultDisplay[] = response.map(result => {
    const subject_data = studyStore.reviewItems[result.subject_id]!
    return {
      subject_data,
      ...result
    }
  })
  console.info('Results:', results)
  studyStore.setStudyResults(results)
  fetchingResults.value = false
}
</script>

<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  /* Light Mode */
  --background-color: #f5f5f5;
  --container-background: #ffffff;
  --button-background: #007bff;
  --button-hover-background: #0056b3;
  --button-text-color: #ffffff;
  --text-color: #000000;
  --error-color: #ff4d4f;
  --success-color: #28a745;
  --info-color: #17a2b8;
  --warning-color: #ffc107;
  --first-color: #007bff;
  --first-color-hover: #0056b3;
  --second-color: #28a745;
  --second-color-hover: #1e7e34;
  --third-color: #9b59b6;
  --third-color-hover: #8849a0;
  --fourth-color: #6fa3ef;
  --fourth-color-hover: #5a8ed7;
  --input-background-color: #ffffff;
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  --divider-color: rgba(0, 0, 0, 0.1);
  --soft-text: #888888;
  --soft-background-color: #e0e0e0;
  --toast-background-color: #ffffff;
  --floating-menu-background-color: #ffffff;
  --floating-menu-button-hover-color: #f0f0f0;
}

/* Manual Light Theme */
body[data-theme='light'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  --background-color: #f5f5f5;
  --container-background: #ffffff;
  --button-background: #007bff;
  --button-hover-background: #0056b3;
  --button-text-color: #ffffff;
  --text-color: #000000;
  --error-color: #ff4d4f;
  --success-color: #28a745;
  --info-color: #17a2b8;
  --warning-color: #ffc107;
  --first-color: #007bff;
  --first-color-hover: #0056b3;
  --second-color: #28a745;
  --second-color-hover: #1e7e34;
  --third-color: #9b59b6;
  --third-color-hover: #8849a0;
  --fourth-color: #6fa3ef;
  --fourth-color-hover: #5a8ed7;
  --input-background-color: #ffffff;
  --divider-color: rgba(0, 0, 0, 0.1);
  --soft-text: #666666;
  --soft-background-color: #f5f5f5;
  --toast-background-color: #ffffff;
  --floating-menu-background-color: #ffffff;
  --floating-menu-button-hover-color: #f0f0f0;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark Mode */
    --background-color: #121212;
    --container-background: #1e1e1e;
    --button-background: #0069d9;
    --button-hover-background: #004a91;
    --button-text-color: #ffffff;
    --text-color: #ffffff;
    --error-color: #cf6679;
    --success-color: #20c163;
    --info-color: #2196f3;
    --warning-color: #ffb74d;
    --first-color: #0069d9;
    --first-color-hover: #338ae9;
    --second-color: #20c163;
    --second-color-hover: #3dd77e;
    --third-color: #a569bd;
    --third-color-hover: #b27cc8;
    --fourth-color: #6fa3ef;
    --fourth-color-hover: #82b1f3;
    --input-background-color: #2a2a2a;
    --divider-color: rgba(255, 255, 255, 0.1);
    --soft-text: #aaaaaa;
    --soft-background-color: #333333;
    --toast-background-color: #2a2a2a;
    --floating-menu-background-color: #2a2a2a;
    --floating-menu-button-hover-color: #3a3a3a;
  }
}

/* Manual Dark Theme */
body[data-theme='dark'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  --background-color: #121212;
  --container-background: #1e1e1e;
  --button-background: #0069d9;
  --button-hover-background: #004a91;
  --button-text-color: #ffffff;
  --text-color: #ffffff;
  --error-color: #cf6679;
  --success-color: #20c163;
  --info-color: #2196f3;
  --warning-color: #ffb74d;
  --first-color: #0069d9;
  --first-color-hover: #338ae9;
  --second-color: #20c163;
  --second-color-hover: #3dd77e;
  --third-color: #a569bd;
  --third-color-hover: #b27cc8;
  --fourth-color: #6fa3ef;
  --fourth-color-hover: #82b1f3;
  --input-background-color: #2a2a2a;
  --divider-color: rgba(255, 255, 255, 0.1);
  --soft-text: #aaaaaa;
  --soft-background-color: #333333;
  --toast-background-color: #2a2a2a;
  --floating-menu-background-color: #2a2a2a;
  --floating-menu-button-hover-color: #3a3a3a;
}

/* Dracula Theme */
body[data-theme='dracula'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  --background-color: #282a36;
  --container-background: #44475a;
  --button-background: #50fa7b;
  --button-hover-background: #6272a4;
  --button-text-color: #f8f8f2;
  --text-color: #f8f8f2;
  --error-color: #ff5555;
  --success-color: #bd93f9;
  --info-color: #8be9fd;
  --warning-color: #f1fa8c;
  --first-color: #50fa7b;
  --first-color-hover: #66ff99;
  --second-color: #bd93f9;
  --second-color-hover: #d8b6ff;
  --third-color: #ff79c6;
  --third-color-hover: #ff92da;
  --fourth-color: #6fa3ef;
  --fourth-color-hover: #85b5f6;
  --input-background-color: #5a5c73;
  --divider-color: rgba(255, 255, 255, 0.1);
  --soft-text: #aaaaaa;
  --soft-background-color: #3e3e4e;
  --toast-background-color: #3a3c4a;
  --floating-menu-background-color: #3a3c4a;
  --floating-menu-button-hover-color: #4b4d5e;
}

/* Catppuccin Themes */
body[data-theme='catppuccin-latte'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  --background-color: #acb0be;
  --container-background: #eff1f5;
  --button-background: #7287fd;
  --button-hover-background: #8839ef;
  --button-text-color: #ffffff;
  --text-color: #4c4f69;
  --error-color: #d20f39;
  --success-color: #40a02b;
  --info-color: #04a5e5;
  --warning-color: #df8e1d;
  --first-color: #7287fd;
  --first-color-hover: #5b6ff1;
  --second-color: #40a02b;
  --second-color-hover: #348627;
  --third-color: #8839ef;
  --third-color-hover: #7c2bd7;
  --fourth-color: #e8a0bb;
  --fourth-color-hover: #d78fab;
  --input-background-color: #eff1f5;
  --divider-color: rgba(0, 0, 0, 0.1);
  --soft-text: #7c849b;
  --soft-background-color: #cbd2e0;
  --toast-background-color: #eff1f5;
  --floating-menu-background-color: #eff1f5;
  --floating-menu-button-hover-color: #dcdfe6;
}

body[data-theme='catppuccin-frappe'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  --background-color: #303446;
  --container-background: #292c3c;
  --button-background: #8caaee;
  --button-hover-background: #ca9ee6;
  --button-text-color: #c6d0f5;
  --text-color: #c6d0f5;
  --error-color: #e78284;
  --success-color: #a6d189;
  --info-color: #99d1db;
  --warning-color: #e5c890;
  --first-color: #8caaee;
  --first-color-hover: #a0bff2;
  --second-color: #a6d189;
  --second-color-hover: #c4e3a5;
  --third-color: #ca9ee6;
  --third-color-hover: #e2b1f0;
  --fourth-color: #e78fb3;
  --fourth-color-hover: #f199bf;
  --input-background-color: var(--background-color);
  --divider-color: rgba(255, 255, 255, 0.1);
  --soft-text: #b0b7d0;
  --soft-background-color: #404452;
  --toast-background-color: #2f3242;
  --floating-menu-background-color: #2f3242;
  --floating-menu-button-hover-color: #3a3e4e;
}

body[data-theme='catppuccin-macchiato'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  --background-color: #24273a;
  --container-background: #363a4f;
  --button-background: #8aadf4;
  --button-hover-background: #c6a0f6;
  --button-text-color: #cad3f5;
  --text-color: #cad3f5;
  --error-color: #ed8796;
  --success-color: #a6da95;
  --info-color: #91d7e3;
  --warning-color: #eed49f;
  --first-color: #8aadf4;
  --first-color-hover: #a1c8ff;
  --second-color: #a6da95;
  --second-color-hover: #bef0b0;
  --third-color: #c6a0f6;
  --third-color-hover: #d8afff;
  --fourth-color: #de93d0;
  --fourth-color-hover: #f2a7e3;
  --input-background-color: #4a4e65;
  --divider-color: rgba(255, 255, 255, 0.1);
  --soft-text: #b0b7d0;
  --soft-background-color: #2a2d3f;
  --toast-background-color: #2d3042;
  --floating-menu-background-color: #2d3042;
  --floating-menu-button-hover-color: #393c54;
}

body[data-theme='catppuccin-mocha'] {
  --input-box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  --background-color: #1e1e2e;
  --container-background: #313244;
  --button-background: #89b4fa;
  --button-hover-background: #cba6f7;
  --button-text-color: #cad3f5;
  --text-color: #cad3f5;
  --error-color: #f38ba8;
  --success-color: #a6e3a1;
  --info-color: #89dceb;
  --warning-color: #f9e2af;
  --first-color: #89b4fa;
  --first-color-hover: #a5ccff;
  --second-color: #a6e3a1;
  --second-color-hover: #bef3b5;
  --third-color: #cba6f7;
  --third-color-hover: #e1b0ff;
  --fourth-color: #f38ba8;
  --fourth-color-hover: #ff99bb;
  --input-background-color: #414355;
  --divider-color: rgba(255, 255, 255, 0.1);
  --soft-text: #b0b7d0;
  --soft-background-color: #46475f;
  --toast-background-color: #28283a;
  --floating-menu-background-color: #28283a;
  --floating-menu-button-hover-color: #34364a;
}

/* TODO: Set this up for other themes too */
:root{
  --radical:         #8AADF4;
  --kanji:           #EED49F;
  --vocabulary:      #A6DA95;
  --kana_vocabulary: #8BD5CA;

  --apprentice:      #ED8796;
  --guru:            #8AADF4;
  --master:          #8BD5CA;
  --enlightened:     #A6DA95;
  --burned:          #181926;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--background-color);
  color: var(--text-color);
  height: 100vh;
  text-align: center;
}

main {
  padding: 1rem;
  max-width: 600px;
}
</style>
