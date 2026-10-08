/**
 * Utility for playing alert sounds with rate limiting
 */

let lastSoundTime = 0;
const SOUND_COOLDOWN = 5000; // 5 seconds

export const playAlertSound = () => {
  const now = Date.now();
  if (now - lastSoundTime > SOUND_COOLDOWN) {
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch((err) => {
        console.warn('[Audio] Play failed (user interaction needed?):', err.message);
      });
      lastSoundTime = now;
    } catch (err) {
      console.warn('[Audio] Failed to create audio:', err);
    }
  } else {
    console.log('[Audio] Sound cooldown active, skipping');
  }
};
