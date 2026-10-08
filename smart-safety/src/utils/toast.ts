type ToastPayload = { message: string; duration?: number }

let listeners: Array<(p: ToastPayload) => void> = []

export function onToast(cb: (p: ToastPayload) => void) {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}

export function showToast(message: string, duration?: number) {
  try {
    listeners.forEach((cb) => cb({ message, duration }))
  } catch (e) {
    // swallow - non-critical
    console.warn('showToast error', e)
  }
}
