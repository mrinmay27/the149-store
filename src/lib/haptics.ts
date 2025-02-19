import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Check if vibration is supported and permitted
const isVibrationSupported = () => {
  return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
};

// Function to trigger haptic feedback
export const vibrate = async (pattern: number | number[] = 25) => {
  try {
    // Try native haptics first
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Fall back to web vibration API if supported
    if (isVibrationSupported()) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        // Silently fail if vibration fails
        console.debug('Vibration failed:', error);
      }
    }
  }
};

// Different haptic patterns with error handling
export const haptics = {
  // Light tap for regular button presses
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      if (isVibrationSupported()) {
        navigator.vibrate(25);
      }
    }
  },
  
  // Medium tap for important actions
  medium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      if (isVibrationSupported()) {
        navigator.vibrate(50);
      }
    }
  },
  
  // Heavy tap for errors or warnings
  heavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      if (isVibrationSupported()) {
        navigator.vibrate(75);
      }
    }
  },
  
  // Success feedback
  success: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
      if (isVibrationSupported()) {
        navigator.vibrate([25, 25, 50]);
      }
    }
  },
  
  // Error feedback
  error: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
      if (isVibrationSupported()) {
        navigator.vibrate([25, 25, 25, 25, 75]);
      }
    }
  },
  
  // Keyboard tap
  keypress: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      if (isVibrationSupported()) {
        navigator.vibrate(7);
      }
    }
  }
}; 