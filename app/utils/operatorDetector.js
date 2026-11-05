// utils/operatorDetector.js
// 📱 Détection automatique et dynamique de l'opérateur GSM / Mobile Money au Niger

export const OPERATORS = {
  NIGER_TELECOMS: {
    id: 'niger_telecoms',
    name: 'Niger Telecoms',
    shortName: 'NT Albey',
    prefixes: ['83', '93'],
    color: '#008933',
    bgColor: '#E8F5E9',
    borderColor: '#86EFAC',
    textColor: '#065F46',
    dotColor: '#008933',
    badge: '🟢 Niger Telecoms',
  },
  AIRTEL: {
    id: 'airtel',
    name: 'Airtel Niger',
    shortName: 'Airtel',
    prefixes: ['80', '81', '90', '91', '92'],
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    textColor: '#991B1B',
    dotColor: '#DC2626',
    badge: '🔴 Airtel',
  },
  ZAMANI: {
    id: 'zamani',
    name: 'Zamani Telecom',
    shortName: 'Zamani',
    prefixes: ['96', '97', '98', '99'],
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    textColor: '#92400E',
    dotColor: '#D97706',
    badge: '🟡 Zamani',
  },
  MOOV: {
    id: 'moov',
    name: 'Moov Africa Niger',
    shortName: 'Moov',
    prefixes: ['88', '89', '94', '95'],
    color: '#2563EB',
    bgColor: '#DBEAFE',
    borderColor: '#93C5FD',
    textColor: '#1E40AF',
    dotColor: '#2563EB',
    badge: '🔵 Moov',
  },
};

/**
 * Nettoie et extrait les 8 chiffres locaux d'un numéro nigérien (+227)
 * @param {string|number} raw
 * @returns {string} (ex: "93804242" ou "83000000")
 */
export const normalizeNigerPhone = (raw = '') => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('227') && digits.length >= 11) {
    return digits.slice(3, 11);
  }
  if (digits.length >= 8) {
    return digits.slice(0, 8);
  }
  return digits;
};

/**
 * Détecte l'opérateur à partir du numéro
 * @param {string|number} phone
 * @returns {typeof OPERATORS.NIGER_TELECOMS | null}
 */
export const detectNigerOperator = (phone = '') => {
  const clean = normalizeNigerPhone(phone);
  if (!clean || clean.length < 2) return null;

  const prefix = clean.slice(0, 2);

  if (OPERATORS.NIGER_TELECOMS.prefixes.includes(prefix)) {
    return OPERATORS.NIGER_TELECOMS;
  }
  if (OPERATORS.AIRTEL.prefixes.includes(prefix)) {
    return OPERATORS.AIRTEL;
  }
  if (OPERATORS.ZAMANI.prefixes.includes(prefix)) {
    return OPERATORS.ZAMANI;
  }
  if (OPERATORS.MOOV.prefixes.includes(prefix)) {
    return OPERATORS.MOOV;
  }

  return null;
};
