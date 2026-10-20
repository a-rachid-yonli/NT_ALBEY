// utils/security.js
// ⚠️ SÉCURITÉ DÉSACTIVÉE : on force le retour à false/true

export const isDeviceCompromised = () => {
  // Force l'app à considérer que le téléphone n'est PAS rooté
  return false;
};

export const warnIfCompromised = () => {
  // N'affiche plus l'alerte au démarrage
  return false;
};

export const guardSensitiveOperation = (operationLabel = 'cette opération') => {
  // Autorise TOUJOURS les opérations sensibles (transactions, QR code)
  return true;
};