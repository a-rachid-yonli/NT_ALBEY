import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import MainLayout from '../components/MainLayout';

const { width } = Dimensions.get('window');

// Icônes
const IconEdit = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M17 3l4 4-7 7H10v-4l7-7z" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 21h18" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconCamera = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke="#FFF" strokeWidth="2" />
    <Path d="M20 7h-4.5L15 4h-6L8.5 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLock = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="11" width="14" height="10" rx="2" stroke="#008933" strokeWidth="1.8" />
    <Path d="M8 11V7a4 4 0 018 0v4" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1.2" fill="#008933" />
  </Svg>
);

const IconVerify = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="1.8" />
    <Path d="M8 12.5l3 3 5-5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconUpload = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v12M8 11l4 4 4-4" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 20h14" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconChevron = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône Chatbot
const IconChatbot = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#008933" strokeWidth="1.8" />
    <Path d="M8 14c0 2 2 3 4 3s4-1 4-3" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="9" cy="10" r="1.2" fill="#008933" />
    <Circle cx="15" cy="10" r="1.2" fill="#008933" />
  </Svg>
);

// Icône FAQ
const IconFAQ = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="1.8" />
    <Path d="M12 8v4M12 16h.01" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// Icône Support
const IconSupport = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="1.8" />
    <Path d="M8 10v2a4 4 0 008 0v-2" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export default function ProfileScreen({ navigation, onLogout }) {
  const [profile, setProfile] = useState({ 
    name: 'Moussa Ibrahim', 
    phone: '83 35 62 00', 
    birthDate: '15/08/1990', 
    address: 'Niamey, Niger', 
    idNumber: 'CNI N° 12345678', 
    nationality: 'Nigérienne' 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [kycModalVisible, setKycModalVisible] = useState(false);
  
  // États pour l'upload des documents KYC
  const [kycStep, setKycStep] = useState(1);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [kycStatus, setKycStatus] = useState('pending');
  const [kycMessage, setKycMessage] = useState('');

  const pickImage = () => Alert.alert('Changer la photo', 'Fonctionnalité disponible sur mobile');

  const handleSaveProfile = () => { 
    setProfile(editForm); 
    setIsEditing(false); 
    Alert.alert('Succès', 'Profil mis à jour'); 
  };
  
  const handleChangePin = () => {
    if (!currentPin || currentPin.length !== 4) return Alert.alert('Erreur', 'PIN actuel requis');
    if (currentPin !== '0000') return Alert.alert('Erreur', 'PIN actuel incorrect');
    if (!newPin || newPin.length !== 4) return Alert.alert('Erreur', 'Nouveau PIN de 4 chiffres');
    if (newPin !== confirmPin) return Alert.alert('Erreur', 'Les PIN ne correspondent pas');
    Alert.alert('Succès', 'PIN modifié'); 
    setPinModalVisible(false); 
    setCurrentPin(''); 
    setNewPin(''); 
    setConfirmPin('');
  };

  const handleUploadDocument = () => {
    Alert.alert(
      'Upload de document',
      'Cette fonctionnalité permet d\'uploader votre pièce d\'identité.\n\nSur l\'application mobile, vous pourrez prendre une photo directement.',
      [{ text: 'OK' }]
    );
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setKycStatus('pending');
      setKycMessage('Document envoyé avec succès. Vérification en cours...');
      Alert.alert('Succès', 'Votre document a été envoyé pour vérification.');
    }, 2000);
  };

  const kycLevel = kycStatus === 'verified' ? 2 : 1;
  const displayKycStatus = kycStatus === 'verified' ? 'Vérifié' : kycStatus === 'pending' ? 'En cours' : 'Non vérifié';

  return (
    <MainLayout activeScreen="Profile" onLogout={onLogout}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>MI</Text>
            </View>
            <View style={styles.cameraIcon}>
              <IconCamera />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{profile.name}</Text>
          <Text style={styles.userPhone}>{profile.phone}</Text>
          <View style={[styles.kycBadge, kycStatus === 'verified' && styles.kycBadgeVerified]}>
            <IconVerify />
            <Text style={styles.kycText}>Compte {displayKycStatus}</Text>
          </View>
          {kycMessage !== '' && (
            <Text style={styles.kycMessage}>{kycMessage}</Text>
          )}
        </View>

        {/* Mode édition */}
        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={styles.sectionTitle}>Modifier mes informations</Text>
            
            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput 
              style={styles.input} 
              value={editForm.name} 
              onChangeText={(t) => setEditForm({ ...editForm, name: t })} 
            />
            
            <Text style={styles.inputLabel}>Numéro de téléphone</Text>
            <TextInput 
              style={styles.input} 
              value={editForm.phone} 
              onChangeText={(t) => setEditForm({ ...editForm, phone: t })} 
              keyboardType="phone-pad" 
            />
            
            <Text style={styles.inputLabel}>Date de naissance</Text>
            <TextInput 
              style={styles.input} 
              value={editForm.birthDate} 
              onChangeText={(t) => setEditForm({ ...editForm, birthDate: t })} 
            />
            
            <Text style={styles.inputLabel}>Adresse</Text>
            <TextInput 
              style={styles.input} 
              value={editForm.address} 
              onChangeText={(t) => setEditForm({ ...editForm, address: t })} 
            />
            
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelEditText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveProfile}>
                <Text style={styles.saveEditText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Text style={styles.sectionTitle}>Informations personnelles</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <IconEdit />
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>{profile.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Numéro de téléphone</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>{profile.birthDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{profile.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pièce d'identité</Text>
              <Text style={styles.infoValue}>{profile.idNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nationalité</Text>
              <Text style={styles.infoValue}>{profile.nationality}</Text>
            </View>
          </View>
        )}

        {/* Vérification d'identité KYC */}
        <View style={styles.kycSection}>
          <Text style={styles.sectionTitle}>Vérification d'identité</Text>
          
          {kycStatus === 'verified' ? (
            <View style={styles.kycVerifiedCard}>
              <IconVerify />
              <Text style={styles.kycVerifiedTitle}>Compte vérifié</Text>
              <Text style={styles.kycVerifiedText}>Votre identité a été vérifiée. Vous bénéficiez de limites plus élevées.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.kycDescription}>
                Pour augmenter vos limites de transaction, veuillez vérifier votre identité.
              </Text>
              
              <View style={styles.kycLimits}>
                <View style={styles.kycLimitItem}>
                  <Text style={styles.kycLimitLabel}>Limite actuelle</Text>
                  <Text style={styles.kycLimitValue}>100 000 FCFA/jour</Text>
                </View>
                <View style={styles.kycLimitDivider} />
                <View style={styles.kycLimitItem}>
                  <Text style={styles.kycLimitLabel}>Limite après vérification</Text>
                  <Text style={styles.kycLimitValueVerified}>500 000 FCFA/jour</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.kycUploadButton} 
                onPress={handleUploadDocument}
              >
                <IconUpload />
                <Text style={styles.kycUploadButtonText}>Uploader ma pièce d'identité</Text>
              </TouchableOpacity>

              <Text style={styles.kycNote}>
                Documents acceptés : Carte d'identité, Passeport, Permis de conduire
              </Text>
            </>
          )}
        </View>

        {/* Sécurité */}
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => setPinModalVisible(true)}>
            <View style={styles.menuItemLeft}>
              <IconLock />
              <Text style={styles.menuItemTitle}>Changer mon PIN</Text>
            </View>
            <IconChevron />
          </TouchableOpacity>
        </View>

        {/* Préférences */}
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <Text style={styles.preferenceIcon}>🔔</Text>
              <Text style={styles.preferenceTitle}>Notifications push</Text>
            </View>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={setNotificationsEnabled} 
              trackColor={{ false: '#D1D5DB', true: '#008933' }} 
            />
          </View>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <Text style={styles.preferenceIcon}>👆</Text>
              <Text style={styles.preferenceTitle}>Authentification biométrique</Text>
            </View>
            <Switch 
              value={biometricEnabled} 
              onValueChange={setBiometricEnabled} 
              trackColor={{ false: '#D1D5DB', true: '#008933' }} 
            />
          </View>
        </View>

        {/* ===== SECTION SUPPORT (NOUVEAU) ===== */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('Chatbot')}
          >
            <View style={styles.menuItemLeft}>
              <IconChatbot />
              <Text style={styles.menuItemTitle}>Assistant virtuel</Text>
            </View>
            <IconChevron />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('FAQ')}
          >
            <View style={styles.menuItemLeft}>
              <IconFAQ />
              <Text style={styles.menuItemTitle}>Foire aux questions</Text>
            </View>
            <IconChevron />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => Alert.alert('Support', '📞 Appelez le 555\n📧 support@ntalbey.ne')}
          >
            <View style={styles.menuItemLeft}>
              <IconSupport />
              <Text style={styles.menuItemTitle}>Contacter le support</Text>
            </View>
            <IconChevron />
          </TouchableOpacity>
        </View>
        {/* ===== FIN SECTION SUPPORT ===== */}

      </ScrollView>

      {/* Modal PIN */}
      <Modal visible={pinModalVisible} transparent onRequestClose={() => setPinModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer mon PIN</Text>
            <Text style={styles.modalLabel}>PIN actuel</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="••••" 
              keyboardType="number-pad" 
              secureTextEntry={!pinVisible} 
              maxLength={4} 
              value={currentPin} 
              onChangeText={setCurrentPin} 
              textAlign="center" 
            />
            <Text style={styles.modalLabel}>Nouveau PIN</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="••••" 
              keyboardType="number-pad" 
              secureTextEntry={!pinVisible} 
              maxLength={4} 
              value={newPin} 
              onChangeText={setNewPin} 
              textAlign="center" 
            />
            <Text style={styles.modalLabel}>Confirmer</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="••••" 
              keyboardType="number-pad" 
              secureTextEntry={!pinVisible} 
              maxLength={4} 
              value={confirmPin} 
              onChangeText={setConfirmPin} 
              textAlign="center" 
            />
            <TouchableOpacity onPress={() => setPinVisible(!pinVisible)}>
              <Text>{pinVisible ? '👁️ Masquer' : '🔒 Afficher'}</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setPinModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleChangePin}>
                <Text style={styles.modalConfirmText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal KYC */}
      <Modal visible={kycModalVisible} transparent onRequestClose={() => setKycModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.kycModalContent}>
            <Text style={styles.modalTitle}>Vérification d'identité</Text>
            <Text style={styles.kycSubtitle}>Pour augmenter vos limites</Text>
            <View style={styles.kycLevels}>
              <View style={[styles.kycLevel, kycLevel >= 1 && styles.kycLevelActive]}>
                <Text style={[styles.kycLevelNumber, kycLevel >= 1 && styles.kycLevelNumberActive]}>1</Text>
                <Text style={styles.kycLevelTitle}>Niveau 1</Text>
                <Text style={styles.kycLevelDesc}>100k/jour</Text>
              </View>
              <View style={[styles.kycLevel, kycLevel >= 2 && styles.kycLevelActive]}>
                <Text style={[styles.kycLevelNumber, kycLevel >= 2 && styles.kycLevelNumberActive]}>2</Text>
                <Text style={styles.kycLevelTitle}>Niveau 2</Text>
                <Text style={styles.kycLevelDesc}>500k/jour</Text>
              </View>
              <View style={[styles.kycLevel, kycLevel >= 3 && styles.kycLevelActive]}>
                <Text style={[styles.kycLevelNumber, kycLevel >= 3 && styles.kycLevelNumberActive]}>3</Text>
                <Text style={styles.kycLevelTitle}>Niveau 3</Text>
                <Text style={styles.kycLevelDesc}>Illimitée</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.kycButton} onPress={() => setKycModalVisible(false)}>
              <Text style={styles.kycButtonText}>Commencer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#008933', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#008933', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  userName: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  userPhone: { fontSize: 14, color: '#666', marginTop: 2 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8, gap: 6 },
  kycBadgeVerified: { backgroundColor: '#10B98120' },
  kycText: { fontSize: 12, color: '#008933', fontWeight: '500' },
  kycMessage: { fontSize: 11, color: '#FF6600', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  infoSection: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  editSection: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, borderColor: '#EEEEEE' },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelEditButton: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelEditText: { color: '#666', fontSize: 14, fontWeight: '600' },
  saveEditButton: { flex: 1, backgroundColor: '#008933', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveEditText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  // KYC Section
  kycSection: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16 },
  kycDescription: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 18 },
  kycLimits: { flexDirection: 'row', backgroundColor: '#F8F9FC', borderRadius: 12, padding: 12, marginBottom: 16 },
  kycLimitItem: { flex: 1, alignItems: 'center' },
  kycLimitDivider: { width: 1, backgroundColor: '#E0E0E0', marginHorizontal: 8 },
  kycLimitLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  kycLimitValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  kycLimitValueVerified: { fontSize: 14, fontWeight: '700', color: '#008933' },
  kycUploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  kycUploadButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  kycNote: { fontSize: 11, color: '#888', textAlign: 'center' },
  kycVerifiedCard: { alignItems: 'center', padding: 16, backgroundColor: '#E8F5E9', borderRadius: 12 },
  kycVerifiedTitle: { fontSize: 16, fontWeight: '700', color: '#008933', marginTop: 8, marginBottom: 4 },
  kycVerifiedText: { fontSize: 12, color: '#666', textAlign: 'center' },
  securitySection: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16 },
  preferencesSection: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 16 },
  // Support Section (NOUVEAU)
  supportSection: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 20 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemTitle: { fontSize: 14, color: '#1A1A1A' },
  preferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  preferenceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preferenceIcon: { fontSize: 20 },
  preferenceTitle: { fontSize: 14, color: '#1A1A1A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width - 40, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, alignSelf: 'flex-start' },
  modalInput: { width: '100%', backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 },
  modalCancelButton: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#666', fontSize: 16, fontWeight: '600' },
  modalConfirmButton: { flex: 1, backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  kycModalContent: { width: width - 40, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  kycSubtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  kycLevels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  kycLevel: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#F5F5F5', borderRadius: 12, marginHorizontal: 4 },
  kycLevelActive: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#008933' },
  kycLevelNumber: { fontSize: 18, fontWeight: '700', color: '#888', marginBottom: 4 },
  kycLevelNumberActive: { color: '#008933' },
  kycLevelTitle: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  kycLevelDesc: { fontSize: 10, color: '#888', marginTop: 2 },
  kycButton: { backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  kycButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});