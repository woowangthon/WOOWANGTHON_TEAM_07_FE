// 브라우저별 접두사와 TypeScript DOM 선언 차이를 이 경계에 한정한다.
export interface RecognitionResult {
  isFinal: boolean
  readonly length: number
  [index: number]: { transcript: string }
}

export interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>
}

export interface BrowserRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export type RecognitionConstructor = new () => BrowserRecognition

export function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const browser = window as Window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}
