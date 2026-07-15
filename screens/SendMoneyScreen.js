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
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Détection web vs mobile
const isWeb = Platform.OS === 'web';

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône QR Code
const IconQR = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke="#666" strokeWidth="1.8" />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke="#666" strokeWidth="1.8" />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke="#666" strokeWidth="1.8" />
    <Path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2zM18 16h-2v2" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

// Icône contact
const IconContact = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#008933" strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// Icône favoris
const IconStar = ({ filled }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#FFD700" : "none"}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#FFD700" strokeWidth="1.5" />
  </Svg>
);

export default function SendMoneyScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [note, setNote] = useState('');
  const [contacts, setContacts] = useState([
    { id: 1, name: 'Amadou Ibrahim', phone: '93452271', avatar: 'AI', color: '#FF6600', isFavorite: true },
    { id: 2, name: 'Aïssata Moussa', phone: '83356200', avatar: 'AM', color: '#10B981', isFavorite: true },
    { id: 3, name: 'Habibou Dan Galadima', phone: '93124598', avatar: 'HD', color: '#3B82F6', isFavorite: true },
    { id: 4, name: 'Maman', phone: '83789011', avatar: 'MA', color: '#8B5CF6', isFavorite: true },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addToFavorites, setAddToFavorites] = useState(false);
  
  // QR Code states
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [scannedData, setScannedData] = useState(null);

  const handleSend = () => {
    if (!selectedContact) {
      Alert.alert('Erreur', 'Veuillez sélectionner un bénéficiaire');
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    Alert.alert(
      'Confirmation',
      `Envoyer ${amount} FCFA à ${selectedContact.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => {
          Alert.alert('Succès', 'Transfert effectué avec succès !');
          navigation.goBack();
        }}
      ]
    );
  };

  // Ajouter un nouveau contact
  const handleAddContact = () => {
    if (!newContactName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }
    if (!newContactPhone.trim() || newContactPhone.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro valide (8 chiffres minimum)');
      return;
    }

    const newId = Math.max(...contacts.map(c => c.id), 0) + 1;
    const colors = ['#FF6600', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const initials = newContactName.substring(0, 2).toUpperCase();

    const newContact = {
      id: newId,
      name: newContactName,
      phone: newContactPhone.replace(/\s/g, ''),
      avatar: initials,
      color: randomColor,
      isFavorite: addToFavorites,
    };

    setContacts([...contacts, newContact]);
    
    if (addToFavorites) {
      setSelectedContact(newContact);
    }
    
    setModalVisible(false);
    setNewContactName('');
    setNewContactPhone('');
    setAddToFavorites(false);
    
    Alert.alert('Succès', `${newContactName} a été ajouté${addToFavorites ? ' aux favoris' : ''}`);
  };

  // Version web : ouvrir un modal pour entrer un numéro manuellement
  const handleOpenContacts = () => {
    if (isWeb) {
      Alert.alert(
        'Ajouter un contact',
        'Sur le web, veuillez entrer le numéro manuellement',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ajouter', onPress: () => setModalVisible(true) }
        ]
      );
    } else {
      // Version mobile : on tente d'importer expo-contacts
      try {
        const { openContacts } = require('./ContactsHelper');
        openContacts((contact) => {
          if (contact) {
            const existingContact = contacts.find(c => c.phone === contact.phone);
            if (existingContact) {
              setSelectedContact(existingContact);
            } else {
              const newId = Math.max(...contacts.map(c => c.id), 0) + 1;
              const colors = ['#FF6600', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              const initials = contact.name.substring(0, 2).toUpperCase();
              
              const newContact = {
                id: newId,
                name: contact.name,
                phone: contact.phone,
                avatar: initials,
                color: randomColor,
                isFavorite: true,
              };
              setContacts([...contacts, newContact]);
              setSelectedContact(newContact);
              Alert.alert('Succès', `${contact.name} a été ajouté à vos contacts`);
            }
          }
        });
      } catch (error) {
        Alert.alert('Info', 'Fonctionnalité disponible uniquement sur mobile');
        setModalVisible(true);
      }
    }
  };

  // Scanner QR Code (version web : input manuel)
  const handleQRScan = () => {
    if (isWeb) {
      Alert.alert(
        'Scanner un QR Code',
        'Entrez le numéro ou les données du QR Code',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Valider',
            onPress: () => {
              if (qrInput && qrInput.length > 5) {
                const existingContact = contacts.find(c => c.phone === qrInput.replace(/\s/g, ''));
                if (existingContact) {
                  setSelectedContact(existingContact);
                  Alert.alert('QR Code', `Contact trouvé : ${existingContact.name}`);
                } else {
                  Alert.alert(
                    'Nouveau contact',
                    `Numéro : ${qrInput}\nVoulez-vous l'ajouter ?`,
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Ajouter',
                        onPress: () => {
                          setNewContactPhone(qrInput);
                          setModalVisible(true);
                        }
                      }
                    ]
                  );
                }
                setQrInput('');
                setQrModalVisible(false);
              } else {
                Alert.alert('Erreur', 'Veuillez entrer un numéro valide');
              }
            }
          }
        ]
      );
    } else {
      // Version mobile : ouvrir la caméra
      setQrModalVisible(true);
    }
  };

  // Trier les contacts
  const sortedContacts = [...contacts].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  const favoriteContacts = sortedContacts.filter(c => c.isFavorite);
  const otherContacts = sortedContacts.filter(c => !c.isFavorite);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envoyer de l'argent</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* SECTION BÉNÉFICIAIRE */}
        <Text style={styles.sectionLabel}>À qui souhaitez-vous envoyer ?</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
          {favoriteContacts.map(contact => (
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
          ))}
          
          {/* Bouton Ajouter un contact */}
          <TouchableOpacity style={styles.addContactCard} onPress={() => setModalVisible(true)}>
            <View style={styles.addContactCircle}>
              <Text style={styles.addContactIcon}>+</Text>
            </View>
            <Text style={styles.addContactText}>Ajouter</Text>
          </TouchableOpacity>

          {/* Bouton Contacts du téléphone (ou ajout manuel sur web) */}
          <TouchableOpacity style={styles.phoneContactCard} onPress={handleOpenContacts}>
            <View style={styles.phoneContactCircle}>
              <IconContact />
            </View>
            <Text style={styles.phoneContactText}>
              {isWeb ? 'Ajouter' : 'Contacts'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Autres contacts */}
        {otherContacts.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Autres contacts</Text>
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
          <Text style={styles.sectionLabel}>Montant à envoyer</Text>
          
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

        {/* SECTION NOTE */}
        <View style={styles.noteSection}>
          <Text style={styles.sectionLabel}>Ajouter une note (optionnel)</Text>
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder="Ex: Pour le dîner, Remboursement..."
              placeholderTextColor="#AAA"
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* FRAIS ET INFO */}
        <View style={styles.feesCard}>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Frais de transaction</Text>
            <Text style={styles.feesValue}>0 FCFA</Text>
          </View>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Total à débiter</Text>
            <Text style={styles.totalValue}>{amount || '0'} FCFA</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Compte débité</Text>
            <Text style={styles.accountInfo}>Wallet principal •••• 4587</Text>
          </View>
        </View>

        {/* BOUTON ENVOYER */}
        <TouchableOpacity
          style={[styles.sendButton, (!selectedContact || !amount) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!selectedContact || !amount}
        >
          <Text style={styles.sendButtonText}>Envoyer {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.sendIconCircle}>
            <Text style={styles.sendIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* QR CODE SECTION */}
        <TouchableOpacity style={styles.qrSection} onPress={handleQRScan}>
          <IconQR />
          <Text style={styles.qrText}>Scanner un QR Code</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL POUR AJOUTER UN CONTACT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un contact</Text>
            
            <Text style={styles.modalLabel}>Nom complet</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Jean Dupont"
              value={newContactName}
              onChangeText={setNewContactName}
            />
            
            <Text style={styles.modalLabel}>Numéro de téléphone</Text>
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
              <Text style={styles.favoriteLabel}>Ajouter aux favoris</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  setNewContactName('');
                  setNewContactPhone('');
                  setAddToFavorites(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleAddContact}
              >
                <Text style={styles.confirmButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL QR CODE POUR WEB */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={qrModalVisible && isWeb}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: width - 40 }]}>
            <Text style={styles.modalTitle}>Scanner un QR Code</Text>
            <Text style={styles.modalLabel}>Entrez le numéro ou les données du QR Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 93123456"
              keyboardType="phone-pad"
              value={qrInput}
              onChangeText={setQrInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setQrModalVisible(false);
                  setQrInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={() => {
                  if (qrInput && qrInput.length > 5) {
                    const existingContact = contacts.find(c => c.phone === qrInput.replace(/\s/g, ''));
                    if (existingContact) {
                      setSelectedContact(existingContact);
                      Alert.alert('QR Code', `Contact trouvé : ${existingContact.name}`);
                    } else {
                      Alert.alert(
                        'Nouveau contact',
                        `Numéro : ${qrInput}\nVoulez-vous l'ajouter ?`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Ajouter',
                            onPress: () => {
                              setNewContactPhone(qrInput);
                              setModalVisible(true);
                            }
                          }
                        ]
                      );
                    }
                    setQrInput('');
                    setQrModalVisible(false);
                  } else {
                    Alert.alert('Erreur', 'Veuillez entrer un numéro valide');
                  }
                }}
              >
                <Text style={styles.confirmButtonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL QR CODE POUR MOBILE (simulation visuelle) */}
      {!isWeb && qrModalVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={qrModalVisible}
          onRequestClose={() => setQrModalVisible(false)}
        >
          <View style={styles.qrModalContainer}>
            <View style={styles.qrHeader}>
              <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.qrBackButton}>
                <IconBack />
              </TouchableOpacity>
              <Text style={styles.qrHeaderTitle}>Scanner un QR Code</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.qrPlaceholder}>
              <IconQR />
              <Text style={styles.qrPlaceholderText}>
                QR Code Scanner{'\n'}
                (Fonctionnalité disponible sur l'application mobile)
              </Text>
              <TextInput
                style={styles.qrPlaceholderInput}
                placeholder="Ou entrez le numéro manuellement"
                keyboardType="phone-pad"
                value={qrInput}
                onChangeText={setQrInput}
              />
              <TouchableOpacity 
                style={styles.qrPlaceholderButton}
                onPress={() => {
                  if (qrInput && qrInput.length > 5) {
                    const existingContact = contacts.find(c => c.phone === qrInput.replace(/\s/g, ''));
                    if (existingContact) {
                      setSelectedContact(existingContact);
                      Alert.alert('QR Code', `Contact trouvé : ${existingContact.name}`);
                    } else {
                      Alert.alert(
                        'Nouveau contact',
                        `Numéro : ${qrInput}\nVoulez-vous l'ajouter ?`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Ajouter',
                            onPress: () => {
                              setNewContactPhone(qrInput);
                              setModalVisible(true);
                            }
                          }
                        ]
                      );
                    }
                    setQrInput('');
                    setQrModalVisible(false);
                  } else {
                    Alert.alert('Erreur', 'Veuillez entrer un numéro valide');
                  }
                }}
              >
                <Text style={styles.qrPlaceholderButtonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  phoneContactCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#008933',
  },
  phoneContactCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  phoneContactText: {
    fontSize: 12,
    color: '#008933',
    fontWeight: '600',
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
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 10,
  },
  qrText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Modal styles
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
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  favoriteCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#008933',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // QR Modal pour mobile
  qrModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1A1A1A',
  },
  qrBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qrPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrPlaceholderText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  qrPlaceholderInput: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  qrPlaceholderButton: {
    backgroundColor: '#008933',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
  },
  qrPlaceholderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});