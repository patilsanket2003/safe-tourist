import STORAGE_KEYS from '../../../constants/storageKeys'
import { pushToList, readJSON, remove } from '../../../utils/storage'
import { SERVER_URL, ROLLING_LOG_ENABLED } from '../../../config'

export type TransitionRecord = {
  id: string
  fenceId: string
  fenceName?: string
  type: 'enter' | 'exit'
  at: number
  coords?: { latitude: number; longitude: number }
}

const STORAGE_KEY = STORAGE_KEYS.TRANSITIONS
const MAX_ITEMS = 2000

export async function appendTransition(r: TransitionRecord) {
  // If rolling-log is enabled, attempt to POST the single transition immediately.
  if (ROLLING_LOG_ENABLED) {
    try {
      const url = `${SERVER_URL.replace(/\/$/, '')}/api/transitions`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitions: [r] }),
      })
      if (res.ok) return // success, don't store locally
      // otherwise fall through to local storage
    } catch (e) {
      // network error, fall back to local storage
    }
  }

  // fallback: append to local rolling log
  await pushToList<TransitionRecord>(STORAGE_KEY, r, MAX_ITEMS)
}

export async function getTransitions(): Promise<TransitionRecord[]> {
  return (await readJSON<TransitionRecord[]>(STORAGE_KEY, [])) || []
}

export async function clearTransitions() {
  await remove(STORAGE_KEY)
}

export default { appendTransition, getTransitions, clearTransitions }
