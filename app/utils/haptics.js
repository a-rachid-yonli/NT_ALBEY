// utils/haptics.js
// Retours haptiques légers et compatibles Expo Go (via l'API native Vibration)
import { Vibration, Platform } from 'react-native';

export const triggerLightHaptic = () => {
  try {
    Vibration.vibrate(Platform.OS === 'ios' ? 10 : 18);
  } catch (_) {}
};

export const triggerSelectionHaptic = () => {
  try {
    Vibration.vibrate(Platform.OS === 'ios' ? 8 : 12);
  } catch (_) {}
};

export const triggerSuccessHaptic = () => {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 25, 60, 35]);
    } else {
      Vibration.vibrate(25);
    }
  } catch (_) {}
};

export const triggerErrorHaptic = () => {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 45, 50, 45, 50, 60]);
    } else {
      Vibration.vibrate(60);
    }
  } catch (_) {}
};
