import STORAGE_KEYS from '../constants/storageKeys'
import { readJSON, writeJSON, pushToList, remove } from './storage'
import { sendSMS, SmsPayload } from './sms'

export type QueuedSMS = {
  id: string
  timestamp: number
  payload: SmsPayload
  attempts?: number
}

const QUEUE_KEY = STORAGE_KEYS.SMS_QUEUE

export async function queueSMS(item: Omit<QueuedSMS, 'id' | 'timestamp' | 'attempts'>) {
  const entry: QueuedSMS = {
    id: `sms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    timestamp: Date.now(),
    attempts: 0,
    ...item,
  }
  await pushToList(QUEUE_KEY, entry, 500)
  return entry
}

export async function getSMSQueue(): Promise<QueuedSMS[]> {
  try {
    const arr = (await readJSON<QueuedSMS[]>(QUEUE_KEY, [])) || []
    return arr
  } catch (e) {
    console.warn('getSMSQueue failed', e)
    return []
  }
}

export async function clearSMSQueue(): Promise<void> {
  try { await remove(QUEUE_KEY) } catch (e) { console.warn('clearSMSQueue failed', e) }
}

export async function drainSMSQueue(maxAttempts = 3) {
  const results = { success: [] as string[], failed: [] as { id: string; reason: any }[] }
  try {
    const queue = await getSMSQueue()
    if (!queue || queue.length === 0) return results

    const items = [...queue].reverse()
    const remaining: QueuedSMS[] = []

    for (const it of items) {
      try {
        const res = await sendSMS(it.payload)
        if (res.ok) results.success.push(it.id)
        else throw new Error('sendSMS not available or failed')
      } catch (e) {
        const attempts = (it.attempts || 0) + 1
        if (attempts >= maxAttempts) {
          results.failed.push({ id: it.id, reason: e })
        } else {
          remaining.push({ ...it, attempts })
        }
      }
    }

    await writeJSON(QUEUE_KEY, remaining.reverse())
    return results
  } catch (e) {
    console.warn('drainSMSQueue failed', e)
    return results
  }
}

export default { queueSMS, getSMSQueue, drainSMSQueue, clearSMSQueue }
