// components/KycVerificationModal.js
// ✨ Modale interactive de Vérification d'Identité (KYC) avec Upload Photo & Saisie Manuelle
import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

export const DOC_TYPES = [
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
  userName = '',
  onVerified,
}) {
  const [docType, setDocType] = useState('cni');
  const [docNumber, setDocNumber] = useState('');
  const [fullName, setFullName] = useState(userName || '');
  const [expirationDate, setExpirationDate] = useState('');
  const [residenceCity, setResidenceCity] = useState('');
  const [frontImageUri, setFrontImageUri] = useState(null);
  const [backImageUri, setBackImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingKyc, setExistingKyc] = useState(null);

  useEffect(() => {
    if (visible) {
      if (userName && !fullName) {
        setFullName(userName);
      }
      getSavedKycStatus(userPhone).then((data) => {
        if (data) {
          setExistingKyc(data);
          setDocType(data.docType || 'cni');
          setDocNumber(data.docNumber || '');
          setFullName(data.fullName || userName || '');
          setExpirationDate(data.expirationDate || '');
          setResidenceCity(data.residenceCity || '');
          setFrontImageUri(data.frontImageUri || null);
          setBackImageUri(data.backImageUri || null);
        }
      });
    }
  }, [visible, userPhone, userName]);

  // Sélection d'image depuis la galerie
  const pickImage = async (side = 'front') => {
    triggerSelectionHaptic();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la galerie pour sélectionner votre pièce d\'identité.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        if (side === 'front') {
          setFrontImageUri(result.assets[0].uri);
        } else {
          setBackImageUri(result.assets[0].uri);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie photo.');
    }
  };

  // Prise de photo directe avec la caméra
  const takePhoto = async (side = 'front') => {
    triggerSelectionHaptic();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à l\'appareil photo pour photographier votre pièce.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        if (side === 'front') {
          setFrontImageUri(result.assets[0].uri);
        } else {
          setBackImageUri(result.assets[0].uri);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'accéder à l\'appareil photo.');
    }
  };

  const handleChooseImageOptions = (side = 'front') => {
    const sideLabel = side === 'front' ? 'Face avant (Recto)' : 'Face arrière (Verso)';
    Alert.alert(
      `Photo ${sideLabel}`,
      'Comment souhaitez-vous ajouter votre photo de pièce ?',
      [
        { text: '📷 Prendre une photo', onPress: () => takePhoto(side) },
        { text: '🖼️ Choisir depuis la galerie', onPress: () => pickImage(side) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    const cleanNumber = docNumber.trim();
    if (cleanNumber.length < 4) {
      Alert.alert(
        'Numéro requis',
        'Veuillez saisir un numéro de pièce d\'identité valide (minimum 4 caractères).'
      );
      return;
    }

    if (!frontImageUri && !existingKyc?.frontImageUri) {
      Alert.alert(
        'Photo requise',
        'Veuillez ajouter la photo du recto de votre pièce d\'identité.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: 'pending',
        docType,
        docNumber: cleanNumber.toUpperCase(),
        fullName: fullName.trim() || userName || 'Client',
        expirationDate: expirationDate.trim(),
        residenceCity: residenceCity.trim(),
        frontImageUri: frontImageUri || existingKyc?.frontImageUri || null,
        backImageUri: backImageUri || existingKyc?.backImageUri || null,
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
        'Dossier soumis avec succès',
        'Votre pièce d\'identité et vos informations ont été enregistrées. Votre dossier est en cours de validation par Niger Telecoms.',
        [{ text: 'Compris', onPress: onClose }]
      );
    } catch (_) {
      Alert.alert(
        'Erreur',
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
                Uploadez votre document et débloquez les plafonds supérieurs
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Avantages du compte vérifié */}
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>✨ Avantages après vérification</Text>
              <Text style={styles.benefitItem}>• Plafond de transfert augmenté jusqu'à 1 000 000 FCFA / jour</Text>
              <Text style={styles.benefitItem}>• Récupération et assistance prioritaire en agence</Text>
              <Text style={styles.benefitItem}>• Badge officiel « Vérifié » sur votre compte</Text>
            </View>

            {/* Statut actuel s'il existe */}
            {existingKyc && (
              <View style={[styles.statusBanner, existingKyc.status === 'verified' ? styles.statusVerified : styles.statusPending]}>
                <Text style={styles.statusBannerIcon}>
                  {existingKyc.status === 'verified' ? '✓' : '⏳'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusBannerTitle, { color: existingKyc.status === 'verified' ? '#065F46' : '#92400E' }]}>
                    {existingKyc.status === 'verified' ? 'Compte vérifié' : 'Dossier en cours d\'examen'}
                  </Text>
                  <Text style={styles.statusBannerSub}>
                    {existingKyc.docNumber ? `Pièce : ${existingKyc.docNumber}` : 'Documents transmis'}
                  </Text>
                </View>
              </View>
            )}

            {/* Choix du type de pièce */}
            <Text style={styles.fieldLabel}>1. TYPE DE PIÈCE D'IDENTITÉ *</Text>
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

            {/* Section UPLOAD PHOTO */}
            <Text style={styles.fieldLabel}>2. PHOTOS DU DOCUMENT *</Text>
            <View style={styles.uploadSection}>
              {/* Recto */}
              <View style={styles.uploadBox}>
                <Text style={styles.uploadBoxTitle}>Face avant (Recto) *</Text>
                {frontImageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: frontImageUri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setFrontImageUri(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removeImageText}>✕ Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadPlaceholder}
                    onPress={() => handleChooseImageOptions('front')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.uploadPlaceholderIcon}>📷</Text>
                    <Text style={styles.uploadPlaceholderText}>Ajouter le Recto</Text>
                    <Text style={styles.uploadPlaceholderSub}>Photo ou galerie</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Verso */}
              <View style={styles.uploadBox}>
                <Text style={styles.uploadBoxTitle}>Face arrière (Verso)</Text>
                {backImageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: backImageUri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setBackImageUri(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removeImageText}>✕ Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadPlaceholder}
                    onPress={() => handleChooseImageOptions('back')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.uploadPlaceholderIcon}>📄</Text>
                    <Text style={styles.uploadPlaceholderText}>Ajouter le Verso</Text>
                    <Text style={styles.uploadPlaceholderSub}>Optionnel pour passeport</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Saisie manuelle des informations */}
            <Text style={styles.fieldLabel}>3. INFORMATIONS SUR LE TITULAIRE</Text>

            <Text style={styles.inputLabel}>Numéro officiel de la pièce *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: NE-10293847"
              placeholderTextColor="#94A3B8"
              value={docNumber}
              onChangeText={setDocNumber}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Nom & Prénom complet</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Abdoulaye Mamane"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.inputLabel}>Date d'expiration de la pièce</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 12/2028 ou JJ/MM/AAAA"
              placeholderTextColor="#94A3B8"
              value={expirationDate}
              onChangeText={setExpirationDate}
            />

            <Text style={styles.inputLabel}>Ville de résidence / Agence (Optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Niamey, Plateau"
              placeholderTextColor="#94A3B8"
              value={residenceCity}
              onChangeText={setResidenceCity}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {existingKyc ? 'Mettre à jour mon dossier' : 'Soumettre ma pièce d\'identité'}
                </Text>
              )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  badgeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  benefitsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  benefitsTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#008933',
    marginBottom: 4,
  },
  benefitItem: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
    borderWidth: 1,
  },
  statusVerified: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBannerIcon: {
    fontSize: 20,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBannerSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#008933',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  docTypesGrid: {
    gap: 8,
    marginBottom: 16,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
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
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  docChipTextActive: {
    color: '#008933',
  },
  uploadSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  uploadBox: {
    flex: 1,
  },
  uploadBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textAlign: 'center',
  },
  uploadPlaceholder: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  uploadPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadPlaceholderSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#008933',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: 110,
  },
  removeImageBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#008933',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
