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

// Icône paiement
const IconPayment = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="25" y="35" width="50" height="35" rx="4" fill="#008933" />
    <Path d="M35 55 L45 65 L65 40" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="75" cy="40" r="5" fill="#FFD700" />
  </Svg>
);

// Icône catégorie
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

const IconInternet = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M3 12h18M12 3v18" stroke="#EC4899" strokeWidth="1.5" />
    <Circle cx="12" cy="12" r="9" stroke="#EC4899" strokeWidth="1.5" />
    <Path d="M12 3a15 15 0 000 18" stroke="#EC4899" strokeWidth="1.5" />
    <Path d="M12 3a15 15 0 01-9 9" stroke="#EC4899" strokeWidth="1.5" />
    <Path d="M12 3a15 15 0 019 9" stroke="#EC4899" strokeWidth="1.5" />
  </Svg>
);

const IconAssurance = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z" stroke="#06B6D4" strokeWidth="1.5" />
    <Path d="M8.5 12.5l2.5 2.5 4-4" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconAutre = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#94A3B8" strokeWidth="1.5" />
    <Path d="M12 8v8M8 12h8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

// Icône chevron bas
const IconChevronDown = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function PaymentScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [favoritePayments, setFavoritePayments] = useState([]);
  
  // États spécifiques pour la scolarité
  const [selectedEcole, setSelectedEcole] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [showEcolePicker, setShowEcolePicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Liste des écoles
  const ecolesList = [
    'Lycée Mariama',
    'Lycée koira',
    'Collège beyrey',
    'lycée Tayamana',
    'Myriam de Nazareth',
    'Nouvelle Horizon',
    'Lycée Issa Beri',
    'Lycée Lako',
  ];

  // Liste des classes
  const classesList = [
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    'Seconde',
    'Première A',
    'Première C',
    'Première D',
    'Terminale A',
    'Terminale C',
    'Terminale D',
  ];

  // Catégories de paiement
  const categories = [
    { id: 'electricite', name: 'Électricité', icon: IconElectricite, color: '#008933', providers: ['NIGELEC'] },
    { id: 'eau', name: 'Eau', icon: IconEau, color: '#3B82F6', providers: ['NDE'] },
    { id: 'tv', name: 'TV / Internet', icon: IconTV, color: '#F59E0B', providers: ['CANAL+', 'TNT'] },
    { id: 'ecole', name: 'Scolarité', icon: IconEcole, color: '#8B5CF6', providers: ['École'] },
    { id: 'internet', name: 'Internet', icon: IconInternet, color: '#EC4899', providers: ['Orange', 'Moov', 'Airtel', 'Niger Télécoms'] },
    { id: 'assurance', name: 'Assurance', icon: IconAssurance, color: '#06B6D4', providers: ['CAREN', 'SANLAM', 'SUNU'] },
    { id: 'autre', name: 'Autre', icon: IconAutre, color: '#94A3B8', providers: ['Autre fournisseur'] },
  ];

  // Historique des paiements récents
  const recentPayments = [
    { id: 1, provider: 'Nigelec', reference: '12345678', amount: '27500', date: '20/05/2025', status: 'payé' },
    { id: 2, provider: 'CANAL+', reference: 'CAN123456', amount: '15000', date: '15/05/2025', status: 'payé' },
    { id: 3, provider: 'Orange Internet', reference: 'OR123456', amount: '10000', date: '10/05/2025', status: 'payé' },
  ];

  const handlePayment = () => {
    if (!selectedCategory) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return;
    }
    
    // Validation spécifique pour la scolarité
    if (selectedCategory.id === 'ecole') {
      if (!selectedEcole) {
        Alert.alert('Erreur', 'Veuillez sélectionner une école');
        return;
      }
      if (!studentName || studentName.trim().length < 2) {
        Alert.alert('Erreur', 'Veuillez entrer le nom et prénom de l\'élève');
        return;
      }
      if (!studentClass) {
        Alert.alert('Erreur', 'Veuillez sélectionner la classe');
        return;
      }
    } else {
      if (!reference || reference.length < 4) {
        Alert.alert('Erreur', 'Veuillez entrer une référence valide');
        return;
      }
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
      let message = `Paiement de ${amount} FCFA à ${selectedCategory.name} ?`;
      if (selectedCategory.id === 'ecole') {
        message = `Paiement de ${amount} FCFA pour ${studentName}\nÉcole: ${selectedEcole}\nClasse: ${studentClass}`;
      } else {
        message = `Paiement de ${amount} FCFA à ${selectedCategory.name} ?\nRéférence: ${reference}`;
      }
      
      Alert.alert(
        'Confirmation',
        message,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => {
            Alert.alert('Succès', `Paiement effectué avec succès !`);
            if (saveAsFavorite) {
              setFavoritePayments([...favoritePayments, {
                id: Date.now(),
                category: selectedCategory,
                reference: selectedCategory.id === 'ecole' ? studentName : reference,
                amount,
                customerName,
              }]);
            }
            setModalVisible(false);
            setPin('');
            // Réinitialiser les champs
            setSelectedEcole('');
            setStudentName('');
            setStudentClass('');
            setReference('');
            setAmount('');
            setCustomerName('');
            setSelectedCategory(null);
            navigation.goBack();
          }}
        ]
      );
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  const getCategoryIcon = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.icon || IconAutre;
  };

  // Rendu des champs spécifiques selon la catégorie
  const renderSpecificFields = () => {
    if (!selectedCategory) return null;

    // Pour la scolarité
    if (selectedCategory.id === 'ecole') {
      return (
        <>
          {/* Sélection de l'école */}
          <Text style={styles.inputLabel}>Nom de l'école</Text>
          <TouchableOpacity 
            style={styles.pickerInput} 
            onPress={() => setShowEcolePicker(true)}
          >
            <Text style={selectedEcole ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedEcole || 'Sélectionnez une école'}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>

          {/* Nom et prénom de l'élève */}
          <Text style={styles.inputLabel}>Nom et prénom de l'élève</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ibrahim Moussa"
            placeholderTextColor="#AAA"
            value={studentName}
            onChangeText={setStudentName}
          />

          {/* Classe de l'élève */}
          <Text style={styles.inputLabel}>Classe</Text>
          <TouchableOpacity 
            style={styles.pickerInput} 
            onPress={() => setShowClassPicker(true)}
          >
            <Text style={studentClass ? styles.pickerText : styles.pickerPlaceholder}>
              {studentClass || 'Sélectionnez une classe'}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>
        </>
      );
    }

    // Pour les autres catégories
    return (
      <>
        {/* Fournisseur / Type */}
        <Text style={styles.inputLabel}>Fournisseur / Type</Text>
        <View style={styles.providerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCategory.providers.map(provider => (
              <TouchableOpacity
                key={provider}
                style={styles.providerChip}
                onPress={() => setCustomerName(provider)}
              >
                <Text style={styles.providerChipText}>{provider}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Numéro de référence / compteur */}
        <Text style={styles.inputLabel}>
          {selectedCategory.id === 'electricite' ? 'Numéro de compteur' :
           selectedCategory.id === 'eau' ? 'Numéro de compteur' :
           selectedCategory.id === 'tv' ? 'Numéro d\'abonné' :
           selectedCategory.id === 'internet' ? 'Numéro de ligne' :
           selectedCategory.id === 'assurance' ? 'Numéro de contrat' :
           'Référence'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={`Ex: ${selectedCategory.id === 'electricite' ? '12345678' : 'REF123456'}`}
          placeholderTextColor="#AAA"
          keyboardType="numeric"
          value={reference}
          onChangeText={setReference}
        />

        {/* Nom du client (optionnel) */}
        <Text style={styles.inputLabel}>Nom du client (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Jean Dupont"
          placeholderTextColor="#AAA"
          value={customerName}
          onChangeText={setCustomerName}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconPayment />
          <Text style={styles.illustrationText}>Payez vos factures en toute simplicité</Text>
        </View>

        {/* SOLDE DISPONIBLE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>125 000 FCFA</Text>
        </View>

        {/* SECTION CATÉGORIES */}
        <Text style={styles.sectionLabel}>Catégories</Text>
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
                  setSelectedEcole('');
                  setStudentName('');
                  setStudentClass('');
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

        {/* SECTION FORMULAIRE (si catégorie sélectionnée) */}
        {selectedCategory && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Paiement {selectedCategory.name}</Text>
            
            {renderSpecificFields()}

            {/* Montant */}
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

            {/* Suggestions de montants */}
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

            {/* Option sauvegarder */}
            <View style={styles.saveRow}>
              <Text style={styles.saveLabel}>Sauvegarder ce paiement</Text>
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
            <Text style={styles.sectionLabel}>Paiements récents</Text>
            <View style={styles.recentContainer}>
              {recentPayments.map(payment => (
                <TouchableOpacity
                  key={payment.id}
                  style={styles.recentCard}
                  onPress={() => {
                    setReference(payment.reference);
                    setAmount(payment.amount);
                    const category = categories.find(c => 
                      c.providers.some(p => p === payment.provider)
                    );
                    if (category) setSelectedCategory(category);
                  }}
                >
                  <View style={styles.recentIcon}>
                    <Text style={styles.recentIconText}>📄</Text>
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentProvider}>{payment.provider}</Text>
                    <Text style={styles.recentRef}>Réf: {payment.reference}</Text>
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
            (!selectedCategory || !amount) && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={!selectedCategory || !amount}
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
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Sélectionner une école</Text>
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
              <Text style={styles.pickerCloseText}>Fermer</Text>
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
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Sélectionner une classe</Text>
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
              <Text style={styles.pickerCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <IconPayment />
            </View>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalSubtitle}>
              Paiement de {amount} FCFA
            </Text>
            <Text style={styles.modalSubtitle2}>
              {selectedCategory?.id === 'ecole' ? selectedEcole : selectedCategory?.name}
            </Text>
            {selectedCategory?.id === 'ecole' && (
              <Text style={styles.modalRef}>
                Élève: {studentName} - {studentClass}
              </Text>
            )}
            {selectedCategory?.id !== 'ecole' && (
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
  providerContainer: {
    marginBottom: 4,
  },
  providerChip: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#008933',
  },
  providerChipText: {
    color: '#008933',
    fontSize: 13,
    fontWeight: '500',
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
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  // Picker Modal styles
  pickerModalContent: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: height * 0.7,
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
    backgroundColor: '#008933',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  pickerCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});