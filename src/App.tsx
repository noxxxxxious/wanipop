import { useEffect, useState, useRef, useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import "./App.css"
import * as wanakana from 'wanakana'

import type { ResultDisplay, ReviewCard, ReviewResult, ReviewTask, SubmittedReviewData, WaniKaniResult } from "./types"

import { SubjectDisplay } from "./components/SubjectDisplay"
import { AnswerField, InputMode } from "./components/AnswerField"
import { ResultsDisplay } from "./components/ResultsDisplay"

function App() {
  const reviewCards = useRef({} as Record<number, ReviewCard>)
  const [reviewStack, setReviewStack] = useState([] as ReviewTask[])
  const currentItem = useRef(null as ReviewTask | null)
  const [placeholderText, setPlaceholderText] = useState('')
  const resultRecord: React.MutableRefObject<Record<number, ReviewResult>> = useRef({})
  const [previousAnswerCheck, setPreviousAnswerCheck] = useState(undefined as 'correct' | 'incorrect' | undefined)
  const [finishedStudy, setFinishedStudy] = useState(false)
  const [studyResults, setStudyResults] = useState([] as ResultDisplay[])
  const [mode, setMode] = useState('romaji' as InputMode)
  const nextButton = useRef<HTMLButtonElement>(null)
  const markButton = useRef<HTMLButtonElement>(null)

  function getWaniKaniResult(): WaniKaniResult[] {
    return Object.values(resultRecord.current).map(result => ({
      assignment_id: result.assignment_id,
      incorrect_reading_answers: result.reading == 'correct' ? 0 : 1,
      incorrect_meaning_answers: result.meaning == 'correct' ? 0 : 1,
    } as WaniKaniResult))
  }

  useEffect(() => {
    startSession()

    //TODO: Temporarily set dark mode. Allow this to change in settings later
    document.body.setAttribute('data-theme', 'catppuccin-macchiato')
    document.body.style.backgroundColor = 'var(--background-color)'
    document.body.style.color = 'var(--text-color)'
    document.body.style.textAlign = 'center'
  }, [])

  const startSession = useCallback(() => {
    //Reset everything
    setFinishedStudy(false)
    resultRecord.current = {}
    currentItem.current = null
    reviewCards.current = {}
    setPlaceholderText('')
    setPreviousAnswerCheck(undefined)
    setReviewStack([])
    setStudyResults([])

    ;(async () => {
      const batch = await invoke('get_review_batch') as ReviewCard[]
      console.log('Fetching reviews...')

      batch.forEach(reviewItem => {
        reviewCards.current[reviewItem.subject_id] = reviewItem

        switch(reviewItem.subject_type) {
          case 'radical':
          case 'kana_vocabulary':
            const newTask: ReviewTask = {
              review_type: 'meaning',
              review_item: reviewItem
            }
            setReviewStack(stack => [...stack, newTask])
            break;
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
            setReviewStack(stack => [...stack, newReadingTask, newMeaningTask])
            break;
        }
      })
    })()
  }, [ reviewStack, placeholderText, previousAnswerCheck, finishedStudy, studyResults ])

  useEffect(() => {
    //Restart everything when the signal from Tauri is received
    (async () => {
      let unlisten = await listen("reset-session", () => startSession())

      return () => {
        unlisten && unlisten()
      }
    })()
  })

  useEffect(() => {
    console.log('reviewStack updated: ', reviewStack)
    let current = reviewStack[reviewStack.length - 1] || null
    let text = ''

    console.log(`result entries length: ${Object.entries(resultRecord.current).length}, current: `, current)
    if(!current && Object.entries(resultRecord.current).length > 0) {
      console.log('finished study')
      setFinishedStudy(true)
      return
    } else if (!current) return

    currentItem.current = current

    switch(current.review_item.subject_type){
      case 'radical':
        text = 'Radical'
        break;
      case 'kanji':
        text = 'Kanji'
        break;
      case 'vocabulary':
      case 'kana_vocabulary':
        text = 'Vocabulary'
        break;
    }
    setPlaceholderText(text + ` ${ current.review_type == 'meaning' ? 'Meaning' : 'Reading' }`)
    console.log(placeholderText, currentItem.current, reviewStack)
  }, [reviewStack])

  function flipAnswer() {
    console.info('flipping answer')
    debugger

    if(!currentItem.current) throw new Error('Trying to check answer but currentItem is undefined???')
    if(!currentItem.current.review_item) return

    const currentResult = resultRecord.current[currentItem.current.review_item.subject_id][currentItem.current.review_type]
    
    if(currentResult == 'correct') {
      resultRecord.current[currentItem.current.review_item.subject_id][currentItem.current.review_type] = 'incorrect'
      setPreviousAnswerCheck('incorrect')
    } else if (currentResult == 'incorrect') {
      resultRecord.current[currentItem.current.review_item.subject_id][currentItem.current.review_type] = 'correct'
      setPreviousAnswerCheck('correct')
    } else {
      console.error('tried to flip answer but item\'s answer was undefined???')
    }

    console.dir(resultRecord.current)
  }

  function checkAnswer(answerAttempt: string) {
    console.info('checking answer')

    if(!currentItem.current) throw new Error('Trying to check answer but currentItem is undefined???')
    if(!currentItem.current.review_item) return

    if(previousAnswerCheck == 'correct') {
      setPreviousAnswerCheck(undefined)
      setReviewStack(stack => stack.slice(0, -1))
      return
    } else if(previousAnswerCheck == 'incorrect') {
      setPreviousAnswerCheck(undefined)
      const incorrectSubject = currentItem.current
      const newStack = reviewStack.slice(0, -1)
      setReviewStack([incorrectSubject, ...newStack])
      return
    }

    let correct = false
    let attempt = answerAttempt.toLowerCase().replace(/\s/g, '')

    if(currentItem.current.review_type == 'meaning') {
      currentItem.current.review_item.meanings.forEach(meaning => {
        let correctMeaning = meaning.meaning.toLowerCase().replace(/\s/g, '')

        if(attempt == correctMeaning)
          correct = true
      })
    } else {
      currentItem.current.review_item.readings?.forEach(reading => {
        let correctReading  = wanakana.toHiragana(reading.reading as string)
        let hiraganaAttempt = wanakana.toHiragana(attempt)

        if(hiraganaAttempt == correctReading)
          correct = true
      })
    }

    const subjectId = currentItem.current.review_item.subject_id
    if(!resultRecord.current[subjectId]) {
      resultRecord.current[subjectId] = {} as ReviewResult
    }

    resultRecord.current[subjectId].assignment_id = currentItem.current.review_item.assignment_id
    resultRecord.current[subjectId].subject_id = currentItem.current.review_item.subject_id
    resultRecord.current[subjectId].characters = currentItem.current.review_item.characters
    console.log(currentItem.current.review_item.characters)
    if(correct) {
      if(currentItem.current.review_type == 'meaning'){
        console.log('got it')
        //Only record if we haven't yet so we don't overwrite
        if(!resultRecord.current[subjectId].meaning){
          resultRecord.current[subjectId].meaning = 'correct'
        }        setPreviousAnswerCheck('correct')
      } else if(currentItem.current.review_type == 'reading'){
        console.log('got it')
        //Only record if we haven't yet so we don't overwrite
        if(!resultRecord.current[subjectId].reading) {
          resultRecord.current[subjectId].reading = 'correct'
        }        setPreviousAnswerCheck('correct')
      }
    } else {
      if(currentItem.current.review_type == 'meaning') {
        console.log('not got it')
        if(!resultRecord.current[subjectId].meaning) {
          resultRecord.current[subjectId].meaning = 'incorrect'
        }
        setPreviousAnswerCheck('incorrect')
      } else if(currentItem.current.review_type == 'reading') {
        console.log('not got it')
        if(!resultRecord.current[subjectId].reading) {
          resultRecord.current[subjectId].reading = 'incorrect'
        }
        setPreviousAnswerCheck('incorrect')
      }
    }

    console.log(resultRecord.current)
  }

  useEffect(() => {
    if(previousAnswerCheck)
      nextButton.current?.focus()
  }, [previousAnswerCheck])

  useEffect(() => {
    const current = reviewStack[reviewStack.length - 1]
    if(!current) return
    if(current.review_type == 'meaning') {
      setMode('romaji')
    } else {
      switch(current.review_item.subject_type) {
        case 'vocabulary':
          setMode('hiragana')
          break;
        case 'kanji':
          if(current.review_item.readings![0].type == 'kunyomi')
            setMode('hiragana')
          else
            setMode('katakana')
          break;
        default:
          setMode('romaji')
      }
    }

    console.log(mode)
  }, [reviewStack])

  useEffect(() => {
    if(!finishedStudy) return
    const payload = getWaniKaniResult()
    invoke("submit_review_batch", { payload })
      .then((r) => {
        const r_typed = r as SubmittedReviewData[]
        const results: ResultDisplay[] = r_typed.map(result => {
          const subject_data = reviewCards.current[result.subject_id]!
          return {
            subject_data,
            ...result
          }
        })
        console.dir(results)
        setStudyResults(results)
      })
  }, [finishedStudy])

  if(studyResults.length > 0) {
    return (
      <main className="container">
        <h1>WaniPOP!</h1>
        <p>🎉 Study completed! 🎉</p>
        <ResultsDisplay resultsArray={studyResults} />
      </main>
    )
  }

  if(reviewStack.length <= 0 || currentItem.current == null) {
    return (
      <main className="container">
        <h1>WaniPOP!</h1>
        <p>Loading review items...</p>
      </main>
    )
  }

  let afterAnswerSection
  if(previousAnswerCheck == 'correct') {
    let answerDisplay: string | React.ReactNode[] = ''
    if(currentItem.current.review_type == 'meaning') {
      answerDisplay = currentItem.current.review_item.meanings.map(m => m.meaning).join(', ')
    } else {
      answerDisplay = currentItem.current.review_item.readings!.map(
        r => {
          let reading: string
          if(r.type == 'onyomi') {
            reading = wanakana.toKatakana(r.reading as string)
          } else {
            reading = r.reading as string
          }
          return <span className={'reading ' + (r.type as string ?? '')}>{reading}</span>
        }
      )
    }
    afterAnswerSection = <div id="after-answer-section">
      <div id="correct-answer-display">
        {answerDisplay}
      </div>
      <button
        key="correct-next"
        ref={nextButton}
        className="review-button correct"
        type="button"
        onClick={() => checkAnswer('')}
      >Next</button>
      <button
        key="mark-incorrect"
        ref={markButton}
        className="review-button incorrect"
        type="button"
        onClick={() => flipAnswer()}
      >Flip</button>
    </div>
  } else if (previousAnswerCheck == 'incorrect') {
    let answerDisplay: string | React.ReactNode[] = ''
    if(currentItem.current.review_type == 'meaning') {
      answerDisplay = currentItem.current.review_item.meanings.map(m => m.meaning).join(', ')
    } else {
      answerDisplay = currentItem.current.review_item.readings!.map(
        r => {
          let reading: string
          if(r.type == 'onyomi') {
            reading = wanakana.toKatakana(r.reading as string)
          } else {
            reading = r.reading as string
          }
          return <span className={'reading ' + (r.type as string ?? '')}>{reading}</span>
        }
      )
    }
    afterAnswerSection = <div id="after-answer-section">
      <div id="correct-answer-display">
        {answerDisplay}
      </div>
      <button
        key="incorrect-next"
        ref={nextButton}
        className="review-button incorrect"
        type="button"
        onClick={() => checkAnswer('')}
      >Next</button>
      <button
        key="mark-correct"
        ref={markButton}
        className="review-button correct"
        type="button"
        onClick={() => flipAnswer()}
      >Flip</button>
    </div>
  } else {
    afterAnswerSection = <div id="after-answer-section">
      <div id="correct-answer-display"></div>
      <button
        key="disabled-next"
        ref={nextButton}
        className="review-button"
        type="button"
        disabled
      >Next</button>
      <button
        key="disabled-flip"
        ref={markButton}
        className="review-button"
        type="button"
        disabled
      >Flip</button>
    </div>
  }

  return (
    <main className="container" onKeyUp={e => {
      if(e.key == 'Enter') {
        e.preventDefault()
        checkAnswer('')
      }
    }}>
      <h1>WaniPOP!</h1>
      <SubjectDisplay type={currentItem.current.review_item.subject_type}>
        {currentItem.current.review_item.characters}
      </SubjectDisplay>
      <AnswerField
        key={mode + currentItem.current.review_item.characters}
        mode={mode}
        previousAnswerCheck={previousAnswerCheck}
        className='test'
        placeholder={ placeholderText }
        onAnswerSubmit={checkAnswer}
      />
      {afterAnswerSection}
    </main>
  )
}

export default App

