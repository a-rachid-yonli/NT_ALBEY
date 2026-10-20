// screens/VisaScreen.js - Version multilingue
// MODIFIÉ POUR UTILISER L'API POUR LES CARTES
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
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';

// ✅ IMPORT DE L'API ET DU CONTEXTE
import { API } from '../services/api';
import { useTransactions } from '../context/TransactionContext';
import { useTranslation } from '../context/LanguageContext';

// Icônes (inchangées)
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconVisa = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="25" y="35" width="50" height="35" rx="5" fill="#1A1F71" />
    <Text x="35" y="55" fill="white" fontSize="18" fontWeight="bold">VISA</Text>
    <Circle cx="65" cy="52" r="8" fill="#F9A825" />
  </Svg>
);

const IconPlus = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#008933" strokeWidth="1.8" />
    <Path d="M8 12h8M12 8v8" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconRecharge = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#FF6600" strokeWidth="1.5" />
    <Path d="M12 8v4l3 3" stroke="#FF6600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCopy = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke="#008933" strokeWidth="1.5" />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#008933" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const IconEye = ({ visible }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={visible ? "#008933" : "#999"} strokeWidth="1.5" />
    <Circle cx="12" cy="12" r="3" stroke={visible ? "#008933" : "#999"} strokeWidth="1.5" />
  </Svg>
);

const IconEyeOff = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#999" strokeWidth="1.5" />
    <Path d="M3 3l18 18" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="3" stroke="#999" strokeWidth="1.5" />
  </Svg>
);

export default function VisaScreen({ navigation, onLogout }) {
  const { t } = useTranslation();
  const { width = 400, height = 800 } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('cards');
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [showMainBalance, setShowMainBalance] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [newCardModalVisible, setNewCardModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Récupération du solde et de la fonction addTransaction
  const { balance, addTransaction } = useTransactions();

  // ✅ États pour la biométrie et le choix exclusif
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  // ✅ Chargement des cartes depuis l'API
  useEffect(() => {
    const loadCards = async () => {
      try {
        const data = await API.getCards();
        setCards(data);
        if (data.length > 0) {
          setSelectedCard(data[0]);
        }
      } catch (error) {
        console.error('Erreur chargement cartes:', error);
        Alert.alert(t('common.error'), t('visa.loadError') || 'Impossible de charger vos cartes');
      } finally {
        setIsLoading(false);
      }
    };
    loadCards();
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
    const prefix = 'VISA';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  // ✅ Fonction pour s'authentifier avec empreinte
  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('visa.biometricPrompt') || 'Confirmez la recharge avec votre empreinte',
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        executeRecharge();
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

  // ✅ Fonction de confirmation par PIN
  const confirmWithPin = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert(t('common.error'), t('common.pin4Digits'));
      return;
    }

    if (pin === '0000') {
      executeRecharge();
    } else {
      Alert.alert(t('common.error'), t('common.incorrectPin'));
      setPin('');
    }
  };

  // ✅ Fonction commune pour exécuter la recharge après authentification
  const executeRecharge = async () => {
    const amount = parseInt(rechargeAmount);
    if (!selectedCard) return;

    try {
      // Appel API pour recharger la carte
      const updatedCard = await API.rechargeCard(selectedCard.id, amount);

      // Mise à jour locale
      setCards(cards.map(card =>
        card.id === selectedCard.id ? updatedCard : card
      ));
      setSelectedCard(updatedCard);

      // Ajouter une transaction dans le contexte
      const transactionRef = generateReference();
      const newTransaction = {
        id: Date.now().toString(),
        type: 'visa_recharge',
        amount: -amount,
        date: new Date().toISOString(),
        description: `${t('visa.rechargeCardDescription') || 'Recharge carte Visa'} •••• ${selectedCard.cardNumber.slice(-4)}`,
        reference: transactionRef,
        details: {
          cardNumber: selectedCard.cardNumber.slice(-4),
          amount: amount,
        },
        deletable: false,
      };
      addTransaction(newTransaction);

      setRechargeModalVisible(false);
      setPinModalVisible(false);
      setRechargeAmount('');
      setPin('');
      Alert.alert(t('common.success'), `${t('visa.rechargeSuccess') || 'Recharge effectuée'} •••• ${selectedCard.cardNumber.slice(-4)}`);
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('visa.rechargeError') || 'Erreur lors de la recharge');
    }
  };

  // ✅ Générer une nouvelle carte via API
  const handleCreateCard = async () => {
    try {
      const newCardData = {
        cardNumber: generateCardNumber(),
        expiry: generateExpiry(),
        cvv: generateCvv(),
        name: 'Moussa Ibrahim',
      };
      const newCard = await API.addCard(newCardData);
      setCards([...cards, newCard]);
      setSelectedCard(newCard);
      setNewCardModalVisible(false);
      Alert.alert(t('common.success'), t('visa.createCardSuccess') || 'Nouvelle carte virtuelle créée avec succès !');
    } catch (error) {
      Alert.alert(t('common.error'), t('visa.createCardError') || 'Impossible de créer la carte');
    }
  };

  // Fonctions de génération (inchangées)
  const generateCardNumber = () => {
    const prefix = '4532';
    let number = prefix;
    for (let i = 0; i < 12; i++) {
      number += Math.floor(Math.random() * 10);
      if (i === 3 || i === 7) number += ' ';
    }
    return number;
  };

  const generateExpiry = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear() + 3).slice(-2);
    return `${month}/${year}`;
  };

  const generateCvv = () => {
    return String(Math.floor(Math.random() * 900) + 100);
  };

  // ✅ Gestion de la recharge
  const handleRecharge = () => {
    if (!rechargeAmount || parseInt(rechargeAmount) <= 0) {
      Alert.alert(t('common.error'), t('visa.invalidAmount') || 'Montant invalide');
      return;
    }
    if (parseInt(rechargeAmount) > balance) {
      Alert.alert(t('common.error'), `${t('common.insufficientBalance')}. ${t('common.yourBalanceIs') || 'Votre solde est de'} ${balance.toLocaleString()} FCFA`);
      return;
    }
    setPinModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const copyToClipboard = (text, type) => {
    Alert.alert(t('common.copied') || 'Copié', `${type} ${t('visa.copiedToClipboard') || 'copié dans le presse-papier'}`);
  };

  const formatBalance = (balance) => {
    return balance.toLocaleString() + ' FCFA';
  };

  const modalWidth = width ? width - 40 : 320;

  // Affichage du chargement
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('visa.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#008933" />
          <Text style={{ marginTop: 16, color: '#666' }}>{t('visa.loadingCards') || 'Chargement de vos cartes...'}</Text>
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
        <Text style={styles.headerTitle}>{t('visa.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconVisa />
          <Text style={styles.illustrationText}>{t('visa.illustration')}</Text>
        </View>

        {/* SOLDE DISPONIBLE - DYNAMIQUE DEPUIS LE CONTEXTE */}
        <TouchableOpacity
          style={styles.balanceCard}
          activeOpacity={0.8}
          onPress={() => setShowMainBalance(!showMainBalance)}
        >
          <Text style={styles.balanceLabel}>{t('visa.balanceAvailable')}</Text>
          <Text style={styles.balanceAmount}>
            {showMainBalance ? `${balance.toLocaleString()} FCFA` : '••••••••'}
          </Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>
              {showMainBalance
                ? (t('visa.balanceHint') || 'Utilisable pour recharger vos cartes')
                : `👆 ${t('common.tapToShow') || 'Appuyez pour afficher'}`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* TAB SWITCHER */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'cards' && styles.tabActive]} onPress={() => setActiveTab('cards')}>
            <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>{t('visa.myCards')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'recharge' && styles.tabActive]} onPress={() => setActiveTab('recharge')}>
            <Text style={[styles.tabText, activeTab === 'recharge' && styles.tabTextActive]}>{t('visa.rechargeTab')}</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION MES CARTES */}
        {activeTab === 'cards' && (
          <View>
            <View style={styles.cardsHeader}>
              <Text style={styles.sectionLabel}>{t('visa.myVirtualCards')}</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.toggleBalanceButton}
                  onPress={() => setShowBalances(!showBalances)}
                >
                  {showBalances ? <IconEye visible={true} /> : <IconEyeOff />}
                  <Text style={styles.toggleBalanceText}>
                    {showBalances ? (t('visa.hide') || 'Masquer') : (t('visa.show') || 'Afficher')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addCardButton} onPress={() => setNewCardModalVisible(true)}>
                  <IconPlus />
                  <Text style={styles.addCardText}>{t('visa.newCard')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {cards.length === 0 ? (
              <View style={styles.emptyCardContainer}>
                <Text style={styles.emptyCardEmoji}>💳</Text>
                <Text style={styles.emptyCardTitle}>{t('visa.noCards')}</Text>
                <Text style={styles.emptyCardText}>{t('visa.createFirstCard')}</Text>
                <TouchableOpacity style={styles.emptyCardButton} onPress={() => setNewCardModalVisible(true)}>
                  <Text style={styles.emptyCardButtonText}>{t('visa.createCard')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              cards.map(card => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardContainer, selectedCard?.id === card.id && styles.cardContainerSelected]}
                  onPress={() => setSelectedCard(card)}
                  activeOpacity={0.7}
                >
                  {/* Carte Virtuelle */}
                  <View style={styles.cardVirtual}>
                    <View style={styles.cardChip}>
                      <Text>💳</Text>
                    </View>
                    <Text style={styles.cardBrand}>VISA</Text>
                    <Text style={styles.cardNumber}>
                      {showCardDetails ? card.cardNumber : '•••• •••• •••• ' + card.cardNumber.slice(-4)}
                    </Text>
                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.cardLabel}>{t('visa.validUntil')}</Text>
                        <Text style={styles.cardExpiry}>
                          {showCardDetails ? card.expiry : '••/••'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cardLabel}>CVV</Text>
                        <Text style={styles.cardCvv}>
                          {showCvv ? card.cvv : '•••'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardName}>{card.name}</Text>

                    {/* Boutons d'action sur la carte */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => setShowCardDetails(!showCardDetails)}
                      >
                        <IconEye visible={showCardDetails} />
                        <Text style={styles.cardActionText}>
                          {showCardDetails ? (t('visa.hide') || 'Masquer') : (t('visa.show') || 'Afficher')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => setShowCvv(!showCvv)}
                      >
                        <IconEye visible={showCvv} />
                        <Text style={styles.cardActionText}>
                          {showCvv ? (t('visa.hideCvv') || 'Masquer CVV') : (t('visa.showCvv') || 'Afficher CVV')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => copyToClipboard(card.cardNumber, t('visa.cardNumber') || 'Numéro de carte')}
                      >
                        <IconCopy />
                        <Text style={styles.cardActionText}>{t('common.copy')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Solde de la carte - MASQUÉ PAR DÉFAUT */}
                  <View style={styles.cardBalance}>
                    <Text style={styles.cardBalanceLabel}>{t('visa.cardBalance')}</Text>
                    <View style={styles.balanceDisplay}>
                      <Text style={styles.cardBalanceAmount}>
                        {showBalances ? formatBalance(card.balance) : '••••••••'}
                      </Text>
                      <TouchableOpacity
                        style={styles.balanceEyeButton}
                        onPress={() => setShowBalances(!showBalances)}
                      >
                        {showBalances ? (
                          <IconEye visible={true} />
                        ) : (
                          <IconEyeOff />
                        )}
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.rechargeCardButton}
                      onPress={() => {
                        setSelectedCard(card);
                        setRechargeModalVisible(true);
                      }}
                    >
                      <IconRecharge />
                      <Text style={styles.rechargeCardText}>{t('visa.rechargeCard')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* SECTION RECHARGE (sans sélection de carte) */}
        {activeTab === 'recharge' && (
          <View style={styles.rechargeSection}>
            <Text style={styles.sectionLabel}>{t('visa.rechargeTitle')}</Text>

            {/* Liste des cartes */}
            {cards.map(card => (
              <TouchableOpacity
                key={card.id}
                style={[styles.rechargeCardItem, selectedCard?.id === card.id && styles.rechargeCardItemSelected]}
                onPress={() => setSelectedCard(card)}
                activeOpacity={0.7}
              >
                <View style={styles.rechargeCardIcon}>
                  <Text style={styles.rechargeCardIconText}>💳</Text>
                </View>
                <View style={styles.rechargeCardInfo}>
                  <Text style={styles.rechargeCardName}>{card.name}</Text>
                  <Text style={styles.rechargeCardNumber}>{t('visa.cardLabel') || 'Carte'} •••• {card.cardNumber.slice(-4)}</Text>
                  <Text style={styles.rechargeCardBalance}>
                    {t('common.balance')}: {showBalances ? formatBalance(card.balance) : '••••••••'}
                  </Text>
                </View>
                {selectedCard?.id === card.id && (
                  <View style={styles.rechargeCardCheck}>
                    <Text style={styles.rechargeCardCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Formulaire de recharge */}
            {selectedCard && (
              <View style={styles.rechargeForm}>
                <Text style={styles.formTitle}>{t('visa.rechargeCardTitle') || 'Recharger la carte'} {selectedCard.cardNumber.slice(-4)}</Text>
                <Text style={styles.inputLabel}>{t('visa.amountToRecharge')}</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>FCFA</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={rechargeAmount}
                    onChangeText={setRechargeAmount}
                  />
                </View>
                <View style={styles.suggestionsRow}>
                  {['5000', '10000', '25000', '50000', '100000'].map(sug => (
                    <TouchableOpacity key={sug} style={styles.suggestionChip} onPress={() => setRechargeAmount(sug)}>
                      <Text style={styles.suggestionText}>{sug} FCFA</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.rechargeButton} onPress={handleRecharge}>
                  <Text style={styles.rechargeButtonText}>{t('visa.recharge')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* HISTORIQUE DES TRANSACTIONS */}
        <Text style={styles.sectionLabel}>{t('visa.lastTransactions')}</Text>
        <View style={styles.historyContainer}>
          <View style={styles.historyItem}>
            <View style={styles.historyIcon}><Text style={styles.historyIconText}>💳</Text></View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>{t('visa.rechargeCardDescription') || 'Recharge carte Visa'}</Text>
              <Text style={styles.historyDate}>10/06/2026</Text>
              <Text style={styles.historyCard}>{t('visa.cardLabel') || 'Carte'} •••• 9012</Text>
            </View>
            <View style={styles.historyAmount}>
              <Text style={[styles.historyAmountText, styles.amountPositive]}>+50 000 FCFA</Text>
              <Text style={styles.historyStatus}>✓ {t('visa.success') || 'Réussi'}</Text>
            </View>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('visa.aboutCards')}</Text>
          <Text style={styles.infoText}>• {t('visa.info1') || 'Utilisez vos cartes virtuelles pour les achats en ligne'}</Text>
          <Text style={styles.infoText}>• {t('visa.info2') || 'Rechargez depuis votre compte Albey'}</Text>
          <Text style={styles.infoText}>• {t('visa.info3') || 'Les numéros de carte sont générés aléatoirement'}</Text>
          <Text style={styles.infoText}>• {t('visa.info4') || 'Valable 3 ans'}</Text>
        </View>

      </ScrollView>

      {/* MODAL NOUVELLE CARTE */}
      <Modal visible={newCardModalVisible} transparent onRequestClose={() => setNewCardModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <Text style={styles.modalTitle}>{t('visa.newVirtualCard')}</Text>
            <IconVisa />
            <Text style={styles.modalText}>{t('visa.newCardMessage') || 'Une nouvelle carte virtuelle sera créée avec un numéro unique'}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setNewCardModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleCreateCard}>
                <Text style={styles.confirmButtonText}>{t('visa.createConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMATION RECHARGE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pinModalVisible}
        onRequestClose={() => {
          setPinModalVisible(false);
          setPin('');
          setUseBiometric(isBiometricAvailable);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <Text style={styles.modalTitle}>{t('common.confirm')}</Text>
            <Text style={styles.modalSubtitle}>{t('visa.rechargeOf') || 'Recharge de'} {rechargeAmount} FCFA</Text>
            <Text style={styles.modalCard}>{t('visa.cardLabel') || 'Carte'} •••• {selectedCard?.cardNumber.slice(-4)}</Text>

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
                style={styles.cancelButton}
                onPress={() => {
                  setPinModalVisible(false);
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
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  illustrationContainer: { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  illustrationText: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
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
    marginTop: 8
  },
  balanceLimitText: { color: '#FFFFFF', fontSize: 11 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, gap: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' },
  tabActive: { backgroundColor: '#E8F5E9', borderColor: '#008933' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#008933' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  cardsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#008933',
  },
  toggleBalanceText: {
    color: '#008933',
    fontSize: 11,
    fontWeight: '500'
  },
  addCardButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  addCardText: { color: '#008933', fontSize: 11, fontWeight: '600' },
  cardContainer: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardContainerSelected: { borderWidth: 2, borderColor: '#008933' },
  cardVirtual: { backgroundColor: '#1A1F71', padding: 20, borderRadius: 20, margin: 1 },
  cardChip: { width: 40, height: 30, backgroundColor: '#FFD700', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cardBrand: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 20 },
  cardNumber: { color: 'white', fontSize: 18, letterSpacing: 2, marginBottom: 20, fontFamily: 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  cardExpiry: { color: 'white', fontSize: 14, fontWeight: '600' },
  cardCvv: { color: 'white', fontSize: 14, fontWeight: '600' },
  cardName: { color: 'white', fontSize: 14, marginTop: 10 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  cardActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardActionText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  cardBalance: { backgroundColor: '#F8F9FC', padding: 16 },
  cardBalanceLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  balanceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardBalanceAmount: { fontSize: 20, fontWeight: '700', color: '#008933' },
  balanceEyeButton: {
    padding: 4,
  },
  rechargeCardButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  rechargeCardText: { color: '#008933', fontSize: 12, fontWeight: '600' },
  rechargeSection: { marginHorizontal: 20 },
  rechargeCardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  rechargeCardItemSelected: { borderWidth: 2, borderColor: '#008933', backgroundColor: '#F0FFF4' },
  rechargeCardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rechargeCardIconText: { fontSize: 22 },
  rechargeCardInfo: { flex: 1 },
  rechargeCardName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  rechargeCardNumber: { fontSize: 12, color: '#666', marginTop: 2 },
  rechargeCardBalance: { fontSize: 11, color: '#008933', marginTop: 2 },
  rechargeCardCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#008933', alignItems: 'center', justifyContent: 'center' },
  rechargeCardCheckText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  rechargeForm: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginTop: 16 },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#008933', paddingBottom: 8, marginBottom: 16, marginTop: 8 },
  currencySymbol: { fontSize: 20, fontWeight: '600', color: '#008933', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '700', color: '#1A1A1A', padding: 0 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  suggestionChip: { backgroundColor: '#F0FFF4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#008933' },
  suggestionText: { color: '#008933', fontSize: 14, fontWeight: '500' },
  rechargeButton: { backgroundColor: '#FF6600', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  rechargeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  historyContainer: { paddingHorizontal: 20 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10 },
  historyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyIconText: { fontSize: 20 },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  historyDate: { fontSize: 11, color: '#888', marginTop: 2 },
  historyCard: { fontSize: 10, color: '#AAA', marginTop: 2 },
  historyAmount: { alignItems: 'flex-end' },
  historyAmountText: { fontSize: 14, fontWeight: '700' },
  amountPositive: { color: '#10B981' },
  amountNegative: { color: '#1A1A1A' },
  historyStatus: { fontSize: 10, color: '#10B981', marginTop: 2 },
  infoCard: { backgroundColor: '#F0FFF4', marginHorizontal: 20, marginTop: 20, marginBottom: 30, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#00893330' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#008933', marginBottom: 10 },
  infoText: { fontSize: 12, color: '#555', marginBottom: 6, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  modalSubtitle: { fontSize: 18, fontWeight: '600', color: '#008933', marginBottom: 4 },
  modalCard: { fontSize: 14, color: '#666', marginBottom: 20 },
  modalText: { fontSize: 14, color: '#666', textAlign: 'center', marginVertical: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  pinContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16, position: 'relative' },
  pinInput: { width: 120, fontSize: 32, fontWeight: '700', letterSpacing: 8, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#008933', paddingVertical: 8 },
  pinEye: { position: 'absolute', right: 0, padding: 8 },
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
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  emptyCardContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
  },
  emptyCardEmoji: { fontSize: 48, marginBottom: 16 },
  emptyCardTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptyCardText: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  emptyCardButton: { backgroundColor: '#008933', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyCardButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});