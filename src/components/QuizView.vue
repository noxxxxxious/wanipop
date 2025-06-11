<template>
  <div v-if="reviewItem" class="quiz-view">
    <div class="item-characters">{{ reviewItem.review_item.characters }}</div>
    <input
      ref="answerInput"
      class="answer-input"
      type="text"
      :disabled="!!lastAttempt"
      :placeholder="placeholderText"
      @keyup.enter.prevent="checkAnswer"
      v-model="userInput"
    />
    <div class="readings-row">
      <template v-if="!!lastAttempt && reviewItem.review_type == 'reading'">
        <span
          v-for="reading in reviewItem.review_item.readings!.filter(r => r.accepted_answer)"
          :class="'reading ' + (reading.type ?? '')"
        >
          {{ getReadingText(reading) }}
        </span>
      </template>
      <template v-else-if="!!lastAttempt && reviewItem.review_type == 'meaning'">
        <span class="meanings">
          {{ reviewItem.review_item.meanings.filter(m => m.accepted_answer).map(m => m.meaning).join(', ') }}
        </span>
      </template>
    </div>
    <div class="button-row">
      <button
        ref="nextButton"
        class="review-button"
        type="button"
        :disabled="!lastAttempt"
        :class="lastAttempt ? lastAttempt : ''"
        @click.prevent="checkAnswer()"
      >
        <span>Next</span>
      </button>
      <button
        class="review-button"
        type="button"
        :disabled="!lastAttempt"
        :class="invertedLastAttempt"
        @click.prevent="flipAnswer()"
      >
        <span>Flip</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { Reading, ReviewTask } from '../types';
import * as wanakana from 'wanakana'

import { useStudyStore } from '../stores/study';
const studyStore = useStudyStore()

const answerInput      = ref(null as HTMLInputElement  | null)
const nextButton       = ref(null as HTMLButtonElement | null)
const lastAttempt      = ref(undefined as 'correct' | 'incorrect' | undefined)
const userInput        = ref('')
let   wanakanaIsBinded = false
let   wanakanaMode     = 'off' as 'hiragana' | 'katakana' | 'off'

const emit = defineEmits(['completedStudy'])

const reviewItem = computed(() => studyStore.reviewStack[studyStore.reviewStack.length -1])
const paddingHackForJapanese = computed(() => userInput.value ? '0px' : '6px')

watch(reviewItem, (newReviewItem, oldReviewItem) => {
  if(!newReviewItem) {
    console.info('next review item is undefined. study must be finished. doing nothing in reviewItem watcher')
    return
  }
  console.log('reviewItem changed. Checking to see if IME should update')
  if(newReviewItem.review_type == 'meaning'
    && oldReviewItem.review_type == 'meaning') return
  if(newReviewItem.review_type == 'reading'
    && oldReviewItem.review_type == 'reading'
    && newReviewItem.review_item.subject_type == oldReviewItem
    .review_item.subject_type) return

  bindWanakana(newReviewItem)
})

onMounted(() => {
  console.log('reviewItem:', reviewItem)
})

//Attach IME once answerInput is ready
watch(answerInput, (newRef, oldRef) => {
  console.info('Detected answerInput change')
  if(newRef && !oldRef && reviewItem.value) {
    console.info('answerInput ready')
    bindWanakana(reviewItem.value)
  }
}, { once: true })

function bindWanakana(reviewItem: ReviewTask) {
  if(!answerInput.value) {
    console.error('Tried to bind wanakana but answerInput ref is undefined')
    return
  }

  if(wanakanaIsBinded) {
    console.info('Unbinding IME')
    wanakana.unbind(answerInput.value)
    wanakanaIsBinded = false
    wanakanaMode = 'off'
  }

  //If different from last item, change the IME
  if(reviewItem.review_type == 'meaning'){
    console.info('Leaving IME off')
    return
  }

  if(reviewItem.review_item.subject_type == 'kanji'
    && reviewItem.review_item.readings![0].type == 'onyomi') {
    wanakana.bind(answerInput.value, { IMEMode: 'toKatakana' })
    wanakanaIsBinded = true
    wanakanaMode = 'katakana'
    console.info('Binding in Katakana mode')
    return
  }

  wanakana.bind(answerInput.value, { IMEMode: 'toHiragana' })
  wanakanaIsBinded = true
  wanakanaMode = 'hiragana'
  console.info('Binding in Hiragana mode')
}

function checkAnswer() {
  if(!userInput.value) return
  const answerAttempt = answerInput.value!.value
  console.info('checking answer')
  if(!reviewItem) {
    console.error('tried to check answer but reviewItem is undefined? reviewItem:', reviewItem)
    return
  }

  if(lastAttempt.value) {
    if(lastAttempt.value == 'incorrect') {
      //If incorrect, place at beginning of review stack so it gets reviewed again
      studyStore.reviewStackUnshift(reviewItem.value)
    }
    lastAttempt.value = undefined
    userInput.value = ''
    studyStore.reviewStackPop()

    if(studyStore.reviewStack.length <= 0)
      emit('completedStudy')

    setTimeout(() => {
      if(answerInput.value)
        answerInput.value.focus()
    })

    return
  }

  let correct = false
  let attempt = answerAttempt.toLowerCase().replace(/\s/g, '')

  if(reviewItem.value.review_type == 'meaning') {
    const acceptedAnswers = reviewItem.value.review_item.meanings.filter(m => m.accepted_answer)
    acceptedAnswers.forEach(meaning => {
      let correctMeaning = meaning.meaning.toLowerCase().replace(/\s/g, '')

      if(attempt == correctMeaning)
        correct = true
    })
  } else {
    const acceptedAnswers = reviewItem.value.review_item.readings!.filter(r => r.accepted_answer)
    acceptedAnswers.forEach(reading => {
      let correctReading  = wanakana.toHiragana(reading.reading as string)
      let hiraganaAttempt = wanakana.toHiragana(attempt)

      if(hiraganaAttempt == correctReading)
        correct = true
    })
  }

  if(correct) lastAttempt.value = 'correct'
  else        lastAttempt.value = 'incorrect'
  studyStore.resultRecordMark(reviewItem.value, correct, answerAttempt)

  // Fix visual bug of last kana getting changed back to romaji
  if(userInput.value.charAt(userInput.value.length - 1) == 'n'
  && userInput.value.charAt(userInput.value.length - 2) == 'n')
    userInput.value = userInput.value.slice(0, -1)
  if(wanakanaMode == 'hiragana')
    userInput.value = wanakana.toHiragana(userInput.value)
  else if(wanakanaMode == 'katakana')
    userInput.value = wanakana.toKatakana(userInput.value)

  setTimeout(() => {
    if(nextButton.value)
      nextButton.value.focus()
  })
}

function getReadingText(reading: Reading) {
  if(reading.type == 'onyomi') {
    return wanakana.toKatakana(reading.reading as string)
  } else {
    return reading.reading as string
  }
}

function flipAnswer() {
  console.info('Flipping answer...')
  if(!reviewItem) {
    console.error('Tried to flip null reviewItem: ', reviewItem)
    return
  }

  studyStore.resultRecordFlip(reviewItem.value)
  if(lastAttempt.value == 'correct')
    lastAttempt.value = 'incorrect'
  else
    lastAttempt.value = 'correct'

  setTimeout(() => {
    if(nextButton.value)
      nextButton.value.focus()
  })
}

const characterColor = computed(() => {
  if(!reviewItem.value) return 'var(--text-color)'
  return `var(--${reviewItem.value.review_item.subject_type})`
})

const placeholderText = computed(() => {
  if(!reviewItem) return 'No review items'
  let wordType
  switch(reviewItem.value.review_item.subject_type){
    case 'radical':
      wordType = 'Radical'
      break;
    case 'kanji':
      wordType = 'Kanji'
      break;
    case 'vocabulary':
    case 'kana_vocabulary':
      wordType = 'Vocabulary'
      break;
  }
  return `${wordType} ${ reviewItem.value.review_type == 'meaning' ? 'Meaning' : 'Reading' }`
})

const successOrErrorColor = computed(() => {
  switch(lastAttempt.value) {
    case 'correct':
      return 'var(--success-color)'
    case 'incorrect':
      return 'var(--error-color)'
    default:
      return 'var(--text-color)'
  }
})

const successOrErrorShadow = computed(() => {
  if(lastAttempt.value == undefined) {
    return 'none'
  } else {
    return `inset 0px 0px 10px ${successOrErrorColor.value}`
  }
})

const successOrErrorBorder = computed(() => {
  const style = '3px solid'
  switch(lastAttempt.value) {
    case 'correct':
      return `${style} var(--success-color)`
    case 'incorrect':
      return `${style} var(--error-color)`
    default:
      return `none`
  }
})

const invertedLastAttempt = computed(() => {
  if(!lastAttempt.value) return ''
  if(lastAttempt.value == 'correct') return 'incorrect'
  return 'correct'
})
</script>

<style scoped>
  .item-characters {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 5rem;
    height: 5rem;
    color: v-bind(characterColor);
  }

  .answer-input {
    all: unset;
    box-sizing: border-box;
    background-color: var(--container-background);
    box-shadow: 0px 2px 2px rgba(0,0,0,0.3);
    width: 80%;
    margin-top: 10px;
    padding-top: 6px;
    border-radius: 5px;
    border: v-bind(successOrErrorBorder);
    text-align: center;
    font-size: 2rem;
    height: 3rem;
    color: v-bind(successOrErrorColor);
    outline: none;
    box-shadow: v-bind(successOrErrorShadow);
  }

  .answer-input::placeholder {
    color: var(--input-background-color);
  }

  .answer-input[lang="ja"] {
    padding-top: v-bind(paddingHackForJapanese);
  }

  .answer-input:disabled {
    background-color: var(--soft-background-color);
  }

  .readings-row {
    margin-top: 0.75rem;
    font-size: 1.25rem;
    transform: translateY(3px);
    min-height: 2rem;
  }

  .reading:not(:last-child)::after {
    color: var(--text-color);
    content: "、";
  }

  input:focus-within {
    box-shadow: 0px 2px 2px rgba(0,0,0,0.3),
      inset 0px 0px 2px var(--text-color);
  }

  .kunyomi {
    color: var(--success-color);
  }

  .onyomi {
    color: var(--warning-color);
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

  .review-button.correct {
    border: 3px solid var(--success-color);
    color: var(--success-color);
    box-shadow: inset 0px 0px 10px var(--success-color);
  }

  .review-button.correct:hover,
  .review-button.correct:focus {
    border: 3px solid var(--success-color);
    background-color: var(--success-color);
    color: var(--background-color);
  }

  .review-button.incorrect {
    border: 3px solid var(--error-color);
    color: var(--error-color);
    box-shadow: inset 0px 0px 10px var(--error-color);
  }

  .review-button.incorrect:hover,
  .review-button.incorrect:focus {
    border: 3px solid var(--error-color);
    background-color: var(--error-color);
    color: var(--background-color);
  }
</style>
