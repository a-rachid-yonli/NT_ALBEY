// screens/GouvPayScreen.js - Version simplifiée et lisible
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  Share,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getLogoBase64 } from '../utils/pdfUtils';

import { API } from '../services/api';
import { useTransactions } from '../context/TransactionContext';

// Icônes
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconGouvPay = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Path d="M50 20 L25 35 L25 50 C25 65 35 78 50 82 C65 78 75 65 75 50 L75 35 L50 20Z" fill="#008933" />
    <Path d="M50 35 L50 50 M50 50 L40 45 M50 50 L60 45" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const IconImpot = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M3 12h18M3 18h18" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="2" fill="#FFD700" />
  </Svg>
);

const IconTaxe = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="1.8" />
    <Path d="M12 8v5M12 16h.01" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconAmende = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke="#FF6600" strokeWidth="1.8" />
    <Path d="M8 12h8M12 8v8" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconDouane = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M3 21h18M4 21V7l8-4 8 4v14" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 13h6" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconPatente = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#F59E0B" strokeWidth="1.8" />
    <Path d="M2 17l10 5 10-5" stroke="#F59E0B" strokeWidth="1.8" />
    <Path d="M2 12l10 5 10-5" stroke="#F59E0B" strokeWidth="1.8" />
  </Svg>
);

const IconCarteGrise = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke="#EC4899" strokeWidth="1.8" />
    <Path d="M7 9h10" stroke="#EC4899" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="17" cy="15" r="2" fill="#EC4899" />
  </Svg>
);

const IconPDF = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8M8 18h6" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconCopy = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke="#008933" strokeWidth="1.5" />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#008933" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

export default function GouvPayScreen({ navigation }) {
  const { width = 400, height = 800 } = useWindowDimensions();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amountFound, setAmountFound] = useState(false);
  const [abonneName, setAbonneName] = useState('');
  const [isServiceMode, setIsServiceMode] = useState(false);

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { addTransaction, balance } = useTransactions();

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, servs] = await Promise.all([
          API.getGouvCategories(),
          API.getGouvServices(),
        ]);
        setCategories(cats);
        setServices(servs);
      } catch (error) {
        console.error('Erreur chargement données Gouv-Pay:', error);
        Alert.alert('Erreur', 'Impossible de charger la liste. Vérifiez votre connexion internet.');
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const available = compatible && enrolled;
        setIsBiometricAvailable(available);
        setUseBiometric(available);
      } catch (error) {
        console.log('Erreur biométrie:', error);
        setIsBiometricAvailable(false);
        setUseBiometric(false);
      }
    };
    checkBiometrics();
  }, []);

  const generateReference = () => {
    const prefix = 'GOV';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmez le paiement avec votre empreinte',
        fallbackLabel: 'Utiliser mon code PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        executePayment();
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert('Erreur', 'L\'authentification a échoué. Veuillez réessayer ou utiliser votre code PIN.');
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      Alert.alert('Erreur', 'Un problème est survenu. Veuillez réessayer.');
    }
  };

  const confirmWithPin = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer un code PIN à 4 chiffres.');
      return;
    }
    if (pin === '0000') {
      executePayment();
    } else {
      Alert.alert('Code incorrect', 'Le code PIN que vous avez entré n\'est pas correct.');
      setPin('');
    }
  };

  const executePayment = () => {
    const ref = generateReference();
    const finalAmount = parseInt(amount);

    const newTransaction = {
      id: Date.now().toString(),
      type: 'gouvpay',
      amount: -finalAmount,
      date: new Date().toISOString(),
      description: `Paiement ${selectedCategory?.name || ''}`,
      reference: ref,
      details: {
        category: selectedCategory?.name || 'Gouv-Pay',
        service: isServiceMode ? selectedCategory?.name : undefined,
        abonne: abonneName || customerName || 'N/A',
        refNumber: reference,
        amount: finalAmount,
      },
      deletable: false,
    };
    addTransaction(newTransaction);

    const details = {
      category: selectedCategory?.name || 'Gouv-Pay',
      reference: ref,
      amount: finalAmount.toLocaleString() + ' FCFA',
      abonne: abonneName || customerName || 'N/A',
      refNumber: reference,
      date: new Date().toLocaleString('fr-FR'),
      service: isServiceMode ? selectedCategory?.name : undefined,
    };
    setTransactionDetails(details);
    setModalVisible(false);
    setPin('');
    setReceiptModalVisible(true);
  };

  // ─── HTML du PDF ────────────────────────────────────────────────
  const generatePDFHTML = (details, logoBase64) => {
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<div style="background:linear-gradient(135deg,#008933,#00A34D);color:white;padding:10px 30px;border-radius:10px;display:inline-block;font-weight:700;font-size:22px;letter-spacing:4px;box-shadow:0 4px 15px rgba(0,137,51,0.3);margin-bottom:6px;">NT ALBEY</div>`;

    return `<!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Helvetica Neue',Arial,sans-serif; padding:40px 30px; max-width:700px; margin:0 auto; color:#1A1A1A; background:#fff; }
          .header { text-align:center; border-bottom:3px solid #008933; padding-bottom:20px; margin-bottom:25px; }
          .logo-container { display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:6px; }
          .logo { max-width:100px; height:auto; margin-bottom:6px; }
          .header h1 { color:#008933; font-size:22px; margin:0; letter-spacing:3px; font-weight:800; }
          .header .subtitle { color:#666; font-size:13px; margin-top:4px; letter-spacing:1px; }
          .transaction-id { text-align:center; color:#888; font-size:11px; margin-bottom:20px; font-family:monospace; letter-spacing:1px; }
          .success-badge { text-align:center; margin-bottom:20px; }
          .success-badge span { background-color:#10B981; color:white; padding:6px 24px; border-radius:30px; font-size:14px; font-weight:700; letter-spacing:1px; }
          .highlight-box { background-color:#F0FFF4; border-radius:12px; padding:18px; margin:16px 0; border-left:5px solid #008933; }
          .highlight-box .info-row { border-bottom:1px solid #D0E8D0; padding:8px 0; }
          .highlight-box .info-row:last-child { border-bottom:none; }
          .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #F0F0F0; }
          .info-row:last-child { border-bottom:none; }
          .info-label { color:#666; font-size:13px; font-weight:500; }
          .info-value { color:#1A1A1A; font-size:13px; font-weight:600; text-align:right; max-width:60%; word-break:break-word; }
          .info-value.amount-highlight { color:#008933; font-size:16px; font-weight:800; }
          .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #F0F0F0; color:#999; font-size:11px; }
          .footer .brand { color:#008933; font-weight:700; font-size:14px; letter-spacing:2px; }
          .footer .slogan { color:#666; font-size:11px; margin-top:4px; }
          .footer .date { font-size:9px; color:#BBB; margin-top:6px; }
          .footer .support { margin-top:8px; font-size:10px; color:#888; }
        </style></head>
        <body>
          <div class="header"><div class="logo-container">${logoHtml}<h1>NT ALBEY</h1></div><div class="subtitle">Votre argent, partout, tout le temps</div></div>
          <div class="transaction-id">TRANSACTION N° ${details.reference || 'N/A'}</div>
          <div class="success-badge"><span>✅ PAIEMENT CONFIRMÉ</span></div>
          <div class="highlight-box">
            <div class="info-row"><span class="info-label">🏛️ Catégorie</span><span class="info-value">${details.category || 'N/A'}</span></div>
            ${details.service ? `<div class="info-row"><span class="info-label">📄 Service</span><span class="info-value">${details.service}</span></div>` : ''}
            <div class="info-row"><span class="info-label">👤 Nom du contribuable</span><span class="info-value">${details.abonne || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">🔑 Référence</span><span class="info-value">${details.refNumber || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">💰 Montant payé</span><span class="info-value amount-highlight">${details.amount || '0 FCFA'}</span></div>
          </div>
          <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${details.date || new Date().toLocaleString('fr-FR')}</span></div>
          <div class="info-row"><span class="info-label">💳 Compte débité</span><span class="info-value">Wallet principal •••• 4587</span></div>
          <div class="footer"><div class="brand">NT ALBEY</div><div class="slogan">Votre argent, partout, tout le temps</div><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div><div class="support">📞 Support : 555 | 📧 support@ntalbey.ne</div></div>
        </body>
      </html>`;
  };

  const handleExportPDF = async (details) => {
    if (!details) {
      Alert.alert('Erreur', 'Aucune donnée à exporter.');
      return;
    }
    try {
      setIsExporting(true);
      const logoBase64 = await getLogoBase64();
      const html = generatePDFHTML(details, logoBase64);

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');

      const filename = `recu_gouvpay_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reçu de paiement - ${details.reference}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Reçu généré', 'Votre reçu est prêt.');
      }
    } catch (error) {
      console.error('Erreur export PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF.\n' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyReceipt = (details) => {
    if (!details) return;
    const message = `NT ALBEY - REÇU DE PAIEMENT
━━━━━━━━━━━━━━━━━━━━━
✅ PAIEMENT CONFIRMÉ
━━━━━━━━━━━━━━━━━━━━━
🏛️ Catégorie : ${details.category || 'N/A'}
${details.service ? `📄 Service : ${details.service}` : ''}
👤 Nom du contribuable : ${details.abonne || 'N/A'}
🔑 Référence : ${details.refNumber || 'N/A'}
💰 Montant payé : ${details.amount || '0 FCFA'}
📅 Date : ${details.date || new Date().toLocaleString('fr-FR')}
💳 Compte débité : Wallet principal •••• 4587
🔑 Réf. transaction : ${details.reference || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━
📞 Support : 555 | 📧 support@ntalbey.ne
━━━━━━━━━━━━━━━━━━━━━
NT Albey - Votre argent, partout, tout le temps`;
    Alert.alert(
      'Reçu copié',
      'Le reçu a été copié. Vous pouvez le coller dans un message ou une note.',
      [
        { text: 'OK' },
        { text: 'Partager', onPress: () => Share.share({ message, title: `Reçu de paiement - ${details.reference}` }) }
      ]
    );
  };

  const finishPayment = () => {
    setReceiptModalVisible(false);
    setTransactionDetails(null);
    setReference('');
    setAmount('');
    setAmountFound(false);
    setAbonneName('');
    setCustomerName('');
    setSelectedCategory(null);
    setIsServiceMode(false);
    navigation.goBack();
  };

  const getIconForCategory = (iconName) => {
    const map = {
      IconImpot: <IconImpot />,
      IconTaxe: <IconTaxe />,
      IconAmende: <IconAmende />,
      IconDouane: <IconDouane />,
      IconPatente: <IconPatente />,
      IconCarteGrise: <IconCarteGrise />,
    };
    return map[iconName] || <IconImpot />;
  };

  const handleServiceClick = (service) => {
    const serviceCategory = {
      id: service.id,
      name: service.name,
      color: '#008933',
      icon: IconImpot,
      description: service.description,
      fields: ['Numéro de référence', 'Nom complet'],
      isService: true,
      servicePrice: service.price,
      refPrefix: service.refPrefix,
    };
    setSelectedCategory(serviceCategory);
    setIsServiceMode(true);
    setReference('');
    setAmount('');
    setAmountFound(false);
    setAbonneName('');
    setCustomerName('');
  };

  const handleCheckReference = async () => {
    if (!selectedCategory) {
      Alert.alert('Attention', 'Veuillez sélectionner une catégorie.');
      return;
    }
    if (!reference || reference.trim().length < 3) {
      Alert.alert('Attention', 'Veuillez entrer une référence valide.');
      return;
    }

    setIsLoading(true);
    setAbonneName('');
    setAmountFound(false);

    try {
      const result = await API.searchGouvReference(reference.toUpperCase());
      if (result) {
        setAbonneName(result.nom);
        setAmount(result.montant.toString());
        setAmountFound(true);
        Alert.alert(
          'Référence trouvée',
          `Type : ${result.type || selectedCategory.name}\nNom : ${result.nom}\nMontant : ${result.montant.toLocaleString()} FCFA`
        );
      } else {
        const randomAmount = Math.floor(Math.random() * (100000 - 5000 + 1)) + 5000;
        const randomNames = ['Moussa Ibrahim', 'Aïssata Moussa', 'Habibou Dan Galadima', 'Balkissa Saley', 'Ibrahim Hassane', 'Amadou Hassane', 'Sani Oumarou'];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        setAbonneName(randomName);
        setAmount(randomAmount.toString());
        setAmountFound(true);
        Alert.alert('Référence trouvée', `Nom : ${randomName}\nMontant : ${randomAmount.toLocaleString()} FCFA`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de vérifier la référence. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = () => {
    if (!selectedCategory) {
      Alert.alert('Attention', 'Veuillez sélectionner une catégorie.');
      return;
    }
    if (!reference || reference.length < 3) {
      Alert.alert('Attention', 'Veuillez entrer une référence valide.');
      return;
    }
    if (!amountFound || !amount || parseInt(amount) <= 0) {
      Alert.alert('Attention', 'Veuillez d\'abord vérifier la référence.');
      return;
    }
    if (parseInt(amount) > balance) {
      Alert.alert('Solde insuffisant', `Votre solde est de ${balance.toLocaleString()} FCFA.`);
      return;
    }
    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const modalWidth = width ? width - 40 : 320;
  const receiptModalWidth = width ? width - 24 : 350;
  const receiptMaxHeight = height ? height * 0.9 : 700;

  if (isDataLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gouv-Pay</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#008933" />
          <Text style={{ marginTop: 16, color: '#666' }}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gouv-Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.illustrationContainer}>
          <IconGouvPay />
          <Text style={styles.illustrationText}>Payez vos impôts et taxes en ligne</Text>
        </View>

        {/* SOLDE */}
        <TouchableOpacity style={styles.balanceCard} activeOpacity={0.8} onPress={() => setBalanceVisible(!balanceVisible)}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>{balanceVisible ? `${balance.toLocaleString()} FCFA` : '••••••••'}</Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>{balanceVisible ? 'Paiement sécurisé' : '👆 Appuyez pour afficher'}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>🏛️ Catégories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, selectedCategory?.id === category.id && !isServiceMode && styles.categoryCardSelected]}
              onPress={() => {
                setSelectedCategory(category);
                setIsServiceMode(false);
                setReference('');
                setAmount('');
                setAmountFound(false);
                setAbonneName('');
                setCustomerName('');
              }}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                {getIconForCategory(category.icon)}
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDesc}>{category.description}</Text>
              {selectedCategory?.id === category.id && !isServiceMode && (
                <View style={styles.categoryCheck}><Text style={styles.categoryCheckText}>✓</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>🪪 Services administratifs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
          {services.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, selectedCategory?.id === service.id && isServiceMode && styles.categoryCardSelected]}
              onPress={() => handleServiceClick(service)}
            >
              <View style={styles.serviceIcon}><Text style={styles.serviceIconText}>📄</Text></View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDesc}>{service.description}</Text>
              <Text style={styles.servicePrice}>{service.price.toLocaleString()} FCFA</Text>
              <View style={styles.serviceButton}><Text style={styles.serviceButtonText}>Vérifier</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedCategory && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Paiement {selectedCategory.name}</Text>
            <Text style={styles.inputLabel}>{isServiceMode ? 'Numéro de référence' : 'Référence'}</Text>
            <View style={styles.referenceWrapper}>
              <TextInput
                style={[styles.input, styles.referenceInput]}
                placeholder={isServiceMode ? "Ex: CNI123456" : "Ex: IFU123456"}
                placeholderTextColor="#AAA"
                value={reference}
                onChangeText={(text) => {
                  setReference(text);
                  setAmountFound(false);
                  setAmount('');
                  setAbonneName('');
                }}
              />
              <TouchableOpacity style={styles.checkRefButton} onPress={handleCheckReference} disabled={isLoading}>
                <Text style={styles.checkRefButtonText}>{isLoading ? '...' : 'Vérifier'}</Text>
              </TouchableOpacity>
            </View>

            {abonneName !== '' && (
              <View style={styles.abonneContainer}>
                <Text style={styles.abonneLabel}>👤 Nom du contribuable</Text>
                <Text style={styles.abonneName}>{abonneName}</Text>
              </View>
            )}

            {amountFound && (
              <View style={styles.amountFoundContainer}>
                <View style={styles.amountFoundHeader}>
                  <Text style={styles.amountFoundLabel}>💰 Montant à payer</Text>
                  <View style={styles.amountFoundBadge}><Text style={styles.amountFoundBadgeText}>✓ Trouvé</Text></View>
                </View>
                <Text style={styles.amountFoundValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
                <Text style={styles.amountFoundRef}>Référence : {reference}</Text>
              </View>
            )}

            {!isServiceMode && selectedCategory.fields?.map((field, index) => {
              const skipFields = ['Numéro IFU', 'Numéro fiscal', 'Numéro du PV', 'Numéro déclaration', 'Numéro patente', 'Numéro certificat', 'Immatriculation'];
              if (skipFields.includes(field)) return null;
              return (
                <View key={index}>
                  <Text style={styles.inputLabel}>{field}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Entrez ${field.toLowerCase()}`}
                    placeholderTextColor="#AAA"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>
              );
            })}

            {!amountFound && !isServiceMode && (
              <>
                <Text style={styles.inputLabel}>Montant à payer</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>FCFA</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#CCC"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <View style={styles.suggestionsRow}>
                  {['5000', '10000', '25000', '50000', '100000'].map(sug => (
                    <TouchableOpacity key={sug} style={styles.suggestionChip} onPress={() => setAmount(sug)}>
                      <Text style={styles.suggestionText}>{sug} FCFA</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.feesCard}>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Frais</Text>
            <Text style={styles.feesValue}>{amount ? `${Math.floor(parseInt(amount) * 0.001)} FCFA` : '0 FCFA'}</Text>
          </View>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Total débité</Text>
            <Text style={styles.totalValue}>{amount ? `${parseInt(amount) + Math.floor(parseInt(amount) * 0.001)} FCFA` : '0 FCFA'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Compte débité</Text>
            <Text style={styles.accountInfo}>Wallet principal •••• 4587</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.payButton, (!selectedCategory || !reference || !amountFound || !amount) && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={!selectedCategory || !reference || !amountFound || !amount}
        >
          <Text style={styles.payButtonText}>{amountFound && amount ? `Payer ${parseInt(amount).toLocaleString()} FCFA` : 'Vérifiez d\'abord la référence'}</Text>
          <View style={styles.payIconCircle}><Text style={styles.payIcon}>→</Text></View>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informations importantes</Text>
          <Text style={styles.infoText}>• Entrez votre référence pour voir le montant à payer</Text>
          <Text style={styles.infoText}>• Paiement sécurisé des impôts et taxes</Text>
          <Text style={styles.infoText}>• Reçu officiel disponible après paiement</Text>
          <Text style={styles.infoText}>• Délai de traitement : 24 à 48 heures</Text>
          <Text style={styles.infoText}>• Service support : 111 ou gouv-pay@nt.ne</Text>
        </View>
      </ScrollView>

      {/* MODAL CONFIRMATION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); setPin(''); setUseBiometric(isBiometricAvailable); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalIcon}><IconGouvPay /></View>
            <Text style={styles.modalTitle}>Confirmer le paiement</Text>
            <Text style={styles.modalSubtitle}>Paiement {selectedCategory?.name}</Text>
            <Text style={styles.modalPrice}>{parseInt(amount).toLocaleString()} FCFA</Text>
            {reference && <Text style={styles.modalRef}>Référence : {reference}</Text>}
            {abonneName && <Text style={styles.modalAbonne}>Nom : {abonneName}</Text>}

            {isBiometricAvailable && useBiometric ? (
              <>
                <Text style={styles.modalLabel}>Confirmez avec votre empreinte digitale</Text>
                <TouchableOpacity style={styles.biometricButton} onPress={authenticateWithBiometrics}>
                  <Image source={require('../assets/images/print.png')} style={styles.biometricIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.switchMethodButton} onPress={() => setUseBiometric(false)}>
                  <Text style={styles.switchMethodText}>🔑 Utiliser mon code PIN</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Entrez votre code PIN</Text>
                <View style={styles.pinContainer}>
                  <TextInput
                    style={styles.pinInput}
                    placeholder="••••"
                    placeholderTextColor="#CCC"
                    keyboardType="number-pad"
                    secureTextEntry={!pinVisible}
                    maxLength={4}
                    value={pin}
                    onChangeText={setPin}
                    textAlign="center"
                  />
                  <TouchableOpacity style={styles.pinEye} onPress={() => setPinVisible(!pinVisible)}>
                    <Text>{pinVisible ? '👁️' : '🔒'}</Text>
                  </TouchableOpacity>
                </View>
                {isBiometricAvailable && (
                  <TouchableOpacity style={styles.switchMethodButton} onPress={() => setUseBiometric(true)}>
                    <Text style={styles.switchMethodText}>👆 Utiliser mon empreinte</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmWithPin}>
                  <Text style={styles.confirmButtonText}>Confirmer</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setModalVisible(false); setPin(''); setUseBiometric(isBiometricAvailable); }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REÇU */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptModalContent, { width: receiptModalWidth, maxHeight: receiptMaxHeight }]}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptIcon}><Text style={styles.receiptIconText}>✅</Text></View>
              <Text style={styles.receiptTitle}>Paiement confirmé</Text>
            </View>

            {transactionDetails ? (
              <>
                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>🏛️ Catégorie</Text>
                    <Text style={styles.receiptValue}>{transactionDetails.category || 'N/A'}</Text>
                  </View>
                  {transactionDetails.service && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>📄 Service</Text>
                      <Text style={styles.receiptValue}>{transactionDetails.service}</Text>
                    </View>
                  )}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>👤 Nom du contribuable</Text>
                    <Text style={styles.receiptValue}>{transactionDetails.abonne || 'N/A'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>🔑 Référence</Text>
                    <Text style={styles.receiptValue}>{transactionDetails.refNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>💰 Montant payé</Text>
                    <Text style={[styles.receiptValue, styles.receiptValueHighlight]}>{transactionDetails.amount || '0 FCFA'}</Text>
                  </View>
                </View>

                <View style={styles.receiptCodeCard}>
                  <Text style={styles.receiptCodeLabel}>🔑 Réf. transaction</Text>
                  <Text style={styles.receiptCode}>{transactionDetails.reference || 'N/A'}</Text>
                </View>

                <Text style={styles.receiptDate}>📅 {transactionDetails.date || new Date().toLocaleString('fr-FR')}</Text>
              </>
            ) : (
              <View style={styles.receiptCard}><Text style={[styles.receiptValue, { textAlign: 'center' }]}>Chargement...</Text></View>
            )}

            <View style={styles.receiptButtons}>
              <TouchableOpacity
                style={[styles.receiptButton, styles.receiptCopyButton]}
                onPress={() => handleCopyReceipt(transactionDetails)}
                disabled={isExporting}
              >
                <IconCopy />
                <Text style={styles.receiptButtonText}>Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.receiptButton, styles.receiptShareButton]}
                onPress={() => handleExportPDF(transactionDetails)}
                disabled={isExporting}
              >
                <IconPDF />
                <Text style={[styles.receiptButtonText, isExporting && { opacity: 0.5 }]}>
                  {isExporting ? '⏳ ...' : 'Partager'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.receiptButton, styles.receiptDoneButton]}
                onPress={finishPayment}
              >
                <Text style={[styles.receiptButtonText, styles.receiptDoneButtonText]}>✓ Terminé</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  illustrationContainer: { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  illustrationText: { fontSize: 14, color: '#666', marginTop: 8 },
  balanceCard: {
    backgroundColor: '#008933',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  balanceLimit: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start', marginTop: 8 },
  balanceLimitText: { color: '#FFFFFF', fontSize: 11 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  categoriesScroll: { paddingLeft: 20 },
  categoryCard: {
    width: 110,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  categoryCardSelected: { borderWidth: 2, borderColor: '#008933', backgroundColor: '#F0FFF4' },
  categoryIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryName: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  categoryDesc: { fontSize: 9, color: '#888', textAlign: 'center', marginTop: 2 },
  categoryCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#008933', alignItems: 'center', justifyContent: 'center' },
  categoryCheckText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  servicesScroll: { paddingLeft: 20 },
  serviceCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  serviceIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0FFF4', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  serviceIconText: { fontSize: 24 },
  serviceName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  serviceDesc: { fontSize: 10, color: '#888', textAlign: 'center', marginBottom: 8 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: '#008933', marginBottom: 8 },
  serviceButton: { backgroundColor: '#008933', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  serviceButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#EEEEEE' },
  referenceWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  referenceInput: { flex: 1 },
  checkRefButton: { backgroundColor: '#008933', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  checkRefButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  abonneContainer: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#00893330' },
  abonneLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  abonneName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  amountFoundContainer: { backgroundColor: '#F0FFF4', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#00893330' },
  amountFoundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  amountFoundLabel: { fontSize: 13, color: '#666' },
  amountFoundBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  amountFoundBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  amountFoundValue: { fontSize: 24, fontWeight: '800', color: '#008933' },
  amountFoundRef: { fontSize: 12, color: '#888', marginTop: 4 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#008933', paddingBottom: 8, marginBottom: 16, marginTop: 8 },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: '#008933', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: '#1A1A1A', padding: 0 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  suggestionChip: { backgroundColor: '#F0FFF4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#008933' },
  suggestionText: { color: '#008933', fontSize: 14, fontWeight: '500' },
  feesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  feesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  feesLabel: { fontSize: 14, color: '#666' },
  feesValue: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#008933' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  accountInfo: { fontSize: 13, color: '#888' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#008933',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payButtonDisabled: { backgroundColor: '#CCC', shadowOpacity: 0 },
  payButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  payIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  payIcon: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },
  infoCard: { backgroundColor: '#F0FFF4', marginHorizontal: 20, marginTop: 20, marginBottom: 30, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#00893330' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#008933', marginBottom: 10 },
  infoText: { fontSize: 12, color: '#555', marginBottom: 6, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalIcon: { marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  modalSubtitle: { fontSize: 18, fontWeight: '600', color: '#008933', marginBottom: 4 },
  modalPrice: { fontSize: 16, color: '#FF6600', fontWeight: '700', marginBottom: 4 },
  modalRef: { fontSize: 14, color: '#666', marginBottom: 4 },
  modalAbonne: { fontSize: 14, color: '#008933', marginBottom: 20, fontWeight: '500' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  pinContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16, position: 'relative' },
  pinInput: { width: 120, fontSize: 32, fontWeight: '700', letterSpacing: 8, color: '#1A1A1A', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#008933', paddingVertical: 8 },
  pinEye: { position: 'absolute', right: 0, padding: 8 },
  biometricButton: { backgroundColor: 'transparent', padding: 0, alignItems: 'center', justifyContent: 'center', width: 50, height: 50, alignSelf: 'center' },
  biometricIcon: { width: 40, height: 40, resizeMode: 'contain', tintColor: '#008933' },
  switchMethodButton: { marginVertical: 8, paddingVertical: 6 },
  switchMethodText: { color: '#008933', fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  receiptModalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  receiptHeader: { alignItems: 'center', marginBottom: 16 },
  receiptIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  receiptIconText: { fontSize: 28 },
  receiptTitle: { fontSize: 20, fontWeight: '700', color: '#008933' },
  receiptCard: { backgroundColor: '#F8F9FC', borderRadius: 16, padding: 16, marginBottom: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  receiptDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 6 },
  receiptLabel: { fontSize: 13, color: '#666', flexShrink: 0 },
  receiptValue: { fontSize: 13, fontWeight: '500', color: '#1A1A1A', textAlign: 'right', flex: 1, marginLeft: 10 },
  receiptValueHighlight: { color: '#008933', fontWeight: '700', fontSize: 15 },
  receiptCodeCard: { backgroundColor: '#FFF3E0', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center' },
  receiptCodeLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  receiptCode: { fontSize: 18, fontWeight: '800', color: '#FF6600', letterSpacing: 2, fontFamily: 'monospace' },
  receiptDate: { textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 16 },
  receiptButtons: { flexDirection: 'row', gap: 12 },
  receiptButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  receiptCopyButton: { backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#008933' },
  receiptShareButton: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FF6600' },
  receiptDoneButton: { backgroundColor: '#008933' },
  receiptButtonText: { fontSize: 15, fontWeight: '600', color: '#008933' },
  receiptDoneButtonText: { color: '#FFFFFF' },
});