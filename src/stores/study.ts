import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ResultDisplay, ReviewCard, ReviewResult, ReviewTask, WaniKaniResult } from '../types'

export const useStudyStore = defineStore('study', () => {
  let storeReviewItems  = ref({} as Record<number, ReviewCard>)
  let storeReviewStack  = ref([] as Array<ReviewTask>)
  let storeResultRecord = ref({} as Record<number, ReviewResult>)
  let storeStudyResults = ref([] as Array<ResultDisplay>)

  function resetStore() {
    console.info('Resetting studyStore')
    storeReviewItems.value  = {}
    storeReviewStack.value  = []
    storeResultRecord.value = {}
    storeStudyResults.value = []
  }

  const reviewItems  = computed(() => storeReviewItems.value)
  const reviewStack  = computed(() => storeReviewStack.value)
  const resultRecord = computed(() => storeResultRecord.value)
  const studyResults = computed(() => storeStudyResults.value)

  function setReviewItems  (reviewItems:  Record<number, ReviewCard>  ){ storeReviewItems.value   = reviewItems  }
  function setReviewStack  (reviewStack:  Array<ReviewTask>           ){ storeReviewStack.value   = reviewStack  }
  function setResultRecord (resultRecord: Record<number, ReviewResult>){ storeResultRecord.value  = resultRecord }
  function setStudyResults (studyResults: Array<ResultDisplay>        ){ storeStudyResults.value  = studyResults }

  function reviewStackPop() {
    storeReviewStack.value.pop()
  }

  function resultRecordMark(reviewItem: ReviewTask, correct: boolean) {
    const subjectId = reviewItem.review_item.subject_id
    if(!storeResultRecord.value[subjectId]) {
      storeResultRecord.value[subjectId] = {} as ReviewResult
    }

    storeResultRecord.value[subjectId].assignment_id = reviewItem.review_item.assignment_id
    storeResultRecord.value[subjectId].subject_id = reviewItem.review_item.subject_id
    storeResultRecord.value[subjectId].characters = reviewItem.review_item.characters
    console.log(reviewItem.review_item.characters)
    if(correct) {
      if(reviewItem.review_type == 'meaning'){
        console.log('got it')
        //Only record if we haven't yet so we don't overwrite
        if(!storeResultRecord.value[subjectId].meaning){
          storeResultRecord.value[subjectId].meaning = 'correct'
        }
      } else if(reviewItem.review_type == 'reading'){
        console.log('got it')
        //Only record if we haven't yet so we don't overwrite
        if(!storeResultRecord.value[subjectId].reading) {
          storeResultRecord.value[subjectId].reading = 'correct'
        }
      }
    } else {
      if(reviewItem.review_type == 'meaning') {
        console.log('not got it. answers: ', reviewItem.review_item.meanings.map(m => m.meaning).join(', '))
        if(!storeResultRecord.value[subjectId].meaning) {
          storeResultRecord.value[subjectId].meaning = 'incorrect'
        }
      } else if(reviewItem.review_type == 'reading') {
        console.log('not got it. answers:', reviewItem.review_item.readings!.map(r => r.reading).join(', '))
        if(!storeResultRecord.value[subjectId].reading) {
          storeResultRecord.value[subjectId].reading = 'incorrect'
        }
      }
    }

    console.dir(storeResultRecord.value)
  }

  function resultRecordFlip(subject: ReviewTask) {
    const subjectId = subject.review_item.subject_id
    const meaningOrReading = subject.review_type
    if(!storeResultRecord.value[subjectId]) {
      console.error('Error below. storeResultRecord.value: ', storeResultRecord.value)
      throw new Error(`Trying to flip ID of storeResultRecord.value that doesn't exist. subjectId: ${subjectId}`)
    }

    if(meaningOrReading == 'meaning' && storeResultRecord.value[subjectId].meaning) {
      if(storeResultRecord.value[subjectId].meaning == 'correct')
        storeResultRecord.value[subjectId].meaning = 'incorrect'
      else
        storeResultRecord.value[subjectId].meaning = 'correct'
      console.log(`Flipped value for subjectId ${subjectId}. storeResultRecord.value: `, storeResultRecord.value)
    } else if (meaningOrReading == 'reading' && storeResultRecord.value[subjectId].reading) {
      if(storeResultRecord.value[subjectId].reading == 'correct')
        storeResultRecord.value[subjectId].reading = 'incorrect'
      else
        storeResultRecord.value[subjectId].reading = 'correct'
      console.log(`Flipped value for subjectId ${subjectId}. storeResultRecord.value: `, storeResultRecord.value)
    }
  }

  function getSubmittableResults(): Array<WaniKaniResult> {
    return Object.values(resultRecord.value).map(result => ({
      assignment_id: result.assignment_id,
      incorrect_reading_answers: result.reading == 'correct' ? 0 : 1,
      incorrect_meaning_answers: result.meaning == 'correct' ? 0 : 1,
    }))
  }

  return {
    resetStore,

    reviewItems,
    setReviewItems,

    resultRecord,
    resultRecordMark,
    resultRecordFlip,
    setResultRecord,

    reviewStack,
    reviewStackPop,
    setReviewStack,

    studyResults,
    setStudyResults,

    getSubmittableResults
  }
})
