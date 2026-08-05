import { useCallback, useEffect, useRef, useState } from 'react'

function getRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export type SpeechRecognitionError = 'not-allowed' | 'other'

/** Wraps the browser's native Web Speech API — voice input is browser-native, not a cloud STT
 * service, so there's no audio upload or extra backend involved — for dictating into a text
 * field: start() begins listening, onResult fires with the running transcript on every interim
 * and final result (so the caller can show live captions as the person talks), and listening
 * continues across natural pauses between phrases until the caller calls stop() (or the
 * component unmounts) — the caller is expected to let the person review/edit the transcribed
 * text before actually sending it, same as Phase C's confirm-before-execute tools never assume
 * intent without a review step. This hook never sends anything itself.
 *
 * <p>continuous=true still isn't enough on its own: most browsers silently end a recognition
 * session after a few seconds of silence even in continuous mode, which — left unhandled —
 * truncates whatever the person was in the middle of saying. shouldListenRef tracks whether
 * stop() was actually called (person-initiated) vs. the browser ending things on its own;
 * onend restarts the same recognition instance automatically in the latter case, so a normal
 * pause mid-sentence doesn't cut them off. finalTranscriptRef accumulates finalized text across
 * however many of these silent restarts happen, so the running transcript handed to onResult
 * never loses what was already recognized before a restart.
 *
 * <p>Not supported in Firefox (no `SpeechRecognition` or `webkitSpeechRecognition` global) —
 * check `supported` and hide the mic affordance entirely rather than show a button that silently
 * does nothing. */
export function useSpeechRecognition(options: {
  lang: string
  onResult: (transcript: string) => void
}) {
  const { lang, onResult } = options
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<SpeechRecognitionError | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldListenRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const supported = getRecognitionConstructor() !== null

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition || recognitionRef.current) return
    setError(null)
    finalTranscriptRef.current = ''
    shouldListenRef.current = true

    const recognition = new Recognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      onResultRef.current((finalTranscriptRef.current + interim).trim())
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false
        setError('not-allowed')
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        // no-speech/aborted are the routine "browser paused the session" cases onend below
        // recovers from — anything else (audio-capture, network, ...) is worth surfacing.
        setError('other')
      }
    }

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // Browser refused the restart (e.g. torn down too abruptly) — fall through and
          // treat this the same as a person-initiated stop rather than getting stuck
          // reporting listening=true with no recognition actually running.
        }
      }
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [lang])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    recognitionRef.current?.stop()
  }, [])

  useEffect(() => {
    return () => {
      shouldListenRef.current = false
      recognitionRef.current?.stop()
    }
  }, [])

  return { supported, listening, start, stop, error }
}
