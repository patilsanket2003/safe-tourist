import type { GeoFence } from '../../../utils/geofenceLogic'
import STORAGE_KEYS from '../../../constants/storageKeys'
import { writeJSON, readJSON, remove } from '../../../utils/storage'

const STORAGE_KEY = STORAGE_KEYS.GEOFENCES

export async function saveFences(fences: GeoFence[]) {
  try {
    await writeJSON(STORAGE_KEY, { version: 1, fences })
  } catch (e) {
    console.warn('saveFences failed', e)
  }
}

export async function loadCachedFences(): Promise<GeoFence[] | null> {
  try {
    const parsed = await readJSON<{ version: number; fences: GeoFence[] } | null>(STORAGE_KEY, null)
    if (!parsed) return null
    return Array.isArray(parsed.fences) ? parsed.fences : null
  } catch (e) {
    console.warn('loadCachedFences failed', e)
    return null
  }
}

export async function clearCachedFences() {
  try {
    await remove(STORAGE_KEY)
  } catch (e) {
    console.warn('clearCachedFences failed', e)
  }
}

export default { saveFences, loadCachedFences, clearCachedFences }
