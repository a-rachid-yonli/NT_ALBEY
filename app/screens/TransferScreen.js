// screens/TransferScreen.js - Version multilingue
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

// Icônes (inchangées)
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconTransfer = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Path d="M30 50 L70 50" stroke="#FF6600" strokeWidth="4" strokeLinecap="round" />
    <Path d="M60 40 L70 50 L60 60" stroke="#FF6600" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Circle cx="35" cy="50" r="6" fill="#008933" />
    <Circle cx="65" cy="50" r="6" fill="#10B981" />
    <Path d="M32 50 L38 50 M35 47 L35 53" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M62 47 L68 53 M68 47 L62 53" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconContact = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#008933" strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconStar = ({ filled }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"} stroke="#FFD700" strokeWidth="1.5">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

export default function TransferScreen({ navigation }) {
  const { t } = useTranslation();
  const { width = 400, height = 800 } = useWindowDimensions();
  const [amount, setAmount] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [note, setNote] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addToFavorites, setAddToFavorites] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);

  // ✅ États pour les contacts (via API)
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // ✅ État pour la biométrie
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // ✅ Récupération du solde et de la fonction addTransaction
  const { addTransaction, balance } = useTransactions();

  // ✅ Chargement des contacts depuis l'API
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await API.getContacts();
        setContacts(data);
      } catch (error) {
        console.error('Erreur chargement contacts:', error);
        Alert.alert(t('common.error'), t('sendMoney.loadContactsError') || 'Impossible de charger vos contacts');
      } finally {
        setIsLoadingContacts(false);
      }
    };
    loadContacts();
  }, []);

  // ✅ Vérifier la disponibilité de la biométrie
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

  // ✅ Génération d'une référence unique
  const generateReference = () => {
    const prefix = 'TRF';
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
        promptMessage: t('transfer.biometricPrompt') || 'Confirmez le transfert avec votre empreinte',
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        executeTransfer();
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert(t('common.error'), t('common.authFailed') || 'L\'authentification a échoué. Veuillez réessayer.');
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      Alert.alert(t('common.error'), t('common.authProblem') || 'Un problème est survenu avec l\'authentification.');
    }
  };

  // ✅ Exécuter le transfert après authentification
  const executeTransfer = () => {
    const newTransaction = {
      id: Date.now().toString(),
      type: 'transfer',
      amount: -parseInt(amount),
      date: new Date().toISOString(),
      description: `${t('sendMoney.transferTo') || 'Transfert à'} ${selectedContact?.name || (t('sendMoney.beneficiary') || 'bénéficiaire')}`,
      reference: generateReference(),
      details: {
        beneficiary: selectedContact?.name,
        phone: selectedContact?.phone,
        note: note || '',
      },
      deletable: true,
    };
    addTransaction(newTransaction);

    setModalVisible(false);
    setPin('');
    Alert.alert(t('common.success'), `${t('sendMoney.transferSuccess') || 'Transfert de'} ${amount} FCFA ${t('sendMoney.transferSuccessEnd') || 'effectué avec succès !'}`);
    setAmount('');
    setSelectedContact(null);
    setNote('');
    navigation.goBack();
  };

  // ✅ Confirmation - SOIT empreinte SOIT PIN
  const confirmTransfer = () => {
    if (isBiometricAvailable) {
      authenticateWithBiometrics();
      return;
    }

    if (!pin || pin.length !== 4) {
      Alert.alert(t('common.error'), t('common.pin4Digits'));
      return;
    }

    if (pin === '0000') {
      executeTransfer();
    } else {
      Alert.alert(t('common.error'), t('common.incorrectPin'));
      setPin('');
    }
  };

  const handleSend = () => {
    if (!selectedContact) {
      Alert.alert(t('common.error'), t('transfer.selectBeneficiary') || 'Veuillez sélectionner un bénéficiaire');
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert(t('common.error'), t('common.enterValidAmount') || 'Veuillez saisir un montant valide');
      return;
    }
    if (parseInt(amount) > balance) {
      Alert.alert(t('common.error'), `${t('common.insufficientBalance')}. ${t('common.yourBalanceIs') || 'Votre solde est de'} ${balance.toLocaleString()} FCFA`);
      return;
    }

    setModalVisible(true);
  };

  // ✅ Ajout d'un contact via API
  const handleAddContact = async () => {
    if (!newContactName.trim()) {
      Alert.alert(t('common.error'), t('sendMoney.nameRequired') || 'Veuillez entrer un nom');
      return;
    }
    if (!newContactPhone.trim() || newContactPhone.length < 8) {
      Alert.alert(t('common.error'), t('sendMoney.validNumberRequired') || 'Veuillez entrer un numéro valide (8 chiffres minimum)');
      return;
    }

    try {
      const colors = ['#FF6600', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const initials = newContactName.substring(0, 2).toUpperCase();

      const newContact = await API.addContact({
        name: newContactName.trim(),
        phone: newContactPhone.replace(/\s/g, ''),
        avatar: initials,
        color: randomColor,
        isFavorite: addToFavorites,
      });

      setContacts([...contacts, newContact]);

      if (addToFavorites) {
        setSelectedContact(newContact);
      }

      setAddModalVisible(false);
      setNewContactName('');
      setNewContactPhone('');
      setAddToFavorites(false);

      Alert.alert(t('common.success'), `${newContactName} ${addToFavorites ? (t('sendMoney.addedToFavShort') || 'a été ajouté aux favoris') : (t('sendMoney.addedShort') || 'a été ajouté')}`);
    } catch (error) {
      Alert.alert(t('common.error'), t('sendMoney.addContactError') || 'Impossible d\'ajouter le contact');
    }
  };

  // Trier les contacts (favoris en premier)
  const favoriteContacts = contacts.filter(c => c.isFavorite);
  const otherContacts = contacts.filter(c => !c.isFavorite);

  // Suggestions de montants fréquents
  const suggestions = ['5000', '10000', '25000', '50000', '100000'];

  const modalWidth = width ? width - 40 : 320;

  // Affichage du chargement
  if (isLoadingContacts) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('transfer.title')}</Text>
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
        <Text style={styles.headerTitle}>{t('transfer.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconTransfer />
          <Text style={styles.illustrationText}>{t('transfer.illustration')}</Text>
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
              {balanceVisible ? (t('transfer.instantTransfer') || 'Transfert instantané') : `👆 ${t('common.tapToShow') || 'Appuyez pour afficher'}`}
            </Text>
          </View>
        </TouchableOpacity>

        {/* SECTION BÉNÉFICIAIRE */}
        <Text style={styles.sectionLabel}>{t('transfer.whoSend')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
          {favoriteContacts.length === 0 && otherContacts.length === 0 ? (
            <View style={styles.emptyContactsMessage}>
              <Text style={styles.emptyContactsText}>{t('transfer.noContacts') || 'Aucun contact. Ajoutez-en un !'}</Text>
            </View>
          ) : (
            favoriteContacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                style={[
                  styles.contactCard,
                  selectedContact?.id === contact.id && styles.contactCardSelected
                ]}
                onPress={() => setSelectedContact(contact)}
              >
                <View style={[styles.contactAvatar, { backgroundColor: contact.color }]}>
                  <Text style={styles.contactAvatarText}>{contact.avatar}</Text>
                </View>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
                <View style={styles.favoriteStar}>
                  <IconStar filled={contact.isFavorite} />
                </View>
                {selectedContact?.id === contact.id && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}

          {/* Bouton Ajouter un contact */}
          <TouchableOpacity style={styles.addContactCard} onPress={() => setAddModalVisible(true)}>
            <View style={styles.addContactCircle}>
              <Text style={styles.addContactIcon}>+</Text>
            </View>
            <Text style={styles.addContactText}>{t('sendMoney.addContact')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Autres contacts */}
        {otherContacts.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>📞 {t('transfer.otherContacts') || 'Autres contacts'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
              {otherContacts.map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.contactCard,
                    selectedContact?.id === contact.id && styles.contactCardSelected
                  ]}
                  onPress={() => setSelectedContact(contact)}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: contact.color }]}>
                    <Text style={styles.contactAvatarText}>{contact.avatar}</Text>
                  </View>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  {selectedContact?.id === contact.id && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* SECTION MONTANT */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>{t('sendMoney.amountToSend')}</Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>FCFA</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#CCC"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <View style={styles.suggestionsRow}>
            {suggestions.map(sug => (
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

        {/* SECTION NOTE */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>{t('sendMoney.addNote')}</Text>
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder={t('sendMoney.notePlaceholder') || 'Ex: Pour le dîner, Remboursement...'}
              placeholderTextColor="#AAA"
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* FRAIS ET INFO */}
        <View style={styles.feesCard}>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>{t('common.fees')}</Text>
            <Text style={styles.feesValue}>0 FCFA</Text>
          </View>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>{t('sendMoney.totalDebited')}</Text>
            <Text style={styles.totalValue}>{amount || '0'} FCFA</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>{t('history.accountDebited')}</Text>
            <Text style={styles.accountInfo}>Wallet principal •••• 4587</Text>
          </View>
        </View>

        {/* BOUTON ENVOYER */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedContact || !amount) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!selectedContact || !amount}
        >
          <Text style={styles.sendButtonText}>{t('common.send')} {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.sendIconCircle}>
            <Text style={styles.sendIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('transfer.infoTitle') || 'ℹ️ Informations importantes'}</Text>
          <Text style={styles.infoText}>• {t('transfer.info1') || 'Transfert instantané vers tous les opérateurs'}</Text>
          <Text style={styles.infoText}>• {t('transfer.info2') || 'Frais de transaction offerts pour les transferts'}</Text>
          <Text style={styles.infoText}>• {t('transfer.info3') || 'Reçu envoyé par SMS après chaque transaction'}</Text>
        </View>

      </ScrollView>

      {/* MODAL CONFIRMATION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setPin('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalIcon}>
              <IconTransfer />
            </View>
            <Text style={styles.modalTitle}>{t('common.confirm')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('sendMoney.sendOf') || 'Envoi de'} {amount} FCFA
            </Text>
            <Text style={styles.modalSubtitle2}>
              {t('common.to') || 'à'} {selectedContact?.name}
            </Text>
            <Text style={styles.modalPhone}>
              {selectedContact?.phone}
            </Text>

            {isBiometricAvailable ? (
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
                <Text style={styles.biometricFallbackText}>
                  {t('common.orEnterPin') || 'ou entrez votre PIN ci-dessous'}
                </Text>
              </>
            ) : (
              <Text style={styles.modalLabel}>{t('common.enterPin')}</Text>
            )}

            {!isBiometricAvailable && (
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
            )}

            {isBiometricAvailable && (
              <>
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
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, styles.pinConfirmButton]}
                  onPress={confirmTransfer}
                >
                  <Text style={styles.confirmButtonText}>{t('common.confirmWithPin') || 'Confirmer avec PIN'}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setPin('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              {!isBiometricAvailable && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmTransfer}
                >
                  <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AJOUTER CONTACT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <Text style={styles.modalTitle}>{t('sendMoney.addContact')}</Text>

            <Text style={styles.modalLabel}>{t('sendMoney.fullName')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Jean Dupont"
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <Text style={styles.modalLabel}>{t('common.phone')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 93123456"
              keyboardType="phone-pad"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
            />

            <TouchableOpacity
              style={styles.favoriteCheckbox}
              onPress={() => setAddToFavorites(!addToFavorites)}
            >
              <View style={[styles.checkbox, addToFavorites && styles.checkboxChecked]}>
                {addToFavorites && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.favoriteLabel}>{t('sendMoney.addToFavorites')}</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddModalVisible(false);
                  setNewContactName('');
                  setNewContactPhone('');
                  setAddToFavorites(false);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddContact}
              >
                <Text style={styles.confirmButtonText}>{t('common.add') || 'Ajouter'}</Text>
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
  contactsScroll: {
    paddingLeft: 20,
  },
  contactCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
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
  contactCardSelected: {
    borderWidth: 2,
    borderColor: '#008933',
    backgroundColor: '#F0FFF4',
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  contactName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  contactPhone: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  favoriteStar: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addContactCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addContactCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addContactIcon: {
    fontSize: 28,
    color: '#008933',
  },
  addContactText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContactsMessage: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  emptyContactsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  amountSection: {
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingBottom: 8,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#008933',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: '#1A1A1A',
    padding: 0,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  noteSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  noteInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  noteInput: {
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
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
  sendButton: {
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
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sendIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
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
    marginBottom: 4,
  },
  modalPhone: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    width: '100%',
  },
  favoriteCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#008933',
    marginRight: 10,
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
  favoriteLabel: {
    fontSize: 14,
    color: '#1A1A1A',
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
  biometricFallbackText: {
    fontSize: 13,
    color: '#888',
    marginVertical: 8,
    textAlign: 'center',
  },
  pinConfirmButton: {
    marginTop: 8,
    backgroundColor: '#008933',
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
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});