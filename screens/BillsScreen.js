import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône factures principale
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

// Icônes des fournisseurs
const IconNigelec = () => (
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

const IconCanal = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="13" rx="2" stroke="#F59E0B" strokeWidth="1.5" />
    <Path d="M8 22l4-4 4 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <Circle cx="12" cy="11" r="2" fill="#F59E0B" />
  </Svg>
);

const IconInternet = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M3 12h18M12 3v18" stroke="#EC4899" strokeWidth="1.5" />
    <Circle cx="12" cy="12" r="9" stroke="#EC4899" strokeWidth="1.5" />
  </Svg>
);

const IconEcole = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3L3 9l9 6 9-6-9-6z" stroke="#8B5CF6" strokeWidth="1.5" />
    <Path d="M3 9v7l9 5 9-5V9" stroke="#8B5CF6" strokeWidth="1.5" />
  </Svg>
);

export default function BillsScreen({ navigation }) {
  const [selectedBill, setSelectedBill] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Liste des facturiers
  const billProviders = [
    { id: 1, name: 'Nigelec', category: 'Électricité', icon: IconNigelec, color: '#008933', fields: ['Numéro de compteur', 'Nom du client'] },
    { id: 2, name: 'NDE', category: 'Eau', icon: IconEau, color: '#3B82F6', fields: ['Numéro de compteur', 'Nom du client'] },
    { id: 3, name: 'CANAL+', category: 'TV', icon: IconCanal, color: '#F59E0B', fields: ['Numéro d\'abonné', 'Nom du client'] },
    { id: 5, name: 'Orange Internet', category: 'Internet', icon: IconInternet, color: '#EC4899', fields: ['Numéro de ligne', 'Nom du client'] },
    { id: 6, name: 'Moov Internet', category: 'Internet', icon: IconInternet, color: '#EC4899', fields: ['Numéro de ligne', 'Nom du client'] },
  ];

  // Historique des factures payées
  const [paidBills, setPaidBills] = useState([
    { id: 1, provider: 'Nigelec', reference: '12345678', amount: '27500', date: '20/05/2025', status: 'payé' },
    { id: 2, provider: 'CANAL+', reference: 'CAN123456', amount: '15000', date: '15/05/2025', status: 'payé' },
    { id: 3, provider: 'NDE', reference: 'SEEN7890', amount: '8000', date: '10/05/2025', status: 'payé' },
    { id: 4, provider: 'Orange Internet', reference: 'OR123456', amount: '10000', date: '05/05/2025', status: 'payé' },
  ]);

  // Factures en attente (à payer)
  const [pendingBills, setPendingBills] = useState([
    { id: 5, provider: 'Nigelec', reference: '12345679', amount: '32500', dueDate: '30/06/2025', status: 'en attente' },
    { id: 6, provider: 'CANAL+', reference: 'CAN123457', amount: '15000', dueDate: '25/06/2025', status: 'en attente' },
  ]);

  const handlePayBill = () => {
    if (!selectedBill) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fournisseur');
      return;
    }
    if (!reference || reference.length < 4) {
      Alert.alert('Erreur', 'Veuillez entrer une référence valide');
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (parseInt(amount) > 125000) {
      Alert.alert('Erreur', 'Solde insuffisant. Votre solde est de 125 000 FCFA');
      return;
    }
    
    setModalVisible(true);
  };

  const confirmPayment = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer votre PIN à 4 chiffres');
      return;
    }
    
    if (pin === '0000') {
      Alert.alert(
        'Confirmation',
        `Paiement de ${amount} FCFA à ${selectedBill.name} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => {
            Alert.alert('Succès', `Facture payée avec succès !\nRéférence: ${reference}`);
            // Ajouter à l'historique
            const newBill = {
              id: Date.now(),
              provider: selectedBill.name,
              reference: reference,
              amount: amount,
              date: new Date().toLocaleDateString('fr-FR'),
              status: 'payé'
            };
            setPaidBills([newBill, ...paidBills]);
            
            setModalVisible(false);
            setPin('');
            setAmount('');
            setReference('');
            setCustomerName('');
            setSelectedBill(null);
          }}
        ]
      );
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  // Filtrer les facturiers par recherche
  const filteredProviders = billProviders.filter(provider =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Factures</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconBills />
          <Text style={styles.illustrationText}>Payez vos factures en toute simplicité</Text>
        </View>

        {/* SOLDE DISPONIBLE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>125 000 FCFA</Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>Paiement sécurisé</Text>
          </View>
        </View>

        {/* SECTION FACTURES EN ATTENTE */}
        {pendingBills.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>⚠️ Factures à payer</Text>
            <View style={styles.pendingContainer}>
              {pendingBills.map(bill => (
                <TouchableOpacity
                  key={bill.id}
                  style={styles.pendingCard}
                  onPress={() => {
                    setSelectedBill(billProviders.find(p => p.name === bill.provider));
                    setReference(bill.reference);
                    setAmount(bill.amount);
                  }}
                >
                  <View style={styles.pendingIcon}>
                    <Text style={styles.pendingIconText}>📄</Text>
                  </View>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingProvider}>{bill.provider}</Text>
                    <Text style={styles.pendingRef}>Réf: {bill.reference}</Text>
                    <Text style={styles.pendingDue}>À payer avant le {bill.dueDate}</Text>
                  </View>
                  <View style={styles.pendingAmount}>
                    <Text style={styles.pendingAmountValue}>{bill.amount} FCFA</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Urgent</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* SECTION RECHERCHE */}
        <Text style={styles.sectionLabel}>🔍 Rechercher un fournisseur</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tapez le nom d'un fournisseur..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* SECTION FOURNISSEURS */}
        <Text style={styles.sectionLabel}>Fournisseurs</Text>
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

        {/* SECTION FORMULAIRE (si fournisseur sélectionné) */}
        {selectedBill && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Paiement {selectedBill.name}</Text>
            
            {selectedBill.fields.map((field, index) => (
              <View key={index}>
                <Text style={styles.inputLabel}>{field}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Entrez ${field.toLowerCase()}`}
                  placeholderTextColor="#AAA"
                  value={field === 'Numéro de compteur' || field === 'Numéro d\'abonné' || field === 'Numéro de ligne' || field === 'Matricule' ? reference : customerName}
                  onChangeText={(text) => {
                    if (field === 'Numéro de compteur' || field === 'Numéro d\'abonné' || field === 'Numéro de ligne' || field === 'Matricule') {
                      setReference(text);
                    } else {
                      setCustomerName(text);
                    }
                  }}
                />
              </View>
            ))}

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

        {/* SECTION HISTORIQUE */}
        <Text style={styles.sectionLabel}>📜 Historique des paiements</Text>
        <View style={styles.historyContainer}>
          {paidBills.slice(0, 5).map(bill => (
            <TouchableOpacity
              key={bill.id}
              style={styles.historyCard}
              onPress={() => {
                setSelectedBill(billProviders.find(p => p.name === bill.provider));
                setReference(bill.reference);
                setAmount(bill.amount);
              }}
            >
              <View style={styles.historyIcon}>
                <Text style={styles.historyIconText}>✅</Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyProvider}>{bill.provider}</Text>
                <Text style={styles.historyRef}>Réf: {bill.reference}</Text>
                <Text style={styles.historyDate}>{bill.date}</Text>
              </View>
              <View style={styles.historyAmount}>
                <Text style={styles.historyAmountValue}>{bill.amount} FCFA</Text>
                <Text style={styles.historyStatus}>{bill.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* SECTION FRAIS */}
        <View style={styles.feesCard}>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Frais de transaction</Text>
            <Text style={styles.feesValue}>
              {amount ? `${Math.floor(parseInt(amount) * 0.001)} FCFA` : '0 FCFA'}
            </Text>
          </View>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Total à débiter</Text>
            <Text style={styles.totalValue}>
              {amount ? `${parseInt(amount) + Math.floor(parseInt(amount) * 0.001)} FCFA` : '0 FCFA'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Compte débité</Text>
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
          <Text style={styles.payButtonText}>Payer {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.payIconCircle}>
            <Text style={styles.payIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informations importantes</Text>
          <Text style={styles.infoText}>• Les frais de transaction sont de 0.1% du montant</Text>
          <Text style={styles.infoText}>• Paiement sécurisé avec confirmation par PIN</Text>
          <Text style={styles.infoText}>• Reçu disponible après chaque transaction</Text>
          <Text style={styles.infoText}>• Factures payées disponibles dans l'historique</Text>
        </View>

      </ScrollView>

      {/* MODAL CONFIRMATION PIN */}
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
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <IconBills />
            </View>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalSubtitle}>
              Paiement de {amount} FCFA
            </Text>
            <Text style={styles.modalSubtitle2}>
              à {selectedBill?.name}
            </Text>
            <Text style={styles.modalRef}>
              Référence: {reference}
            </Text>
            
            <Text style={styles.modalLabel}>Entrez votre PIN pour confirmer</Text>
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
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  setPin('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={confirmPayment}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
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
  pendingContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FF660030',
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF660015',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingIconText: {
    fontSize: 20,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingProvider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pendingRef: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  pendingDue: {
    fontSize: 10,
    color: '#FF6600',
    marginTop: 2,
  },
  pendingAmount: {
    alignItems: 'flex-end',
  },
  pendingAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6600',
  },
  pendingBadge: {
    backgroundColor: '#FF6600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  pendingBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  providersScroll: {
    paddingLeft: 20,
  },
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
  providerCardSelected: {
    borderWidth: 2,
    borderColor: '#008933',
    backgroundColor: '#F0FFF4',
  },
  providerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  providerCategory: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
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
  providerCheckText: {
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingBottom: 8,
    marginBottom: 16,
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
    marginBottom: 8,
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
  historyContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
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
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 20,
  },
  historyInfo: {
    flex: 1,
  },
  historyProvider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  historyRef: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 2,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008933',
  },
  historyStatus: {
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginBottom: 24,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
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
});