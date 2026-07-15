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
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône retrait
const IconWithdraw = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Path d="M50 30 L50 70" stroke="#FF6600" strokeWidth="4" strokeLinecap="round" />
    <Path d="M35 55 L50 70 L65 55" stroke="#FF6600" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Rect x="35" y="72" width="30" height="8" rx="2" fill="#FF6600" />
    <Circle cx="50" cy="45" r="5" fill="#10B981" />
  </Svg>
);

// Icône localisation
const IconLocation = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#008933" strokeWidth="1.8" />
    <Circle cx="12" cy="9" r="2.5" fill="#008933" />
  </Svg>
);

// Icône agent
const IconAgent = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#008933" strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M12 12 L12 8" stroke="#008933" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

// Icône carte
const IconCard = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="6" width="18" height="12" rx="2" stroke="#008933" strokeWidth="1.8" />
    <Path d="M3 10h18" stroke="#008933" strokeWidth="1.8" />
    <Path d="M7 14h4" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export default function WithdrawScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  // Méthodes de retrait
  const withdrawMethods = [
    { id: 'agent', name: 'Retrait par Agent', icon: '👤', description: 'Retrait chez un agent NT Albey', color: '#FF6600' },
    { id: 'atm', name: 'Distributeur ATM', icon: '🏧', description: 'Retrait aux GAB partenaires', color: '#3B82F6' },
  ];

  // Points de retrait (agents)
  const withdrawLocations = [
    { id: 1, name: 'Agence NT Niamey', address: 'Boulevard de l\'Indépendance, Niamey', distance: '500m', rating: 4.8 },
    { id: 2, name: 'Alimentation Bonprix', address: 'Quartier Plateau, Niamey', distance: '1.2km', rating: 4.5 },
    { id: 3, name: 'Station Total', address: 'Route de l\'Aéroport, Niamey', distance: '2.5km', rating: 4.7 },
    { id: 4, name: 'Super U', address: 'Centre Commercial, Niamey', distance: '3km', rating: 4.6 },
  ];

  const handleWithdraw = () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode de retrait');
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
    if (selectedMethod.id === 'agent' && !selectedLocation) {
      Alert.alert('Erreur', 'Veuillez sélectionner un point de retrait');
      return;
    }
    
    // Ouvrir modal pour confirmation avec PIN
    setModalVisible(true);
  };

  const confirmWithdraw = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer votre PIN à 4 chiffres');
      return;
    }
    
    if (pin === '0000') {
      Alert.alert(
        'Confirmation',
        `Retrait de ${amount} FCFA par ${selectedMethod.name} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => {
            Alert.alert('Succès', `Retrait de ${amount} FCFA effectué avec succès !`);
            setModalVisible(false);
            setPin('');
            navigation.goBack();
          }}
        ]
      );
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  const getMethodIcon = (methodId) => {
    switch(methodId) {
      case 'agent': return '👤';
      case 'atm': return '🏧';
      case 'bank': return '🏦';
      default: return '💰';
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Retrait d'argent</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ILLUSTRATION */}
        <View style={styles.illustrationContainer}>
          <IconWithdraw />
          <Text style={styles.illustrationText}>Retirez votre argent facilement</Text>
        </View>

        {/* SOLDE DISPONIBLE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde disponible</Text>
          <Text style={styles.balanceAmount}>125 000 FCFA</Text>
          <View style={styles.balanceLimit}>
            <Text style={styles.balanceLimitText}>Limite de retrait : 500 000 FCFA/jour</Text>
          </View>
        </View>

        {/* SECTION MONTANT */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>Montant à retirer</Text>
          
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

        {/* SECTION MÉTHODE DE RETRAIT */}
        <Text style={styles.sectionLabel}>Méthode de retrait</Text>
        <View style={styles.methodsContainer}>
          {withdrawMethods.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod?.id === method.id && styles.methodCardSelected
              ]}
              onPress={() => setSelectedMethod(method)}
            >
              <View style={[styles.methodIcon, { backgroundColor: `${method.color}15` }]}>
                <Text style={styles.methodIconText}>{method.icon}</Text>
              </View>
              <Text style={styles.methodName}>{method.name}</Text>
              <Text style={styles.methodDescription}>{method.description}</Text>
              {selectedMethod?.id === method.id && (
                <View style={styles.methodCheck}>
                  <Text style={styles.methodCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* SECTION POINTS DE RETRAIT (si méthode agent sélectionnée) */}
        {selectedMethod?.id === 'agent' && (
          <>
            <Text style={styles.sectionLabel}>Points de retrait à proximité</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationsScroll}>
              {withdrawLocations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationCard,
                    selectedLocation?.id === location.id && styles.locationCardSelected
                  ]}
                  onPress={() => setSelectedLocation(location)}
                >
                  <View style={styles.locationHeader}>
                    <View style={styles.locationIcon}>
                      <IconLocation />
                    </View>
                    {selectedLocation?.id === location.id && (
                      <View style={styles.locationCheck}>
                        <Text style={styles.locationCheckText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                  <View style={styles.locationFooter}>
                    <Text style={styles.locationDistance}>📍 {location.distance}</Text>
                    <Text style={styles.locationRating}>⭐ {location.rating}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* SECTION FRAIS */}
        <View style={styles.feesCard}>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Frais de retrait</Text>
            <Text style={styles.feesValue}>
              {amount ? `${Math.floor(parseInt(amount) * 0.005)} FCFA` : '0 FCFA'}
            </Text>
          </View>
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Montant net à recevoir</Text>
            <Text style={styles.totalValue}>
              {amount ? `${parseInt(amount) - Math.floor(parseInt(amount) * 0.005)} FCFA` : '0 FCFA'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesRow}>
            <Text style={styles.feesLabel}>Compte débité</Text>
            <Text style={styles.accountInfo}>Wallet principal •••• 4587</Text>
          </View>
        </View>

        {/* BOUTON RETIRER */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!selectedMethod || !amount) && styles.withdrawButtonDisabled
          ]}
          onPress={handleWithdraw}
          disabled={!selectedMethod || !amount}
        >
          <Text style={styles.withdrawButtonText}>Retirer {amount ? `${amount} FCFA` : ''}</Text>
          <View style={styles.withdrawIconCircle}>
            <Text style={styles.withdrawIcon}>↓</Text>
          </View>
        </TouchableOpacity>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📌 Informations importantes</Text>
          <Text style={styles.infoText}>• Les frais de retrait sont de 0.5% du montant</Text>
          <Text style={styles.infoText}>• Retrait maximum par transaction : 500 000 FCFA</Text>
          <Text style={styles.infoText}>• Pièce d'identité requise pour les retraits > 100 000 FCFA</Text>
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
              <IconWithdraw />
            </View>
            <Text style={styles.modalTitle}>Confirmation</Text>
            <Text style={styles.modalSubtitle}>
              Retrait de {amount} FCFA
            </Text>
            <Text style={styles.modalSubtitle2}>
              par {selectedMethod?.name}
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
                onPress={confirmWithdraw}
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
    marginBottom: 8,
  },
  balanceLimit: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
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
  amountSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
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
  methodsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  methodCardSelected: {
    borderWidth: 2,
    borderColor: '#008933',
    backgroundColor: '#F0FFF4',
  },
  methodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  methodDescription: {
    fontSize: 12,
    color: '#888',
    position: 'absolute',
    bottom: 12,
    left: 81,
  },
  methodCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCheckText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationsScroll: {
    paddingLeft: 20,
  },
  locationCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  locationCardSelected: {
    borderWidth: 2,
    borderColor: '#008933',
    backgroundColor: '#F0FFF4',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCheckText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
  },
  locationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationDistance: {
    fontSize: 10,
    color: '#008933',
  },
  locationRating: {
    fontSize: 10,
    color: '#F59E0B',
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
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6600',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
  },
  withdrawButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  withdrawIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawIcon: {
    fontSize: 24,
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
    backgroundColor: '#FF6600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});