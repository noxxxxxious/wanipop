import { useRef, useEffect, HTMLAttributes } from "react";
import * as wanakana from 'wanakana'

export type InputMode = 'romaji' | 'hiragana' | 'katakana'

interface AnswerFieldProps extends HTMLAttributes<HTMLInputElement> {
  mode: InputMode,
  placeholder: string,
  previousAnswerCheck: 'correct' | 'incorrect' | undefined,
  onAnswerSubmit: (answerAttempt: string) => void,
}

export function AnswerField({
  mode,
  placeholder,
  previousAnswerCheck,
  onAnswerSubmit,
  ...rest
}: AnswerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if(!el) return

    switch(mode) {
      case 'romaji':
        // console.log('toRomaji')
        break
      case 'hiragana':
        // console.log('toHiragana')
        wanakana.bind(el, {IMEMode: 'toHiragana'})
        break
      case 'katakana':
        // console.log('toKatakana')
        wanakana.bind(el, {IMEMode: 'toKatakana'})
        break
    }

  }, [mode])

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    const ref = inputRef.current
    if(!ref) return

    if(previousAnswerCheck == 'correct')
      ref.style.color = 'var(--success-color)'
    else if (previousAnswerCheck == 'incorrect')
      ref.style.color = 'var(--error-color)'
    else
      ref.style.color = 'var(--text-color)'
  }, [previousAnswerCheck])

  const style: React.CSSProperties = {
    border: (() => {
      switch(previousAnswerCheck) {
        case 'correct':
          return '3px solid var(--success-color)'
        case 'incorrect':
          return '3px solid var(--error-color)'
        default:
          return 'none'
      }
    })(),
    boxShadow: (() => {
      switch(previousAnswerCheck) {
        case 'correct':
          return 'inset 0px 0px 10px var(--success-color)'
        case 'incorrect':
          return 'inset 0px 0px 10px var(--error-color)'
        default:
          return 'none'
      }
    })(),
  }

  return <input
    id='answer-input'
    type="text"
    ref={inputRef}
    style={style}
    placeholder={placeholder}
    disabled={previousAnswerCheck ? true : false}
    onKeyUp={e => {
      e.preventDefault()
      e.stopPropagation()
      let el = e.target as HTMLInputElement
      if(e.key == 'Enter' && el.value){
        onAnswerSubmit(inputRef.current!.value)
      }
    }}
    {...rest}
  />
}

