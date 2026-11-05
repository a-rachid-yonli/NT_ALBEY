// utils/contactPicker.js
// Sélecteur de contact natif du téléphone (via expo-contacts/legacy pour compatibilité SDK 58)
import * as Contacts from 'expo-contacts/legacy';
import { Linking } from 'react-native';

export async function pickPhoneContact({ showToast } = {}) {
  try {
    const { status, canAskAgain } = await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
      if (!canAskAgain) {
        if (showToast) {
          showToast(
            'error',
            'Autorisation requise',
            "Activez l'accès aux contacts dans les réglages de votre téléphone."
          );
        }
        setTimeout(() => {
          Linking.openSettings().catch(() => {});
        }, 800);
        return null;
      }
      if (showToast) {
        showToast('error', 'Autorisation refusée', 'Accès au répertoire requis.');
      }
      return null;
    }

    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;

    const rawPhone =
      contact.phoneNumbers && contact.phoneNumbers.length > 0
        ? contact.phoneNumbers[0].number || ''
        : '';

    const cleanPhone = String(rawPhone)
      .replace(/\s/g, '')
      .replace(/[^0-9]/g, '')
      .replace(/^00227/, '')
      .replace(/^227/, '');

    const name = contact.name || '';

    if (!cleanPhone || cleanPhone.length < 8) {
      if (showToast) {
        showToast('error', 'Numéro invalide', 'Ce contact ne possède pas de numéro valide.');
      }
      return null;
    }

    return {
      phone: cleanPhone,
      name,
    };
  } catch (err) {
    if (__DEV__) console.warn('⚠️ [contactPicker] Erreur :', err?.message);
    if (showToast) {
      showToast('error', 'Erreur', "Impossible d'ouvrir le répertoire.");
    }
    return null;
  }
}
