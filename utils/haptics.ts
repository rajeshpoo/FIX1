/**
 * Triggers a short vibration on supported devices for tactile feedback.
 * @param pattern A vibration pattern (ms). Defaults to a short 5ms tap.
 */
export const hapticFeedback = (pattern: number | number[] = 5) => {
  if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
    try {
      // Use a short, crisp vibration for UI feedback
      window.navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptic feedback failed.", e);
    }
  }
};
