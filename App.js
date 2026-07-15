// App.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import SendMoneyScreen from './screens/SendMoneyScreen';
import WithdrawScreen from './screens/WithdrawScreen';
import PaymentScreen from './screens/PaymentScreen';
import BillsScreen from './screens/BillsScreen';
import ShopScreen from './screens/ShopScreen';
import GouvPayScreen from './screens/GouvPayScreen';
import HistoryScreen from './screens/HistoryScreen';
import TransferScreen from './screens/TransferScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import QRScreen from './screens/QRScreen';
import VisaScreen from './screens/VisaScreen';
import TransferToAgencyScreen from './screens/TransferToAgencyScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import FAQScreen from './screens/FAQScreen';
import SavingsScreen from './screens/SavingsScreen';

const Stack = createStackNavigator();

// ===== MODAL INSCRIPTION =====
const RegisterModal = ({ visible, onClose }) => {
  const { width, height } = useWindowDimensions();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleRegister = () => {
    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide');
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Le PIN doit contenir 4 chiffres');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Erreur', 'Les PIN ne correspondent pas');
      return;
    }
    if (!agreeTerms) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions d\'utilisation');
      return;
    }
    
    Alert.alert('Succès', 'Inscription réussie ! Vous pouvez maintenant vous connecter');
    onClose();
    setFullName('');
    setPhoneNumber('');
    setPin('');
    setConfirmPin('');
    setAgreeTerms(false);
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: width - 40,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      maxHeight: height * 0.8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#1A1A1A',
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseText: {
      fontSize: 18,
      color: '#666',
    },
    modalSubtitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 20,
      textAlign: 'center',
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
      marginBottom: 8,
      marginTop: 12,
    },
    modalInput: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#EEEEEE',
      marginBottom: 16,
    },
    modalCodeInput: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 14,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: 8,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      marginBottom: 16,
    },
    modalEyeButton: {
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalCheckbox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: '#008933',
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#008933',
    },
    checkboxCheck: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
    modalCheckboxText: {
      fontSize: 13,
      color: '#666',
      flex: 1,
    },
    modalConfirmButton: {
      backgroundColor: '#008933',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    modalConfirmText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalSecondaryButton: {
      backgroundColor: '#F5F5F5',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    modalSecondaryText: {
      color: '#008933',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Créer un compte</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>Nom complet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Moussa Ibrahim"
              placeholderTextColor="#AAA"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.modalLabel}>Numéro de téléphone</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 93 45 22 71"
              placeholderTextColor="#AAA"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <Text style={styles.modalLabel}>PIN (4 chiffres)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••"
              placeholderTextColor="#AAA"
              keyboardType="number-pad"
              secureTextEntry={!pinVisible}
              maxLength={4}
              value={pin}
              onChangeText={setPin}
              textAlign="center"
            />

            <Text style={styles.modalLabel}>Confirmer le PIN</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••"
              placeholderTextColor="#AAA"
              keyboardType="number-pad"
              secureTextEntry={!pinVisible}
              maxLength={4}
              value={confirmPin}
              onChangeText={setConfirmPin}
              textAlign="center"
            />

            <TouchableOpacity 
              style={styles.modalEyeButton}
              onPress={() => setPinVisible(!pinVisible)}
            >
              <Text>{pinVisible ? '👁️ Masquer les PIN' : '🔒 Afficher les PIN'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCheckbox}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.modalCheckboxText}>
                J'accepte les conditions d'utilisation et la politique de confidentialité
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleRegister}>
              <Text style={styles.modalConfirmText}>S'inscrire</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ===== MODAL MOT DE PASSE OUBLIÉ =====
const ForgotPasswordModal = ({ visible, onClose }) => {
  const { width, height } = useWindowDimensions();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  const handleSendCode = () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide');
      return;
    }
    Alert.alert('Code envoyé', `Un code de réinitialisation a été envoyé au ${phoneNumber}`);
    setStep(2);
  };

  const handleVerifyCode = () => {
    if (!code || code.length !== 6) {
      Alert.alert('Erreur', 'Code invalide (6 chiffres)');
      return;
    }
    if (code === '123456') {
      setStep(3);
    } else {
      Alert.alert('Erreur', 'Code incorrect. Veuillez réessayer.');
    }
  };

  const handleResetPin = () => {
    if (!newPin || newPin.length !== 4) {
      Alert.alert('Erreur', 'Le nouveau PIN doit contenir 4 chiffres');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Erreur', 'Les PIN ne correspondent pas');
      return;
    }
    Alert.alert('Succès', 'Votre PIN a été réinitialisé avec succès !');
    onClose();
    setStep(1);
    setPhoneNumber('');
    setCode('');
    setNewPin('');
    setConfirmPin('');
  };

  const resetModal = () => {
    setStep(1);
    setPhoneNumber('');
    setCode('');
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: width - 40,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      maxHeight: height * 0.8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#1A1A1A',
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseText: {
      fontSize: 18,
      color: '#666',
    },
    modalSubtitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 20,
      textAlign: 'center',
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
      marginBottom: 8,
      marginTop: 12,
    },
    modalInput: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#EEEEEE',
      marginBottom: 16,
    },
    modalCodeInput: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 14,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: 8,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      marginBottom: 16,
    },
    modalEyeButton: {
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalConfirmButton: {
      backgroundColor: '#008933',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    modalConfirmText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalSecondaryButton: {
      backgroundColor: '#F5F5F5',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    modalSecondaryText: {
      color: '#008933',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={resetModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 1 ? 'Mot de passe oublié' : step === 2 ? 'Vérification' : 'Nouveau PIN'}
            </Text>
            <TouchableOpacity onPress={resetModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <>
                <Text style={styles.modalSubtitle}>
                  Entrez votre numéro de téléphone pour recevoir un code de réinitialisation
                </Text>
                <Text style={styles.modalLabel}>Numéro de téléphone</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: 93 45 22 71"
                  placeholderTextColor="#AAA"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleSendCode}>
                  <Text style={styles.modalConfirmText}>Envoyer le code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.modalSubtitle}>
                  Entrez le code à 6 chiffres reçu par SMS au {phoneNumber}
                </Text>
                <Text style={styles.modalLabel}>Code de vérification</Text>
                <TextInput
                  style={styles.modalCodeInput}
                  placeholder="123456"
                  placeholderTextColor="#AAA"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  textAlign="center"
                />
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleVerifyCode}>
                  <Text style={styles.modalConfirmText}>Vérifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleSendCode}>
                  <Text style={styles.modalSecondaryText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.modalSubtitle}>
                  Choisissez un nouveau PIN pour votre compte
                </Text>
                <Text style={styles.modalLabel}>Nouveau PIN (4 chiffres)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="••••"
                  placeholderTextColor="#AAA"
                  keyboardType="number-pad"
                  secureTextEntry={!pinVisible}
                  maxLength={4}
                  value={newPin}
                  onChangeText={setNewPin}
                  textAlign="center"
                />
                <Text style={styles.modalLabel}>Confirmer le nouveau PIN</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="••••"
                  placeholderTextColor="#AAA"
                  keyboardType="number-pad"
                  secureTextEntry={!pinVisible}
                  maxLength={4}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  textAlign="center"
                />
                <TouchableOpacity 
                  style={styles.modalEyeButton}
                  onPress={() => setPinVisible(!pinVisible)}
                >
                  <Text>{pinVisible ? '👁️ Masquer' : '🔒 Afficher'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleResetPin}>
                  <Text style={styles.modalConfirmText}>Réinitialiser</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ===== ÉCRAN DE CONNEXION =====
function LoginScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);

  const handleLogin = () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide');
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Le PIN doit contenir 4 chiffres');
      return;
    }
    
    if (pin === '0000') {
      Alert.alert('Succès', 'Connexion réussie !');
      navigation.replace('Home');
      return;
    }
    
    Alert.alert('Erreur', 'PIN incorrect pour le test. Utilisez 0000');
  };

  const styles = StyleSheet.create({
    loginContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    topBackgroundContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: height * 0.28,
      zIndex: 0,
      overflow: 'hidden',
    },
    topBackgroundImage: {
      width: '100%',
      height: '100%',
    },
    bottomBackgroundContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: height * 0.18,
      zIndex: 0,
      overflow: 'hidden',
      borderWidth: 0,
      margin: 0,
      padding: 0,
    },
    bottomBackgroundImage: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      height: '100%',
      borderWidth: 0,
    },
    mainContent: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 40,
      zIndex: 2,
    },
    logoWrapper: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logoImage: {
      width: width * 0.2,
      height: width * 0.2,
      resizeMode: 'contain',
      borderRadius: (width * 0.2) / 2,
      backgroundColor: '#FFFFFF',
    },
    appTagline: {
      color: '#666666',
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
    },
    formCard: {
      backgroundColor: '#FFFFFF',
      paddingVertical: 20,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 5,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1A1A1A',
      marginBottom: 6,
      paddingHorizontal: 24,
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      color: '#888888',
      marginBottom: 28,
      paddingHorizontal: 24,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 14,
      backgroundColor: '#FAFAFA',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    iconContainer: {
      paddingLeft: 14,
      paddingRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputWithIcon: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: '#1A1A1A',
    },
    trailingIconContainer: {
      paddingRight: 14,
      paddingLeft: 8,
      justifyContent: 'center',
    },
    forgotPasswordContainer: {
      alignItems: 'flex-end',
      marginHorizontal: 20,
      marginBottom: 20,
      marginTop: 2,
    },
    forgotPassword: {
      color: '#FF6600',
      fontSize: 13,
    },
    loginButton: {
      backgroundColor: '#008933',
      borderRadius: 12,
      paddingVertical: 15,
      paddingHorizontal: 20,
      marginBottom: 20,
      marginHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowIcon: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    separator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      marginHorizontal: 20,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: '#EEEEEE',
    },
    orText: {
      marginHorizontal: 12,
      color: '#AAAAAA',
      fontSize: 13,
    },
    fingerprintButton: {
      backgroundColor: '#FAFAFA',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      marginHorizontal: 20,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    fingerprintText: {
      color: '#333333',
      fontSize: 15,
      marginLeft: 10,
    },
    securityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 16,
      gap: 12,
    },
    shieldIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,137,51,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    securityTextWrapper: {
      flex: 1,
    },
    securityTop: {
      color: '#008933',
      fontSize: 13,
      fontWeight: '600',
    },
    securitySub: {
      color: '#555555',
      fontSize: 12,
      marginTop: 2,
    },
    registerWrapperInline: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 20,
    },
    registerTextInline: {
      color: '#666666',
      fontSize: 14,
    },
    registerLinkInline: {
      color: '#008933',
      fontWeight: 'bold',
      fontSize: 14,
    },
  });

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.loginContainer}>
        {/* IMAGE DE FOND TOP */}
        <View style={styles.topBackgroundContainer}>
          <Image
            source={require('./assets/images/top.png')}
            style={styles.topBackgroundImage}
            resizeMode="cover"
          />
        </View>

        {/* IMAGE DE FOND BOTTOM */}
        <View style={styles.bottomBackgroundContainer}>
          <Image
            source={require('./assets/images/bottom.png')}
            style={styles.bottomBackgroundImage}
            resizeMode="cover"
          />
        </View>

        {/* CONTENU PRINCIPAL */}
        <View style={styles.mainContent}>
          {/* LOGO */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('./assets/images/logo.png')}
              style={styles.logoImage}
            />
            <Text style={styles.appTagline}>Votre argent, partout, tout le temps</Text>
          </View>

          {/* FORMULAIRE */}
          <View style={styles.formCard}>
            <Text style={styles.title}>Bienvenue !</Text>
            <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>

            {/* Champ téléphone */}
            <View style={styles.inputContainer}>
              <View style={styles.iconContainer}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
                    stroke="#008933"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Numéro de téléphone"
                placeholderTextColor="#BBBBBB"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
              {phoneNumber.length >= 8 && (
                <View style={styles.trailingIconContainer}>
                  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" stroke="#008933" strokeWidth="1.8" />
                    <Path
                      d="M8 12.5l3 3 5-5"
                      stroke="#008933"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              )}
            </View>

            {/* Champ PIN */}
            <View style={styles.inputContainer}>
              <View style={styles.iconContainer}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <Rect x="5" y="11" width="14" height="10" rx="2" stroke="#008933" strokeWidth="1.8" />
                  <Path
                    d="M8 11V7a4 4 0 018 0v4"
                    stroke="#008933"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <Circle cx="12" cy="16" r="1.2" fill="#008933" />
                </Svg>
              </View>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="PIN"
                placeholderTextColor="#BBBBBB"
                keyboardType="number-pad"
                secureTextEntry={!pinVisible}
                maxLength={4}
                value={pin}
                onChangeText={setPin}
              />
              <TouchableOpacity
                style={styles.trailingIconContainer}
                onPress={() => setPinVisible(!pinVisible)}
              >
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="#BBBBBB"
                    strokeWidth="1.8"
                  />
                  <Circle cx="12" cy="12" r="3" stroke="#BBBBBB" strokeWidth="1.8" />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Mot de passe oublié */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={() => setForgotModalVisible(true)}
            >
              <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton Se connecter */}
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Se connecter</Text>
              <View style={styles.arrowCircle}>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.line} />
              <Text style={styles.orText}>ou</Text>
              <View style={styles.line} />
            </View>

            {/* Bouton empreinte */}
            <TouchableOpacity style={styles.fingerprintButton}>
              <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <Path d="M12 2C9.5 2 7.5 3 6 5" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M18 5c-1.5-2-3.5-3-6-3" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M4 9c-.5 1-.8 2-.8 3" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M20.8 12c0-1-.3-2-.8-3" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M9 12c0-1.66 1.34-3 3-3s3 1.34 3 3v2" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M9 14v1c0 1.66 1.34 3 3 3" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M15 14.5c0 .83-.17 1.61-.5 2.3" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M6.5 10.5C6 11.3 6 12.1 6 13c0 2 .7 3.8 1.8 5.2" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
                <Path d="M17.5 10.5c.5.8.5 1.6.5 2.5 0 1.2-.3 2.4-.8 3.4" stroke="#008933" strokeWidth="1.6" strokeLinecap="round" />
              </Svg>
              <Text style={styles.fingerprintText}>Se connecter avec l'empreinte</Text>
            </TouchableOpacity>
          </View>

          {/* BANNIÈRE SÉCURITÉ */}
          <View style={styles.securityBanner}>
            <View style={styles.shieldIconWrapper}>
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z"
                  fill="#008933"
                />
                <Path
                  d="M8.5 12.5l2.5 2.5 4-4"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.securityTextWrapper}>
              <Text style={styles.securityTop}>Votre sécurité, notre priorité</Text>
              <Text style={styles.securitySub}>Utilisez un PIN fort et ne le partagez jamais.</Text>
            </View>
          </View>

          {/* LIEN S'INSCRIRE */}
          <View style={styles.registerWrapperInline}>
            <Text style={styles.registerTextInline}>Vous n'avez pas de compte ? </Text>
            <TouchableOpacity onPress={() => setRegisterModalVisible(true)}>
              <Text style={styles.registerLinkInline}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MODAL INSCRIPTION */}
        <RegisterModal 
          visible={registerModalVisible} 
          onClose={() => setRegisterModalVisible(false)} 
        />

        {/* MODAL MOT DE PASSE OUBLIÉ */}
        <ForgotPasswordModal 
          visible={forgotModalVisible} 
          onClose={() => setForgotModalVisible(false)} 
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ===== NAVIGATION PRINCIPALE =====
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
        <Stack.Screen name="Withdraw" component={WithdrawScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="Bills" component={BillsScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="GouvPay" component={GouvPayScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Transfer" component={TransferScreen} />
        <Stack.Screen name="Expenses" component={ExpensesScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="QRPay" component={QRScreen} />
        <Stack.Screen name="Visa" component={VisaScreen} />
        <Stack.Screen name="TransferToAgency" component={TransferToAgencyScreen} />
        <Stack.Screen name="Chatbot" component={ChatbotScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="Savings" component={SavingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}