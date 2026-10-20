// utils/qrUtils.js
// 🔐 Logique de chiffrement/déchiffrement du QR Code NT Albey
// Partagée entre HomeScreen (génération) et QRScreen (scan)
//
// ⚠️ LEGACY — Migration recommandée vers signature ECDSA côté serveur.
//    Endpoint cible : POST /api/v1/qr/sign → renvoie { payload, signature }
export const SECRET_KEY = 'NT@lb3y$2026#S3cur3!K3y&Ni9erT3l3c0ms';
export const QR_PREFIX = 'NTALBEY::';
export const QR_EXPIRATION_SECONDS = 5 * 60;

const xorCipher = (text, key) => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const b64Encode = (str) => {
  let output = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++) & 0xff;
    const c2 = i < str.length ? str.charCodeAt(i++) & 0xff : NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) & 0xff : NaN;

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;

    output += B64_CHARS.charAt(e1);
    output += B64_CHARS.charAt(e2);
    output += B64_CHARS.charAt(e3);
    output += B64_CHARS.charAt(e4);
  }
  return output;
};

const b64Decode = (str) => {
  let output = '';
  let i = 0;
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');
  while (i < str.length) {
    const e1 = B64_CHARS.indexOf(str.charAt(i++));
    const e2 = B64_CHARS.indexOf(str.charAt(i++));
    const e3 = B64_CHARS.indexOf(str.charAt(i++));
    const e4 = B64_CHARS.indexOf(str.charAt(i++));

    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;

    output += String.fromCharCode(c1);
    if (e3 !== 64) output += String.fromCharCode(c2);
    if (e4 !== 64) output += String.fromCharCode(c3);
  }
  return output;
};

/**
 * Encode un payload QR avec expiration obligatoire (5 min par défaut).
 * Ajoute automatiquement `exp` (timestamp Unix en secondes).
 */
export const encodeQRData = (data) => {
  const payloadWithExp = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + QR_EXPIRATION_SECONDS,
  };
  const json = JSON.stringify(payloadWithExp);
  const encoded = encodeURIComponent(json);
  const xored = xorCipher(encoded, SECRET_KEY);
  return QR_PREFIX + b64Encode(xored);
};

/**
 * Décode + VALIDE l'expiration.
 * Renvoie null si :
 *   - pas de préfixe NTALBEY
 *   - JSON invalide
 *   - exp manquant ou expiré
 */
export const decodeQRData = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  if (!raw.startsWith(QR_PREFIX)) return null;
  try {
    const b64 = raw.substring(QR_PREFIX.length);
    const xored = b64Decode(b64);
    const decoded = xorCipher(xored, SECRET_KEY);
    const parsed = JSON.parse(decodeURIComponent(decoded));

    if (typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return parsed;
  } catch (e) {
    return null;
  }
};