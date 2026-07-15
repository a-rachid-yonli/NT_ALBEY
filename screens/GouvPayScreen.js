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
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône Gouv-Pay principale
const IconGouvPay = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Path d="M50 20 L25 35 L25 50 C25 65 35 78 50 82 C65 78 75 65 75 50 L75 35 L50 20Z" fill="#008933" />
    <Path d="M50 35 L50 50 M50 50 L40 45 M50 50 L60 45" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

// Icônes des catégories
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

export default function GouvPayScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  // Catégories de paiement
  const categories = [
    { id: 'impots', name: 'Impôts', icon: IconImpot, color: '#008933', description: 'TVA, ISB, IR, BIC', fields: ['Numéro IFU', 'Période', 'Nom'] },
    { id: 'taxes', name: 'Taxes locales', icon: IconTaxe, color: '#3B82F6', description: 'Taxe d\'habitation, foncière', fields: ['Numéro fiscal', 'Année', 'Nom du contribuable'] },
    { id: 'amendes', name: 'Amendes', icon: IconAmende, color: '#FF6600', description: 'Contraventions, PV', fields: ['Numéro du PV', 'Immatriculation', 'Nom'] },
    { id: 'douane', name: 'Douane', icon: IconDouane, color: '#8B5CF6', description: 'Droits de douane', fields: ['Numéro déclaration', 'Code douanier', 'Nom'] },
    { id: 'patente', name: 'Patente', icon: IconPatente, color: '#F59E0B', description: 'Licence, vignette', fields: ['Numéro patente', 'Année', 'Nom commerce'] },
    { id: 'carteGrise', name: 'Carte Grise', icon: IconCarteGrise, color: '#EC4899', description: 'Certificat d\'immatriculation', fields: ['Numéro certificat', 'Immatriculation', 'Nom'] },
  ];

  // Services additionnels
  const services = [
    { id: 'casier', name: 'Casier judiciaire', price: 2000, description: 'Extrait de casier judiciaire' },
    { id: 'cni', name: 'CNI', price: 5000, description: 'Carte nationale d\'identité' },
    { id: 'passeport', name: 'Passeport', price: 25000, description: 'Passeport biométrique' },
    { id: 'etatCivil', name: 'État civil', price: 1500, description: 'Acte de naissance/mariage' },
  ];

  const handlePayment = () => {
    if (!selectedCategory) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
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
        `Paiement de ${amount} FCFA (${selectedCategory.name}) ?\nRéférence: ${reference}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => {
            Alert.alert('Succès', `Paiement effectué avec succès !\n${selectedCategory.name}\nRéférence: ${reference}`);
            setModalVisible(false);
            setPin('');
            setReference('');
            setAmount('');
            setCustomerName('');
            setSelectedCategory(null);
          }}
        ]
      );
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  const handleServicePayment = (service) => {
    setSelectedCategory({ id: service.id, name: service.name });
    setAmount(service.price.toString());
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gouv-Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconGouvPay />
          <Text style={styles.illustrationText}>Payez vos impôts et taxes en ligne</Text>
        </View>

        {/* SOLDE DISPONIBLE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>125 000 FCFA</Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>Paiement sécurisé</Text>
          </View>
        </View>

        {/* SECTION CATÉGORIES */}
        <Text style={styles.sectionLabel}>🏛️ Catégories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map(category => {
            const IconComponent = category.icon;
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
                  setCustomerName('');
                }}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                  <IconComponent />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDesc}>{category.description}</Text>
                {selectedCategory?.id === category.id && (
                  <View style={styles.categoryCheck}>
                    <Text style={styles.categoryCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SECTION SERVICES ADMINISTRATIFS */}
        <Text style={styles.sectionLabel}>🪪 Services administratifs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
          {services.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => handleServicePayment(service)}
            >
              <View style={styles.serviceIcon}>
                <Text style={styles.serviceIconText}>📄</Text>
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDesc}>{service.description}</Text>
              <Text style={styles.servicePrice}>{service.price} FCFA</Text>
              <View style={styles.serviceButton}>
                <Text style={styles.serviceButtonText}>Payer</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SECTION FORMULAIRE (si catégorie sélectionnée) */}
        {selectedCategory && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Paiement {selectedCategory.name}</Text>
            
            {selectedCategory.fields?.map((field, index) => (
              <View key={index}>
                <Text style={styles.inputLabel}>{field}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Entrez ${field.toLowerCase()}`}
                  placeholderTextColor="#AAA"
                  value={field === 'Numéro IFU' || field === 'Numéro fiscal' || field === 'Numéro du PV' || field === 'Numéro déclaration' || field === 'Numéro patente' || field === 'Numéro certificat' ? reference : customerName}
                  onChangeText={(text) => {
                    if (field === 'Numéro IFU' || field === 'Numéro fiscal' || field === 'Numéro du PV' || field === 'Numéro déclaration' || field === 'Numéro patente' || field === 'Numéro certificat') {
                      setReference(text);
                    } else if (field === 'Immatriculation') {
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
              {['5000', '10000', '25000', '50000', '100000'].map(sug => (
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
            (!selectedCategory || !reference || !amount) && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={!selectedCategory || !reference || !amount}
        >
          <Text style={styles.payButtonText}>Payer {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.payIconCircle}>
            <Text style={styles.payIcon}>→</Text>
          </View>
        </TouchableOpacity>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informations importantes</Text>
          <Text style={styles.infoText}>• Paiement sécurisé des impôts et taxes</Text>
          <Text style={styles.infoText}>• Reçu officiel disponible après paiement</Text>
          <Text style={styles.infoText}>• Délai de traitement: 24-48h</Text>
          <Text style={styles.infoText}>• Service support: 111 ou gouv-pay@nt.ne</Text>
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
              <IconGouvPay />
            </View>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalSubtitle}>
              Paiement {selectedCategory?.name}
            </Text>
            <Text style={styles.modalPrice}>
              {amount} FCFA
            </Text>
            {reference && (
              <Text style={styles.modalRef}>
                Référence: {reference}
              </Text>
            )}
            
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
  categoriesScroll: {
    paddingLeft: 20,
  },
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
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  categoryDesc: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
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
  servicesScroll: {
    paddingLeft: 20,
  },
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
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceIconText: {
    fontSize: 24,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008933',
    marginBottom: 8,
  },
  serviceButton: {
    backgroundColor: '#008933',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  serviceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  modalPrice: {
    fontSize: 16,
    color: '#FF6600',
    fontWeight: '700',
    marginBottom: 8,
  },
  modalRef: {
    fontSize: 14,
    color: '#666',
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