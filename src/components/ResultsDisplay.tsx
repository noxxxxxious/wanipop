import { ResultDisplay } from "../types"
import { ResultItem } from "./ResultItem"

interface ResultsDisplayProps {
  resultsArray: ResultDisplay[],
}

export function ResultsDisplay({
  resultsArray
}: ResultsDisplayProps) {
  console.log(resultsArray)
  let results = resultsArray.map(r => <ResultItem item={r} />)
  return (
    <div id="results-display">{results}</div>
  )
}

