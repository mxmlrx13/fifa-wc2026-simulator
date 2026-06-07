const STORAGE_KEY = 'wc26-onboarded'

export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // storage unavailable
  }
}

export function clearOnboarded(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable
  }
}
