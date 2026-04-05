const PKCE_VERIFIER_KEY = 'auth-pkce-verifier'
const PKCE_STATE_KEY = 'auth-pkce-state'

function toBase64Url(uint8Array: Uint8Array) {
  const binary = Array.from(uint8Array)
    .map((value) => String.fromCharCode(value))
    .join('')

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(length: number) {
  const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const result: string[] = []
  const randomValues = new Uint8Array(length)

  window.crypto.getRandomValues(randomValues)

  for (let index = 0; index < length; index += 1) {
    result.push(allowedChars[randomValues[index] % allowedChars.length])
  }

  return result.join('')
}

export async function createPkcePair() {
  const verifier = randomString(96)
  const state = randomString(40)

  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )

  const challenge = toBase64Url(new Uint8Array(digest))

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_KEY, state)

  return { verifier, challenge, state }
}

export function readPkceVerifier() {
  return sessionStorage.getItem(PKCE_VERIFIER_KEY)
}

export function readPkceState() {
  return sessionStorage.getItem(PKCE_STATE_KEY)
}

export function clearPkceSession() {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_STATE_KEY)
}
