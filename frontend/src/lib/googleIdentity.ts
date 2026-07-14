/** Minimal typings for the bits of Google Identity Services (loaded via the <script> tag in
 * index.html) that GoogleSignInButton uses — the full API surface is much larger than this. */
interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
      }): void
      renderButton(
        parent: HTMLElement,
        options: { type: 'standard'; theme: 'outline'; size: 'large'; width: number; text: 'continue_with' },
      ): void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/** Resolves once window.google is available — the script tag in index.html loads it
 * asynchronously, so it may not be ready yet when a component first mounts. */
export function waitForGoogleIdentity(): Promise<GoogleIdentityServices> {
  if (window.google) {
    return Promise.resolve(window.google)
  }
  const existingScript = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
  return new Promise((resolve, reject) => {
    const onLoad = () => (window.google ? resolve(window.google) : reject(new Error('Google Identity Services failed to load')))
    const onError = () => reject(new Error('Google Identity Services failed to load'))
    if (existingScript) {
      existingScript.addEventListener('load', onLoad, { once: true })
      existingScript.addEventListener('error', onError, { once: true })
    } else {
      reject(new Error('Google Identity Services script tag is missing'))
    }
  })
}
