// components/KycVerificationModal.js
// ✨ Modale interactive de Vérification d'Identité (KYC) pour augmenter ses plafonds
import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TranslatedText as Text,
  TranslatedTextInput as TextInput,
  TranslatedAlert as Alert,
  ThemedView as View,
  ThemedScrollView as ScrollView,
  ThemedTouchableOpacity as TouchableOpacity,
  ThemedKeyboardAvoidingView as KeyboardAvoidingView,
} from '../context/LanguageContext';
import { triggerSuccessHaptic, triggerSelectionHaptic } from '../utils/haptics';

const KYC_STORAGE_KEY = '@ntalbey_kyc_status_v1';

const DOC_TYPES = [
  { id: 'cni', label: 'Carte Nationale (CNI)', icon: '🪪' },
  { id: 'passport', label: 'Passeport', icon: '🛂' },
  { id: 'permis', label: 'Permis de conduire', icon: '🚗' },
];

export async function getSavedKycStatus(userPhone = '') {
  try {
    const raw = await AsyncStorage.getItem(`${KYC_STORAGE_KEY}_${userPhone || 'default'}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export default function KycVerificationModal({
  visible,
  onClose,
  userPhone = '',
  onVerified,
}) {
  const [docType, setDocType] = useState('cni');
  const [docNumber, setDocNumber] = useState('');
  const [ninaNumber, setNinaNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingKyc, setExistingKyc] = useState(null);

  useEffect(() => {
    if (visible) {
      getSavedKycStatus(userPhone).then((data) => {
        if (data) {
          setExistingKyc(data);
          setDocType(data.docType || 'cni');
          setDocNumber(data.docNumber || '');
          setNinaNumber(data.ninaNumber || '');
        }
      });
    }
  }, [visible, userPhone]);

  const handleSubmit = async () => {
    const cleanNumber = docNumber.trim();
    if (cleanNumber.length < 5) {
      Alert.alert(
        'Attention',
        'Veuillez saisir un numéro de pièce d\'identité valide (minimum 5 caractères).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: 'verified',
        docType,
        docNumber: cleanNumber.toUpperCase(),
        ninaNumber: ninaNumber.trim(),
        submittedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        `${KYC_STORAGE_KEY}_${userPhone || 'default'}`,
        JSON.stringify(payload)
      );
      setExistingKyc(payload);
      triggerSuccessHaptic();
      if (typeof onVerified === 'function') {
        onVerified(payload);
      }
      Alert.alert(
        'Opération réussie',
        'Votre pièce d\'identité a été enregistrée avec succès. Votre profil est désormais vérifié !',
        [{ text: 'Compris', onPress: onClose }]
      );
    } catch (_) {
      Alert.alert(
        'Attention',
        'Impossible d\'enregistrer vos informations pour le moment. Veuillez réessayer.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.badgeIcon}>
              <Text style={styles.badgeEmoji}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Vérification d'identité (KYC)</Text>
              <Text style={styles.subtitle}>
                Sécurisez votre compte et débloquez les plafonds supérieurs
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avantages du compte vérifié */}
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>✨ Avantages du compte vérifié</Text>
              <Text style={styles.benefitItem}>• Plafond de transfert jusqu'à 2 000 000 FCFA / jour</Text>
              <Text style={styles.benefitItem}>• Récupération prioritaire du compte en agence</Text>
              <Text style={styles.benefitItem}>• Badge officiel « Vérifié » sur votre profil</Text>
            </View>

            {/* Choix du type de pièce */}
            <Text style={styles.fieldLabel}>TYPE DE PIÈCE D'IDENTITÉ</Text>
            <View style={styles.docTypesGrid}>
              {DOC_TYPES.map((item) => {
                const active = docType === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.docChip, active && styles.docChipActive]}
                    onPress={() => {
                      triggerSelectionHaptic();
                      setDocType(item.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.docEmoji}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.docChipText,
                        active && styles.docChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Numéro de la pièce */}
            <Text style={styles.fieldLabel}>NUMÉRO DE LA PIÈCE *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: NE-10293847"
              placeholderTextColor="#94A3B8"
              value={docNumber}
              onChangeText={setDocNumber}
              autoCapitalize="characters"
            />

            {/* Numéro NINA / Profession (Optionnel) */}
            <Text style={styles.fieldLabel}>ADRESSE OU VILLE DE RÉSIDENCE (OPTIONNEL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Niamey, Plateau"
              placeholderTextColor="#94A3B8"
              value={ninaNumber}
              onChangeText={setNinaNumber}
            />

            {existingKyc?.status === 'verified' && (
              <View style={styles.verifiedBanner}>
                <Text style={styles.verifiedBannerText}>
                  ✓ Pièce enregistrée ({existingKyc.docNumber})
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {existingKyc?.status === 'verified'
                  ? 'Mettre à jour ma pièce'
                  : 'Valider ma vérification'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '88%',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  benefitsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#008933',
    marginBottom: 6,
  },
  benefitItem: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  docTypesGrid: {
    gap: 8,
    marginBottom: 16,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  docChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#008933',
  },
  docEmoji: {
    fontSize: 18,
  },
  docChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  docChipTextActive: {
    color: '#008933',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 14,
  },
  verifiedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  verifiedBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#008933',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
