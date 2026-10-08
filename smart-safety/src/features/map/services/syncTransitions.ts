import transitionStore from '../store/transitionStore'
import { SERVER_URL } from '../../../config'

export async function syncTransitions(token?: string) {
  try {
    const items = await transitionStore.getTransitions()
    if (!items || items.length === 0) return { ok: true, uploaded: 0 }

    const url = `${SERVER_URL.replace(/\/$/, '')}/api/transitions`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transitions: items }),
    })

    if (res.ok) {
      await transitionStore.clearTransitions()
      return { ok: true, uploaded: items.length }
    }
    return { ok: false, uploaded: 0, status: res.status }
  } catch (e) {
    return { ok: false, uploaded: 0, error: String(e) }
  }
}

export default { syncTransitions }
