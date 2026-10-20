// screens/CashInScreen.js - Encaissement RÉEL via backend
// ✅ DESIGN PREMIUM : moderne, épuré, professionnel (thème teal pour différencier)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Share,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import MainLayout from '../components/MainLayout';
import { getLogoBase64 } from '../utils/pdfUtils';
import { useTransactions } from '../context/TransactionContext';
import { API } from '../services/api';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  teal:         '#10B981',
  tealDark:     '#059669',
  tealSoft:     '#D1FAE5',
  textPrimary:  '#0F172A',
  textSecondary:'#64748B',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  borderSoft:   '#F1F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAFC',
  background:   '#F1F5F9',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  success:      '#10B981',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  shadow:       '#0F172A',
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCashInBig = () => (
  <Svg width="64" height="64" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill={COLORS.tealSoft} />
    <Circle cx="50" cy="50" r="45" stroke={COLORS.teal} strokeWidth="1.5" strokeDasharray="4 4" />
    <Path d="M28 48 L44 64 L72 32" stroke={COLORS.teal} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Circle cx="72" cy="30" r="7" fill="#FFD700" />
    <Path d="M69 30 L71.5 32.5 L75.5 28" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconUserSmall = ({ color = COLORS.teal }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconPhoneSmall = ({ color = COLORS.teal }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLocationSmall = ({ color = COLORS.teal }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconCalendarSmall = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="16" rx="2" stroke={COLORS.teal} strokeWidth="2" />
    <Path d="M3 9h18M8 3v4M16 3v4" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconKeySmall = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="8" cy="15" r="4" stroke={COLORS.teal} strokeWidth="2" />
    <Path d="M11.5 12L20 3.5M17 6l3 3M14 9l2 2" stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheckCircle = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.teal} strokeWidth="2" />
    <Path d="M8 12l2.5 2.5L16 9" stroke={COLORS.teal} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconWarning = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.danger} strokeWidth="2" />
    <Path d="M12 8v5M12 16h.01" stroke={COLORS.danger} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const IconEye = ({ visible }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" />
  </Svg>
);

const IconShareSmall = ({ color = COLORS.accent }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCopySmall = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.8" />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconArrowRight = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheckSmall = ({ color = '#FFFFFF' }) => (
  <Svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSparkle = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="#FFD700" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// 💸 ÉCRAN D'ENCAISSEMENT
// ═══════════════════════════════════════════════════════════════
export default function CashInScreen({ navigation }) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transferFound, setTransferFound] = useState(false);
  const [transferData, setTransferData] = useState(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);

  const [isCashingIn, setIsCashingIn] = useState(false);

  const { addTransaction, balance, refreshWallet } = useTransactions();

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await API.getCurrentUser();
        if (user) {
          setUserPhone(user.phone || '');
          setUserName(user.name || '');
          console.log('👤 [CashIn] Utilisateur :', user.name, '|', user.phone);
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const available = compatible && enrolled;
        setIsBiometricAvailable(available);
        setUseBiometric(available);
        console.log('🔐 [CashIn] Biométrie disponible :', available);
      } catch (error) {
        console.log('Erreur biométrie:', error);
        setIsBiometricAvailable(false);
        setUseBiometric(false);
      }
    };
    checkBiometrics();
  }, []);

  // Vérification du code
  const handleCheckCode = async () => {
    console.log('');
    console.log('🔍 [CashIn] handleCheckCode → début');
    console.log('   Code saisi :', code);

    if (!code || code.trim().length < 8) {
      Alert.alert('Attention', 'Veuillez entrer un code de retrait valide (au moins 8 caractères).');
      return;
    }

    setIsLoading(true);
    setTransferFound(false);
    setTransferData(null);

    try {
      const transfer = await API.getPendingTransferByCode(code.trim());
      if (transfer) {
        console.log('✅ [CashIn] Transfert trouvé :', JSON.stringify(transfer, null, 2));
        setTransferData(transfer);
        setTransferFound(true);
      } else {
        console.log('❌ [CashIn] Aucun transfert avec ce code');
        Alert.alert('Code non trouvé', 'Aucun transfert ne correspond à ce code. Vérifiez et réessayez.');
      }
    } catch (error) {
      console.error('❌ [CashIn] Erreur vérification code :', error);
      Alert.alert('Erreur', 'Impossible de vérifier le code. Vérifiez votre connexion et réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════
  // ✅ AUTHENTIFICATION BIOMÉTRIQUE
  // ═════════════════════════════════════════════════════
  const authenticateWithBiometrics = async () => {
    console.log('🔐 [CashIn] authenticateWithBiometrics → démarrage');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmez l\'encaissement avec votre empreinte',
        fallbackLabel: 'Utiliser mon code PIN',
        disableDeviceFallback: false,
      });

      console.log('🔐 [CashIn] Résultat biométrie :', result.success);

      if (result.success) {
        setPinModalVisible(false);
        setPin('');
        await proceedWithCashIn();
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert('Erreur', 'L\'authentification a échoué. Utilisez votre code PIN.');
        }
      }
    } catch (error) {
      console.error('❌ [CashIn] Erreur biométrie :', error);
      Alert.alert('Erreur', 'Un problème est survenu. Veuillez réessayer.');
    }
  };

  // ═════════════════════════════════════════════════════
  // ✅ CONFIRMATION PAR PIN
  // ═════════════════════════════════════════════════════
  const confirmWithPin = async () => {
    console.log('🔐 [CashIn] confirmWithPin → PIN longueur :', pin.length);
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer un code PIN à 4 chiffres.');
      return;
    }
    if (pin === '0000') {
      setPinModalVisible(false);
      setPin('');
      await proceedWithCashIn();
    } else {
      Alert.alert('Code incorrect', 'Le code PIN que vous avez entré n\'est pas correct.');
      setPin('');
    }
  };

  // ═════════════════════════════════════════════════════
  // ✅ EXÉCUTION DE L'ENCAISSEMENT — APPEL BACKEND RÉEL
  // ═════════════════════════════════════════════════════
  const proceedWithCashIn = async () => {
    if (!transferData) {
      console.warn('⚠️ [CashIn] proceedWithCashIn sans transferData');
      return;
    }

    if (!userPhone) {
      Alert.alert('Erreur', 'Numéro de téléphone introuvable.');
      return;
    }

    const cleanUserPhone = String(userPhone).replace(/\s/g, '').replace(/^\+?227/, '');
    const amountValue = Number(transferData.amount);

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('💸 [CashIn] proceedWithCashIn → APPEL BACKEND');
    console.log('   Code           :', transferData.code);
    console.log('   Expéditeur     :', transferData.sender);
    console.log('   Téléphone user :', cleanUserPhone);
    console.log('   Montant        :', amountValue, 'FCFA');
    console.log('═══════════════════════════════════════════════');

    setIsCashingIn(true);

    try {
      const result = await API.deposit({
        customer_phone: cleanUserPhone,
        amount: amountValue,
      });

      console.log('✅ [CashIn] Réponse backend :', JSON.stringify(result, null, 2));

      setTransactionDetails({
        sender: transferData.sender,
        phone: transferData.phone,
        region: transferData.region,
        amount: amountValue.toLocaleString() + ' FCFA',
        reference: result.reference || transferData.code,
        date: new Date().toLocaleString('fr-FR'),
        backendId: result.id,
        backendStatus: result.status,
      });

      setReceiptModalVisible(true);

      if (typeof refreshWallet === 'function') {
        console.log('🔄 [CashIn] Refresh wallet...');
        await refreshWallet();
      }
    } catch (error) {
      console.error('❌ [CashIn] Échec de l\'encaissement :', error.message);
      Alert.alert(
        'Échec de l\'encaissement',
        error.message || 'Impossible d\'encaisser le transfert. Vérifiez votre connexion.'
      );
    } finally {
      setIsCashingIn(false);
      console.log('🏁 [CashIn] proceedWithCashIn terminé');
    }
  };

  // Clic sur "Encaisser"
  const handleCashIn = () => {
    console.log('');
    console.log('💰 [CashIn] handleCashIn → début');

    if (!transferData) return;

    if (transferData.beneficiaryPhone !== userPhone) {
      console.log('❌ [CashIn] Bénéficiaire ne correspond pas :', transferData.beneficiaryPhone, '≠', userPhone);
      Alert.alert(
        'Accès refusé',
        `Ce transfert est destiné au ${transferData.beneficiaryPhone}. Vous ne pouvez pas l'encaisser avec votre numéro.`
      );
      return;
    }
    if (transferData.status === 'encaisse') {
      Alert.alert('Déjà encaissé', 'Ce transfert a déjà été encaissé auparavant.');
      return;
    }

    console.log('✅ [CashIn] Ouverture du modal PIN');
    setPinModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  // ═════════════════════════════════════════════════════
  // ✅ FERMETURE DU REÇU
  // ═════════════════════════════════════════════════════
  const finishCashIn = () => {
    console.log('🏁 [CashIn] finishCashIn → fermeture');
    Alert.alert('C\'est fait !', `Vous avez bien reçu ${transferData?.amount} FCFA.`);
    setReceiptModalVisible(false);
    setCode('');
    setTransferFound(false);
    setTransferData(null);
    setTransactionDetails(null);
    navigation.goBack();
  };

  // Copier le reçu
  const copyReceipt = async () => {
    if (!transactionDetails) return;
    const text = `NT Albey - Reçu d'encaissement\n\nExpéditeur : ${transactionDetails.sender}\nTéléphone : ${transactionDetails.phone}\nRégion : ${transactionDetails.region}\nMontant : ${transactionDetails.amount}\nRéférence : ${transactionDetails.reference}\nDate : ${transactionDetails.date}`;
    try {
      await Share.share({ message: text });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le reçu.');
    }
  };

  // Export PDF
  const shareReceiptPDF = async () => {
    if (!transactionDetails) return;
    setIsExporting(true);
    try {
      console.log('📄 [CashIn] Export PDF...');
      const logoBase64 = await getLogoBase64();
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 20px; }
              .logo { width: 80px; height: 80px; }
              .title { font-size: 24px; font-weight: bold; color: #008933; }
              .subtitle { font-size: 14px; color: #666; }
              .card { background: #f8f9fc; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
              .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
              .label { color: #666; }
              .value { font-weight: 500; }
              .highlight { color: #008933; font-weight: 700; font-size: 18px; }
              .code-card { background: #fff3e0; padding: 16px; text-align: center; border-radius: 10px; margin: 16px 0; }
              .code { font-size: 20px; font-weight: 800; color: #FF6600; letter-spacing: 2px; }
              .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
              <div class="title">NT Albey</div>
              <div class="subtitle">Reçu d'encaissement</div>
            </div>
            <div class="card">
              <div class="row"><span class="label">Expéditeur</span><span class="value">${transactionDetails.sender}</span></div>
              <div class="row"><span class="label">Téléphone</span><span class="value">${transactionDetails.phone}</span></div>
              <div class="row"><span class="label">Région</span><span class="value">${transactionDetails.region}</span></div>
              <div class="row"><span class="label">Montant</span><span class="value highlight">${transactionDetails.amount}</span></div>
            </div>
            <div class="code-card">
              <div style="font-size:13px; color:#666;">Code de retrait</div>
              <div class="code">${transactionDetails.reference}</div>
            </div>
            <div style="text-align:center; font-size:13px; color:#888;">Date : ${transactionDetails.date}</div>
            <div class="footer">Ce reçu est généré automatiquement par NT Albey.</div>
          </body>
        </html>
      `;

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');

      const filename = `recu_encaissement_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le reçu',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil.');
      }
    } catch (error) {
      console.error('Erreur PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF.\n' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const isBeneficiaryMatch = transferData?.beneficiaryPhone === userPhone;
  const isAlreadyCashed = transferData?.status === 'encaisse';

  // ✅ Vérifie si le code peut être vérifié
  const canCheckCode = !!(code && code.trim().length >= 8) && !isLoading && !isCashingIn;
  // ✅ Vérifie si on peut encaisser
  const canCashIn = transferFound && isBeneficiaryMatch && !isAlreadyCashed && !isCashingIn;

  // ===== RENDU =====
  return (
    <MainLayout activeScreen="CashIn">
      <View style={styles.container}>
        {/* ═══════════ HEADER ═══════════ */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <IconBack />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Encaisser</Text>
            <Text style={styles.headerSubtitle}>Transfert guichet</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ═══════════ HERO ═══════════ */}
          <View style={styles.heroContainer}>
            <View style={styles.heroIconWrap}>
              <IconCashInBig />
            </View>
            <Text style={styles.heroTitle}>Encaisser un transfert</Text>
            <Text style={styles.heroSubtitle}>
              Entrez le code reçu pour récupérer l'argent
            </Text>
          </View>

          {/* ═══════════ CARTE SOLDE ═══════════ */}
          <TouchableOpacity
            style={styles.balanceCard}
            activeOpacity={0.9}
            onPress={() => setBalanceVisible(!balanceVisible)}
          >
            <View style={styles.balanceDecorCircle} pointerEvents="none" />

            <View style={styles.balanceHeader}>
              <View>
                <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
                <Text style={styles.balanceAmount}>
                  {balanceVisible ? `${balance.toLocaleString('fr-FR')} FCFA` : '• • • • • •'}
                </Text>
              </View>
              <View style={styles.balanceEyeBtn}>
                <IconEye visible={balanceVisible} />
              </View>
            </View>

            <View style={styles.balanceFooter}>
              <View style={styles.balancePill}>
                <Text style={styles.balancePillText}>
                  {balanceVisible ? '✅ Prêt à encaisser' : '👆 Appuyez pour afficher'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ═══════════ ÉTAPE 1 : CODE DE RETRAIT ═══════════ */}
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: COLORS.teal }]}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Code de retrait</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>
              Saisissez le code que vous avez reçu
            </Text>

            <View style={styles.codeInputWrapper}>
              <TextInput
                style={styles.codeInput}
                placeholder="NT123456789"
                placeholderTextColor={COLORS.textMuted}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isCashingIn}
              />
              <TouchableOpacity
                style={[styles.checkButton, !canCheckCode && styles.checkButtonDisabled]}
                onPress={handleCheckCode}
                disabled={!canCheckCode}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.checkButtonText, !canCheckCode && styles.checkButtonTextDisabled]}>
                    Vérifier
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* ─── AIDE ─── */}
            <View style={styles.hintBanner}>
              <Text style={styles.hintBannerText}>
                💡 Le code vous a été communiqué par l'expéditeur (par SMS)
              </Text>
            </View>
          </View>

          {/* ═══════════ TRANSFERT TROUVÉ ═══════════ */}
          {transferFound && transferData && (
            <>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: COLORS.teal }]}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Détails du transfert</Text>
              </View>

              <View style={styles.transferCard}>
                {/* Header succès */}
                <View style={styles.transferHeader}>
                  <View style={styles.transferHeaderIconWrap}>
                    <IconCheckCircle />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transferHeaderTitle}>Transfert trouvé</Text>
                    <Text style={styles.transferHeaderSubtitle}>
                      Vérifiez les informations avant de continuer
                    </Text>
                  </View>
                </View>

                {/* Montant mis en avant */}
                <View style={styles.amountHighlight}>
                  <Text style={styles.amountHighlightLabel}>MONTANT À ENCAISSER</Text>
                  <Text style={styles.amountHighlightValue}>
                    {transferData.amount.toLocaleString()} <Text style={styles.amountHighlightUnit}>FCFA</Text>
                  </Text>
                </View>

                {/* Détails */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <IconUserSmall />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Expéditeur</Text>
                      <Text style={styles.detailValue}>{transferData.sender}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <IconPhoneSmall />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Téléphone</Text>
                      <Text style={styles.detailValue}>{transferData.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <IconLocationSmall />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Région</Text>
                      <Text style={styles.detailValue}>{transferData.region}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <IconCalendarSmall />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(transferData.date).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconWrap}>
                      <IconKeySmall />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Statut</Text>
                      <View style={[
                        styles.statusPill,
                        transferData.status === 'encaisse' ? styles.statusPillDanger : styles.statusPillSuccess,
                      ]}>
                        <Text style={[
                          styles.statusPillText,
                          transferData.status === 'encaisse' ? styles.statusPillTextDanger : styles.statusPillTextSuccess,
                        ]}>
                          {transferData.status === 'encaisse' ? '❌ Déjà encaissé' : '✅ Disponible'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Avertissements */}
                {!isBeneficiaryMatch && (
                  <View style={styles.warningCard}>
                    <View style={styles.warningIconWrap}>
                      <IconWarning />
                    </View>
                    <View style={styles.warningContent}>
                      <Text style={styles.warningTitle}>Accès refusé</Text>
                      <Text style={styles.warningText}>
                        Ce transfert est destiné au {transferData.beneficiaryPhone}. Vous ne pouvez pas l'encaisser avec votre numéro.
                      </Text>
                    </View>
                  </View>
                )}

                {isAlreadyCashed && isBeneficiaryMatch && (
                  <View style={styles.warningCard}>
                    <View style={styles.warningIconWrap}>
                      <IconWarning />
                    </View>
                    <View style={styles.warningContent}>
                      <Text style={styles.warningTitle}>Déjà encaissé</Text>
                      <Text style={styles.warningText}>
                        Ce transfert a déjà été encaissé auparavant.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ═══════════ BOUTON ENCAISSER ═══════════ */}
          {transferFound && (
            <TouchableOpacity
              style={[styles.cashInButton, !canCashIn && styles.cashInButtonDisabled]}
              onPress={handleCashIn}
              disabled={!canCashIn}
              activeOpacity={0.85}
            >
              {isCashingIn ? (
                <View style={styles.cashInButtonContent}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.cashInButtonText}>Encaissement en cours…</Text>
                </View>
              ) : (
                <View style={styles.cashInButtonContent}>
                  <Text style={[styles.cashInButtonText, !canCashIn && styles.cashInButtonTextDisabled]}>
                    {isAlreadyCashed
                      ? 'Déjà encaissé'
                      : !isBeneficiaryMatch
                        ? 'Non autorisé'
                        : 'Encaisser maintenant'}
                  </Text>
                  {canCashIn && (
                    <View style={styles.cashInIconCircle}>
                      <IconArrowRight />
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* ═══════════ INFO CARD ═══════════ */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoEmoji}>ℹ️</Text>
              <Text style={styles.infoTitle}>Comment ça marche ?</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoBullet}>1.</Text>
              <Text style={styles.infoText}>Un proche vous a envoyé de l'argent via « Transfert Guichet »</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoBullet}>2.</Text>
              <Text style={styles.infoText}>Il vous a communiqué un code de retrait par SMS</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoBullet}>3.</Text>
              <Text style={styles.infoText}>Saisissez ce code pour vérifier le transfert</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoBullet}>4.</Text>
              <Text style={styles.infoText}>Confirmez avec votre empreinte ou votre code PIN</Text>
            </View>
          </View>

        </ScrollView>

        {/* ═══════════════ MODAL PIN ═══════════════ */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={pinModalVisible}
          onRequestClose={() => {
            if (isCashingIn) return;
            setPinModalVisible(false);
            setPin('');
            setUseBiometric(isBiometricAvailable);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: width - 40 }]}>
              <View style={styles.confirmIconWrapper}>
                <IconCashInBig />
              </View>

              <Text style={styles.confirmTitle}>Confirmer l'encaissement</Text>
              <Text style={styles.confirmAmount}>
                {transferData?.amount.toLocaleString()} FCFA
              </Text>
              <Text style={styles.confirmRecipient}>de {transferData?.sender}</Text>

              {isBiometricAvailable && useBiometric ? (
                <>
                  <Text style={styles.confirmHintText}>Confirmez avec votre empreinte</Text>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={authenticateWithBiometrics}
                    activeOpacity={0.75}
                    disabled={isCashingIn}
                  >
                    {isCashingIn ? (
                      <ActivityIndicator color={COLORS.teal} size="small" />
                    ) : (
                      <Image
                        source={require('../assets/images/print.png')}
                        style={styles.biometricIcon}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.switchMethodButton}
                    onPress={() => setUseBiometric(false)}
                    disabled={isCashingIn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchMethodText}>🔑 Utiliser mon code PIN</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.confirmHintText}>Entrez votre code PIN</Text>
                  <View style={styles.pinContainer}>
                    <TextInput
                      style={styles.pinInput}
                      placeholder="••••"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      secureTextEntry={!pinVisible}
                      maxLength={4}
                      value={pin}
                      onChangeText={setPin}
                      textAlign="center"
                      editable={!isCashingIn}
                    />
                    <TouchableOpacity
                      style={styles.pinEye}
                      onPress={() => setPinVisible(!pinVisible)}
                      disabled={isCashingIn}
                    >
                      <Text>{pinVisible ? '👁️' : '🔒'}</Text>
                    </TouchableOpacity>
                  </View>
                  {isBiometricAvailable && (
                    <TouchableOpacity
                      style={styles.switchMethodButton}
                      onPress={() => setUseBiometric(true)}
                      disabled={isCashingIn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.switchMethodText}>👆 Utiliser mon empreinte</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={confirmWithPin}
                    disabled={isCashingIn}
                    activeOpacity={0.85}
                  >
                    {isCashingIn ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Confirmer</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setPinModalVisible(false);
                    setPin('');
                    setUseBiometric(isBiometricAvailable);
                  }}
                  disabled={isCashingIn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>
                    {isCashingIn ? 'Encaissement…' : 'Annuler'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ═══════════════ MODAL REÇU ═══════════════ */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={receiptModalVisible}
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.receiptModalContent, { width: width - 24 }]}>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptIcon}>
                    <Text style={styles.receiptIconText}>✅</Text>
                  </View>
                  <Text style={styles.receiptTitle}>Encaissement réussi</Text>
                  <Text style={styles.receiptSubtitle}>Votre transaction a bien été effectuée</Text>
                </View>

                {transactionDetails && (
                  <>
                    {/* Montant mis en avant */}
                    <View style={styles.receiptAmountBox}>
                      <Text style={styles.receiptAmountLabel}>MONTANT REÇU</Text>
                      <Text style={styles.receiptAmountValue}>
                        {transactionDetails.amount}
                      </Text>
                    </View>

                    <View style={styles.receiptCard}>
                      <View style={styles.receiptSection}>
                        <Text style={styles.receiptSectionLabel}>EXPÉDITEUR</Text>

                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>👤 Nom</Text>
                          <Text style={styles.receiptValue}>{transactionDetails.sender}</Text>
                        </View>

                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>📞 Téléphone</Text>
                          <Text style={styles.receiptValue}>{transactionDetails.phone}</Text>
                        </View>

                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>📍 Région</Text>
                          <Text style={styles.receiptValue}>{transactionDetails.region}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.receiptCodeCard}>
                      <View style={styles.receiptCodeHeader}>
                        <IconSparkle />
                        <Text style={styles.receiptCodeLabel}>CODE DE RETRAIT</Text>
                      </View>
                      <Text style={styles.receiptCode}>{transactionDetails.reference}</Text>
                    </View>

                    <Text style={styles.receiptDate}>
                      📅 {transactionDetails.date}
                    </Text>
                  </>
                )}

                <View style={styles.receiptButtons}>
                  <TouchableOpacity
                    style={[styles.receiptButton, styles.receiptCopyButton]}
                    onPress={copyReceipt}
                    activeOpacity={0.75}
                  >
                    <IconCopySmall />
                    <Text style={styles.receiptCopyButtonText}>Copier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.receiptButton, styles.receiptShareButton]}
                    onPress={shareReceiptPDF}
                    disabled={isExporting}
                    activeOpacity={0.75}
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <>
                        <IconShareSmall />
                        <Text style={styles.receiptShareButtonText}>Partager</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.receiptButton, styles.receiptDoneButton]}
                  onPress={finishCashIn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.receiptDoneButtonText}>✓ Terminé</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  // ═══════════════ HEADER ═══════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  // ═══════════════ HERO ═══════════════
  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 24,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '500',
  },

  // ═══════════════ CARTE SOLDE ═══════════════
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: COLORS.teal,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  balanceDecorCircle: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  balanceEyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  balancePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  balancePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // ═══════════════ STEP HEADERS ═══════════════
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    gap: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2 },

  // ═══════════════ CARD ═══════════════
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  // ═══════════════ CODE INPUT ═══════════════
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 14,
    fontSize: 17,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 2.5,
    fontWeight: '700',
  },
  checkButton: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  checkButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  checkButtonTextDisabled: { color: COLORS.textMuted },

  // ═══════════════ HINT BANNER ═══════════════
  hintBanner: {
    backgroundColor: COLORS.tealSoft,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.teal + '30',
  },
  hintBannerText: {
    fontSize: 11,
    color: COLORS.tealDark,
    fontWeight: '600',
    lineHeight: 16,
  },

  // ═══════════════ TRANSFERT TROUVÉ ═══════════════
  transferCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  transferHeaderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.tealDark,
    letterSpacing: -0.2,
  },
  transferHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  amountHighlight: {
    backgroundColor: COLORS.tealSoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal + '25',
  },
  amountHighlightLabel: {
    fontSize: 10,
    color: COLORS.tealDark,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  amountHighlightValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.8,
  },
  amountHighlightUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.tealDark,
  },

  detailsContainer: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginVertical: 4,
  },

  // ═══════════════ STATUS PILLS ═══════════════
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  statusPillSuccess: { backgroundColor: COLORS.tealSoft },
  statusPillDanger: { backgroundColor: COLORS.dangerSoft },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPillTextSuccess: { color: COLORS.tealDark },
  statusPillTextDanger: { color: '#991B1B' },

  // ═══════════════ WARNING CARD ═══════════════
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  warningIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  warningText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
    fontWeight: '500',
  },

  // ═══════════════ BOUTON ENCAISSER ═══════════════
  cashInButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: COLORS.teal,
    paddingVertical: 18,
    paddingHorizontal: 22,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  cashInButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  cashInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cashInButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
  cashInButtonTextDisabled: { color: COLORS.textMuted },
  cashInIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════ INFO CARD ═══════════════
  infoCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoEmoji: { fontSize: 16 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  infoBullet: { fontSize: 12, color: COLORS.teal, fontWeight: '800', lineHeight: 18, minWidth: 14 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, fontWeight: '500' },

  // ═══════════════ MODAL OVERLAY ═══════════════
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ═══════════════ MODAL CONFIRMATION ═══════════════
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconWrapper: { marginBottom: 16 },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  confirmAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  confirmRecipient: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
  },
  confirmHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  pinInput: {
    width: 140,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 8,
    color: COLORS.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.teal,
    paddingVertical: 8,
  },
  pinEye: { position: 'absolute', right: 0, padding: 8 },
  biometricButton: {
    backgroundColor: COLORS.tealSoft,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.teal + '25',
  },
  biometricIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    tintColor: COLORS.teal,
  },
  switchMethodButton: { marginVertical: 10, paddingVertical: 6 },
  switchMethodText: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  confirmButton: {
    backgroundColor: COLORS.teal,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // ═══════════════ REÇU ═══════════════
  receiptModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
  },
  receiptHeader: { alignItems: 'center', marginBottom: 20 },
  receiptIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptIconText: { fontSize: 32 },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.3,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },

  receiptAmountBox: {
    backgroundColor: COLORS.tealSoft,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal + '25',
  },
  receiptAmountLabel: {
    fontSize: 10,
    color: COLORS.tealDark,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  receiptAmountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.6,
  },

  receiptCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  receiptSection: { marginVertical: 2 },
  receiptSectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  receiptLabel: { fontSize: 13, color: COLORS.textSecondary, flexShrink: 0, fontWeight: '500' },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },

  receiptCodeCard: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  receiptCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  receiptCodeLabel: {
    fontSize: 10,
    color: '#7A4A1A',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  receiptCode: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
  },

  receiptDate: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 16,
    fontWeight: '600',
  },

  receiptButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  receiptButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  receiptCopyButton: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
  },
  receiptCopyButtonText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  receiptShareButton: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '30',
  },
  receiptShareButtonText: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  receiptDoneButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  receiptDoneButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});