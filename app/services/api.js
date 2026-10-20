// ╔══════════════════════════════════════════════════════════════════════╗
// ║                                                                      ║
// ║                    NT ALBEY — services/api.js                        ║
// ║                          Version 16.1.0                              ║
// ║                                                                      ║
// ║  ARCHITECTURE :                                                      ║
// ║  ├── 00. Configuration & constantes                                  ║
// ║  ├── 01. Gestion des erreurs                                         ║
// ║  ├── 02. Stockage sécurisé (SecureStore)                             ║
// ║  ├── 03. Biométrie                                                   ║
// ║  ├── 04. Blacklist locale                                            ║
// ║  ├── 05. Refresh token                                               ║
// ║  ├── 06. authFetch (requêtes authentifiées)                          ║
// ║  ├── 07. Utilitaires JWT / Base64                                    ║
// ║  ├── 08. Login                                                       ║
// ║  ├── 09. Profil /me                                                  ║
// ║  ├── 10. Nettoyage local                                             ║
// ║  ├── 11. Données de référence                                        ║
// ║  ├── 12. Storage multi-utilisateurs                                  ║
// ║  ├── 13. Parser SOAP Huawei (GSM)                                    ║
// ║  └── 14. API publique (export)                                       ║
// ║                                                                      ║
// ║  NOUVEAUTÉS v16.1.0 :                                                ║
// ║  ✅ BACKEND_URL supporte maintenant un override via variable         ║
// ║     d'environnement : EXPO_PUBLIC_API_URL                            ║
// ║  ✅ Le blocage HTTPS en production a été retiré :                    ║
// ║     l'app utilise désormais l'IP publique NT Albey                   ║
// ║     (http://41.138.63.50:100) directement en prod, pour éviter       ║
// ║     une dépendance à un domaine DNS + certificat SSL.                ║
// ║  ✅ GSM_GATEWAY_URL peut aussi être overridé via                     ║
// ║     EXPO_PUBLIC_GSM_URL                                              ║
// ║                                                                      ║
// ║  v16.0.3 :                                                           ║
// ║  ✅ transferToAgency() : validation du numéro PROGRESSIVE            ║
// ║     avec messages clairs et alignés sur le front                     ║
// ║                                                                      ║
// ║  v16.0.2 :                                                           ║
// ║  ✅ getDepartements() : multi-stratégies en cas de 403               ║
// ║                                                                      ║
// ║  v16 :                                                               ║
// ║  ✅ transferToAgency() refondu                                       ║
// ║  ✅ getDepartements() remplace getRegions()                          ║
// ║  ✅ withdraw() utilise le vrai endpoint self-send                    ║
// ╚══════════════════════════════════════════════════════════════════════╝

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/* ═══════════════════════════════════════════════════════════════════════
   00. CONFIGURATION & CONSTANTES
   ═══════════════════════════════════════════════════════════════════════ */

// ─── Backend principal ──────────────────────────────────────────────
// ✅ IP publique NT Albey utilisée en dev ET en prod.
// ✅ Peut être overridée via la variable d'environnement EXPO_PUBLIC_API_URL
//    (définie dans eas.json pour chaque profil de build).
const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://41.138.63.50:100';

// ─── Passerelle GSM (Huawei SOAP) ───────────────────────────────────
// ✅ Peut être overridée via EXPO_PUBLIC_GSM_URL
const GSM_GATEWAY_URL =
  process.env.EXPO_PUBLIC_GSM_URL ||
  'http://41.138.63.12:9000/check_free_unit.php';

// ─── Timeouts ────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS     = 20_000; // 20s — appels standards
const NT_RECHARGE_TIMEOUT_MS = 45_000; // 45s — recharges NT (GSM lent)

// ─── Clés SecureStore (chiffrées) ───────────────────────────────────
const SECURE_KEYS = Object.freeze({
  ACCESS:  'ntalbey_access_token',
  REFRESH: 'ntalbey_refresh_token',
  USER:    'ntalbey_user_profile',
  REVOKED: 'ntalbey_revoked_tokens',
});

const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// ─── Clés AsyncStorage (non sensibles) ──────────────────────────────
const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN:               '@ntalbey_access_token',
  REFRESH_TOKEN:              '@ntalbey_refresh_token',
  USER:                       '@ntalbey_user',
  REVOKED_TOKENS:             '@ntalbey_revoked_tokens',
  DEVICE_ID:                  '@ntalbey_device_id',
  ALL_USERS_DATA:             '@ntalbey_all_users_data',
  BIOMETRIC_ENROLLED_PHONES:  '@ntalbey_biometric_enrolled_phones',
  BIOMETRIC_DISMISSED_PHONES: '@ntalbey_biometric_dismissed',
  EXTRA_USERS:                '@ntalbey_extra_users',
  CHATBOT_HISTORY:            '@ntalbey_chatbot_history',
  CHATBOT_MODE:               '@ntalbey_chatbot_mode',
  CHATBOT_CONV_ID:            '@ntalbey_chatbot_conv_id',
});

// ─── Préfixes biométriques ──────────────────────────────────────────
const BIOMETRIC_ACCESS_PREFIX  = 'ntalbey_bio_access_';
const BIOMETRIC_REFRESH_PREFIX = 'ntalbey_bio_refresh_';

// ─── Données de repli (UNIQUEMENT pour les agences / carte) ─────────
// ⚠️ Les DÉPARTEMENTS n'ont PLUS de fallback (données 100% API)
const WITHDRAW_LOCATIONS_FALLBACK = Object.freeze([
  { id: 1, name: 'Agence NT Niamey',    address: 'Niamey',    lat: 13.502989085926565, lng: 2.1305871006587145 },
  { id: 2, name: 'Agence NT Maradi',    address: 'Maradi',    lat: 13.4977,            lng: 7.1026 },
  { id: 3, name: 'Agence NT Zinder',    address: 'Zinder',    lat: 13.8123,            lng: 8.9843 },
  { id: 4, name: 'Agence NT Tahoua',    address: 'Tahoua',    lat: 14.8909,            lng: 5.2690 },
  { id: 5, name: 'Agence NT Agadez',    address: 'Agadez',    lat: 16.9742,            lng: 7.9909 },
  { id: 6, name: 'Agence NT Diffa',     address: 'Diffa',     lat: 13.3150,            lng: 12.6113 },
  { id: 7, name: 'Agence NT Dosso',     address: 'Dosso',     lat: 13.0490,            lng: 3.1941 },
  { id: 8, name: 'Agence NT Tillabéri', address: 'Tillabéri', lat: 14.2077,            lng: 1.4544 },
]);

/* ═══════════════════════════════════════════════════════════════════════
   01. GESTION DES ERREURS
   ═══════════════════════════════════════════════════════════════════════ */

function buildFriendlyError(res, data, context = 'action') {
  const status = res?.status || 0;

  if (__DEV__) {
    console.log(`⚠️ [API:${context}] HTTP ${status}`, {
      url: res?.url,
      error_code: data?.error_code,
    });
  }

  let backendDetail = data?.detail;
  if (Array.isArray(backendDetail)) {
    const first = backendDetail[0];
    const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
    const rawMsg = first?.msg || '';
    backendDetail = field ? `${field} : ${rawMsg}` : rawMsg;
  }

  const USER_MESSAGES = {
    400: 'Les informations envoyées sont incorrectes.',
    401: 'Numéro de téléphone ou code PIN incorrect.',
    403: 'Vous n\'avez pas accès à cette fonctionnalité.',
    404: 'Impossible de traiter la demande. Vérifiez les informations saisies.',
    409: 'Cette opération existe déjà.',
    422: 'Certaines informations sont invalides.',
    429: 'Trop de tentatives. Réessayez dans quelques minutes.',
    500: 'Le service est momentanément indisponible.',
    502: 'Le service est momentanément indisponible.',
    503: 'Le service est momentanément indisponible.',
    504: 'Le service met trop de temps à répondre.',
  };

  if (status === 403 && typeof backendDetail === 'string' && backendDetail.toLowerCase().includes('permission')) {
    return new Error('Cette fonctionnalité n\'est pas disponible pour votre compte.');
  }
  if (status === 404) return new Error('Impossible de traiter la demande. Vérifiez les informations saisies.');
  if (status === 422 && backendDetail && __DEV__) return new Error(`Information invalide : ${backendDetail}`);
  if (status === 422) return new Error('Certaines informations sont invalides.');

  return new Error(USER_MESSAGES[status] || 'Une erreur est survenue. Réessayez.');
}

async function safeFetch(url, options = {}, context = 'request', timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (netErr) {
    if (__DEV__) {
      console.log(`❌ [API:${context}] Erreur réseau`, {
        url,
        name: netErr?.name,
        message: netErr?.message,
      });
    }
    const errName = String(netErr?.name || '').toLowerCase();
    const errMsg  = String(netErr?.message || '').toLowerCase();
    const isAbort = errName === 'aborterror' || errMsg.includes('abort');

    if (isAbort) throw new Error('Le serveur ne répond pas. Réessayez dans un instant.');
    throw new Error('Connexion impossible. Vérifiez votre réseau.');
  } finally {
    clearTimeout(timer);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   01b. MESSAGES EMPATHIQUES POUR LES RECHARGES NT
   ═══════════════════════════════════════════════════════════════════════ */

function buildRechargeUserMessage(kind, reason = '') {
  const label =
    kind === 'airtime'   ? 'crédit' :
    kind === 'softphone' ? 'crédit Softphone' :
                           'stock';

  const r = String(reason || '').toLowerCase();

  if (
    r.includes('connexion') || r.includes('réseau') || r.includes('network') ||
    r.includes('timeout')   || r.includes('abort')  || r.includes('serveur ne répond')
  ) {
    return `😥 Petite difficulté de connexion.\n\nVotre ${label} n'a pas pu être rechargé à cause d'un souci de réseau. Pas d'inquiétude : rien n'a été débité.\n\n👉 Vérifiez votre connexion internet puis réessayez dans quelques instants.`;
  }

  if (
    r.includes('indisponible') || r.includes('momentanément') ||
    r.includes('service')      || r.includes('trop de temps')
  ) {
    return `🙏 Le service est momentanément indisponible.\n\nNos équipes techniques y travaillent. Votre ${label} sera rechargé dès que tout sera revenu à la normale.\n\n👉 Merci de réessayer dans quelques minutes.`;
  }

  if (r.includes('trop de tentatives') || r.includes('rate') || r.includes('429')) {
    return `⏳ Un peu trop de tentatives d'affilée.\n\nPour votre sécurité, une petite pause est nécessaire avant de recharger votre ${label}.\n\n👉 Réessayez dans 2 à 3 minutes.`;
  }

  if (
    r.includes('session expirée') || r.includes('reconnectez') ||
    r.includes('unauthorized')    || r.includes('forbidden')
  ) {
    return `🔐 Votre session a expiré.\n\nPour votre sécurité, veuillez vous reconnecter puis relancer le rechargement de votre ${label}.\n\n👉 Vos informations sont en sécurité.`;
  }

  if (
    r.includes('montant') || r.includes('invalide') || r.includes('dépasse') ||
    r.includes('limite')  || r.includes('numéro')   || r.includes('destinataire') ||
    r.includes('bénéficiaire')
  ) {
    return `⚠️ Les informations saisies ne peuvent pas être traitées.\n\nVérifiez le numéro et le montant, puis réessayez.\n\n👉 Besoin d'aide ? Contactez notre support au 555.`;
  }

  if (
    reason && typeof reason === 'string' && reason.length > 0 &&
    reason.length < 250 && !reason.includes('HTTP') && !reason.includes('error_code')
  ) {
    return `😔 Nous n'avons pas pu recharger votre ${label}.\n\n${reason}\n\n👉 Pas d'inquiétude : réessayez dans quelques instants. Si le problème persiste, contactez le support au 555.`;
  }

  return `😔 Nous sommes vraiment désolés.\n\nVotre ${label} n'a pas pu être rechargé pour le moment. Pas d'inquiétude : aucune somme n'a été débitée de votre compte.\n\n👉 Merci de réessayer dans quelques instants. Si le problème persiste, notre support est là pour vous au 555.`;
}

/* ═══════════════════════════════════════════════════════════════════════
   02. STOCKAGE SÉCURISÉ DES TOKENS
   ═══════════════════════════════════════════════════════════════════════ */

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateIdempotencyKey() {
  const key = generateUUID();
  if (__DEV__) console.log('🔑 [Idempotency] Clé générée :', key);
  return key;
}

async function getOrCreateDeviceId() {
  try {
    let id = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = generateUUID();
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

function getDeviceName() {
  return `${Platform.OS} ${Platform.version || Platform.Version}`;
}

async function migrateLegacyToken(secureKey, asyncKey) {
  try {
    const legacy = await AsyncStorage.getItem(asyncKey);
    if (!legacy) return null;
    await SecureStore.setItemAsync(secureKey, legacy, SECURE_OPTS);
    await AsyncStorage.removeItem(asyncKey);
    if (__DEV__) console.log('🔁 [SecureStore] Migration effectuée pour', secureKey);
    return legacy;
  } catch {
    return null;
  }
}

async function storeTokens(access, refresh) {
  try {
    await SecureStore.setItemAsync(SECURE_KEYS.ACCESS, access, SECURE_OPTS);
    if (refresh) await SecureStore.setItemAsync(SECURE_KEYS.REFRESH, refresh, SECURE_OPTS);
  } catch (e) {
    if (__DEV__) console.log('⚠️ [SecureStore] Échec storeTokens');
    throw new Error('Impossible de stocker la session en sécurité.');
  }
}

async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS);
    await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH);
  } catch {}
}

async function getAccessToken() {
  try {
    let token = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS);
    if (!token) token = await migrateLegacyToken(SECURE_KEYS.ACCESS, STORAGE_KEYS.ACCESS_TOKEN);
    return token || null;
  } catch {
    return null;
  }
}

async function getRefreshToken() {
  try {
    let token = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH);
    if (!token) token = await migrateLegacyToken(SECURE_KEYS.REFRESH, STORAGE_KEYS.REFRESH_TOKEN);
    return token || null;
  } catch {
    return null;
  }
}

async function storeUser(userObj) {
  try {
    await SecureStore.setItemAsync(SECURE_KEYS.USER, JSON.stringify(userObj), SECURE_OPTS);
    try { await AsyncStorage.removeItem(STORAGE_KEYS.USER); } catch (_) {}
  } catch (e) {
    if (__DEV__) console.log('⚠️ [SecureStore] storeUser échoué, fallback AsyncStorage');
    try { await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userObj)); } catch (_) {}
  }
}

async function getUserFromStorage() {
  try {
    let raw = await SecureStore.getItemAsync(SECURE_KEYS.USER, SECURE_OPTS);
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }

    raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        await SecureStore.setItemAsync(SECURE_KEYS.USER, raw, SECURE_OPTS);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
        if (__DEV__) console.log('🔁 [SecureStore] Migration USER effectuée');
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function clearUserStorage() {
  try { await SecureStore.deleteItemAsync(SECURE_KEYS.USER); } catch (_) {}
  try { await AsyncStorage.removeItem(STORAGE_KEYS.USER); } catch (_) {}
}

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/* ═══════════════════════════════════════════════════════════════════════
   03. BIOMÉTRIE
   ═══════════════════════════════════════════════════════════════════════ */

function normalizePhoneForStore(phone) {
  return String(phone).replace(/[^0-9]/g, '');
}

async function saveBiometricTokens(phone, accessToken, refreshToken) {
  if (!phone || !accessToken) return;
  const suffix = normalizePhoneForStore(phone);
  try {
    await SecureStore.setItemAsync(`${BIOMETRIC_ACCESS_PREFIX}${suffix}`, accessToken, SECURE_OPTS);
    if (refreshToken) {
      await SecureStore.setItemAsync(`${BIOMETRIC_REFRESH_PREFIX}${suffix}`, refreshToken, SECURE_OPTS);
    }
    if (__DEV__) console.log('🔐 [Bio] Tokens biométriques sauvegardés');
  } catch (e) {
    if (__DEV__) console.log('Erreur saveBiometricTokens');
  }
}

async function getBiometricTokens(phone) {
  if (!phone) return null;
  const suffix = normalizePhoneForStore(phone);
  try {
    const access  = await SecureStore.getItemAsync(`${BIOMETRIC_ACCESS_PREFIX}${suffix}`);
    const refresh = await SecureStore.getItemAsync(`${BIOMETRIC_REFRESH_PREFIX}${suffix}`);
    if (!access) return null;
    return { access, refresh };
  } catch {
    return null;
  }
}

async function clearBiometricTokens(phone) {
  if (!phone) return;
  const suffix = normalizePhoneForStore(phone);
  try {
    await SecureStore.deleteItemAsync(`${BIOMETRIC_ACCESS_PREFIX}${suffix}`);
    await SecureStore.deleteItemAsync(`${BIOMETRIC_REFRESH_PREFIX}${suffix}`);
    if (__DEV__) console.log('🗑️ [Bio] Tokens biométriques supprimés');
  } catch (e) {
    if (__DEV__) console.log('Erreur clearBiometricTokens');
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   04. BLACKLIST LOCALE
   ═══════════════════════════════════════════════════════════════════════ */

async function readRevokedList() {
  try {
    let raw = await SecureStore.getItemAsync(SECURE_KEYS.REVOKED, SECURE_OPTS);
    if (raw) {
      try { return JSON.parse(raw); } catch { return []; }
    }
    raw = await AsyncStorage.getItem(STORAGE_KEYS.REVOKED_TOKENS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        await SecureStore.setItemAsync(SECURE_KEYS.REVOKED, JSON.stringify(parsed), SECURE_OPTS);
        await AsyncStorage.removeItem(STORAGE_KEYS.REVOKED_TOKENS);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function writeRevokedList(list) {
  try {
    const trimmed = list.slice(-10);
    await SecureStore.setItemAsync(SECURE_KEYS.REVOKED, JSON.stringify(trimmed), SECURE_OPTS);
  } catch (e) {
    if (__DEV__) console.log('Erreur writeRevokedList');
  }
}

async function revokeTokenLocally(token) {
  if (!token) return;
  try {
    const list = await readRevokedList();
    if (!list.some((r) => r.token === token)) list.push({ token, revokedAt: Date.now() });
    await writeRevokedList(list);
  } catch (e) {
    if (__DEV__) console.log('Erreur revokeTokenLocally');
  }
}

async function isTokenRevoked(token) {
  if (!token) return false;
  try {
    const list = await readRevokedList();
    return list.some((r) => r.token === token);
  } catch {
    return false;
  }
}

async function unrevokeTokenLocally(token) {
  if (!token) return;
  try {
    const list = await readRevokedList();
    const before = list.length;
    const filtered = list.filter((r) => r.token !== token);
    if (filtered.length !== before) {
      await writeRevokedList(filtered);
      if (__DEV__) console.log('🔓 [Blacklist] Token retiré');
    }
  } catch (e) {
    if (__DEV__) console.log('Erreur unrevokeTokenLocally');
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   05. REFRESH TOKEN
   ═══════════════════════════════════════════════════════════════════════ */

let _refreshInFlight = null;

async function refreshAccessToken() {
  if (_refreshInFlight) return _refreshInFlight;

  _refreshInFlight = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      if (__DEV__) console.log('🔁 [Refresh] POST /api/v1/auth/refresh');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      let res;
      try {
        res = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
          signal: controller.signal,
        });
      } catch (netErr) {
        return null;
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) return null;

      const data = await res.json();
      if (data?.access_token) {
        await storeTokens(data.access_token, data.refresh_token);
        try {
          const u = await getUserFromStorage();
          if (u?.phone) {
            const cleanPhone = String(u.phone).replace(/\s/g, '');
            const enrolledRaw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
            const enrolled = enrolledRaw ? JSON.parse(enrolledRaw) : [];
            if (enrolled.includes(cleanPhone)) {
              await saveBiometricTokens(cleanPhone, data.access_token, data.refresh_token);
            }
          }
        } catch (e) {}
        return data.access_token;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      _refreshInFlight = null;
    }
  })();

  return _refreshInFlight;
}

/* ═══════════════════════════════════════════════════════════════════════
   06. authFetch — requêtes authentifiées avec retry auto
   ═══════════════════════════════════════════════════════════════════════ */

async function authFetch(path, options = {}, _retry = true, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const token = await getAccessToken();

  if (token && (await isTokenRevoked(token))) {
    await clearTokens();
    throw new Error('Votre session a expiré. Reconnectez-vous.');
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (netErr) {
    const errName = String(netErr?.name || '').toLowerCase();
    const errMsg  = String(netErr?.message || '').toLowerCase();
    const isAbort = errName === 'aborterror' || errMsg.includes('abort');

    if (__DEV__) {
      console.log('❌ [authFetch] Erreur fetch', {
        path,
        name: netErr?.name,
        message: netErr?.message,
        isAbort,
        timeoutMs,
      });
    }

    if (isAbort) {
      throw new Error(
        `Le serveur met trop de temps à répondre (>${Math.round(timeoutMs / 1000)}s). Réessayez dans un instant.`
      );
    }
    throw new Error('Connexion impossible. Vérifiez votre réseau.');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && _retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return authFetch(path, options, false, timeoutMs);
    await clearTokens();
    await clearUserStorage();
    throw new Error('Votre session a expiré. Reconnectez-vous.');
  }

  return res;
}

/* ═══════════════════════════════════════════════════════════════════════
   07. UTILITAIRES JWT / BASE64
   ═══════════════════════════════════════════════════════════════════════ */

function base64Decode(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');
  let i = 0;
  while (i < str.length) {
    const e1 = chars.indexOf(str.charAt(i++));
    const e2 = chars.indexOf(str.charAt(i++));
    const e3 = chars.charAt(i++) === '=' ? 64 : chars.indexOf(str.charAt(i - 1));
    const e4 = chars.charAt(i++) === '=' ? 64 : chars.indexOf(str.charAt(i - 1));
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64) output += String.fromCharCode(c2);
    if (e4 !== 64) output += String.fromCharCode(c3);
  }
  try {
    return decodeURIComponent(escape(output));
  } catch {
    return output;
  }
}

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const b64     = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad     = b64.length % 4;
    const padded  = pad ? b64 + '='.repeat(4 - pad) : b64;
    return JSON.parse(base64Decode(padded));
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   08. LOGIN
   ═══════════════════════════════════════════════════════════════════════ */

async function realLogin(phone, pin) {
  const cleanPhone = String(phone).replace(/\s/g, '');
  const deviceId   = await getOrCreateDeviceId();
  const deviceName = getDeviceName();

  const payload = {
    phone_number: cleanPhone,
    pin: String(pin),
    device_id: deviceId,
    device_name: deviceName,
  };
  const path = '/api/v1/auth/customer';

  if (__DEV__) console.log(`📡 [Login] POST ${BACKEND_URL}${path}`);

  const res = await safeFetch(
    `${BACKEND_URL}${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    },
    'login'
  );

  let data = null;
  try { data = await res.json(); } catch {}

  if (res.ok && data?.access_token) {
    await storeTokens(data.access_token, data.refresh_token);
    return { authData: data, endpoint: path };
  }

  if (res.status === 401 || res.status === 403) throw new Error('Numéro de téléphone ou code PIN incorrect.');
  if (res.status === 422) throw new Error('Les informations saisies sont invalides.');
  if (res.status === 429) throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
  if (res.status >= 500)  throw new Error('Le service est momentanément indisponible. Réessayez plus tard.');

  throw buildFriendlyError(res, data, 'login');
}

/* ═══════════════════════════════════════════════════════════════════════
   09. PROFIL /me
   ═══════════════════════════════════════════════════════════════════════ */

async function fetchMe() {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await authFetch('/api/v1/auth/me');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   10. NETTOYAGE LOCAL
   ═══════════════════════════════════════════════════════════════════════ */

async function clearUserLocalData(userId) {
  if (!userId) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ALL_USERS_DATA);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed[userId]) {
      delete parsed[userId];
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_USERS_DATA, JSON.stringify(parsed));
    }
  } catch (e) {}
}

async function clearAllSensitiveStorage() {
  const keysToRemove = [
    STORAGE_KEYS.DEVICE_ID,
    STORAGE_KEYS.EXTRA_USERS,
    STORAGE_KEYS.CHATBOT_HISTORY,
    STORAGE_KEYS.CHATBOT_MODE,
    STORAGE_KEYS.CHATBOT_CONV_ID,
  ];
  try { await AsyncStorage.multiRemove(keysToRemove); } catch (e) {}
}

/* ═══════════════════════════════════════════════════════════════════════
   11. DONNÉES DE RÉFÉRENCE (Mocks & Fixtures)
   ═══════════════════════════════════════════════════════════════════════ */

const PAYMENT_CATEGORIES = [
  { id: 'electricite', name: 'Électricité', icon: 'IconElectricite', color: '#008933', providers: ['NIGELEC'],                 refLabel: 'Numéro de compteur' },
  { id: 'eau',         name: 'Eau',         icon: 'IconEau',         color: '#3B82F6', providers: ['NDE'],                     refLabel: 'Numéro de compteur' },
  { id: 'tv',          name: 'TV',          icon: 'IconTV',          color: '#F59E0B', providers: ['CANAL+', 'TNT'],           refLabel: "Numéro d'abonné"    },
  { id: 'ecole',       name: 'Scolarité',   icon: 'IconEcole',       color: '#8B5CF6', providers: ['École'],                   refLabel: 'Matricule élève'    },
  { id: 'assurance',   name: 'Assurance',   icon: 'IconAssurance',   color: '#06B6D4', providers: ['CAREN', 'SANLAM', 'SUNU'], refLabel: 'Numéro de contrat'  },
];

const ECOLES = [
  'Lycée Mariama', 'Lycée koira', 'Collège beyrey', 'lycée Tayamana',
  'Myriam de Nazareth', 'Nouvelle Horizon', 'Lycée Issa Beri', 'Lycée Lako',
];

const CLASSES = [
  '6ème', '5ème', '4ème', '3ème',
  'Seconde', 'Première A', 'Première C', 'Première D',
  'Terminale A', 'Terminale C', 'Terminale D',
];

let recentPayments = [
  { id: 1, provider: 'Nigelec', reference: '12345678', amount: '27500', date: '20/05/2025', status: 'payé', type: 'postpaid', abonne: 'Moussa Ibrahim' },
];

const nigelecAbonnes  = { '12345678': { nom: 'Moussa Ibrahim', type: 'postpaid' } };
const nigelecFactures = { '12345678': { montant: 27500, nom: 'Moussa Ibrahim' } };
const ndeAbonnes      = { '11111111': { nom: 'Moussa Ibrahim', montant: 8500 } };

const phoneBalanceData = {
  phoneNumber: '83 35 62 00',
  credit: 10500,
  callMinutes: 120,
  dataAmount: 2.5,
  dataUnit: 'GB',
  smsCount: 50,
  bonus: 500,
};

const gouvCategories = [
  { id: 'impot', name: 'Impôts', icon: 'IconImpot', color: '#008933', description: 'Impôt sur le revenu', fields: ['Numéro IFU', 'Nom complet'] },
];

const gouvServices = [
  { id: 'cni', name: "Carte d'identité", description: 'Demande CNI', price: 15000, refPrefix: 'CNI' },
];

const gouvReferences = {
  IFU123456: { nom: 'Moussa Ibrahim', montant: 125000, type: 'Impôt' },
};

const faqData = [
  {
    id: 'general',
    category: 'Général',
    icon: '📋',
    questions: [
      { q: "Qu'est-ce que NT Albey ?", a: 'NT Albey est une plateforme de paiement mobile de Niger Télécoms.' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   11b. BOUTIQUE — CATÉGORIES
   ═══════════════════════════════════════════════════════════════════════ */

const shopMainCategories = [
  {
    id: 'stock',
    name: 'Stock',
    icon: 'IconStock',
    color: '#10B981',
    description: 'Recharger mon stock',
  },
  {
    id: 'credit',
    name: 'Crédit',
    icon: 'IconCredit',
    color: '#FF6600',
    description: 'Recharger mon crédit',
  },
  {
    id: 'softphone',
    name: 'Softphone',
    icon: 'IconSoftphone',
    color: '#8B5CF6',
    description: 'Crédit pour appels Softphone',
  },
  {
    id: 'blr',
    name: 'BLR',
    icon: 'IconBLR',
    color: '#0EA5E9',
    description: 'Boucle locale radio — internet haut débit',
  },
];

const shopSubCategories = {};
const shopPeriods       = {};
const shopTariffs       = {};
const shopOtherProducts = {};

/* ═══════════════════════════════════════════════════════════════════════
   12. STORAGE MULTI-UTILISATEURS
   ═══════════════════════════════════════════════════════════════════════ */

let allUsersDataCache = null;
const INITIAL_BALANCES = {};
let users = [];

async function loadExtraUsers() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXTRA_USERS);
    if (raw) {
      const extra = JSON.parse(raw);
      if (Array.isArray(extra)) {
        extra.forEach((u) => {
          if (!users.some((e) => e.phone === u.phone)) users.push(u);
        });
      }
    }
  } catch (e) {}
}

function createUserData(userId) {
  return {
    balance: INITIAL_BALANCES[userId] !== undefined ? INITIAL_BALANCES[userId] : 0,
    transactions: [],
    contacts: [],
    cards: [],
    savings: [],
    pendingBills: [],
    notifications: [],
    pendingTransfers: [],
  };
}

async function loadAllUsersData() {
  if (allUsersDataCache !== null) return allUsersDataCache;
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ALL_USERS_DATA);
    if (json) {
      allUsersDataCache = JSON.parse(json);
      return allUsersDataCache;
    }
    allUsersDataCache = {};
    await AsyncStorage.setItem(STORAGE_KEYS.ALL_USERS_DATA, JSON.stringify(allUsersDataCache));
    return allUsersDataCache;
  } catch (error) {
    allUsersDataCache = {};
    return allUsersDataCache;
  }
}

async function saveAllUsersData() {
  if (allUsersDataCache === null) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ALL_USERS_DATA, JSON.stringify(allUsersDataCache));
  } catch (e) {}
}

async function getUserData(userId) {
  const allData = await loadAllUsersData();
  if (!allData[userId]) {
    allData[userId] = createUserData(userId);
    await saveAllUsersData();
  }
  return allData[userId];
}

async function updateUserData(userId, newData) {
  const allData = await loadAllUsersData();
  allData[userId] = newData;
  await saveAllUsersData();
  allUsersDataCache = allData;
}

async function getCurrentUserId() {
  try {
    const user = await getUserFromStorage();
    return user?.id || null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   13. PARSER SOAP HUAWEI (GSM)
   ═══════════════════════════════════════════════════════════════════════ */

function formatBytesToVolume(bytesValue) {
  const bytes = parseFloat(bytesValue) || 0;
  const mo = bytes / 1_000_000;
  if (mo >= 1024) return `${(mo / 1024).toFixed(1)}GB`;
  return `${Math.round(mo)}Mo`;
}

function normalizeVolumeString(volumeStr) {
  if (!volumeStr || typeof volumeStr !== 'string') return '0Mo';
  const trimmed = volumeStr.trim();
  const upper = trimmed.toUpperCase();
  if (upper.indexOf('GB') !== -1) return trimmed;
  if (upper.indexOf('MO') !== -1) {
    const mo = parseFloat(trimmed.replace(/mo/i, '')) || 0;
    if (mo >= 1024) return `${(mo / 1024).toFixed(1)}GB`;
    return `${Math.round(mo)}Mo`;
  }
  return trimmed;
}

function parseHuaweiSoapResponse(xmlText) {
  const resultCodeMatch = xmlText.match(/<cbs:ResultCode[^>]*>([^<]*)<\/cbs:ResultCode>/);
  const resultCode = resultCodeMatch ? parseInt(resultCodeMatch[1], 10) : -1;
  const resultDescMatch = xmlText.match(/<cbs:ResultDesc[^>]*>([^<]*)<\/cbs:ResultDesc>/);
  const resultDesc = resultDescMatch ? resultDescMatch[1].trim() : '';

  if (resultCode !== 0) {
    return { success: false, message: resultDesc || 'Erreur du serveur GSM', solde: '0 XOF' };
  }

  const items = [];
  const itemRegex = /<(?:\w+:)?FreeUnitItem\b[^>]*>([\s\S]*?)<\/(?:\w+:)?FreeUnitItem>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    const extractTag = (tag) => {
      const regex = new RegExp(`<(?:(?:\\w+):)?${tag}\\b[^>]*>([^<]*)</(?:(?:\\w+):)?${tag}>`);
      const m = itemXml.match(regex);
      return m ? m[1].trim() : '';
    };
    const type = extractTag('FreeUnitType');
    if (type) {
      items.push({
        FreeUnitType: type,
        FreeUnitTypeName: extractTag('FreeUnitTypeName'),
        TotalInitialAmount: extractTag('TotalInitialAmount') || '0',
        TotalUnusedAmount: extractTag('TotalUnusedAmount') || '0',
        ExpireTime: extractTag('ExpireTime'),
      });
    }
  }

  let dataRemaining = 0, dataTotal = 0;
  let bonusDataRemaining = 0, bonusDataTotal = 0;
  let smsRemaining = 0, smsTotal = 0;
  let voiceRemaining = 0, voiceTotal = 0;
  let expireDate = '';

  for (const item of items) {
    const type   = item.FreeUnitType || '';
    const name   = (item.FreeUnitTypeName || '').toLowerCase();
    const unused = parseFloat(item.TotalUnusedAmount) || 0;
    const total  = parseFloat(item.TotalInitialAmount) || 0;

    if (type === 'C_data' || name === 'data') {
      dataRemaining += unused;
      dataTotal += total;
    } else if (type === 'C_3G_Bonus_Internet' || name.indexOf('bonus') !== -1) {
      bonusDataRemaining += unused;
      bonusDataTotal += total;
    } else if (type === 'C_SMS_TR' || name.indexOf('sms') !== -1) {
      smsRemaining += unused;
      smsTotal += total;
    } else if (type === 'C_VOICE_Minutes_TR' || name.indexOf('voice') !== -1 || name.indexOf('min') !== -1) {
      voiceRemaining += unused;
      voiceTotal += total;
    }

    if (item.ExpireTime && !expireDate) expireDate = item.ExpireTime;
  }

  const internetRemaining = dataRemaining + bonusDataRemaining;
  const internetTotal     = dataTotal + bonusDataTotal;

  return {
    success: true,
    message: resultDesc,
    data: items,
    solde: '0 XOF',
    t_internet: formatBytesToVolume(internetTotal),
    r_internet: formatBytesToVolume(internetRemaining),
    t_minuteTR: `${voiceTotal}Min`,
    r_minuteTR: `${voiceRemaining}Min`,
    t_minuteNT: 'Min',
    r_minuteNT: 'Min',
    t_smsNT: `${smsTotal}SMS`,
    r_smsNT: `${smsRemaining}SMS`,
    expireDateTime: expireDate,
  };
}

function normalizeJsonVolumeResponse(data) {
  if (!data || typeof data !== 'object') return data;
  if (data.r_internet) data.r_internet = normalizeVolumeString(data.r_internet);
  if (data.t_internet) data.t_internet = normalizeVolumeString(data.t_internet);
  return data;
}

/* ═══════════════════════════════════════════════════════════════════════
   14. API PUBLIQUE
   ═══════════════════════════════════════════════════════════════════════ */

export const API = {

  /* ═══════════════════════════════════════════════════════════════════
     14.1 — AUTHENTIFICATION
     ═══════════════════════════════════════════════════════════════════ */

  async login(emailOrPhone, password) {
    const cleanPhone = String(emailOrPhone).replace(/\s/g, '');
    const { authData } = await realLogin(cleanPhone, password);
    const jwtPayload = decodeJWT(authData.access_token);
    const jwtUserId  = jwtPayload?.sub || cleanPhone;
    const meData     = await fetchMe();
    const profile    = meData?.profile || {};
    const apiUserId  = meData?.id || profile.id || jwtUserId;
    const fullName   = profile.full_name || profile.name || `Utilisateur ${cleanPhone.slice(-4)}`;

    const apiUser = {
      id: apiUserId,
      name: fullName,
      phone: profile.phone_number || cleanPhone,
      email: profile.email || '',
      city: profile.city || '',
      address: profile.address || '',
      nationality: profile.nationality || '',
      kyc_level: meData?.kyc_level || profile.kyc_level || 'kyc1',
      status: profile.status || 'active',
      actor_type: meData?.actor_type || jwtPayload?.actor_type || 'customer',
      actor_role: meData?.actor_role || jwtPayload?.actor_role || null,
      permissions: meData?.permissions || jwtPayload?.permissions || [],
      isRealUser: true,
    };

    await storeUser(apiUser);
    await getUserData(apiUser.id);

    try {
      const isEnrolled = await this.isPhoneEnrolledForBiometric(cleanPhone);
      if (isEnrolled) {
        await saveBiometricTokens(cleanPhone, authData.access_token, authData.refresh_token);
      }
    } catch (e) {}

    return apiUser;
  },

  async logout() {
    if (__DEV__) console.log('🚪 [Logout] Démarrage');

    let currentUser = null, refreshToken = null, accessToken = null;
    try {
      currentUser = await getUserFromStorage();
      refreshToken = await getRefreshToken();
      accessToken = await getAccessToken();
    } catch (e) {}

    let hasBiometricEnrolled = false;
    try {
      if (currentUser?.phone) {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
        const list = raw ? JSON.parse(raw) : [];
        const cleanPhone = String(currentUser.phone).replace(/\s/g, '');
        hasBiometricEnrolled = Array.isArray(list) && list.includes(cleanPhone);
      }
    } catch (_) {}

    if (refreshToken && !hasBiometricEnrolled) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeoutId);
      } catch (e) {}
    } else if (refreshToken && hasBiometricEnrolled) {
      if (__DEV__) console.log('ℹ️ [Logout] Bio activée → conservation backend du refresh_token');
    }

    if (accessToken) await revokeTokenLocally(accessToken);
    if (currentUser?.id) await clearUserLocalData(currentUser.id);
    await clearAllSensitiveStorage();
    await clearTokens();
    await clearUserStorage();
    if (__DEV__) console.log('✅ [Logout] Terminé');
  },

  async getCurrentUser() {
    try {
      return await getUserFromStorage();
    } catch {
      return null;
    }
  },

  async getMyProfile() {
    try {
      const res = await authFetch('/api/v1/auth/me');
      if (res.status === 401 || res.status === 403 || !res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async verifyPin(pin) {
    return await this.verifyPinForTransaction(pin);
  },

  async verifyPinForTransaction(pin) {
    const currentUser = await this.getCurrentUser();
    if (!currentUser?.phone) throw new Error('Session expirée. Reconnectez-vous.');

    if (!pin || String(pin).length < 8 || String(pin).length > 20) {
      throw new Error('Le mot de passe doit contenir entre 8 et 20 caractères.');
    }

    const cleanPhone = String(currentUser.phone).replace(/\s/g, '').replace(/^\+?227/, '');

    try {
      await realLogin(cleanPhone, pin);
      if (__DEV__) console.log('✅ [verifyPin] PIN vérifié via /auth/customer');
      return true;
    } catch (fallbackErr) {
      const msg = String(fallbackErr?.message || '').toLowerCase();
      if (msg.includes('incorrect') || msg.includes('401') || msg.includes('403')) {
        throw new Error('Le mot de passe est incorrect.');
      }
      if (msg.includes('trop de tentatives') || msg.includes('429')) {
        throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
      }
      if (msg.includes('indisponible') || msg.includes('connexion') || msg.includes('réseau')) {
        throw new Error('Le service est momentanément indisponible. Réessayez.');
      }
      throw new Error('Le mot de passe est incorrect.');
    }
  },

  async verifyBiometricForTransaction(phone) {
    const cleanPhone = String(phone || '').replace(/\s/g, '');
    if (!cleanPhone) throw new Error('Numéro de téléphone manquant.');

    const enrolled = await this.isPhoneEnrolledForBiometric(cleanPhone);
    if (!enrolled) {
      throw new Error('Aucune empreinte n\'est enregistrée pour ce compte. Utilisez votre mot de passe.');
    }

    const tokens = await getBiometricTokens(cleanPhone);
    if (!tokens || !tokens.access) {
      throw new Error('Session biométrique expirée. Utilisez votre mot de passe.');
    }

    let res;
    try {
      res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${tokens.access}` },
      });
    } catch (netErr) {
      throw new Error('Connexion impossible. Vérifiez votre réseau.');
    }

    if (!res.ok) {
      const mainToken = await getAccessToken();
      if (mainToken) {
        if (__DEV__) console.log('⚠️ [verifyBiometric] Token bio refusé → fallback session principale');
        return true;
      }
      await clearBiometricTokens(cleanPhone);
      throw new Error('Session biométrique expirée. Utilisez votre mot de passe.');
    }

    if (__DEV__) console.log('✅ [verifyBiometricForTransaction] Biométrie validée');
    return true;
  },

  async loginWithBiometric(emailOrPhone) {
    const cleanPhone = String(emailOrPhone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
    const enrolledList = raw ? JSON.parse(raw) : [];

    if (enrolledList.length === 0) {
      throw new Error('Aucun compte activé pour la connexion par empreinte.');
    }
    if (!enrolledList.includes(cleanPhone)) {
      throw new Error('Ce numéro n\'est pas associé à une empreinte.');
    }

    const tokens = await getBiometricTokens(cleanPhone);
    if (!tokens || !tokens.access) {
      throw new Error('Session biométrique expirée. Connectez-vous avec votre code PIN.');
    }

    await unrevokeTokenLocally(tokens.access);
    if (tokens.refresh) await unrevokeTokenLocally(tokens.refresh);
    await storeTokens(tokens.access, tokens.refresh);

    let meData = null;
    try { meData = await fetchMe(); } catch (_) { meData = null; }

    if (!meData) {
      await clearTokens();
      await clearBiometricTokens(cleanPhone);
      throw new Error(
        'Session biométrique expirée. Connectez-vous avec votre code PIN, puis réactivez l\'empreinte depuis votre Profil.'
      );
    }

    const profile = meData?.profile || {};
    const freshUser = {
      id: meData.id || profile.id || cleanPhone,
      name: profile.full_name || profile.name || `Utilisateur ${cleanPhone.slice(-4)}`,
      phone: profile.phone_number || cleanPhone,
      email: profile.email || '',
      city: profile.city || '',
      address: profile.address || '',
      nationality: profile.nationality || '',
      birthDate: profile.date_of_birth || '',
      kyc_level: meData.kyc_level || profile.kyc_level || 'kyc1',
      status: profile.status || 'active',
      actor_type: meData.actor_type || 'customer',
      actor_role: meData.actor_role || null,
      permissions: meData.permissions || [],
      isRealUser: true,
    };

    await storeUser(freshUser);
    await getUserData(freshUser.id);
    if (__DEV__) console.log('✅ [Bio] Login biométrique réussi pour', cleanPhone);
    return freshUser;
  },

  async enableBiometricForUser(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(cleanPhone)) {
      list.push(cleanPhone);
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES, JSON.stringify(list));
    }
    const access = await getAccessToken();
    const refresh = await getRefreshToken();
    if (access) await saveBiometricTokens(cleanPhone, access, refresh);
    await this.resetBiometricPrompt(cleanPhone);
    return true;
  },

  async disableBiometricForUser(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter((p) => p !== cleanPhone);
    await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES, JSON.stringify(list));
    await clearBiometricTokens(cleanPhone);
    return true;
  },

  async isPhoneEnrolledForBiometric(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
    const list = raw ? JSON.parse(raw) : [];
    return list.includes(cleanPhone);
  },

  async getEnrolledBiometricPhones() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
    return raw ? JSON.parse(raw) : [];
  },

  async shouldAskBiometricPrompt(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_DISMISSED_PHONES);
    const list = raw ? JSON.parse(raw) : [];
    return !list.includes(cleanPhone);
  },

  async dismissBiometricPrompt(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_DISMISSED_PHONES);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(cleanPhone)) {
      list.push(cleanPhone);
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_DISMISSED_PHONES, JSON.stringify(list));
    }
    return true;
  },

  async resetBiometricPrompt(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '');
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_DISMISSED_PHONES);
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter((p) => p !== cleanPhone);
    await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_DISMISSED_PHONES, JSON.stringify(list));
    return true;
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.2 — CUSTOMERS
     ═══════════════════════════════════════════════════════════════════ */

  async registerCustomer(payload) {
    const url = `${BACKEND_URL}/api/v1/customers/create`;
    if (__DEV__) console.log('🌐 [API registerCustomer] POST', url);

    const response = await safeFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      },
      'register'
    );

    let data = null;
    try { data = await response.json(); } catch {}

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          'Le service d\'inscription est momentanément indisponible. Contactez le support au 555 ou réessayez plus tard.'
        );
      }
      if (response.status === 422) {
        const first = data?.detail?.[0];
        const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
        const fieldMessages = {
          phone_number: 'Le numéro de téléphone est invalide.',
          full_name: 'Le nom complet est invalide.',
          email: 'L\'adresse email est invalide.',
          date_of_birth: 'La date de naissance est invalide.',
          gender: 'Le genre doit être "M" ou "F".',
          nationality: 'La nationalité doit être un code à 2 lettres (ex: NE).',
          pin: 'Le code PIN doit contenir entre 8 et 20 caractères.',
        };
        throw new Error(fieldMessages[field] || 'Les informations saisies sont invalides.');
      }
      if (response.status === 409) {
        throw new Error('Si ces informations sont valides, un SMS de confirmation vous sera envoyé.');
      }
      if (response.status >= 500) {
        throw new Error('Le service est momentanément indisponible. Réessayez plus tard.');
      }
      throw buildFriendlyError(response, data, 'register');
    }

    return data;
  },

  async searchCustomerByPhone(phone) {
    const cleanPhone = String(phone).replace(/\s/g, '').replace(/^\+?227/, '');
    if (!cleanPhone || cleanPhone.length < 8) return null;

    try {
      const me = await this.getCurrentUser();
      if (me?.phone) {
        const myClean = String(me.phone).replace(/\s/g, '').replace(/^\+?227/, '');
        if (myClean === cleanPhone) {
          if (__DEV__) console.log('🔍 [searchCustomer] = MOI-MÊME → retour local');
          return {
            full_name: me.name || 'Vous-même',
            phone_number: myClean,
            kyc_level: me.kyc_level,
            isSelf: true,
          };
        }
      }
    } catch (e) {}

    try {
      if (__DEV__) console.log(`🔍 [searchCustomer] GET ${BACKEND_URL}/api/v1/customers/${cleanPhone}`);
      const res = await authFetch(`/api/v1/customers/${cleanPhone}`);
      if (__DEV__) console.log('🔍 [searchCustomer] Status HTTP :', res.status);
      if (res.status === 404) return null;
      if (res.status === 403) return { phone_number: cleanPhone, full_name: null, _forbidden: true };
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      if (__DEV__) console.log('❌ [searchCustomer] Erreur :', e?.message);
      return null;
    }
  },

  async getCustomerById(id) {
    try {
      const res = await authFetch(`/api/v1/customers/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAllCustomers() {
    try {
      const res = await authFetch('/api/v1/customers');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.3 — CHANGEMENT DE PIN
     ═══════════════════════════════════════════════════════════════════ */

  async changeCustomerPin(customerId, currentPin, newPin) {
    const user = await this.getCurrentUser();
    if (!user?.id) throw new Error('Votre session a expiré. Reconnectez-vous.');

    const targetId = user.id;

    const res = await authFetch(`/api/v1/customers/changePin/${targetId}`, {
      method: 'POST',
      body: JSON.stringify({ current_pin: String(currentPin), new_pin: String(newPin) }),
    });

    if (res.ok) {
      try {
        if (user.phone) {
          await clearBiometricTokens(user.phone);
          const raw = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES);
          const list = raw ? JSON.parse(raw) : [];
          const cleanPhone = String(user.phone).replace(/\s/g, '');
          const filtered = list.filter((p) => p !== cleanPhone);
          await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENROLLED_PHONES, JSON.stringify(filtered));
          if (__DEV__) console.log('🔐 [changePin] Biométrie révoquée');
        }
      } catch (e) {
        if (__DEV__) console.log('⚠️ [changePin] Impossible de révoquer la biométrie');
      }
      return true;
    }

    let data = null;
    try { data = await res.json(); } catch {}
    if (res.status === 401 || res.status === 403) throw new Error('Le code PIN actuel est incorrect.');
    if (res.status === 404) throw new Error('Votre compte est introuvable. Contactez le support.');
    if (res.status === 422) throw new Error('Le nouveau code PIN doit contenir entre 8 et 20 caractères.');
    throw buildFriendlyError(res, data, 'changePin');
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.4 — RÉFÉRENTIELS
     ═══════════════════════════════════════════════════════════════════ */

  async getWithdrawLocations() {
    try {
      const res = await authFetch('/api/v1/agence');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const NIAMEY_LAT = 13.502989085926565;
          const NIAMEY_LNG = 2.1305871006587145;
          return data.map((a, idx) => {
            const isNiamey = (a.designation || '').toLowerCase().includes('niamey');
            return {
              id: a.id || idx + 1,
              name: a.designation || 'Agence NT',
              address: a.designation || '',
              lat: isNiamey ? NIAMEY_LAT : (a.gps_lat || NIAMEY_LAT),
              lng: isNiamey ? NIAMEY_LNG : (a.gps_lng || NIAMEY_LNG),
            };
          });
        }
      }
    } catch (e) {}
    return WITHDRAW_LOCATIONS_FALLBACK;
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.4b — DÉPARTEMENTS (pour le retrait et le transfert guichet)

     ✅ v16.0.2 : Multi-stratégies en cas de 403
        1) auth + /api/v1/departement
        2) SANS auth + /api/v1/departement (si endpoint public)
        3) auth + /api/v1/departements (pluriel)
        4) auth + /api/v1/regions (fallback ancien)
        → Retourne [] si TOUT échoue (pas de mock statique)
     ═══════════════════════════════════════════════════════════════════ */

  async getDepartements(region_id = null) {
    const query = region_id ? `?region_id=${encodeURIComponent(region_id)}` : '';

    const tryFetch = async (path, { auth = true } = {}) => {
      try {
        const token = auth ? await getAccessToken() : null;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

        let res;
        try {
          res = await fetch(`${BACKEND_URL}${path}`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        return res;
      } catch (e) {
        if (__DEV__) console.log(`❌ [getDepartements] fetch ${path} →`, e?.message);
        return null;
      }
    };

    const extractList = async (res) => {
      if (!res || !res.ok) return null;
      try {
        const data = await res.json();
        if (!Array.isArray(data)) return null;
        return data.filter(
          (d) => !d.status || String(d.status).toLowerCase() === 'active'
        );
      } catch {
        return null;
      }
    };

    if (__DEV__) console.log(`📡 [getDepartements] → /api/v1/departement${query} (avec auth)`);
    let res = await tryFetch(`/api/v1/departement${query}`, { auth: true });

    if (res?.status === 403) {
      if (__DEV__) console.log('⚠️ [getDepartements] 403 reçu → tentative sans auth');
    }

    let list = await extractList(res);
    if (list && list.length > 0) {
      if (__DEV__) console.log(`✅ [getDepartements] ${list.length} département(s) via /departement (auth)`);
      return list;
    }

    if (__DEV__) console.log(`📡 [getDepartements] → /api/v1/departement${query} (sans auth)`);
    res = await tryFetch(`/api/v1/departement${query}`, { auth: false });
    list = await extractList(res);
    if (list && list.length > 0) {
      if (__DEV__) console.log(`✅ [getDepartements] ${list.length} département(s) via /departement (public)`);
      return list;
    }

    if (__DEV__) console.log(`📡 [getDepartements] → /api/v1/departements${query} (avec auth)`);
    res = await tryFetch(`/api/v1/departements${query}`, { auth: true });
    list = await extractList(res);
    if (list && list.length > 0) {
      if (__DEV__) console.log(`✅ [getDepartements] ${list.length} département(s) via /departements`);
      return list;
    }

    if (__DEV__) console.log(`📡 [getDepartements] → /api/v1/regions (fallback)`);
    res = await tryFetch(`/api/v1/regions`, { auth: true });
    list = await extractList(res);
    if (list && list.length > 0) {
      if (__DEV__) console.log(`✅ [getDepartements] ${list.length} région(s) via /regions`);
      return list;
    }

    if (__DEV__) {
      console.log('❌ [getDepartements] Toutes les stratégies ont échoué');
      console.log('   → Vérifie que /api/v1/departement autorise le rôle "customer" côté backend');
    }
    return [];
  },

  async getPays() {
    try {
      const res = await authFetch('/api/v1/pays');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getCurrencies() {
    try {
      const res = await authFetch('/api/v1/currencies');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getAgences() {
    try {
      const res = await authFetch('/api/v1/agence');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getCaisses() {
    try {
      const res = await authFetch('/api/v1/caisse');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.5 — KYC
     ═══════════════════════════════════════════════════════════════════ */

  async getKycLimits() {
    try {
      const res = await authFetch('/api/v1/kyc/limits');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getKycStatus(customerId) {
    const id = customerId || (await this.getCurrentUser())?.id;
    if (!id) throw new Error('Utilisateur non connecté.');
    try {
      const res = await authFetch(`/api/v1/kyc/verification/customers/status/${id}`);
      if (res.status === 404) return null;
      if (res.status === 403) return { _forbidden: true };
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getKycUploadUrls(customerId) {
    const id = customerId || (await this.getCurrentUser())?.id;
    if (!id) throw new Error('Utilisateur non connecté.');
    const res = await authFetch(`/api/v1/kyc/customers/upload-urls/${id}`, { method: 'POST' });
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw buildFriendlyError(res, data, 'kycUploadUrls');
    }
    return await res.json();
  },

  async confirmKycDocuments(customerId, frontKey, backKey) {
    const id = customerId || (await this.getCurrentUser())?.id;
    if (!id) throw new Error('Utilisateur non connecté.');
    const res = await authFetch(`/api/v1/kyc/verification/customers/documents/confirm/${id}`, {
      method: 'POST',
      body: JSON.stringify({ front_key: frontKey, back_key: backKey }),
    });
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw buildFriendlyError(res, data, 'kycConfirm');
    }
    return await res.json();
  },

  async submitKyc(customerId, kycLevel = 'kyc2') {
    const id = customerId || (await this.getCurrentUser())?.id;
    if (!id) throw new Error('Utilisateur non connecté.');
    const res = await authFetch(`/api/v1/kyc/verification/customers/submit/${id}`, {
      method: 'POST',
      body: JSON.stringify({ kyc_level: kycLevel }),
    });
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw buildFriendlyError(res, data, 'kycSubmit');
    }
    return await res.json();
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.6 — WALLET
     ═══════════════════════════════════════════════════════════════════ */

  async getWallet(phoneNumber) {
    if (!phoneNumber) throw new Error('Numéro de téléphone manquant.');
    const candidates = [
      String(phoneNumber),
      String(phoneNumber).replace(/\s/g, ''),
      String(phoneNumber).replace(/\s/g, '').replace(/^\+?227/, ''),
    ];

    let lastError = null;
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const res = await authFetch(`/api/v1/wallets/${encodeURIComponent(candidate)}`);
        if (res.ok) return await res.json();
        if (res.status === 404) {
          lastError = new Error('Compte introuvable.');
          continue;
        }
        lastError = new Error('Impossible de charger votre solde.');
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Impossible de charger votre solde.');
  },

  async getWalletById(walletId) {
    if (!walletId) throw new Error('Identifiant de wallet manquant.');
    const res = await authFetch(`/api/v1/wallets/${walletId}`);
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw buildFriendlyError(res, data, 'getWalletById');
    }
    return await res.json();
  },

  async getWalletEntries(walletId, { limit = 50, offset = 0 } = {}) {
    if (!walletId) return [];
    try {
      const res = await authFetch(`/api/v1/wallets/entries/${walletId}?limit=${limit}&offset=${offset}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.7 — TRANSACTIONS (ÉCRITURES)
     ═══════════════════════════════════════════════════════════════════ */

  async _postTransaction(path, payload) {
    const idempotencyKey = generateIdempotencyKey();
    const res = await authFetch(path, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      const errorCode = data?.error_code || null;
      const backendDetail = typeof data?.detail === 'string' ? data.detail : null;

      const BUSINESS_ERROR_MESSAGES = {
        limit_exceeded: 'Cette opération dépasserait la limite autorisée pour ce compte.',
        max_balance_exceeded: 'Le destinataire a atteint le solde maximum autorisé sur son compte.',
        kyc_limit_exceeded: 'Vous avez atteint la limite de votre niveau KYC. Vérifiez votre identité pour augmenter vos plafonds.',
        insufficient_funds: 'Votre solde est insuffisant pour effectuer cette transaction.',
        insufficient_balance: 'Votre solde est insuffisant pour effectuer cette transaction.',
        amount_too_low: 'Le montant est inférieur au minimum autorisé.',
        amount_too_high: 'Le montant dépasse le maximum autorisé par transaction.',
        invalid_amount: 'Le montant saisi est invalide.',
        wallet_not_found: 'Le compte du destinataire est introuvable.',
        wallet_suspended: 'Ce compte est actuellement suspendu.',
        wallet_blocked: 'Ce compte est actuellement bloqué.',
        wallet_closed: 'Ce compte est fermé.',
        receiver_not_found: 'Le destinataire n\'est pas enregistré sur NT Albey.',
        sender_not_found: 'Votre compte est introuvable. Contactez le support.',
        duplicate_transaction: 'Cette transaction a déjà été enregistrée.',
        idempotency_conflict: 'Cette transaction a déjà été traitée.',
        permission_denied: 'Vous n\'êtes pas autorisé à effectuer cette opération.',
        kyc_required: 'Une vérification d\'identité est requise pour cette opération.',
        pin_required: 'Une confirmation par code PIN est requise.',
        rate_limit_exceeded: 'Trop de tentatives. Réessayez dans quelques minutes.',
        service_unavailable: 'Le service est momentanément indisponible.',
        invalid_phone: 'Le numéro de téléphone est invalide.',
        same_wallet_transfer: 'Vous ne pouvez pas envoyer de l\'argent à votre propre compte.',
      };

      if (errorCode && BUSINESS_ERROR_MESSAGES[errorCode]) throw new Error(BUSINESS_ERROR_MESSAGES[errorCode]);
      if (backendDetail && __DEV__) throw new Error(backendDetail);

      if (res.status === 400) throw new Error('Les informations de la transaction sont invalides.');
      if (res.status === 403) throw new Error('Cette opération n\'est pas autorisée pour votre compte.');
      if (res.status === 404) throw new Error('Destinataire ou compte introuvable.');
      if (res.status === 409) throw new Error('Cette transaction est déjà en cours.');

      if (res.status === 422) {
        const first = data?.detail?.[0];
        const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
        if (field === 'amount') throw new Error('Le montant saisi est invalide.');
        if (field === 'customer_phone' || field === 'receiver_phone') throw new Error('Le numéro de téléphone est invalide.');
        if (field === 'receiver_caisse_id') throw new Error('L\'agence de destination est invalide.');
        if (field === 'departement_id') throw new Error('La région est invalide.');
        if (field === 'sender_first_name') throw new Error('Le prénom de l\'expéditeur est invalide.');
        if (field === 'sender_last_name') throw new Error('Le nom de l\'expéditeur est invalide.');
        throw new Error('Certaines informations de la transaction sont invalides.');
      }

      if (res.status >= 500) throw new Error('Le service est momentanément indisponible. Réessayez.');
      throw buildFriendlyError(res, data, 'transaction');
    }

    return data;
  },

  async deposit({ customer_phone, amount }) {
    const cleanPhone = String(customer_phone).replace(/\s/g, '').replace(/^\+?227/, '');
    const numericAmount = Number(amount);
    if (!cleanPhone || cleanPhone.length < 8) throw new Error('Le numéro de téléphone est invalide.');
    if (!numericAmount || numericAmount <= 0) throw new Error('Le montant doit être supérieur à zéro.');
    return await this._postTransaction('/api/v1/transactions/depot', {
      customer_phone: cleanPhone,
      amount: numericAmount,
    });
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.7b — RETRAIT (self-send)
     POST /api/v1/transactions/self-send
     Body : { departement_id, amount, frais_inclus, external_ref? }
     ═══════════════════════════════════════════════════════════════════ */

  async withdraw({ departement_id, amount, frais_inclus = false, external_ref = null }) {
    const numericAmount = Number(amount);
    const cleanDepartement = String(departement_id || '').trim();

    if (!cleanDepartement) {
      throw new Error('Veuillez sélectionner une région de retrait.');
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant doit être supérieur à zéro.');
    }
    if (!Number.isInteger(numericAmount)) {
      throw new Error('Le montant doit être un entier (pas de centimes).');
    }
    if (numericAmount > 500_000) {
      throw new Error('Le montant maximum par retrait est de 500 000 FCFA.');
    }

    const payload = {
      departement_id: cleanDepartement,
      amount: numericAmount,
      frais_inclus: Boolean(frais_inclus),
    };
    if (external_ref) payload.external_ref = String(external_ref);

    if (__DEV__) {
      console.log('📡 [Withdraw] POST /api/v1/transactions/self-send', payload);
    }

    return await this._postTransaction('/api/v1/transactions/self-send', payload);
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.7c — TRANSFERT AU GUICHET (transfert)
     ✅ v16.0.3 : validation du numéro PROGRESSIVE avec messages clairs
     POST /api/v1/transactions/transfert
     ═══════════════════════════════════════════════════════════════════ */

  async transferToAgency({
    departement_id,
    amount,
    frais_inclus = false,
    receiver_phone,
    sender_first_name,
    sender_last_name,
    is_cash_sender = false,
    external_ref = null,
  }) {
    const cleanPhone = String(receiver_phone || '')
      .replace(/[\s\-()\.]/g, '')
      .replace(/^\+?227/, '');

    const numericAmount = Number(amount);
    const cleanDepartement = String(departement_id || '').trim();
    const cleanFirstName = String(sender_first_name || '').trim();
    const cleanLastName  = String(sender_last_name  || '').trim();

    if (!cleanDepartement) {
      throw new Error('Veuillez sélectionner une région de retrait.');
    }

    if (!cleanPhone) {
      throw new Error('Veuillez saisir le numéro de téléphone du bénéficiaire.');
    }
    if (!/^\d+$/.test(cleanPhone)) {
      throw new Error('Le numéro ne doit contenir que des chiffres.');
    }
    if (cleanPhone.length !== 8) {
      throw new Error('Le numéro doit contenir exactement 8 chiffres.');
    }
    if (!/^(83|93)\d{6}$/.test(cleanPhone)) {
      throw new Error('Le numéro doit commencer par 83 ou 93.');
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant doit être supérieur à zéro.');
    }
    if (!Number.isInteger(numericAmount)) {
      throw new Error('Le montant doit être un entier (pas de centimes).');
    }
    if (numericAmount > 500_000) {
      throw new Error('Le montant maximum par transfert est de 500 000 FCFA.');
    }

    if (!cleanFirstName) {
      throw new Error('Le prénom de l\'expéditeur est requis.');
    }
    if (!cleanLastName) {
      throw new Error('Le nom de l\'expéditeur est requis.');
    }

    const payload = {
      departement_id:    cleanDepartement,
      amount:            numericAmount,
      frais_inclus:      Boolean(frais_inclus),
      receiver_phone:    cleanPhone,
      is_cash_sender:    false,
      sender_first_name: cleanFirstName,
      sender_last_name:  cleanLastName,
    };
    if (external_ref) payload.external_ref = String(external_ref);

    if (__DEV__) {
      console.log('📡 [TransferAgency] POST /api/v1/transactions/transfert', payload);
    }

    return await this._postTransaction('/api/v1/transactions/transfert', payload);
  },

  async accountToAccount({ receiver_phone, amount, external_ref = null }) {
    const cleanPhone = String(receiver_phone).replace(/\s/g, '').replace(/^\+?227/, '');
    const numericAmount = Number(amount);
    if (!cleanPhone || cleanPhone.length < 8) throw new Error('Le numéro du destinataire est invalide.');
    if (!numericAmount || numericAmount <= 0) throw new Error('Le montant doit être supérieur à zéro.');

    const payload = { receiver_phone: cleanPhone, amount: numericAmount };
    if (external_ref) payload.external_ref = String(external_ref);

    return await this._postTransaction('/api/v1/transactions/compte_compte', payload);
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.8 — TRANSACTIONS (LECTURE)
     _mapTransactionFromBackend ENRICHI pour tous les types Boutique
     ═══════════════════════════════════════════════════════════════════ */

  _mapTransactionFromBackend(tx, currentWalletId) {
    if (!tx) return null;
    const isSender   = tx.sender_wallet_id && tx.sender_wallet_id === currentWalletId;
    const isReceiver = tx.receiver_wallet_id && tx.receiver_wallet_id === currentWalletId;

    const gross = parseFloat(tx.gross_amount || '0') || 0;
    const fee   = parseFloat(tx.fee_amount || '0') || 0;

    let amount = 0;
    if (isSender) amount = -gross;
    else if (isReceiver) amount = gross - fee;
    else amount = gross;

    const typeMap = {
      compte_compte:      'transfer',
      comte_compte:       'transfer',
      transfer:           'transferAgency',
      transfert:          'transferAgency',
      ajustement:         'transfer',

      cashin:             'cashin',
      depot:              'cashin',
      bank_to_wallet:     'cashin',
      cashout:            'withdraw',
      retrait:            'withdraw',
      wallet_to_bank:     'withdraw',

      facture_payment:    'bill',
      bill_payment:       'bill',
      gouvpay:            'gouvpay',
      gov_payment:        'gouvpay',

      merchant_payment:   'shop',
      shop_purchase:      'shop',

      airtime:            'shop',
      airtime_self:       'shop',
      airtime_to_me:      'shop',
      airtime_to_phone:   'shop',
      credit_purchase:    'shop',
      recharge_credit:    'shop',

      stock:              'shop',
      stock_recharge:     'shop',
      stock_to_me:        'shop',
      recharge_stock:     'shop',

      softphone:          'shop',
      softphone_recharge: 'shop',
      softphone_to_phone: 'shop',
      recharge_softphone: 'shop',

      blr:                'shop',
      blr_recharge:       'shop',
      blr_resubscribe:    'shop',
      blr_payment:        'shop',
      resubscribe_blr:    'shop',

      ntrecharge:         'shop',
      nt_recharge:        'shop',
      bundle:             'shop',
      bundle_purchase:    'shop',
      plan_purchase:      'shop',
      forfait:            'shop',
    };
    const frontType = typeMap[tx.trans_type] || 'transfer';

    const labelMap = {
      compte_compte:      'Transfert compte à compte',
      comte_compte:       'Transfert compte à compte',
      transfer:           'Transfert au guichet',
      transfert:          'Transfert au guichet',
      ajustement:         'Ajustement',

      cashin:             'Dépôt',
      depot:              'Dépôt',
      bank_to_wallet:     'Dépôt bancaire',
      cashout:            'Retrait',
      retrait:            'Retrait',
      wallet_to_bank:     'Retrait vers banque',

      facture_payment:    'Paiement facture',
      bill_payment:       'Paiement facture',
      gouvpay:            'Paiement Gouv-Pay',
      gov_payment:        'Paiement Gouv-Pay',

      merchant_payment:   'Paiement marchand',
      shop_purchase:      'Achat Boutique NT',

      airtime:            'Achat crédit téléphonique',
      airtime_self:       'Recharge crédit (pour moi)',
      airtime_to_me:      'Recharge crédit (pour moi)',
      airtime_to_phone:   'Envoi crédit téléphonique',
      credit_purchase:    'Achat crédit téléphonique',
      recharge_credit:    'Recharge crédit',

      stock:              'Recharge stock NT Albey',
      stock_recharge:     'Recharge stock NT Albey',
      stock_to_me:        'Recharge stock NT Albey',
      recharge_stock:     'Recharge stock NT Albey',

      softphone:          'Recharge Softphone',
      softphone_recharge: 'Recharge Softphone',
      softphone_to_phone: 'Envoi crédit Softphone',
      recharge_softphone: 'Recharge Softphone',

      blr:                'Paiement BLR',
      blr_recharge:       'Recharge BLR',
      blr_resubscribe:    'Réabonnement BLR',
      blr_payment:        'Paiement BLR',
      resubscribe_blr:    'Réabonnement BLR',

      ntrecharge:         'Recharge NT',
      nt_recharge:        'Recharge NT',
      bundle:             'Achat forfait',
      bundle_purchase:    'Achat forfait',
      plan_purchase:      'Achat forfait',
      forfait:            'Achat forfait',
    };
    const description = labelMap[tx.trans_type] || 'Transaction';

    return {
      id: tx.id,
      type: frontType,
      amount,
      date: tx.initiated_at || tx.completed_at || new Date().toISOString(),
      description,
      reference: tx.reference,
      status: tx.status,
      details: {
        trans_type: tx.trans_type,
        currency: tx.currency_code,
        gross_amount: tx.gross_amount,
        fee_amount: tx.fee_amount,
        net_amount: tx.net_amount,
        sender_wallet_id: tx.sender_wallet_id,
        receiver_wallet_id: tx.receiver_wallet_id,
      },
      deletable: false,
    };
  },

  async getTransactions({ page = 1, page_size = 50, status_filter = null, trans_type = null } = {}) {
    try {
      const resEntries = await authFetch('/api/v1/transactions/entries/me');
      if (resEntries.ok) {
        const entries = await resEntries.json();
        const safeEntries = Array.isArray(entries) ? entries : [];
        return {
          items: safeEntries,
          total: safeEntries.length,
          page: 1,
          page_size: safeEntries.length,
          _viaEntries: true,
        };
      }
    } catch (e) {}

    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(page_size));
      if (status_filter) params.append('status_filter', status_filter);
      if (trans_type) params.append('trans_type', trans_type);

      const res = await authFetch(`/api/v1/transactions?${params.toString()}`);
      if (res.status === 403) return { items: [], total: 0, page, page_size, _forbidden: true };
      if (!res.ok) return { items: [], total: 0, page, page_size, _error: res.status };

      const data = await res.json();
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || page_size,
      };
    } catch {
      return { items: [], total: 0, page, page_size, _error: 'network' };
    }
  },

  async getTransactionsRaw({ page = 1, page_size = 100 } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(page_size));
      const res = await authFetch(`/api/v1/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return { items: Array.isArray(data.items) ? data.items : [], total: data.total || 0 };
      }
      if (res.status === 403) return { items: [], total: 0, _forbidden: true };
      return { items: [], total: 0, _error: res.status };
    } catch {
      return { items: [], total: 0, _error: 'network' };
    }
  },

  async getTransactionRawById(transactionId) {
    if (!transactionId) return null;
    try {
      const res = await authFetch(`/api/v1/transactions/${encodeURIComponent(transactionId)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTransactionById(transactionId) {
    if (!transactionId) throw new Error('Identifiant de transaction manquant.');
    const res = await authFetch(`/api/v1/transactions/${transactionId}`);
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw buildFriendlyError(res, data, 'getTransaction');
    }
    return await res.json();
  },

  async getTransactionByReference(reference) {
    if (!reference) throw new Error('Référence manquante.');
    const res = await authFetch(`/api/v1/transactions/${reference}`);
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw buildFriendlyError(res, data, 'getTransaction');
    }
    return await res.json();
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.9 — SOLDE & TRANSACTIONS LOCALES
     ═══════════════════════════════════════════════════════════════════ */

  async getBalance() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.balance;
  },

  async getLocalTransactions() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.transactions;
  },

  async addTransaction(transaction) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const newTrans = { id: Date.now().toString(), date: new Date().toISOString(), ...transaction };
    data.balance += transaction.amount;
    data.transactions = [newTrans, ...data.transactions];
    await updateUserData(userId, data);
    return newTrans;
  },

  async deleteTransaction(id) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const index = data.transactions.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Transaction introuvable.');
    const trans = data.transactions[index];
    if (!trans.deletable) throw new Error('Cette transaction ne peut pas être annulée.');
    data.balance -= trans.amount;
    data.transactions.splice(index, 1);
    await updateUserData(userId, data);
    return { success: true };
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.10 — CONTACTS
     ═══════════════════════════════════════════════════════════════════ */

  async getContacts() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.contacts;
  },

  async addContact(contact) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const newContact = {
      id: Math.max(...data.contacts.map((c) => c.id), 0) + 1,
      ...contact,
      isFavorite: contact.isFavorite || false,
    };
    data.contacts.push(newContact);
    await updateUserData(userId, data);
    return newContact;
  },

  async updateContact(id, dataToUpdate) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const index = data.contacts.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Contact introuvable.');
    data.contacts[index] = { ...data.contacts[index], ...dataToUpdate };
    await updateUserData(userId, data);
    return data.contacts[index];
  },

  async deleteContact(id) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    data.contacts = data.contacts.filter((c) => c.id !== id);
    await updateUserData(userId, data);
    return { success: true };
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.11 — CARTES VIRTUELLES
     ═══════════════════════════════════════════════════════════════════ */

  async getCards() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.cards;
  },

  async addCard(cardData) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const newCard = {
      id: Math.max(...data.cards.map((c) => c.id), 0) + 1,
      ...cardData,
      balance: 0,
      isDefault: false,
    };
    data.cards.push(newCard);
    await updateUserData(userId, data);
    return newCard;
  },

  async rechargeCard(cardId, amount) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const card = data.cards.find((c) => c.id === cardId);
    if (!card) throw new Error('Carte introuvable.');
    if (data.balance < amount) throw new Error('Votre solde est insuffisant.');
    data.balance -= amount;
    card.balance += amount;
    data.transactions = [
      {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        amount: -amount,
        description: `Recharge carte •••• ${card.cardNumber.slice(-4)}`,
        type: 'visa_recharge',
        details: { cardId, cardNumber: card.cardNumber.slice(-4) },
        deletable: false,
      },
      ...data.transactions,
    ];
    await updateUserData(userId, data);
    return card;
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.12 — ÉPARGNE
     ═══════════════════════════════════════════════════════════════════ */

  async getSavings() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.savings;
  },

  async createSavings(savingsData) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const newSavings = {
      id: Date.now().toString(),
      ...savingsData,
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
    };
    data.savings.push(newSavings);
    await updateUserData(userId, data);
    return newSavings;
  },

  async addToSavings(savingsId, amount) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const saving = data.savings.find((s) => s.id === savingsId);
    if (!saving) throw new Error('Épargne introuvable.');
    if (data.balance < amount) throw new Error('Votre solde est insuffisant.');
    data.balance -= amount;
    saving.balance += amount;
    saving.transactions.push({
      id: Date.now().toString(),
      type: 'add',
      amount,
      date: new Date().toISOString(),
      note: 'Ajout',
    });
    data.transactions = [
      {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        amount: -amount,
        description: `Ajout à "${saving.name}"`,
        type: 'savings',
        details: { savingsId, savingsName: saving.name, operation: 'add' },
        deletable: false,
      },
      ...data.transactions,
    ];
    await updateUserData(userId, data);
    return saving;
  },

  async withdrawFromSavings(savingsId, amount) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const saving = data.savings.find((s) => s.id === savingsId);
    if (!saving) throw new Error('Épargne introuvable.');
    if (saving.balance < amount) throw new Error('Le solde de cette épargne est insuffisant.');
    if (saving.lockDate && new Date() < new Date(saving.lockDate)) {
      throw new Error(`Cette épargne est bloquée jusqu'au ${saving.lockDate}.`);
    }
    saving.balance -= amount;
    data.balance += amount;
    saving.transactions.push({
      id: Date.now().toString(),
      type: 'withdraw',
      amount,
      date: new Date().toISOString(),
      note: 'Retrait',
    });
    data.transactions = [
      {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        amount,
        description: `Retrait de "${saving.name}"`,
        type: 'savings',
        details: { savingsId, savingsName: saving.name, operation: 'withdraw' },
        deletable: false,
      },
      ...data.transactions,
    ];
    await updateUserData(userId, data);
    return saving;
  },

  async deleteSavings(savingsId) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    data.savings = data.savings.filter((s) => s.id !== savingsId);
    await updateUserData(userId, data);
    return { success: true };
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.13 — FACTURES / NOTIFICATIONS
     ═══════════════════════════════════════════════════════════════════ */

  async getPendingBills() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.pendingBills;
  },

  async getNotifications() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.notifications;
  },

  async markNotificationAsRead(id) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const notif = data.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    await updateUserData(userId, data);
    return { success: true };
  },

  async markAllNotificationsAsRead() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    data.notifications.forEach((n) => (n.read = true));
    await updateUserData(userId, data);
    return { success: true };
  },

  async getUnreadNotificationsCount() {
    const userId = await getCurrentUserId();
    if (!userId) return 0;
    const data = await getUserData(userId);
    return (data.notifications || []).filter((n) => !n.read).length;
  },

  async addNotification(notification) {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const data = await getUserData(userId);
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      read: false,
      type: 'success',
      ...notification,
    };
    data.notifications = [newNotif, ...(data.notifications || [])];
    await updateUserData(userId, data);
    return newNotif;
  },

  async notificationExistsForTransaction(transactionId) {
    if (!transactionId) return false;
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const data = await getUserData(userId);
    return (data.notifications || []).some((n) => n.transactionId === transactionId);
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.14 — SOLDE TÉLÉPHONIQUE (GSM)
     ═══════════════════════════════════════════════════════════════════ */

  async getPhoneBalance(userPhone) {
    await delay();
    return { ...phoneBalanceData, phoneNumber: userPhone || phoneBalanceData.phoneNumber };
  },

  async getPhoneRealBalance(phoneNumber) {
    const cleanPhone = String(phoneNumber).replace(/\s/g, '').replace(/^\+?227/, '');
    const bodyString = `number=${encodeURIComponent(cleanPhone)}&=`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(GSM_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await res.text();
    const trimmed = rawText.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const data = JSON.parse(trimmed);
      return normalizeJsonVolumeResponse(data);
    }

    if (
      trimmed.startsWith('<?xml') ||
      trimmed.indexOf('<soapenv:Envelope') !== -1 ||
      trimmed.indexOf('<QueryFreeUnitResult') !== -1
    ) {
      return parseHuaweiSoapResponse(trimmed);
    }

    if (trimmed.startsWith('<')) {
      throw new Error(`Le serveur GSM a renvoyé du HTML (HTTP ${res.status}).`);
    }
    throw new Error('Format de réponse inconnu du serveur GSM.');
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.15 — NT RECHARGE (via /ntrecharge)
     ═══════════════════════════════════════════════════════════════════ */

  async _sendNtRechargeToMe(amount, type) {
    const kind = Number(type) === 1 ? 'airtime' : 'stock';
    const numericAmount = Number(amount);
    const numericType   = Number(type);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant doit être supérieur à zéro.');
    }
    if (!Number.isInteger(numericAmount)) {
      throw new Error('Le montant doit être un entier (pas de centimes).');
    }
    if (numericAmount > 5_000_000) {
      throw new Error('Le montant dépasse la limite autorisée.');
    }
    if (numericType !== 1 && numericType !== 2) {
      throw new Error('Type de recharge invalide.');
    }

    if (__DEV__) {
      console.log('📡 [NT Recharge → moi] POST /api/v1/ntrecharge/send-to-me', {
        amount: numericAmount,
        type: numericType,
        kind,
        timeoutMs: NT_RECHARGE_TIMEOUT_MS,
      });
    }

    let res;
    let data = null;

    try {
      res = await authFetch(
        '/api/v1/ntrecharge/send-to-me',
        {
          method: 'POST',
          body: JSON.stringify({ amount: numericAmount, type: numericType }),
        },
        true,
        NT_RECHARGE_TIMEOUT_MS
      );
      try { data = await res.json(); } catch {}
    } catch (netOrAuthErr) {
      const raw = String(netOrAuthErr?.message || '');
      if (__DEV__) {
        console.log(`⚠️ [NT Recharge → moi] Erreur réseau/auth (${kind}):`, {
          name: netOrAuthErr?.name,
          message: raw,
        });
      }
      throw new Error(buildRechargeUserMessage(kind, raw));
    }

    const httpOk = res.ok;
    const backendSaysFailed = data && typeof data === 'object' && data.success === false;

    if (!httpOk || backendSaysFailed) {
      if (__DEV__) {
        console.log(`⚠️ [NT Recharge → moi] Échec backend (${kind})`, {
          status: res?.status,
          detail: data?.detail,
          message: data?.message,
        });
      }

      const technicalReason =
        data?.message ||
        (typeof data?.detail === 'string' ? data.detail : '') ||
        (res?.status === 401 || res?.status === 403 ? 'Session expirée, reconnectez-vous.' : '') ||
        (res?.status === 429 ? 'Trop de tentatives.' : '') ||
        (res?.status >= 500 ? 'Le service est momentanément indisponible.' : '') ||
        'Impossible d\'effectuer la recharge.';

      throw new Error(buildRechargeUserMessage(kind, technicalReason));
    }

    if (__DEV__) {
      console.log(`✅ [NT Recharge → moi] Succès (${kind}) :`, {
        type: data?.type,
        amount: data?.amount,
        balance: data?.balance,
        receiver: data?.receiver,
      });
    }

    return data;
  },

  async sendStockToMe(amount) {
    return await this._sendNtRechargeToMe(amount, 2);
  },

  async sendAirtimeToMe(amount) {
    return await this._sendNtRechargeToMe(amount, 1);
  },

  async _sendNtRechargeToPhone(receiver, amount, type) {
    const kind =
      Number(type) === 1 ? 'airtime' :
      Number(type) === 3 ? 'softphone' :
                           'stock';

    const numericAmount = Number(amount);
    const numericType   = Number(type);

    const cleanReceiver = String(receiver || '')
      .replace(/[\s\-()\.]/g, '')
      .replace(/^\+?227/, '');

    if (!cleanReceiver || !/^(83|93)\d{6}$/.test(cleanReceiver)) {
      throw new Error(
        'Le numéro du bénéficiaire est invalide (doit commencer par 83 ou 93, suivi de 6 chiffres).'
      );
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant doit être supérieur à zéro.');
    }
    if (!Number.isInteger(numericAmount)) {
      throw new Error('Le montant doit être un entier (pas de centimes).');
    }
    if (numericAmount > 5_000_000) {
      throw new Error('Le montant dépasse la limite autorisée.');
    }
    if (numericType !== 1 && numericType !== 3) {
      throw new Error('Type de recharge invalide.');
    }

    try {
      const me = await this.getCurrentUser();
      if (me?.phone) {
        const myClean = String(me.phone).replace(/\s/g, '').replace(/^\+?227/, '');
        if (myClean === cleanReceiver) {
          throw new Error('Pour recharger votre propre numéro, utilisez l\'option "Pour moi".');
        }
      }
    } catch (e) {
      if (e?.message && e.message.includes('Pour recharger votre propre numéro')) throw e;
    }

    if (__DEV__) {
      console.log('📡 [NT Recharge → tiers] POST /api/v1/ntrecharge/send-to', {
        receiver: cleanReceiver,
        amount: numericAmount,
        type: numericType,
        kind,
        timeoutMs: NT_RECHARGE_TIMEOUT_MS,
      });
    }

    let res;
    let data = null;

    try {
      res = await authFetch(
        '/api/v1/ntrecharge/send-to',
        {
          method: 'POST',
          body: JSON.stringify({
            receiver: cleanReceiver,
            amount: numericAmount,
            type: numericType,
          }),
        },
        true,
        NT_RECHARGE_TIMEOUT_MS
      );
      try { data = await res.json(); } catch {}
    } catch (netOrAuthErr) {
      const raw = String(netOrAuthErr?.message || '');
      if (__DEV__) {
        console.log(`⚠️ [NT Recharge → tiers] Erreur réseau/auth (${kind} → ${cleanReceiver}):`, {
          name: netOrAuthErr?.name,
          message: raw,
        });
      }
      throw new Error(buildRechargeUserMessage(kind, raw));
    }

    const httpOk = res.ok;
    const backendSaysFailed = data && typeof data === 'object' && data.success === false;

    if (!httpOk || backendSaysFailed) {
      if (__DEV__) {
        console.log(`⚠️ [NT Recharge → tiers] Échec backend (${kind} → ${cleanReceiver})`, {
          status: res?.status,
          detail: data?.detail,
          message: data?.message,
        });
      }

      const technicalReason =
        data?.message ||
        (typeof data?.detail === 'string' ? data.detail : '') ||
        (res?.status === 401 || res?.status === 403 ? 'Session expirée, reconnectez-vous.' : '') ||
        (res?.status === 422 ? 'Numéro destinataire ou montant invalide.' : '') ||
        (res?.status === 429 ? 'Trop de tentatives.' : '') ||
        (res?.status >= 500 ? 'Le service est momentanément indisponible.' : '') ||
        'Impossible d\'effectuer la recharge.';

      throw new Error(buildRechargeUserMessage(kind, technicalReason));
    }

    if (__DEV__) {
      console.log(`✅ [NT Recharge → tiers] Succès (${kind} → ${cleanReceiver}) :`, {
        type: data?.type,
        amount: data?.amount,
        balance: data?.balance,
        receiver: data?.receiver || cleanReceiver,
      });
    }

    return data;
  },

  async sendAirtimeToPhone(receiver, amount) {
    return await this._sendNtRechargeToPhone(receiver, amount, 1);
  },

  async sendSoftphoneToPhone(receiver, amount) {
    return await this._sendNtRechargeToPhone(receiver, amount, 3);
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.15b — BLR (Boucle Locale Radio)
     ═══════════════════════════════════════════════════════════════════ */

  async checkBLR(numero_blr) {
    const clean = String(numero_blr || '').trim().toUpperCase().replace(/\s/g, '');

    if (!clean) {
      throw new Error('Veuillez saisir le numéro BLR.');
    }
    if (clean.length < 1 || clean.length > 20) {
      throw new Error('Le numéro BLR doit contenir entre 1 et 20 caractères.');
    }

    if (__DEV__) {
      console.log('📡 [BLR:check] POST /api/v1/blr/check', { numero_blr: clean });
    }

    let res;
    let data = null;

    try {
      res = await authFetch('/api/v1/blr/check', {
        method: 'POST',
        body: JSON.stringify({ numero_blr: clean }),
      });
      try { data = await res.json(); } catch {}
    } catch (netErr) {
      if (__DEV__) console.log('❌ [BLR:check] Erreur réseau', netErr?.message);
      throw new Error('Connexion impossible. Vérifiez votre réseau.');
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (_) {}
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Votre session a expiré. Reconnectez-vous.');
      }
      if (res.status === 404) throw new Error('Ce numéro BLR est introuvable.');
      if (res.status === 422) throw new Error('Le numéro BLR est invalide.');
      if (res.status === 429) throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
      if (res.status >= 500) throw new Error('Le service est momentanément indisponible.');
      throw buildFriendlyError(res, data, 'blrCheck');
    }

    if (data && typeof data === 'object' && data.success === false) {
      throw new Error(data.message || 'Ce numéro BLR est introuvable.');
    }

    return data;
  },

  async resubscribeBLR(numero_blr) {
    const clean = String(numero_blr || '').trim().toUpperCase().replace(/\s/g, '');

    if (!clean) {
      throw new Error('Veuillez saisir le numéro BLR.');
    }
    if (clean.length < 1 || clean.length > 20) {
      throw new Error('Le numéro BLR doit contenir entre 1 et 20 caractères.');
    }

    if (__DEV__) {
      console.log('📡 [BLR:resubscribe] POST /api/v1/blr/resubscribe', { numero_blr: clean });
    }

    const idempotencyKey = generateIdempotencyKey();

    let res;
    let data = null;

    try {
      res = await authFetch('/api/v1/blr/resubscribe', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ numero_blr: clean }),
      });
      try { data = await res.json(); } catch {}
    } catch (netErr) {
      if (__DEV__) console.log('❌ [BLR:resubscribe] Erreur réseau', netErr?.message);
      throw new Error('Connexion impossible. Vérifiez votre réseau.');
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (_) {}
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Votre session a expiré. Reconnectez-vous.');
      }
      if (res.status === 404) throw new Error('Ce numéro BLR est introuvable.');
      if (res.status === 409) throw new Error('Cet abonnement a déjà été réabonné.');
      if (res.status === 422) throw new Error('Le numéro BLR est invalide.');
      if (res.status === 429) throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
      if (res.status >= 500) throw new Error('Le service est momentanément indisponible.');
      throw buildFriendlyError(res, data, 'blrResubscribe');
    }

    if (data && typeof data === 'object' && data.success === false) {
      throw new Error(data.message || 'Le réabonnement a échoué.');
    }

    return data;
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.16 — SERVICES MOCK (données de test)
     ═══════════════════════════════════════════════════════════════════ */

  async getPaymentCategories() {
    await delay();
    return PAYMENT_CATEGORIES;
  },

  async getEcoles() {
    await delay();
    return ECOLES;
  },

  async getClasses() {
    await delay();
    return CLASSES;
  },

  async getRecentPayments() {
    await delay();
    return recentPayments;
  },

  async searchNigelecAbonne(ref) {
    await delay();
    const a = nigelecAbonnes[ref];
    if (!a) return null;
    const f = nigelecFactures[ref] || null;
    return { nom: a.nom, type: a.type, facture: f ? { montant: f.montant } : null };
  },

  async searchNDEAbonne(ref) {
    await delay();
    const a = ndeAbonnes[ref];
    if (!a) return null;
    return { nom: a.nom, montant: a.montant };
  },

  async searchFacture(ref, catId) {
    await delay();
    return { montant: Math.floor(Math.random() * (120_000 - 5_000 + 1)) + 5_000 };
  },

  async getGouvCategories() {
    await delay();
    return gouvCategories;
  },

  async getGouvServices() {
    await delay();
    return gouvServices;
  },

  async searchGouvReference(ref) {
    await delay();
    const f = gouvReferences[ref.toUpperCase().trim()];
    if (f) return { nom: f.nom, montant: f.montant, type: f.type };
    return null;
  },

  async getFaq() {
    await delay();
    return faqData;
  },

  async getPendingTransferByCode(code) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    return data.pendingTransfers.find((t) => t.code === code.trim()) || null;
  },

  async cashInTransfer(code, userPhone) {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecté.');
    const data = await getUserData(userId);
    const transfer = data.pendingTransfers.find((t) => t.code === code.trim());
    if (!transfer) throw new Error('Ce code de retrait est invalide.');
    if (transfer.status === 'encaisse') throw new Error('Ce transfert a déjà été encaissé.');
    if (transfer.beneficiaryPhone !== userPhone) {
      throw new Error('Ce transfert n\'est pas destiné à votre numéro.');
    }

    transfer.status = 'encaisse';
    data.balance += transfer.amount;
    const newTrans = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: transfer.amount,
      description: `Encaissement de ${transfer.sender}`,
      type: 'cashin',
      details: {
        sender: transfer.sender,
        phone: transfer.phone,
        region: transfer.region,
        code: transfer.code,
      },
      deletable: true,
    };
    data.transactions = [newTrans, ...data.transactions];
    await updateUserData(userId, data);
    return { success: true, transaction: newTrans, transfer };
  },

  /* ═══════════════════════════════════════════════════════════════════
     14.17 — BOUTIQUE (mocks)
     ═══════════════════════════════════════════════════════════════════ */

  async getShopMainCategories() {
    await delay();
    return shopMainCategories;
  },

  async getShopSubCategories(id) {
    await delay();
    return shopSubCategories[id] || [];
  },

  async getShopPeriods(id) {
    await delay();
    return shopPeriods[id] || [];
  },

  async getShopTariffs(subId, perId) {
    await delay();
    return shopTariffs[`${subId}_${perId}`] || [];
  },

  async getShopOtherProducts(id) {
    await delay();
    return shopOtherProducts[id] || [];
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   INITIALISATION
   ═══════════════════════════════════════════════════════════════════════ */

(async () => {
  await loadExtraUsers();
  await loadAllUsersData();
})();