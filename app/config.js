// app/config.js
// ✅ Configuration centralisée de l'API
// ✅ En dev   : détecte automatiquement l'IP du serveur Metro (ex: 192.168.1.5:3000)
// ✅ En prod  : pointe vers l'IP publique NT Albey (http://41.138.63.50:100)
// ✅ Peut être overridée via la variable d'environnement EXPO_PUBLIC_API_URL
//    (définie dans eas.json pour chaque profil de build)

import Constants from 'expo-constants';

export const getApiUrl = () => {
  // ═══════════════════════════════════════════════════════════
  // MODE DÉVELOPPEMENT
  // ═══════════════════════════════════════════════════════════
  if (__DEV__) {
    // Récupère l'IP depuis l'URL de Metro (ex: http://192.168.1.5:8081)
    const debuggerHost =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.hostUri ||
      Constants.debuggerHost;

    if (debuggerHost) {
      // Extrait l'IP (ex: 192.168.1.5)
      const ip = debuggerHost.split(':')[0];
      // Utilise cette IP avec le port 3000 (celui de ton serveur)
      return `http://${ip}:3000`;
    }

    // Fallback : si on ne trouve pas l'IP, on utilise localhost
    return 'http://localhost:3000';
  }

  // ═══════════════════════════════════════════════════════════
  // MODE PRODUCTION (APK / AAB EAS Build)
  // ═══════════════════════════════════════════════════════════
  // ✅ Priorité à la variable d'environnement (définie dans eas.json)
  // ✅ Fallback : IP publique NT Albey
  return process.env.EXPO_PUBLIC_API_URL || 'http://41.138.63.50:100';
};

export const API_URL = getApiUrl();
export const SOCKET_URL = API_URL;