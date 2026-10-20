// screens/PaymentScreen.js - Version multilingue
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
  Switch,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';

// ✅ IMPORT DE L'API ET DU CONTEXTE
import { API } from '../services/api';
import { useTransactions } from '../context/TransactionContext';
import { useTranslation } from '../context/LanguageContext';

// ===== ICÔNES SVG (inchangées) =====
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPayment = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="25" y="35" width="50" height="35" rx="4" fill="#008933" />
    <Path d="M35 55 L45 65 L65 40" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="75" cy="40" r="5" fill="#FFD700" />
  </Svg>
);

const IconElectricite = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v3M18 6l-3 3M6 6l3 3M3 12h3M18 12h3M12 18v3M6 18l3-3M18 18l-3-3" stroke="#008933" strokeWidth="1.5" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="3" fill="#008933" />
  </Svg>
);

const IconEau = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2c-2 4-5 7-5 10a5 5 0 0010 0c0-3-3-6-5-10z" stroke="#3B82F6" strokeWidth="1.5" />
    <Path d="M12 15a2 2 0 100-4 2 2 0 000 4z" fill="#3B82F6" />
  </Svg>
);

const IconTV = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="13" rx="2" stroke="#F59E0B" strokeWidth="1.5" />
    <Path d="M8 22l4-4 4 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const IconEcole = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3L3 9l9 6 9-6-9-6z" stroke="#8B5CF6" strokeWidth="1.5" />
    <Path d="M3 9v7l9 5 9-5V9" stroke="#8B5CF6" strokeWidth="1.5" />
  </Svg>
);

const IconAssurance = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z" stroke="#06B6D4" strokeWidth="1.5" />
    <Path d="M8.5 12.5l2.5 2.5 4-4" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronDown = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ===== MAPPING DES ICÔNES =====
const iconMap = {
  IconElectricite: IconElectricite,
  IconEau: IconEau,
  IconTV: IconTV,
  IconEcole: IconEcole,
  IconAssurance: IconAssurance,
};

export default function PaymentScreen({ navigation }) {
  const { t } = useTranslation();
  const { width = 400, height = 800 } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [favoritePayments, setFavoritePayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [amountFound, setAmountFound] = useState(false);
  const [abonneName, setAbonneName] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(false);

  // États spécifiques pour Nigelec
  const [nigelecType, setNigelecType] = useState('prepaid');

  // États spécifiques pour la scolarité
  const [selectedEcole, setSelectedEcole] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [showEcolePicker, setShowEcolePicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  // États pour les données chargées depuis l'API
  const [categories, setCategories] = useState([]);
  const [ecolesList, setEcolesList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // ✅ États pour la biométrie
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  // ✅ Récupération du solde et de la fonction addTransaction
  const { addTransaction, balance } = useTransactions();

  // ✅ Chargement des données initiales depuis l'API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, ecoles, classes, payments] = await Promise.all([
          API.getPaymentCategories(),
          API.getEcoles(),
          API.getClasses(),
          API.getRecentPayments(),
        ]);
        setCategories(cats);
        setEcolesList(ecoles);
        setClassesList(classes);
        setRecentPayments(payments);
      } catch (error) {
        console.error('Erreur chargement données paiement:', error);
        Alert.alert(t('common.error'), t('payment.loadError') || 'Impossible de charger les données');
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, []);

  // ✅ Vérifier la disponibilité de la biométrie
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

  // ✅ Génération d'une référence unique
  const generateReference = () => {
    const prefix = 'PAY';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  // ✅ Authentification biométrique
  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('payment.biometricPrompt') || 'Confirmez le paiement avec votre empreinte',
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        executePayment();
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert(t('common.error'), t('common.authFailed') || 'L\'authentification a échoué. Veuillez réessayer ou utiliser votre PIN.');
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      Alert.alert(t('common.error'), t('common.authProblem') || 'Un problème est survenu avec l\'authentification.');
    }
  };

  // ✅ Confirmation par PIN
  const confirmWithPin = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert(t('common.error'), t('common.pin4Digits'));
      return;
    }

    if (pin === '0000') {
      executePayment();
    } else {
      Alert.alert(t('common.error'), t('common.incorrectPin'));
      setPin('');
    }
  };

  // ✅ Exécution du paiement
  const executePayment = () => {
    const transactionAmount = -parseInt(amount);
    const transactionRef = generateReference();
    let description = `${t('payment.paymentOf') || 'Paiement'} ${selectedCategory?.name}`;
    let details = {
      category: selectedCategory?.name,
      reference: reference,
      amount: parseInt(amount),
      customer: customerName || abonneName || 'N/A',
      type: selectedCategory?.id === 'electricite' ? nigelecType : undefined,
    };
    if (selectedCategory?.id === 'ecole') {
      description = `${t('payment.schoolPaymentOf') || 'Paiement scolarité'} ${selectedEcole}`;
      details = {
        ...details,
        ecole: selectedEcole,
        student: studentName,
        class: studentClass,
      };
    }
    if (selectedCategory?.id === 'electricite') {
      details.abonne = abonneName;
    }
    if (selectedCategory?.id === 'eau') {
      details.abonne = abonneName;
    }

    const newTransaction = {
      id: Date.now().toString(),
      type: 'payment',
      amount: transactionAmount,
      date: new Date().toISOString(),
      description: description,
      reference: transactionRef,
      details: details,
      deletable: false,
    };
    addTransaction(newTransaction);

    Alert.alert(t('common.success'), t('payment.paymentSuccess') || 'Paiement effectué avec succès !');
    if (saveAsFavorite) {
      setFavoritePayments([...favoritePayments, {
        id: Date.now(),
        category: selectedCategory,
        reference: selectedCategory.id === 'ecole' ? studentName : reference,
        amount,
        customerName,
        type: selectedCategory.id === 'electricite' ? nigelecType : undefined,
        abonne: (selectedCategory.id === 'electricite' || selectedCategory.id === 'eau') ? abonneName : undefined,
      }]);
    }
    setModalVisible(false);
    setPin('');
    setSelectedEcole('');
    setStudentName('');
    setStudentClass('');
    setReference('');
    setAmount('');
    setAmountFound(false);
    setCustomerName('');
    setSelectedCategory(null);
    setNigelecType('prepaid');
    setAbonneName('');
    navigation.goBack();
  };

  // ===== VÉRIFICATIONS API =====

  const handleCheckNigelec = async () => {
    if (!reference || reference.trim().length < 4) {
      Alert.alert(t('common.error'), t('payment.invalidMeter') || 'Veuillez entrer un numéro de compteur valide');
      return;
    }

    setIsLoading(true);
    setAbonneName('');

    try {
      const result = await API.searchNigelecAbonne(reference);
      if (result) {
        setAbonneName(result.nom);
        if (nigelecType === 'prepaid') {
          setAmountFound(true);
          setAmount('');
          Alert.alert(
            t('payment.subscriberFound') || 'Abonné trouvé',
            `${t('payment.meter') || 'Compteur'}: ${reference}\n${t('payment.subscriber')}: ${result.nom}\n\n${t('payment.enterRechargeAmount') || 'Veuillez saisir le montant que vous souhaitez recharger.'}`
          );
        } else {
          const montant = result.facture?.montant || Math.floor(Math.random() * (80000 - 5000 + 1)) + 5000;
          setAmount(montant.toString());
          setAmountFound(true);
          Alert.alert(
            t('payment.billFound') || 'Facture trouvée',
            `${t('payment.meter') || 'Compteur'}: ${reference}\n${t('payment.subscriber')}: ${result.nom}\n${t('common.amount')}: ${montant.toLocaleString()} FCFA`
          );
        }
      } else {
        Alert.alert(t('payment.meterNotFound') || 'Compteur non trouvé', t('payment.checkMeter') || 'Veuillez vérifier le numéro de compteur et réessayer.');
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('payment.checkMeterError') || 'Impossible de vérifier le compteur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckNDE = async () => {
    if (!reference || reference.trim().length < 4) {
      Alert.alert(t('common.error'), t('payment.invalidMeter') || 'Veuillez entrer un numéro de compteur valide');
      return;
    }

    setIsLoading(true);
    setAbonneName('');

    try {
      const result = await API.searchNDEAbonne(reference);
      if (result) {
        setAbonneName(result.nom);
        setAmount(result.montant.toString());
        setAmountFound(true);
        Alert.alert(
          t('payment.billFound') || 'Facture trouvée',
          `${t('payment.meter') || 'Compteur'}: ${reference}\n${t('payment.subscriber')}: ${result.nom}\n${t('common.amount')}: ${result.montant.toLocaleString()} FCFA`
        );
      } else {
        Alert.alert(t('payment.meterNotFound') || 'Compteur non trouvé', t('payment.checkMeter') || 'Veuillez vérifier le numéro de compteur et réessayer.');
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('payment.checkMeterError') || 'Impossible de vérifier le compteur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckReference = async () => {
    if (!selectedCategory) {
      Alert.alert(t('common.error'), t('payment.selectCategory') || 'Veuillez sélectionner une catégorie');
      return;
    }

    if (selectedCategory.id === 'ecole') {
      if (!reference || reference.trim().length < 3) {
        Alert.alert(t('common.error'), t('payment.invalidStudentId') || 'Veuillez entrer un matricule élève valide');
        return;
      }
      if (!selectedEcole) {
        Alert.alert(t('common.error'), t('payment.selectSchool') || 'Veuillez sélectionner une école');
        return;
      }
      if (!studentName || studentName.trim().length < 2) {
        Alert.alert(t('common.error'), t('payment.enterStudentName') || 'Veuillez entrer le nom et prénom de l\'élève');
        return;
      }
      if (!studentClass) {
        Alert.alert(t('common.error'), t('payment.selectClass') || 'Veuillez sélectionner la classe');
        return;
      }

      setIsLoading(true);
      try {
        const result = await API.searchFacture(reference, selectedCategory.id);
        setAmount(result.montant.toString());
        setAmountFound(true);
        Alert.alert(
          t('payment.billFound') || 'Facture trouvée',
          `${t('payment.amountToPayFor') || 'Le montant à payer pour'} ${studentName} (${selectedEcole}) ${t('payment.is') || 'est de'} ${result.montant.toLocaleString()} FCFA`
        );
      } catch (error) {
        Alert.alert(t('common.error'), t('payment.checkRefError') || 'Impossible de vérifier la référence');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!reference || reference.trim().length < 3) {
      Alert.alert(t('common.error'), `${t('payment.enterValid') || 'Veuillez entrer un'} ${selectedCategory.refLabel || t('payment.refNumber') || 'numéro de référence'} ${t('payment.valid') || 'valide'}`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await API.searchFacture(reference, selectedCategory.id);
      setAmount(result.montant.toString());
      setAmountFound(true);
      Alert.alert(
        t('payment.billFound') || 'Facture trouvée',
        `${t('payment.amountToPayForRef') || 'Le montant à payer pour la référence'} ${reference} ${t('payment.is') || 'est de'} ${result.montant.toLocaleString()} FCFA`
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('payment.checkRefError') || 'Impossible de vérifier la référence');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = () => {
    if (!selectedCategory) {
      Alert.alert(t('common.error'), t('payment.selectCategory') || 'Veuillez sélectionner une catégorie');
      return;
    }

    if (selectedCategory.id === 'electricite' || selectedCategory.id === 'eau') {
      if (!reference || reference.length < 4) {
        Alert.alert(t('common.error'), t('payment.invalidMeter') || 'Veuillez entrer un numéro de compteur valide');
        return;
      }
      if (!abonneName) {
        Alert.alert(t('common.error'), t('payment.verifyMeterFirst') || 'Veuillez d\'abord vérifier le compteur');
        return;
      }
      if (!amount || parseInt(amount) <= 0) {
        Alert.alert(t('common.error'), t('payment.noBillAmount') || 'Aucun montant de facture trouvé');
        return;
      }
    }

    if (selectedCategory.id === 'ecole') {
      if (!selectedEcole) {
        Alert.alert(t('common.error'), t('payment.selectSchool') || 'Veuillez sélectionner une école');
        return;
      }
      if (!studentName || studentName.trim().length < 2) {
        Alert.alert(t('common.error'), t('payment.enterStudentName') || 'Veuillez entrer le nom et prénom de l\'élève');
        return;
      }
      if (!studentClass) {
        Alert.alert(t('common.error'), t('payment.selectClass') || 'Veuillez sélectionner la classe');
        return;
      }
    } else if (selectedCategory.id !== 'electricite' && selectedCategory.id !== 'eau') {
      if (!reference || reference.length < 3) {
        Alert.alert(t('common.error'), `${t('payment.enterValid') || 'Veuillez entrer un'} ${selectedCategory.refLabel || t('payment.refNumber') || 'numéro de référence'} ${t('payment.valid') || 'valide'}`);
        return;
      }
    }

    if (!amount || parseInt(amount) <= 0) {
      Alert.alert(t('common.error'), t('payment.invalidAmount') || 'Montant invalide');
      return;
    }

    if (parseInt(amount) > balance) {
      Alert.alert(t('common.error'), `${t('common.insufficientBalance')}. ${t('common.yourBalanceIs') || 'Votre solde est de'} ${balance.toLocaleString()} FCFA`);
      return;
    }

    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const modalWidth = width ? width - 40 : 320;
  const pickerModalMaxHeight = height ? height * 0.7 : 550;

  // Rendu des champs spécifiques selon la catégorie
  const renderSpecificFields = () => {
    if (!selectedCategory) return null;

    // Pour Nigelec (Électricité)
    if (selectedCategory.id === 'electricite') {
      return (
        <>
          <Text style={styles.inputLabel}>{t('payment.nigelecType')}</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeChip, nigelecType === 'prepaid' && styles.typeChipActive]}
              onPress={() => {
                setNigelecType('prepaid');
                setAmount('');
                setAmountFound(false);
                setAbonneName('');
                setReference('');
              }}
            >
              <Text style={[styles.typeChipText, nigelecType === 'prepaid' && styles.typeChipTextActive]}>
                ⚡ {t('payment.prepaid')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, nigelecType === 'postpaid' && styles.typeChipActive]}
              onPress={() => {
                setNigelecType('postpaid');
                setAmount('');
                setAmountFound(false);
                setAbonneName('');
                setReference('');
              }}
            >
              <Text style={[styles.typeChipText, nigelecType === 'postpaid' && styles.typeChipTextActive]}>
                📄 {t('payment.postpaid')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>{t('payment.meterNumber')}</Text>
          <View style={styles.referenceWrapper}>
            <TextInput
              style={[styles.input, styles.referenceInput]}
              placeholder="Ex: 12345678"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={reference}
              onChangeText={(text) => {
                setReference(text);
                setAmountFound(false);
                setAmount('');
                setAbonneName('');
              }}
            />
            <TouchableOpacity
              style={styles.checkRefButton}
              onPress={handleCheckNigelec}
              disabled={isLoading}
            >
              <Text style={styles.checkRefButtonText}>
                {isLoading ? '...' : t('payment.verifyReference')}
              </Text>
            </TouchableOpacity>
          </View>

          {abonneName !== '' && (
            <View style={styles.abonneContainer}>
              <Text style={styles.abonneLabel}>👤 {t('payment.subscriber')}</Text>
              <Text style={styles.abonneName}>{abonneName}</Text>
            </View>
          )}

          {nigelecType === 'prepaid' && amountFound && (
            <>
              <Text style={styles.inputLabel}>{t('payment.amountToRecharge')}</Text>
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
                {['1000', '2000', '5000', '10000', '25000', '50000'].map(sug => (
                  <TouchableOpacity
                    key={sug}
                    style={styles.suggestionChip}
                    onPress={() => setAmount(sug)}
                  >
                    <Text style={styles.suggestionText}>{sug} FCFA</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {nigelecType === 'postpaid' && amountFound && (
            <View style={styles.amountFoundContainer}>
              <View style={styles.amountFoundHeader}>
                <Text style={styles.amountFoundLabel}>💰 {t('payment.billAmount') || 'Montant de la facture'}</Text>
                <View style={styles.amountFoundBadge}>
                  <Text style={styles.amountFoundBadgeText}>✓ {t('payment.found') || 'Trouvé'}</Text>
                </View>
              </View>
              <Text style={styles.amountFoundValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
              <Text style={styles.amountFoundRef}>{t('payment.meter') || 'Compteur'}: {reference}</Text>
            </View>
          )}
        </>
      );
    }

    // Pour NDE (Eau)
    if (selectedCategory.id === 'eau') {
      return (
        <>
          <Text style={styles.inputLabel}>{t('payment.meterNumber')}</Text>
          <View style={styles.referenceWrapper}>
            <TextInput
              style={[styles.input, styles.referenceInput]}
              placeholder="Ex: 11111111"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={reference}
              onChangeText={(text) => {
                setReference(text);
                setAmountFound(false);
                setAmount('');
                setAbonneName('');
              }}
            />
            <TouchableOpacity
              style={styles.checkRefButton}
              onPress={handleCheckNDE}
              disabled={isLoading}
            >
              <Text style={styles.checkRefButtonText}>
                {isLoading ? '...' : t('payment.verifyReference')}
              </Text>
            </TouchableOpacity>
          </View>

          {abonneName !== '' && (
            <View style={styles.abonneContainer}>
              <Text style={styles.abonneLabel}>👤 {t('payment.subscriber')}</Text>
              <Text style={styles.abonneName}>{abonneName}</Text>
            </View>
          )}

          {amountFound && (
            <View style={styles.amountFoundContainer}>
              <View style={styles.amountFoundHeader}>
                <Text style={styles.amountFoundLabel}>💰 {t('payment.billAmount') || 'Montant de la facture'}</Text>
                <View style={styles.amountFoundBadge}>
                  <Text style={styles.amountFoundBadgeText}>✓ {t('payment.found') || 'Trouvé'}</Text>
                </View>
              </View>
              <Text style={styles.amountFoundValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
              <Text style={styles.amountFoundRef}>{t('payment.meter') || 'Compteur'}: {reference}</Text>
            </View>
          )}
        </>
      );
    }

    // Pour la scolarité
    if (selectedCategory.id === 'ecole') {
      return (
        <>
          <Text style={styles.inputLabel}>{t('payment.schoolName')}</Text>
          <TouchableOpacity
            style={styles.pickerInput}
            onPress={() => setShowEcolePicker(true)}
          >
            <Text style={selectedEcole ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedEcole || t('payment.selectSchool')}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>{t('payment.studentName')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ibrahim Moussa"
            placeholderTextColor="#AAA"
            value={studentName}
            onChangeText={setStudentName}
          />

          <Text style={styles.inputLabel}>{t('payment.classLabel')}</Text>
          <TouchableOpacity
            style={styles.pickerInput}
            onPress={() => setShowClassPicker(true)}
          >
            <Text style={studentClass ? styles.pickerText : styles.pickerPlaceholder}>
              {studentClass || t('payment.selectClass')}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>{t('payment.studentId')}</Text>
          <View style={styles.referenceWrapper}>
            <TextInput
              style={[styles.input, styles.referenceInput]}
              placeholder="Ex: MAT-2026-001"
              placeholderTextColor="#AAA"
              value={reference}
              onChangeText={(text) => {
                setReference(text);
                setAmountFound(false);
                setAmount('');
              }}
            />
            <TouchableOpacity
              style={styles.checkRefButton}
              onPress={handleCheckReference}
              disabled={isLoading}
            >
              <Text style={styles.checkRefButtonText}>
                {isLoading ? '...' : t('payment.verifyReference')}
              </Text>
            </TouchableOpacity>
          </View>

          {amountFound && (
            <View style={styles.amountFoundContainer}>
              <View style={styles.amountFoundHeader}>
                <Text style={styles.amountFoundLabel}>💰 {t('payment.schoolFees')}</Text>
                <View style={styles.amountFoundBadge}>
                  <Text style={styles.amountFoundBadgeText}>✓ {t('payment.found') || 'Trouvé'}</Text>
                </View>
              </View>
              <Text style={styles.amountFoundValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
              <Text style={styles.amountFoundRef}>{t('payment.studentId')}: {reference}</Text>
            </View>
          )}
        </>
      );
    }

    // Pour les autres catégories (TV, Assurance)
    return (
      <>
        <Text style={styles.inputLabel}>{t('payment.providerType') || 'Fournisseur / Type'}</Text>
        <View style={styles.providerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCategory.providers.map(provider => (
              <TouchableOpacity
                key={provider}
                style={[styles.providerChip, customerName === provider && styles.providerChipActive]}
                onPress={() => setCustomerName(provider)}
              >
                <Text style={[styles.providerChipText, customerName === provider && styles.providerChipTextActive]}>
                  {provider}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.inputLabel}>{selectedCategory.refLabel || t('payment.reference')}</Text>
        <View style={styles.referenceWrapper}>
          <TextInput
            style={[styles.input, styles.referenceInput]}
            placeholder={`Ex: ${selectedCategory.id === 'eau' ? '11111111' : 'REF123456'}`}
            placeholderTextColor="#AAA"
            keyboardType={selectedCategory.id === 'eau' ? 'numeric' : 'default'}
            value={reference}
            onChangeText={(text) => {
              setReference(text);
              setAmountFound(false);
              setAmount('');
            }}
          />
          <TouchableOpacity
            style={styles.checkRefButton}
            onPress={handleCheckReference}
            disabled={isLoading}
          >
            <Text style={styles.checkRefButtonText}>
              {isLoading ? '...' : t('payment.verifyReference')}
            </Text>
          </TouchableOpacity>
        </View>

        {amountFound && (
          <View style={styles.amountFoundContainer}>
            <View style={styles.amountFoundHeader}>
              <Text style={styles.amountFoundLabel}>💰 {t('payment.amountToPay')}</Text>
              <View style={styles.amountFoundBadge}>
                <Text style={styles.amountFoundBadgeText}>✓ {t('payment.billFoundShort') || 'Facture trouvée'}</Text>
              </View>
            </View>
            <Text style={styles.amountFoundValue}>{parseInt(amount).toLocaleString()} FCFA</Text>
            <Text style={styles.amountFoundRef}>{t('common.reference')}: {reference}</Text>
          </View>
        )}
      </>
    );
  };

  // Affichage du chargement initial
  if (isDataLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('payment.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#008933" />
          <Text style={{ marginTop: 16, color: '#666' }}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconPayment />
          <Text style={styles.illustrationText}>{t('payment.illustration')}</Text>
        </View>

        {/* SOLDE DISPONIBLE */}
        <TouchableOpacity
          style={styles.balanceCard}
          activeOpacity={0.8}
          onPress={() => setBalanceVisible(!balanceVisible)}
        >
          <Text style={styles.balanceLabel}>{t('home.balanceAvailable')}</Text>
          <Text style={styles.balanceAmount}>
            {balanceVisible ? `${balance.toLocaleString()} FCFA` : '••••••••'}
          </Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>
              {balanceVisible ? (t('common.securePayment') || 'Paiement sécurisé') : `👆 ${t('common.tapToShow') || 'Appuyez pour afficher'}`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* SECTION CATÉGORIES */}
        <Text style={styles.sectionLabel}>{t('payment.categories')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(category => {
            const IconComponent = iconMap[category.icon];
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory?.id === category.id && styles.categoryCardSelected
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setReference('');
                  setAmount('');
                  setAmountFound(false);
                  setCustomerName('');
                  setSelectedEcole('');
                  setStudentName('');
                  setStudentClass('');
                  setNigelecType('prepaid');
                  setAbonneName('');
                }}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                  <IconComponent />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                {selectedCategory?.id === category.id && (
                  <View style={styles.categoryCheck}>
                    <Text style={styles.categoryCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SECTION FORMULAIRE */}
        {selectedCategory && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('payment.paymentOf') || 'Paiement'} {selectedCategory.name}</Text>

            {renderSpecificFields()}

            {selectedCategory.id !== 'ecole' && selectedCategory.id !== 'electricite' && selectedCategory.id !== 'eau' && (
              <>
                <Text style={styles.inputLabel}>{t('payment.clientNameOptional') || 'Nom du client (optionnel)'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jean Dupont"
                  placeholderTextColor="#AAA"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </>
            )}

            <View style={styles.saveRow}>
              <Text style={styles.saveLabel}>{t('payment.savePayment')}</Text>
              <Switch
                value={saveAsFavorite}
                onValueChange={setSaveAsFavorite}
                trackColor={{ false: '#D1D5DB', true: '#008933' }}
                thumbColor={saveAsFavorite ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </View>
        )}

        {/* SECTION PAIEMENTS RÉCENTS */}
        {recentPayments.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('payment.recentPayments')}</Text>
            <View style={styles.recentContainer}>
              {recentPayments.map(payment => (
                <TouchableOpacity
                  key={payment.id}
                  style={styles.recentCard}
                  onPress={() => {
                    setReference(payment.reference);
                    setAmount(payment.amount);
                    setAmountFound(true);
                    const category = categories.find(c =>
                      c.providers.some(p => p === payment.provider)
                    );
                    if (category) {
                      setSelectedCategory(category);
                      if (payment.provider === 'Nigelec' && payment.type) {
                        setNigelecType(payment.type);
                        setAbonneName(payment.abonne || '');
                      }
                      if (payment.provider === 'NDE') {
                        setAbonneName(payment.abonne || '');
                      }
                    }
                  }}
                >
                  <View style={styles.recentIcon}>
                    <Text style={styles.recentIconText}>
                      {payment.provider === 'Nigelec' && payment.type === 'prepaid' ? '⚡' :
                        payment.provider === 'NDE' ? '💧' : '📄'}
                    </Text>
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentProvider}>{payment.provider}</Text>
                    <Text style={styles.recentRef}>
                      {payment.type === 'prepaid' ? (t('payment.recharge') || 'Recharge') : (t('payment.bill') || 'Facture')} • {t('common.reference')}: {payment.reference}
                    </Text>
                    <Text style={styles.recentDate}>{payment.date}</Text>
                  </View>
                  <View style={styles.recentAmount}>
                    <Text style={styles.recentAmountValue}>{payment.amount} FCFA</Text>
                    <Text style={styles.recentStatus}>{payment.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* SECTION FRAIS */}
        <View style={styles.feesCard}>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>{t('common.fees')}</Text>
            <Text style={styles.feesValue}>
              {amount ? `${Math.floor(parseInt(amount) * 0.001)} FCFA` : '0 FCFA'}
            </Text>
          </View>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>{t('sendMoney.totalDebited')}</Text>
            <Text style={styles.totalValue}>
              {amount ? `${parseInt(amount) + Math.floor(parseInt(amount) * 0.001)} FCFA` : '0 FCFA'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>{t('history.accountDebited')}</Text>
            <Text style={styles.accountInfo}>Wallet principal •••• 4587</Text>
          </View>
        </View>

        {/* BOUTON PAYER */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedCategory || !amountFound || !amount) && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={!selectedCategory || !amountFound || !amount}
        >
          <Text style={styles.payButtonText}>
            {amountFound && amount ? `${t('common.pay')} ${parseInt(amount).toLocaleString()} FCFA` : (t('payment.verifyFirstBtn') || 'Vérifiez d\'abord la référence')}
          </Text>
          <View style={styles.payIconCircle}>
            <Text style={styles.payIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('payment.infoTitle') || 'ℹ️ Informations importantes'}</Text>
          <Text style={styles.infoText}>• {t('payment.info1') || 'Entrez votre référence pour voir le montant à payer'}</Text>
          <Text style={styles.infoText}>• {t('payment.info2') || 'Pour Nigelec : sélectionnez Prepaid ou Postpaid'}</Text>
          <Text style={styles.infoText}>• {t('payment.info3') || 'Pour NDE : entrez votre numéro de compteur'}</Text>
          <Text style={styles.infoText}>• {t('payment.info4') || 'Les frais de transaction sont de 0.1% du montant'}</Text>
          <Text style={styles.infoText}>• {t('payment.info5') || 'Paiement sécurisé avec confirmation par PIN'}</Text>
        </View>

      </ScrollView>

      {/* MODAL SÉLECTION ÉCOLE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEcolePicker}
        onRequestClose={() => setShowEcolePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModalContent, {
            width: modalWidth,
            maxHeight: pickerModalMaxHeight
          }]}>
            <Text style={styles.pickerModalTitle}>{t('payment.selectSchool')}</Text>
            <ScrollView style={styles.pickerList}>
              {ecolesList.map((ecole, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedEcole(ecole);
                    setShowEcolePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{ecole}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setShowEcolePicker(false)}
            >
              <Text style={styles.pickerCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SÉLECTION CLASSE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showClassPicker}
        onRequestClose={() => setShowClassPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerModalContent, {
            width: modalWidth,
            maxHeight: pickerModalMaxHeight
          }]}>
            <Text style={styles.pickerModalTitle}>{t('payment.selectClass')}</Text>
            <ScrollView style={styles.pickerList}>
              {classesList.map((classe, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setStudentClass(classe);
                    setShowClassPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{classe}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setShowClassPicker(false)}
            >
              <Text style={styles.pickerCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMATION - EMPREINTE OU PIN */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setPin('');
          setUseBiometric(isBiometricAvailable);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalIcon}>
              <IconPayment />
            </View>
            <Text style={styles.modalTitle}>{t('common.confirm')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('payment.paymentOf') || 'Paiement de'} {parseInt(amount).toLocaleString()} FCFA
            </Text>
            <Text style={styles.modalSubtitle2}>
              {selectedCategory?.id === 'ecole' ? selectedEcole : selectedCategory?.name}
            </Text>
            {selectedCategory?.id === 'ecole' && (
              <Text style={styles.modalRef}>
                {t('payment.student') || 'Élève'}: {studentName} - {studentClass}
              </Text>
            )}
            {selectedCategory?.id === 'electricite' && (
              <Text style={styles.modalRef}>
                {nigelecType === 'prepaid' ? (t('payment.rechargePrepaid') || 'Recharge Prepaid') : (t('payment.billPostpaid') || 'Facture Postpaid')}{'\n'}
                {t('payment.meter') || 'Compteur'}: {reference}{'\n'}
                {t('payment.subscriber')}: {abonneName}
              </Text>
            )}
            {selectedCategory?.id === 'eau' && (
              <Text style={styles.modalRef}>
                {t('payment.waterBillNDE') || 'Facture Eau (NDE)'}{'\n'}
                {t('payment.meter') || 'Compteur'}: {reference}{'\n'}
                {t('payment.subscriber')}: {abonneName}
              </Text>
            )}
            {selectedCategory?.id !== 'ecole' && selectedCategory?.id !== 'electricite' && selectedCategory?.id !== 'eau' && (
              <Text style={styles.modalRef}>
                {t('common.reference')}: {reference}
              </Text>
            )}

            {isBiometricAvailable && useBiometric ? (
              <>
                <Text style={styles.modalLabel}>{t('common.confirmWithBiometric')}</Text>
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={authenticateWithBiometrics}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('../assets/images/print.png')}
                    style={styles.biometricIcon}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchMethodButton}
                  onPress={() => setUseBiometric(false)}
                >
                  <Text style={styles.switchMethodText}>🔑 {t('common.usePin')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>
                  {isBiometricAvailable ? t('common.enterPin') : t('common.enterPin')}
                </Text>
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
                  <TouchableOpacity
                    style={styles.pinEye}
                    onPress={() => setPinVisible(!pinVisible)}
                  >
                    <Text>{pinVisible ? '👁️' : '🔒'}</Text>
                  </TouchableOpacity>
                </View>
                {isBiometricAvailable && (
                  <TouchableOpacity
                    style={styles.switchMethodButton}
                    onPress={() => setUseBiometric(true)}
                  >
                    <Text style={styles.switchMethodText}>👆 {t('common.useBiometric')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmWithPin}
                >
                  <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setPin('');
                  setUseBiometric(isBiometricAvailable);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  illustrationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
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
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  balanceLimit: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  balanceLimitText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingLeft: 20,
  },
  categoryCard: {
    width: 90,
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
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: '#008933',
    backgroundColor: '#F0FFF4',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  categoryCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCheckText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
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
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  referenceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  referenceInput: {
    flex: 1,
  },
  checkRefButton: {
    backgroundColor: '#008933',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  checkRefButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  abonneContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#00893330',
  },
  abonneLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  abonneName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  amountFoundContainer: {
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#00893330',
  },
  amountFoundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountFoundLabel: {
    fontSize: 13,
    color: '#666',
  },
  amountFoundBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  amountFoundBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  amountFoundValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#008933',
  },
  amountFoundRef: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingBottom: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#008933',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    padding: 0,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  suggestionChip: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#008933',
  },
  suggestionText: {
    color: '#008933',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  pickerText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: '#AAA',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: '#008933',
    borderColor: '#008933',
  },
  typeChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  providerContainer: {
    marginBottom: 4,
  },
  providerChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  providerChipActive: {
    backgroundColor: '#008933',
    borderColor: '#008933',
  },
  providerChipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  providerChipTextActive: {
    color: '#FFFFFF',
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  saveLabel: {
    fontSize: 14,
    color: '#666',
  },
  recentContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  recentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentIconText: {
    fontSize: 20,
  },
  recentInfo: {
    flex: 1,
  },
  recentProvider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  recentRef: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  recentDate: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 2,
  },
  recentAmount: {
    alignItems: 'flex-end',
  },
  recentAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008933',
  },
  recentStatus: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },
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
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feesLabel: {
    fontSize: 14,
    color: '#666',
  },
  feesValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#008933',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  accountInfo: {
    fontSize: 13,
    color: '#888',
  },
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
  payButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  payIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#F0FFF4',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00893330',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008933',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 6,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#008933',
    marginBottom: 4,
  },
  modalSubtitle2: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalRef: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    width: 120,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#1A1A1A',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingVertical: 8,
  },
  pinEye: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  biometricButton: {
    backgroundColor: 'transparent',
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    alignSelf: 'center',
  },
  biometricIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    tintColor: '#008933',
  },
  switchMethodButton: {
    marginVertical: 8,
    paddingVertical: 6,
  },
  switchMethodText: {
    color: '#008933',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#008933',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  pickerCloseButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  pickerCloseText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});