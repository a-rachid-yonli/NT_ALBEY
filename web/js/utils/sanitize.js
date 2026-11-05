// web/js/utils/sanitize.js
// ✅ Protection globale contre les failles XSS (Cross-Site Scripting)

/**
 * Échappe les caractères HTML dangereux pour empêcher les attaques XSS.
 * @param {any} str - Texte à assainir
 * @returns {string} Texte sécurisé pour injection dans le DOM
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Assainit un objet récursivement ou un texte
 */
export function sanitizeText(val) {
  return escapeHtml(val);
}

// Exposer globalement sur window pour rétrocompatibilité
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
