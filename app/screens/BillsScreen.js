// screens/BillsScreen.js - Version avec biométrie + MULTILINGUE
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
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';

// ✅ IMPORT DE L'API ET DU CONTEXTE
import { API } from '../services/api';
import { useTransactions } from '../context/TransactionContext';
import { useTranslation } from '../context/LanguageContext';

// Icônes SVG (inchangées)
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBills = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="30" y="30" width="40" height="45" rx="4" fill="#008933" />
    <Path d="M38 42 L62 42" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M38 50 L55 50" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M38 58 L62 58" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="70" cy="35" r="8" fill="#FFD700" />
    <Path d="M66 35 L68 37 L74 31" stroke="#008933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icônes des fournisseurs (mapping générique)
const IconProvider = ({ color, label }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
    <Text style={{ fontSize: 12, textAlign: 'center', color: color }}>{label}</Text>
  </Svg>
);

export default function BillsScreen({ navigation }) {
  const { t } = useTranslation();
  const { width = 400 } = useWindowDimensions();
  const [selectedBill, setSelectedBill] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // États biométrie
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // États pour les données API
  const [paymentCategories, setPaymentCategories] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);

  // Contexte transactions
  const { addTransaction, transactions, balance } = useTransactions();

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categories, bills] = await Promise.all([
          API.getPaymentCategories(),
          API.getPendingBills(),
        ]);
        setPaymentCategories(categories);
        setPendingBills(bills);
      } catch (error) {
        console.error('Erreur chargement factures:', error);
        Alert.alert(t('common.error'), t('bills.loadError') || 'Impossible de charger les données des factures.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Vérification biométrie
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(compatible && enrolled);
      } catch (error) {
        console.log('Erreur biométrie:', error);
        setIsBiometricAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  // Construction de la liste des fournisseurs à partir des catégories
  const billProviders = paymentCategories.flatMap(cat =>
    (cat.providers || []).map(provider => ({
      id: `${cat.id}-${provider}`,
      name: provider,
      category: cat.name,
      icon: () => <IconProvider color={cat.color} label={provider.charAt(0)} />,
      color: cat.color,
      fields: [cat.refLabel, t('payment.clientNameShort') || 'Nom du client'],
    }))
  );

  // Authentification biométrique
  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('bills.biometricPrompt') || 'Confirmez le paiement de la facture avec votre empreinte',
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        executePayment();
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert(t('common.error'), t('common.authFailed') || "L'authentification a échoué. Veuillez réessayer.");
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      Alert.alert(t('common.error'), t('common.authProblem') || 'Un problème est survenu avec l\'authentification.');
    }
  };

  // Exécution du paiement (appel API via contexte)
  const executePayment = () => {
    const transactionRef = generateReference();
    const finalAmount = parseInt(amount);
    const fees = Math.floor(finalAmount * 0.001);
    const total = finalAmount + fees;

    if (total > balance) {
      Alert.alert(t('common.insufficientBalance'), `${t('common.yourBalanceIs') || 'Votre solde est de'} ${balance.toLocaleString()} FCFA.`);
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      type: 'bill',
      amount: -total,
      date: new Date().toISOString(),
      description: `${t('bills.paymentOf')} ${selectedBill?.name}`,
      reference: transactionRef,
      details: {
        provider: selectedBill?.name,
        reference: reference,
        customerName: customerName || 'N/A',
        amount: finalAmount,
        fees: fees,
      },
      deletable: false,
    };
    addTransaction(newTransaction);

    Alert.alert(t('common.success'), `${t('bills.paidSuccess') || 'Facture payée avec succès !'}\n${t('common.reference')}: ${reference}`);
    setModalVisible(false);
    setPin('');
    setAmount('');
    setReference('');
    setCustomerName('');
    setSelectedBill(null);
    navigation.goBack();
  };

  // Génération de référence
  const generateReference = () => {
    const prefix = 'BILL';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  // Confirmation (biométrie ou PIN)
  const confirmPayment = () => {
    if (isBiometricAvailable) {
      authenticateWithBiometrics();
      return;
    }
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

  const handlePayBill = () => {
    if (!selectedBill) {
      Alert.alert(t('common.error'), t('bills.selectProvider') || 'Veuillez sélectionner un fournisseur');
      return;
    }
    if (!reference || reference.length < 4) {
      Alert.alert(t('common.error'), t('bills.invalidReference') || 'Veuillez entrer une référence valide');
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert(t('common.error'), t('common.enterValidAmount') || 'Veuillez saisir un montant valide');
      return;
    }
    const total = parseInt(amount) + Math.floor(parseInt(amount) * 0.001);
    if (total > balance) {
      Alert.alert(t('common.insufficientBalance'), `${t('common.yourBalanceIs') || 'Votre solde est de'} ${balance.toLocaleString()} FCFA.`);
      return;
    }
    setModalVisible(true);
  };

  // Filtrage des fournisseurs
  const filteredProviders = billProviders.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Historique des paiements (depuis les transactions)
  const paidBills = transactions
    .filter(t => t.type === 'bill')
    .map(t => ({
      id: t.id,
      provider: t.details?.provider || t('bills.billLabel') || 'Facture',
      reference: t.details?.reference || t.reference,
      amount: Math.abs(t.amount).toString(),
      date: new Date(t.date).toLocaleDateString('fr-FR'),
      status: t('bills.paidStatus') || 'payé'
    }));

  // Dimensions modales
  const modalWidth = width ? width - 40 : 320;

  // Affichage du chargement
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('bills.title')}</Text>
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
        <Text style={styles.headerTitle}>{t('bills.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconBills />
          <Text style={styles.illustrationText}>{t('bills.illustration')}</Text>
        </View>

        {/* SOLDE DISPONIBLE (dynamique) */}
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

        {/* FACTURES EN ATTENTE (depuis l'API) */}
        {pendingBills.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('bills.pendingBills')}</Text>
            <View style={styles.pendingContainer}>
              {pendingBills.map(bill => (
                <TouchableOpacity
                  key={bill.id}
                  style={styles.pendingCard}
                  onPress={() => {
                    const provider = billProviders.find(p => p.name === bill.provider);
                    if (provider) setSelectedBill(provider);
                    setReference(bill.reference);
                    setAmount(bill.amount);
                  }}
                >
                  <View style={styles.pendingIcon}>
                    <Text style={styles.pendingIconText}>📄</Text>
                  </View>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingProvider}>{bill.provider}</Text>
                    <Text style={styles.pendingRef}>{t('common.reference')}: {bill.reference}</Text>
                    <Text style={styles.pendingDue}>{t('bills.dueDate')} {bill.dueDate}</Text>
                  </View>
                  <View style={styles.pendingAmount}>
                    <Text style={styles.pendingAmountValue}>{bill.amount} FCFA</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>{t('bills.urgent')}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* RECHERCHE */}
        <Text style={styles.sectionLabel}>{t('bills.searchProvider')}</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('bills.searchPlaceholder') || 'Tapez le nom d\'un fournisseur...'}
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* FOURNISSEURS */}
        <Text style={styles.sectionLabel}>{t('bills.providers')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providersScroll}>
          {filteredProviders.map(provider => {
            const IconComponent = provider.icon;
            return (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerCard,
                  selectedBill?.id === provider.id && styles.providerCardSelected
                ]}
                onPress={() => {
                  setSelectedBill(provider);
                  setReference('');
                  setAmount('');
                  setCustomerName('');
                }}
              >
                <View style={[styles.providerIcon, { backgroundColor: `${provider.color}15` }]}>
                  <IconComponent />
                </View>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerCategory}>{provider.category}</Text>
                {selectedBill?.id === provider.id && (
                  <View style={styles.providerCheck}>
                    <Text style={styles.providerCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FORMULAIRE */}
        {selectedBill && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('bills.paymentOf')} {selectedBill.name}</Text>
            {selectedBill.fields.map((field, index) => (
              <View key={index}>
                <Text style={styles.inputLabel}>{field}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`${t('common.enter') || 'Entrez'} ${field.toLowerCase()}`}
                  placeholderTextColor="#AAA"
                  value={field === selectedBill.fields[0] ? reference : customerName}
                  onChangeText={(text) => {
                    if (field === selectedBill.fields[0]) {
                      setReference(text);
                    } else {
                      setCustomerName(text);
                    }
                  }}
                />
              </View>
            ))}
            <Text style={styles.inputLabel}>{t('payment.amountToPay')}</Text>
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
              {['5000', '10000', '25000', '50000'].map(sug => (
                <TouchableOpacity
                  key={sug}
                  style={styles.suggestionChip}
                  onPress={() => setAmount(sug)}
                >
                  <Text style={styles.suggestionText}>{sug} FCFA</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* HISTORIQUE (depuis les transactions) */}
        <Text style={styles.sectionLabel}>{t('bills.history')}</Text>
        <View style={styles.historyContainer}>
          {paidBills.length === 0 ? (
            <Text style={styles.emptyHistoryText}>{t('bills.noPaidBills')}</Text>
          ) : (
            paidBills.slice(0, 5).map(bill => (
              <TouchableOpacity
                key={bill.id}
                style={styles.historyCard}
                onPress={() => {
                  const provider = billProviders.find(p => p.name === bill.provider);
                  if (provider) setSelectedBill(provider);
                  setReference(bill.reference);
                  setAmount(bill.amount);
                }}
              >
                <View style={styles.historyIcon}>
                  <Text style={styles.historyIconText}>✅</Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyProvider}>{bill.provider}</Text>
                  <Text style={styles.historyRef}>{t('common.reference')}: {bill.reference}</Text>
                  <Text style={styles.historyDate}>{bill.date}</Text>
                </View>
                <View style={styles.historyAmount}>
                  <Text style={styles.historyAmountValue}>{bill.amount} FCFA</Text>
                  <Text style={styles.historyStatus}>{bill.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* FRAIS */}
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
            (!selectedBill || !reference || !amount) && styles.payButtonDisabled
          ]}
          onPress={handlePayBill}
          disabled={!selectedBill || !reference || !amount}
        >
          <Text style={styles.payButtonText}>{t('common.pay')} {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.payIconCircle}>
            <Text style={styles.payIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* INFO */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('bills.infoTitle') || 'ℹ️ Informations importantes'}</Text>
          <Text style={styles.infoText}>• {t('bills.infoFee') || 'Les frais de transaction sont de 0.1% du montant'}</Text>
          <Text style={styles.infoText}>• {t('bills.infoSecure') || 'Paiement sécurisé avec confirmation par PIN'}</Text>
          <Text style={styles.infoText}>• {t('bills.infoReceipt') || 'Reçu disponible après chaque transaction'}</Text>
          <Text style={styles.infoText}>• {t('bills.infoHistory') || 'Factures payées disponibles dans l\'historique'}</Text>
        </View>
      </ScrollView>

      {/* MODAL CONFIRMATION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); setPin(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalIcon}><IconBills /></View>
            <Text style={styles.modalTitle}>{t('common.confirm')}</Text>
            <Text style={styles.modalSubtitle}>{t('bills.paymentOf')} {amount} FCFA</Text>
            <Text style={styles.modalSubtitle2}>{t('common.to') || 'à'} {selectedBill?.name}</Text>
            <Text style={styles.modalRef}>{t('common.reference')}: {reference}</Text>

            {isBiometricAvailable ? (
              <>
                <Text style={styles.modalLabel}>{t('common.confirmWithBiometric')}</Text>
                <TouchableOpacity style={styles.biometricButton} onPress={authenticateWithBiometrics}>
                  <Image source={require('../assets/images/print.png')} style={styles.biometricIcon} />
                </TouchableOpacity>
                <Text style={styles.biometricFallbackText}>{t('common.orEnterPin') || 'ou entrez votre PIN ci-dessous'}</Text>
              </>
            ) : (
              <Text style={styles.modalLabel}>{t('common.enterPin')}</Text>
            )}

            {/* PIN toujours affiché */}
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setModalVisible(false); setPin(''); }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmPayment}
              >
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles (inchangés, identiques à ceux du fichier original)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
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
  balanceLimit: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  balanceLimitText: { color: '#FFFFFF', fontSize: 11 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  pendingContainer: { paddingHorizontal: 20, gap: 10 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FF660030',
  },
  pendingIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF660015', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pendingIconText: { fontSize: 20 },
  pendingInfo: { flex: 1 },
  pendingProvider: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  pendingRef: { fontSize: 11, color: '#888', marginTop: 2 },
  pendingDue: { fontSize: 10, color: '#FF6600', marginTop: 2 },
  pendingAmount: { alignItems: 'flex-end' },
  pendingAmountValue: { fontSize: 14, fontWeight: '700', color: '#FF6600' },
  pendingBadge: { backgroundColor: '#FF6600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  pendingBadgeText: { fontSize: 9, color: '#FFFFFF', fontWeight: '600' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  providersScroll: { paddingLeft: 20 },
  providerCard: {
    width: 100,
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
  providerCardSelected: { borderWidth: 2, borderColor: '#008933', backgroundColor: '#F0FFF4' },
  providerIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  providerName: { fontSize: 12, fontWeight: '600', color: '#1A1A1A', textAlign: 'center' },
  providerCategory: { fontSize: 10, color: '#888', marginTop: 2 },
  providerCheck: {
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
  providerCheckText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
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
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingBottom: 8,
    marginBottom: 16,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: '#008933', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: '#1A1A1A', padding: 0 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  suggestionChip: { backgroundColor: '#F0FFF4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#008933' },
  suggestionText: { color: '#008933', fontSize: 14, fontWeight: '500' },
  historyContainer: { paddingHorizontal: 20, gap: 10 },
  emptyHistoryText: { textAlign: 'center', color: '#888', fontSize: 14, paddingVertical: 20 },
  historyCard: {
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
  historyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyIconText: { fontSize: 20 },
  historyInfo: { flex: 1 },
  historyProvider: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  historyRef: { fontSize: 11, color: '#888', marginTop: 2 },
  historyDate: { fontSize: 10, color: '#AAA', marginTop: 2 },
  historyAmount: { alignItems: 'flex-end' },
  historyAmountValue: { fontSize: 14, fontWeight: '700', color: '#008933' },
  historyStatus: { fontSize: 10, color: '#10B981', marginTop: 2 },
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
  payButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  payIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  payIcon: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },
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
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#008933', marginBottom: 10 },
  infoText: { fontSize: 12, color: '#555', marginBottom: 6, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalIcon: { marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  modalSubtitle: { fontSize: 18, fontWeight: '600', color: '#008933', marginBottom: 4 },
  modalSubtitle2: { fontSize: 14, color: '#666', marginBottom: 8 },
  modalRef: { fontSize: 12, color: '#888', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  pinContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16, position: 'relative' },
  pinInput: { width: 120, fontSize: 32, fontWeight: '700', letterSpacing: 8, color: '#1A1A1A', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#008933', paddingVertical: 8 },
  pinEye: { position: 'absolute', right: 0, padding: 8 },
  biometricButton: { backgroundColor: 'transparent', padding: 0, alignItems: 'center', justifyContent: 'center', width: 50, height: 50, alignSelf: 'center' },
  biometricIcon: { width: 40, height: 40, resizeMode: 'contain', tintColor: '#008933' },
  biometricFallbackText: { fontSize: 13, color: '#888', marginVertical: 8, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});