<template>
  <div class="settings-view">
    <div class="close-button" @click="$emit('onClose', settingsChanged)">
      <svg view-box="0 0 24 24" height="24" width="24">
        <path :d="mdiCloseThick" />
      </svg>
    </div>
    <h3>🛠️ Settings 🛠️</h3>
    <h5>
      If you make changes and the app stops working,<br>
      it may be due to rate limiting by WK.<br>
      Try again after a few minutes once the limiting has passed!
    </h5>
    <div class="settings-list">
      <div class="api-key">
        <label for="wk-key">WaniKani API Key</label>
        <div class="input-wrapper">
          <input :type="apiKeyIsVisible ? 'text' : 'password'" name="wk-key" v-model="wanikaniApiKey" />
          <div class="api-visible-button" @click="() => { apiKeyIsVisible = !apiKeyIsVisible}">
            <svg view-box="0 0 24 24" height="24" width="24">
              <path :d="apiKeyIsVisible ? mdiEyeOffOutline : mdiEyeOutline" />
            </svg>
          </div>
        </div>
      </div>
      <div class="input-wrapper flex">
        <label for="time-between">
          <span>Minutes Between Study Sessions</span>
          <span class="minmax">Minimum: 5, Previous: {{ originalTimeBetweenPopupsInMinutes }}</span>
        </label>
        <input
          type="number"
          name="time-between"
          v-model="timeBetweenPopupsInMinutes"
        />
      </div>
      <div class="input-wrapper flex">
        <label for="batch-size">
          <span>Study Items per Session</span>
          <span class="minmax">Minimum: 5, Maximum: 30, Previous: {{ originalNumOfReviewsPerBatch }} </span>
        </label>
        <input
          type="number"
          name="batch-size"
          v-model="numOfReviewsPerBatch"
        />
      </div>
      <div class="input-wrapper flex">
        <label for="window-decorations">
          <span>Hide Window Decorations (Titlebar)</span>
          <span class="minmax">Previous: {{ originalHideWindowDecorations ? 'On' : 'Off'}}</span>
        </label>
        <div class="checkbox-wrapper">
          <input
            type="checkbox"
            name="window-decorations"
            v-model="hideWindowDecorations"
          />
          <svg view-box="0 0 24 24" height="24" width="24">
            <path :d="hideWindowDecorations ? mdiCheckBold : ''" />
          </svg>
        </div>
      </div>
      <div class="button-row">
        <button
          class="review-button correct"
          type="button"
          :disabled="!canSubmitChanges"
          @click="saveChanges"
        >
          <span>Save</span>
        </button>
        <button
          class="review-button incorrect"
          type="button"
          :disabled="!canSubmitChanges"
          @click="revertChanges"
        >
          <span>Cancel</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { WanipopConfig } from '../types';

defineEmits(['onClose'])

const wanikaniApiKey = ref("" as String)
const numOfReviewsPerBatch = ref(5)
const timeBetweenPopupsInMinutes = ref(60)
const hideWindowDecorations = ref(false)

let originalWanikaniApiKey = ref("" as String)
let originalNumOfReviewsPerBatch = ref(5)
let originalTimeBetweenPopupsInMinutes = ref(60)
let originalHideWindowDecorations = ref(false)

const apiKeyIsVisible = ref(false)

let settingsChanged = false

const apiKeyVisibleBackgroundHoverColor = computed(() => {
  return apiKeyIsVisible.value ? 'var(--success-color)' : 'var(--error-color)'
})

onMounted(async () => {
  const config = await invoke('get_config') as WanipopConfig

  originalWanikaniApiKey.value = config.wanikani_api_key ? config.wanikani_api_key : ""
  originalNumOfReviewsPerBatch.value = config.num_of_reviews_per_batch
  originalTimeBetweenPopupsInMinutes.value = config.time_between_popups_in_minutes
  originalHideWindowDecorations.value = config.hide_window_decorations

  wanikaniApiKey.value = originalWanikaniApiKey.value
  numOfReviewsPerBatch.value = originalNumOfReviewsPerBatch.value
  timeBetweenPopupsInMinutes.value = originalTimeBetweenPopupsInMinutes.value
  hideWindowDecorations.value = originalHideWindowDecorations.value

  console.log('Config loaded from file')
})

const canSubmitChanges = computed(() => 
  // One of the values must be different from the original
  (wanikaniApiKey.value != originalWanikaniApiKey.value
  || timeBetweenPopupsInMinutes.value != originalTimeBetweenPopupsInMinutes.value
  || numOfReviewsPerBatch.value != originalNumOfReviewsPerBatch.value
  || hideWindowDecorations.value != originalHideWindowDecorations.value)

  && 

  // numOfReviewsPerBatch limits
  (numOfReviewsPerBatch.value >= 5
  && numOfReviewsPerBatch.value <= 30)

  &&

  // timeBetweenPopupsInMinutes limits
  (timeBetweenPopupsInMinutes.value >= 5)
)

function revertChanges() {
  wanikaniApiKey.value = originalWanikaniApiKey.value
  numOfReviewsPerBatch.value = originalNumOfReviewsPerBatch.value
  timeBetweenPopupsInMinutes.value = originalTimeBetweenPopupsInMinutes.value
  hideWindowDecorations.value = originalHideWindowDecorations.value
}

async function saveChanges() {
  if(wanikaniApiKey.value != originalWanikaniApiKey.value) {
    console.info(`Updating api key from ${originalWanikaniApiKey.value} to ${wanikaniApiKey.value}`)
    await invoke('set_api_key', { key: wanikaniApiKey.value })
    originalWanikaniApiKey.value = wanikaniApiKey.value
    settingsChanged = true
  }

  if(numOfReviewsPerBatch.value != originalNumOfReviewsPerBatch.value) {
    console.info(`Updating number of reviews per batch from ${originalNumOfReviewsPerBatch.value} to ${numOfReviewsPerBatch.value}`)
    await invoke('set_num_of_reviews_per_batch', { newValue: numOfReviewsPerBatch.value })
    originalNumOfReviewsPerBatch.value = numOfReviewsPerBatch.value
    settingsChanged = true
  }

  if(timeBetweenPopupsInMinutes.value != originalTimeBetweenPopupsInMinutes.value) {
    console.info(`Updating time between popups in minutes from ${originalTimeBetweenPopupsInMinutes.value} to ${timeBetweenPopupsInMinutes.value}`)
    await invoke('set_time_between_popups_in_minutes', { newValue: timeBetweenPopupsInMinutes.value })
    originalTimeBetweenPopupsInMinutes.value = timeBetweenPopupsInMinutes.value
    settingsChanged = true
  }

  if(hideWindowDecorations.value != originalHideWindowDecorations.value) {
    console.info(`Updating hide window decorations from ${originalHideWindowDecorations.value} to ${hideWindowDecorations.value}`)
    await invoke('set_hide_window_decorations', { newValue: hideWindowDecorations.value })
    originalHideWindowDecorations.value = hideWindowDecorations.value
    settingsChanged = true
  }
}

const mdiEyeOutline = 'M12 9a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0a9.821 9.821 0 0 0-17.64 0'
const mdiEyeOffOutline = 'M2 5.27L3.28 4L20 20.72L18.73 22l-3.08-3.08c-1.15.38-2.37.58-3.65.58c-5 0-9.27-3.11-11-7.5c.69-1.76 1.79-3.31 3.19-4.54zM12 9a3 3 0 0 1 3 3a3 3 0 0 1-.17 1L11 9.17A3 3 0 0 1 12 9m0-4.5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-4 5.19l-1.42-1.43A9.86 9.86 0 0 0 20.82 12A9.82 9.82 0 0 0 12 6.5c-1.09 0-2.16.18-3.16.5L7.3 5.47c1.44-.62 3.03-.97 4.7-.97M3.18 12A9.82 9.82 0 0 0 12 17.5c.69 0 1.37-.07 2-.21L11.72 15A3.064 3.064 0 0 1 9 12.28L5.6 8.87c-.99.85-1.82 1.91-2.42 3.13'
const mdiCheckBold = 'm9 20.42l-6.21-6.21l2.83-2.83L9 14.77l9.88-9.89l2.83 2.83z'
const mdiCloseThick = 'M20 6.91L17.09 4L12 9.09L6.91 4L4 6.91L9.09 12L4 17.09L6.91 20L12 14.91L17.09 20L20 17.09L14.91 12z'
</script>

<style scoped>
.close-button {
  position: fixed;
  top: 15px;
  right: 20px;
  fill: var(--soft-text);
  padding: 0.5rem;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--background-color);
  outline: none;
}

.close-button:hover {
  cursor: pointer;
  fill: var(--background-color);
  background-color: var(--error-color);
}

h3 {
  margin-bottom: 0;
}

h5 {
  margin-top: 0;
  font-weight: 400;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-wrapper {
  position: relative;
  margin: auto;
  width: 80%;
  display: flex;
}

label {
  display: flex;
  flex-direction: column;
}

.minmax {
  color: var(--soft-text);
  font-size: 0.8rem;
}

input {
  all: unset;
  box-sizing: border-box;
  background-color: var(--container-background);
  box-shadow: 0px 2px 2px rgba(0,0,0,0.3);
  padding-top: 6px;
  text-align: center;
  border-radius: 5px;
  font-size: 1rem;
  height: 3rem;
  color: var(--text-color);
  outline: none;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  width: 10%;
}

.checkbox-wrapper {
  width: 10%;
  height: 3rem;
  position: relative;
  display: flex;
}

.checkbox-wrapper svg {
  position: absolute;
  top: 75%;
  left: 75%;
  height: 100%;
  width: 100%;
  transform: translate(-50%, -50%);
  user-select: none;
  pointer-events: none;
  fill: var(--background-color);
}

input[type="checkbox"] {
  width: 100%;
}

input[type="checkbox"]:hover {
  cursor: pointer;
  background-color: var(--success-color);
}

input[type="checkbox"]:checked {
  background-color: var(--success-color);
}

input[type="checkbox"]:checked:hover {
  background-color: var(--error-color);
}

.api-key input {
  width: 90%;
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}

.api-visible-button {
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  background-color: var(--floating-menu-background-color);
  fill: var(--text-color);
  box-shadow: 0px 2px 2px rgba(0,0,0,0.3);
  width: 10%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.api-visible-button:hover {
  cursor: pointer;
  background-color: v-bind(apiKeyVisibleBackgroundHoverColor);
  fill: var(--background-color);
}

input:focus-within {
  box-shadow: 0px 2px 2px rgba(0,0,0,0.3),
    inset 0px 0px 2px var(--text-color);
}

.flex {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.button-row {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.review-button {
  all: unset;
  border: 3px solid var(--container-background);
  color: var(--container-background);
  border-radius: 5px;
  width: 8rem;
  height: 3rem;
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
}

.review-button > span {
  transform: translateY(3px);
}

.review-button:not(:disabled):hover {
  cursor: pointer;
}

.review-button:not(:disabled).correct {
  border: 3px solid var(--success-color);
  color: var(--success-color);
  box-shadow: inset 0px 0px 10px var(--success-color);
}

.review-button:not(:disabled).correct:hover,
.review-button:not(:disabled).correct:focus {
  border: 3px solid var(--success-color);
  background-color: var(--success-color);
  color: var(--background-color);
}

.review-button:not(:disabled).incorrect {
  border: 3px solid var(--error-color);
  color: var(--error-color);
  box-shadow: inset 0px 0px 10px var(--error-color);
}

.review-button:not(:disabled).incorrect:hover,
.review-button:not(:disabled).incorrect:focus {
  border: 3px solid var(--error-color);
  background-color: var(--error-color);
  color: var(--background-color);
}
</style>
