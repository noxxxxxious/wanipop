export interface Meaning {
    meaning: String,
    primary: Boolean,
    accepted_answer: Boolean,
}

export interface Reading {
    reading: String,
    primary: Boolean,
    accepted_answer: Boolean,
    type: String | undefined, // onyomi, kunyomi, etc.
}

export type SubjectType = 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary'

export interface ReviewCard {
    assignment_id: number,
    subject_id: number,
    subject_type: SubjectType,
    characters: String | undefined,
    meanings: Meaning[],
    readings: Reading[] | undefined,
    meaning_mnemonic: String | undefined,
    reading_mnemonic: String | undefined,
}

export interface ReviewTask {
  review_type: 'meaning' | 'reading',
  review_item: ReviewCard,
}

export interface ReviewResult {
  assignment_id: number,
  subject_id: number,
  characters: String | undefined,
  meaning: 'correct' | 'incorrect' | undefined,
  reading?: 'correct' | 'incorrect' | undefined,
  meaning_attempt: string,
  reading_attempt: string,
  subjectData: ReviewCard,
}

export interface WaniKaniResult {
  assignment_id: number,
  incorrect_meaning_answers: number,
  incorrect_reading_answers: number,
}

export interface SubmittedReviewData {
  created_at: Date,
  assignment_id: number,
  subject_id: number,
  starting_srs_stage: SRSLevel,
  ending_srs_stage: SRSLevel,
  incorrect_meaning_answers: number,
  incorrect_reading_answers: number,
}

export interface ResultDisplay extends SubmittedReviewData {
  subject_data: ReviewCard
}

export enum SRSLevel {
  Locked = 0,
  Apprentice_1,
  Apprentice_2,
  Apprentice_3,
  Apprentice_4,
  Guru_1,
  Guru_2,
  Master,
  Enlightened,
  Burned,
}

export enum SRSLevelText {
  Locked = "Locked",
  Apprentice = "Apprentice",
  Guru = "Guru",
  Master = "Master",
  Enlightened = "Enlightened",
  Burned = "Burned"
}

export interface WanipopConfig {
    num_of_reviews_per_batch: number,
    time_between_popups_in_minutes: number,
    wanikani_api_key: String | null,

    hide_window_decorations: boolean,
}
