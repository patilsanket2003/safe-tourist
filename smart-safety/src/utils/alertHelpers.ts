import * as Haptics from 'expo-haptics'
import { Platform, Vibration } from 'react-native'
import STORAGE_KEYS from '../constants/storageKeys'
import { readJSON, writeJSON, remove } from './storage'
import {
  getNotificationPermissionStatus,
  requestNotificationPermissionStatus,
  scheduleNotification,
} from './notificationsCompat'

type EscalationState = {
  startedAt: number // ms epoch when user entered a high-risk state
  lastTier?: 0 | 1 | 2 | 3 // 0=none, 1=5m, 2=15m, 3=30m+
  lastNotifiedAt?: number // ms epoch for throttle
  suppressionUntil?: number // ms epoch until which notifications are paused
  globalMute?: boolean // when true, no alerts/vibration at all
}

const COOLDOWN_MS = 60_000 // avoid spam even if logic checks very frequently
const TIER_1_MS = 5 * 60 * 1000
const TIER_2_MS = 15 * 60 * 1000
const TIER_3_MS = 30 * 60 * 1000
let escalationTimer: any = null

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const settings = await getNotificationPermissionStatus()
    if (settings === 'granted') return true
    const req = await requestNotificationPermissionStatus()
    return req === 'granted'
  } catch (e) {
    console.warn('notification permission check failed', e)
    return false
  }
}


export type AlertConfig = {
  emergency: boolean
  warnings: boolean
  sound: boolean
  vibration: boolean
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  emergency: true,
  warnings: true,
  sound: true,
  vibration: true,
}

export async function getAlertConfig(): Promise<AlertConfig> {
  try {
    const cfg = await readJSON<AlertConfig>(STORAGE_KEYS.ALERT_CONFIG)
    return { ...DEFAULT_ALERT_CONFIG, ...cfg }
  } catch (e) {
    return DEFAULT_ALERT_CONFIG
  }
}

export async function saveAlertConfig(cfg: Partial<AlertConfig>) {
  try {
    const current = await getAlertConfig()
    await writeJSON(STORAGE_KEYS.ALERT_CONFIG, { ...current, ...cfg })
  } catch (e) {
    console.warn('saveAlertConfig failed', e)
  }
}

// Send a single local notification and optionally vibrate for N ms
async function notifyOnce(title: string, body: string | undefined, vibrateMs: number = 0, isEmergency: boolean = false) {
  try {
    const cfg = await getAlertConfig()

    // Filter based on config
    if (isEmergency && !cfg.emergency) return
    if (!isEmergency && !cfg.warnings) return

    // Haptic cue (light) if vibration enabled
    if (cfg.vibration) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) } catch (e) { /* ignore */ }
    }

    // Custom vibration length (Android/iOS respects duration array best)
    try {
      if (cfg.vibration && vibrateMs > 0 && (Platform.OS === 'android' || Platform.OS === 'ios')) {
        Vibration.vibrate([0, vibrateMs])
      }
    } catch (e) { /* ignore */ }

    const ok = await ensureNotificationPermission()
    if (ok) {
      await scheduleNotification({
        content: { title, body: body || '', sound: cfg.sound },
        trigger: null,
      })
    }
  } catch (e) {
    console.warn('notifyOnce failed', e)
  }
}

export async function triggerHighRiskAlert(title: string, body?: string) {
  // Backward compatible one-off alert (no continuous escalation)
  // Treat as "Emergency"
  await notifyOnce(title, body, 500, true)
}

import { Audio } from 'expo-av'
let sirenSound: Audio.Sound | null = null;

export interface SirenState {
  isPlaying: boolean;
  title: string;
  body: string;
}

let activeSirenState: SirenState = {
  isPlaying: false,
  title: '',
  body: '',
};

const sirenListeners = new Set<(state: SirenState) => void>();

export function subscribeToSirenState(cb: (state: SirenState) => void) {
  sirenListeners.add(cb);
  cb(activeSirenState);
  return () => {
    sirenListeners.delete(cb);
  };
}

// Global audio unlock listener for web browsers
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const dummy = new AudioCtx();
        dummy.resume().then(() => {
          setTimeout(() => dummy.close(), 100);
        });
      }
    } catch (_) {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}

let webAudioCtx: any = null;
let webOsc1: any = null;
let webOsc2: any = null;
let webGain: any = null;
let webModulationInterval: any = null;
let vibrationLoopInterval: any = null;

function startContinuousWebSiren() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  stopContinuousWebSiren();
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    webAudioCtx = new AudioCtx();
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume();
    }

    webOsc1 = webAudioCtx.createOscillator();
    webOsc2 = webAudioCtx.createOscillator();
    webGain = webAudioCtx.createGain();

    webOsc1.type = 'sawtooth';
    webOsc2.type = 'square';

    webGain.gain.setValueAtTime(0.4, webAudioCtx.currentTime);

    // Initial frequency
    webOsc1.frequency.setValueAtTime(650, webAudioCtx.currentTime);
    webOsc2.frequency.setValueAtTime(700, webAudioCtx.currentTime);

    webOsc1.connect(webGain);
    webOsc2.connect(webGain);
    webGain.connect(webAudioCtx.destination);

    webOsc1.start();
    webOsc2.start();

    // Continuous wailing loop
    let goingUp = true;
    webModulationInterval = setInterval(() => {
      if (!webAudioCtx || !webOsc1 || !webOsc2) return;
      const t = webAudioCtx.currentTime;
      if (goingUp) {
        webOsc1.frequency.linearRampToValueAtTime(1050, t + 0.35);
        webOsc2.frequency.linearRampToValueAtTime(1120, t + 0.35);
      } else {
        webOsc1.frequency.linearRampToValueAtTime(650, t + 0.35);
        webOsc2.frequency.linearRampToValueAtTime(700, t + 0.35);
      }
      goingUp = !goingUp;
    }, 400);
  } catch (err) {
    console.warn('[AlertHelpers] startContinuousWebSiren error:', err);
  }
}

function stopContinuousWebSiren() {
  if (webModulationInterval) {
    clearInterval(webModulationInterval);
    webModulationInterval = null;
  }
  if (webOsc1) {
    try { webOsc1.stop(); webOsc1.disconnect(); } catch (_) {}
    webOsc1 = null;
  }
  if (webOsc2) {
    try { webOsc2.stop(); webOsc2.disconnect(); } catch (_) {}
    webOsc2 = null;
  }
  if (webGain) {
    try { webGain.disconnect(); } catch (_) {}
    webGain = null;
  }
  if (webAudioCtx) {
    try { webAudioCtx.close(); } catch (_) {}
    webAudioCtx = null;
  }
}

function startContinuousVibration() {
  stopContinuousVibration();
  const triggerVibe = () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate([0, 800, 200, 800]);
    } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([800, 200, 800]);
      } catch (_) {}
    }
  };

  triggerVibe();
  vibrationLoopInterval = setInterval(triggerVibe, 2200);
}

function stopContinuousVibration() {
  if (vibrationLoopInterval) {
    clearInterval(vibrationLoopInterval);
    vibrationLoopInterval = null;
  }
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    Vibration.cancel();
  } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(0);
    } catch (_) {}
  }
}

export async function stopSirenAlert() {
  stopContinuousWebSiren();
  stopContinuousVibration();
  if (sirenSound) {
    try {
      await sirenSound.stopAsync();
      await sirenSound.unloadAsync();
    } catch (_) {}
    sirenSound = null;
  }

  activeSirenState = {
    isPlaying: false,
    title: '',
    body: '',
  };
  sirenListeners.forEach((cb) => {
    try { cb(activeSirenState); } catch (_) {}
  });
}

export async function triggerSirenAlert(title: string, body?: string) {
  try {
    const cfg = await getAlertConfig();
    if (!cfg.emergency) return;

    activeSirenState = {
      isPlaying: true,
      title: title || '⚠️ DANGER / RESTRICTED ZONE DETECTED',
      body: body || 'You are inside a restricted or danger zone. Please proceed to safety.',
    };
    sirenListeners.forEach((cb) => {
      try { cb(activeSirenState); } catch (_) {}
    });
    
    // Continuous vibration until turned off
    if (cfg.vibration) {
      startContinuousVibration();
    }
    
    // Continuous siren sound until turned off
    if (cfg.sound) {
      if (Platform.OS === 'web') {
        startContinuousWebSiren();
      } else {
        try {
          if (sirenSound) {
            await sirenSound.unloadAsync();
          }
          const { sound } = await Audio.Sound.createAsync(
            { uri: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_248fa73b43.mp3?filename=siren-alert-96052.mp3' },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          sirenSound = sound;
        } catch (audioErr) {
          console.warn('[AlertHelpers] Native Audio.Sound failed:', audioErr);
        }
      }
    }

    const ok = await ensureNotificationPermission();
    if (ok) {
      await scheduleNotification({
        content: { title, body: body || '', sound: cfg.sound },
        trigger: null,
      });
    }
  } catch (e) {
    console.warn('triggerSirenAlert failed', e);
  }
}

export async function startProgressiveAlert(title: string, baseBody?: string) {
  // Begin or resume escalation from storage; fire according to elapsed time.
  try {
    const now = Date.now()
    let state = await readJSON<EscalationState>(STORAGE_KEYS.ALERT_ESCALATION)
    if (!state?.startedAt) {
      state = { startedAt: now, lastTier: 0, lastNotifiedAt: 0 }
      await writeJSON(STORAGE_KEYS.ALERT_ESCALATION, state)
    }
    // Immediate entry alert with 5s vibration (default), respecting mute/suppression/cooldown
    try {
      const s = state
      const suppressed = !!(s.suppressionUntil && now < s.suppressionUntil)
      const cooledDown = !(s.lastNotifiedAt && now - s.lastNotifiedAt < COOLDOWN_MS)
      if (!s.globalMute && !suppressed && cooledDown) {
        // Evaluate if this entry is emergency or warning. Assuming generic progressive starts as Warning? 
        // Or if it says "High risk", it's emergency.
        const isEmergency = title.toLowerCase().includes('high risk')
        await notifyOnce(title, baseBody || 'High-risk area detected.', 5000, isEmergency)
        const updated: EscalationState = { ...s, lastNotifiedAt: now }
        await writeJSON(STORAGE_KEYS.ALERT_ESCALATION, updated)
        state = updated
      }
    } catch (e) { /* ignore */ }
    // Kick an immediate evaluation, then schedule periodic checks
    await evaluateAndNotify(state, title, baseBody)
    if (escalationTimer) clearInterval(escalationTimer)
    escalationTimer = setInterval(async () => {
      try {
        const s = await readJSON<EscalationState>(STORAGE_KEYS.ALERT_ESCALATION)
        if (!s?.startedAt) return // nothing to do
        await evaluateAndNotify(s, title, baseBody)
      } catch (e) { /* ignore */ }
    }, 30_000) // check every 30s; notifications throttled by COOLDOWN_MS
  } catch (e) {
    console.warn('startProgressiveAlert failed', e)
  }
}

export async function stopProgressiveAlert() {
  try {
    if (escalationTimer) { clearInterval(escalationTimer); escalationTimer = null }
    await remove(STORAGE_KEYS.ALERT_ESCALATION)
    try { Vibration.cancel() } catch (e) { /* ignore */ }
  } catch (e) {
    console.warn('stopProgressiveAlert failed', e)
  }
}

async function evaluateAndNotify(state: EscalationState, title: string, baseBody?: string) {
  const now = Date.now()
  const elapsed = now - state.startedAt
  // global mute
  if (state.globalMute) return
  // cooldown
  if (state.lastNotifiedAt && now - state.lastNotifiedAt < COOLDOWN_MS) return
  // suppression window active
  if (state.suppressionUntil && now < state.suppressionUntil) return

  let tier: 1 | 2 | 3 | null = null
  if (elapsed >= TIER_3_MS) tier = 3
  else if (elapsed >= TIER_2_MS) tier = 2
  else if (elapsed >= TIER_1_MS) tier = 1

  if (!tier) return // not time yet
  if ((state.lastTier || 0) >= tier) return // already handled this tier or higher

  // Decide vibration by tier
  const vibMs = tier === 1 ? 0 : tier === 2 ? 3000 : 5000
  const body =
    tier === 1
      ? `${baseBody || ''}`.trim() || 'You are in a high-risk area.'
      : tier === 2
        ? `${baseBody || 'High-risk area persists.'} Escalation: 15 minutes.`
        : `${baseBody || 'High-risk area persists.'} Escalation: 30+ minutes.`

  const isEmergency = true // Escalations are usually emergencies
  await notifyOnce(title, body, vibMs, isEmergency)
  const updated: EscalationState = { ...state, lastTier: tier, lastNotifiedAt: now }
  await writeJSON(STORAGE_KEYS.ALERT_ESCALATION, updated)
}

export async function acknowledgeHighRisk(minutes: number) {
  try {
    const now = Date.now()
    const s = (await readJSON<EscalationState>(STORAGE_KEYS.ALERT_ESCALATION)) || {
      startedAt: now,
      lastTier: 0,
      lastNotifiedAt: 0,
    }
    const suppressionUntil = now + Math.max(1, Math.floor(minutes)) * 60 * 1000
    const updated: EscalationState = { ...s, suppressionUntil }
    await writeJSON(STORAGE_KEYS.ALERT_ESCALATION, updated)
    try { Vibration.cancel() } catch (e) { /* ignore */ }
  } catch (e) {
    console.warn('acknowledgeHighRisk failed', e)
  }
}

// Deprecated in favor of fine-grained config, but keeping for backward compat
export async function setGlobalMute(mute: boolean) {
  try {
    const now = Date.now()
    const s = (await readJSON<EscalationState>(STORAGE_KEYS.ALERT_ESCALATION)) || {
      startedAt: now,
      lastTier: 0,
      lastNotifiedAt: 0,
    }
    const updated: EscalationState = { ...s, globalMute: !!mute }
    await writeJSON(STORAGE_KEYS.ALERT_ESCALATION, updated)
    if (mute) { try { Vibration.cancel() } catch (e) { /* ignore */ } }
  } catch (e) {
    console.warn('setGlobalMute failed', e)
  }
}

export async function getAlertState(): Promise<{ muted: boolean; suppressionUntil?: number } | null> {
  try {
    const s = await readJSON<EscalationState>(STORAGE_KEYS.ALERT_ESCALATION)
    if (!s) return null
    return { muted: !!s.globalMute, suppressionUntil: s.suppressionUntil }
  } catch (e) {
    return null
  }
}

