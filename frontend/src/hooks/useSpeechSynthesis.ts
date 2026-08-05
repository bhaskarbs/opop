import { useCallback, useEffect, useState } from 'react'

/** Wraps the browser's native SpeechSynthesis API (window.speechSynthesis) — the read-aloud half
 * of voice support, same browser-native/no-cloud-TTS-service approach as useSpeechRecognition's
 * dictation half. Unlike SpeechRecognition, SpeechSynthesisUtterance is standard and already in
 * TypeScript's DOM lib, so no custom type declarations are needed here.
 *
 * <p>speak() cancels whatever utterance is currently playing before starting the new one — a
 * chat widget only ever has one reply worth hearing at a time, so callers don't need to track or
 * cancel previous utterances themselves. */
export function useSpeechSynthesis(options: { lang: string }) {
  const { lang } = options
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = useCallback(
    (text: string) => {
      if (!supported) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [lang, supported],
  )

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  return { supported, speaking, speak, stop }
}
