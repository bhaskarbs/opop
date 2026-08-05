// Web Speech API's SpeechRecognition isn't in TypeScript's DOM lib — it's still a non-standard,
// vendor-prefixed API in most browsers (Firefox has neither prefix) — so this hand-rolls only
// what useSpeechRecognition.ts actually uses. Same approach as razorpay.d.ts for Razorpay
// Checkout, another browser global TypeScript doesn't ship types for. Everything has to live
// inside `declare global` (not just the Window augmentation) because the trailing `export {}`
// makes this file a module — without `declare global`, these interfaces would only be visible
// within this file instead of being ambient globals like the real DOM lib's types.
declare global {
  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
  }

  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number
    readonly results: SpeechRecognitionResultList
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string
    readonly message: string
  }

  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
    onstart: (() => void) | null
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export {}
