import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône transfert guichet
const IconTransferAgency = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="30" y="35" width="40" height="30" rx="4" fill="#008933" />
    <Path d="M30 45 L70 45" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M40 55 L60 55" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M35 35 L50 25 L65 35" stroke="#008933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="50" cy="65" r="8" fill="#FFD700" />
    <Path d="M47 65 L50 68 L54 63" stroke="#008933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône chevron bas
const IconChevronDown = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Données du Niger
const regionsData = {
  'Niamey': {
    departments: ['Niamey'],
    arrondissements: ['Niamey']
  },
  'Agadez': {
    departments: ['Tchirozérine', 'Arlit', 'Iférouane', 'Bilma'],
    arrondissements: ['Agadez Centre', 'Arlit Nord', 'Bilma Sud']
  },
  'Diffa': {
    departments: ['Diffa', 'Maïné-Soroa', "N'Gourti", 'Bosso'],
    arrondissements: ['Diffa Centre', 'Maïné-Soroa Nord']
  },
  'Dosso': {
    departments: ['Dosso', 'Gaya', 'Boboye', 'Dogondoutchi', 'Loga'],
    arrondissements: ['Dosso Centre', 'Gaya Est', 'Boboye Sud']
  },
  'Maradi': {
    departments: ['Maradi', 'Tessaoua', 'Madarounfa', 'Mayahi', 'Gguidan Roumdji', 'Dakoro'],
    arrondissements: ['Maradi Centre', 'Tessaoua Nord', 'Madarounfa Ouest']
  },
  'Tahoua': {
    departments: ['Tahoua', "Birni N'Konni", 'Bouza', 'Illela', 'Kéita', 'Madaoua', 'Tchintabaraden'],
    arrondissements: ['Tahoua Centre', "Birni N'Konni Est", 'Bouza Sud']
  },
  'Tillabéri': {
    departments: ['Tillabéri', 'Filingue', 'Kollo', 'Ouallam', 'Say', 'Téra'],
    arrondissements: ['Tillabéri Centre', 'Filingue Nord', 'Kollo Est']
  },
  'Zinder': {
    departments: ['Zinder', 'Mirriah', 'Magaria', 'Matameye', 'Takeita', 'Tanout', 'Goure'],
    arrondissements: ['Zinder Centre', 'Mirriah Nord', 'Magaria Est']
  }
};

export default function TransferToAgencyScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedArrondissement, setSelectedArrondissement] = useState('');
  const [amount, setAmount] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [arrondissementModalVisible, setArrondissementModalVisible] = useState(false);

  const generateTransferCode = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
  };

  const getDepartments = (region) => {
    return regionsData[region]?.departments || [];
  };

  const getArrondissements = (region, department) => {
    return regionsData[region]?.arrondissements || [];
  };

  const handleSend = () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }
    if (!beneficiaryName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du bénéficiaire');
      return;
    }
    if (!selectedRegion) {
      Alert.alert('Erreur', 'Veuillez sélectionner une région');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Erreur', 'Veuillez sélectionner un département');
      return;
    }
    if (!selectedArrondissement) {
      Alert.alert('Erreur', 'Veuillez sélectionner un arrondissement');
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

    const code = generateTransferCode();
    setGeneratedCode(code);
    setModalVisible(true);
  };

  const confirmTransfer = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer votre PIN à 4 chiffres');
      return;
    }
    
    if (pin === '0000') {
      Alert.alert(
        'Succès',
        `Transfert de ${amount} FCFA effectué avec succès !\n\nCode de retrait : ${generatedCode}\n\nLe bénéficiaire peut retirer dans n'importe quelle agence NT Albey avec ce code.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setModalVisible(false);
              setPin('');
              setPhoneNumber('');
              setBeneficiaryName('');
              setSelectedRegion('');
              setSelectedDepartment('');
              setSelectedArrondissement('');
              setAmount('');
              setGeneratedCode('');
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  const regions = Object.keys(regionsData);
  const departments = getDepartments(selectedRegion);
  const arrondissements = getArrondissements(selectedRegion, selectedDepartment);

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
    illustrationSubtext: {
      fontSize: 12,
      color: '#888',
      marginTop: 4,
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
    pickerDisabled: {
      opacity: 0.5,
    },
    pickerText: {
      fontSize: 15,
      color: '#1A1A1A',
    },
    pickerPlaceholder: {
      fontSize: 15,
      color: '#AAA',
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
      fontSize: 14,
      fontWeight: '700',
      color: '#FF6600',
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfert Guichet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        <View style={styles.illustrationContainer}>
          <IconTransferAgency />
          <Text style={styles.illustrationText}>Envoyez de l'argent à retirer en guichet</Text>
          <Text style={styles.illustrationSubtext}>Le bénéficiaire retire en agence NT Albey</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>125 000 FCFA</Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>Transfert sécurisé</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Informations du bénéficiaire</Text>

          <Text style={styles.inputLabel}>Numéro de téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 93 45 22 71"
            placeholderTextColor="#AAA"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          <Text style={styles.inputLabel}>Nom complet du bénéficiaire</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Amadou Ibrahim"
            placeholderTextColor="#AAA"
            value={beneficiaryName}
            onChangeText={setBeneficiaryName}
          />

          <Text style={styles.inputLabel}>Région</Text>
          <TouchableOpacity 
            style={styles.pickerInput} 
            onPress={() => setRegionModalVisible(true)}
          >
            <Text style={selectedRegion ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedRegion || 'Sélectionner une région'}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Département</Text>
          <TouchableOpacity 
            style={[styles.pickerInput, !selectedRegion && styles.pickerDisabled]} 
            onPress={() => selectedRegion && setDepartmentModalVisible(true)}
          >
            <Text style={selectedDepartment ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedDepartment || (selectedRegion ? 'Sélectionner un département' : 'Sélectionnez d\'abord une région')}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Arrondissement / Commune</Text>
          <TouchableOpacity 
            style={[styles.pickerInput, !selectedDepartment && styles.pickerDisabled]} 
            onPress={() => selectedDepartment && setArrondissementModalVisible(true)}
          >
            <Text style={selectedArrondissement ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedArrondissement || (selectedDepartment ? 'Sélectionner un arrondissement' : 'Sélectionnez d\'abord un département')}
            </Text>
            <IconChevronDown />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Montant à envoyer</Text>
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

        <TouchableOpacity
          style={[styles.sendButton, (!phoneNumber || !beneficiaryName || !selectedRegion || !selectedDepartment || !selectedArrondissement || !amount) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!phoneNumber || !beneficiaryName || !selectedRegion || !selectedDepartment || !selectedArrondissement || !amount}
        >
          <Text style={styles.sendButtonText}>Envoyer {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.sendIconCircle}>
            <Text style={styles.sendIcon}>→</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Comment ça fonctionne ?</Text>
          <Text style={styles.infoText}>• Le bénéficiaire reçoit un code de retrait par SMS</Text>
          <Text style={styles.infoText}>• Il se rend dans n'importe quelle agence NT Albey</Text>
          <Text style={styles.infoText}>• Présente son numéro de téléphone et le code</Text>
          <Text style={styles.infoText}>• Retire l'argent en espèces</Text>
        </View>

      </ScrollView>

      {/* MODAL SÉLECTION RÉGION */}
      <Modal visible={regionModalVisible} transparent onRequestClose={() => setRegionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Sélectionner une région</Text>
            <ScrollView style={styles.pickerList}>
              {regions.map((region, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedRegion(region);
                    setSelectedDepartment('');
                    setSelectedArrondissement('');
                    setRegionModalVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{region}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setRegionModalVisible(false)}>
              <Text style={styles.pickerCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SÉLECTION DÉPARTEMENT */}
      <Modal visible={departmentModalVisible} transparent onRequestClose={() => setDepartmentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Sélectionner un département</Text>
            <ScrollView style={styles.pickerList}>
              {departments.map((dept, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedDepartment(dept);
                    setSelectedArrondissement('');
                    setDepartmentModalVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{dept}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setDepartmentModalVisible(false)}>
              <Text style={styles.pickerCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SÉLECTION ARRONDISSEMENT */}
      <Modal visible={arrondissementModalVisible} transparent onRequestClose={() => setArrondissementModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Sélectionner un arrondissement / commune</Text>
            <ScrollView style={styles.pickerList}>
              {arrondissements.map((arr, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedArrondissement(arr);
                    setArrondissementModalVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{arr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setArrondissementModalVisible(false)}>
              <Text style={styles.pickerCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMATION PIN */}
      <Modal visible={modalVisible} transparent onRequestClose={() => { setModalVisible(false); setPin(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <IconTransferAgency />
            </View>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalSubtitle}>
              Transfert de {amount} FCFA
            </Text>
            <Text style={styles.modalSubtitle2}>
              à {beneficiaryName}
            </Text>
            <Text style={styles.modalRef}>
              Code de retrait: {generatedCode}
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
              <TouchableOpacity style={styles.pinEye} onPress={() => setPinVisible(!pinVisible)}>
                <Text>{pinVisible ? '👁️' : '🔒'}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); setPin(''); }}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmTransfer}>
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}