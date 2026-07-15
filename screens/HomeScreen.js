// screens/HomeScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Modal,
  Alert,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import MainLayout from '../components/MainLayout';

const { width } = Dimensions.get('window');

// ===== ICÔNES SVG =====
const IconEnvoyer = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconRetrait = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v12M8 11l4 4 4-4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 20h14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconPaiement = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke="#10B981" strokeWidth="2" />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke="#10B981" strokeWidth="2" />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke="#10B981" strokeWidth="2" />
    <Path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2zM18 16h-2v2" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const IconBoutique = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l1-5h16l1 5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9" stroke="#F59E0B" strokeWidth="2" />
    <Path d="M9 9v3a3 3 0 006 0V9" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconGouv = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" stroke="#14B8A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconHistorique = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#6366F1" strokeWidth="2" />
    <Path d="M12 7v5l3 3" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconTransfertGuichet = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="8" width="16" height="12" rx="2" stroke="#008933" strokeWidth="1.8" />
    <Path d="M12 4L8 8h8L12 4z" stroke="#008933" strokeWidth="1.8" strokeLinejoin="round" />
    <Path d="M9 14l3 3 3-3" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 11v6" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconPlus = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#94A3B8" strokeWidth="2" />
    <Path d="M8 12h8M12 8v8" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// Icône œil (pour afficher/masquer le solde)
const IconEye = ({ visible }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" />
  </Svg>
);

// ===== MINI GRAPHE EN BARRES =====
const BarChart = () => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const values = [60, 45, 90, 30, 50, 40, 35];
  const maxH = 70;
  const barW = 18;
  const yLabels = ['100k', '75k', '50k', '25k', '0'];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <View style={{ justifyContent: 'space-between', height: maxH + 20, marginRight: 6 }}>
        {yLabels.map((l) => (
          <Text key={l} style={{ fontSize: 9, color: '#AAAAAA' }}>{l}</Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: maxH }}>
          {values.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: barW,
                  height: (v / 100) * maxH,
                  backgroundColor: i === 2 ? '#FF6600' : '#FFB347',
                  borderRadius: 5,
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {days.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: '#AAAAAA' }}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ===== MODAL PLUS =====
const PlusModal = ({ visible, onClose, navigation }) => {
  const features = [
    { 
      id: 'epargne', 
      name: 'Épargne', 
      icon: '🏦', 
      color: '#008933', 
      description: 'Coffre-fort & objectifs',
      screen: 'Savings',
      available: true,
    },
    { 
      id: 'crypto', 
      name: 'Crypto-monnaies', 
      icon: '₿', 
      color: '#F7931A', 
      description: 'Achetez et vendez des cryptos',
      screen: null,
      available: false,
    },
    { 
      id: 'assurance', 
      name: 'Assurances', 
      icon: '🛡️', 
      color: '#06B6D4', 
      description: 'Souscrivez en ligne',
      screen: null,
      available: false,
    },
    { 
      id: 'parrainage', 
      name: 'Parrainage', 
      icon: '👥', 
      color: '#8B5CF6', 
      description: 'Invitez vos amis',
      screen: null,
      available: false,
    },
  ];

  const handleFeaturePress = (item) => {
    if (item.available && item.screen) {
      navigation.navigate(item.screen);
      onClose();
    } else {
      Alert.alert('Bientôt disponible', 'Cette fonctionnalité arrive bientôt !');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={stylesPlus.modalOverlay}>
        <View style={stylesPlus.modalContent}>
          <View style={stylesPlus.modalHeader}>
            <Text style={stylesPlus.modalTitle}>✨ Plus de fonctionnalités</Text>
            <TouchableOpacity onPress={onClose} style={stylesPlus.modalClose}>
              <Text style={stylesPlus.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={stylesPlus.modalSubtitle}>
            Découvrez toutes les fonctionnalités de NT Albey
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={stylesPlus.gridContainer}>
            {features.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  stylesPlus.gridItem,
                  !item.available && stylesPlus.gridItemDisabled
                ]}
                onPress={() => handleFeaturePress(item)}
                activeOpacity={item.available ? 0.7 : 1}
              >
                <View style={[stylesPlus.gridIcon, { backgroundColor: `${item.color}15` }]}>
                  <Text style={stylesPlus.gridIconText}>{item.icon}</Text>
                </View>
                <Text style={stylesPlus.gridName}>{item.name}</Text>
                <Text style={stylesPlus.gridDesc} numberOfLines={1}>{item.description}</Text>
                {!item.available && (
                  <View style={stylesPlus.comingBadge}>
                    <Text style={stylesPlus.comingBadgeText}>🚀 Soon</Text>
                  </View>
                )}
                {item.available && (
                  <View style={stylesPlus.availableBadge}>
                    <Text style={stylesPlus.availableBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={stylesPlus.closeButton} onPress={onClose}>
            <Text style={stylesPlus.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const stylesPlus = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  gridItemDisabled: {
    opacity: 0.6,
  },
  gridIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridIconText: {
    fontSize: 28,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  gridDesc: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  comingBadge: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#00893330',
  },
  comingBadgeText: {
    fontSize: 9,
    color: '#008933',
    fontWeight: '600',
  },
  availableBadge: {
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
  availableBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#008933',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ===== HOME SCREEN =====
export default function HomeScreen({ onLogout }) {
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [plusModalVisible, setPlusModalVisible] = useState(false);
  const navigation = useNavigation();

  const quickActions = [
    { key: 'envoyer', label: 'Compte à Compte', Icon: IconEnvoyer, screen: 'SendMoney' },
    { key: 'retrait', label: 'Envoi à moi même', Icon: IconRetrait, screen: 'Withdraw' },
    { key: 'transfertGuichet', label: 'Transfert d argent', Icon: IconTransfertGuichet, screen: 'TransferToAgency' },
    { key: 'paiement', label: 'Paiement', Icon: IconPaiement, screen: 'Payment' },
    { key: 'boutique', label: 'Boutique NT', Icon: IconBoutique, screen: 'Shop' },
    { key: 'gouv', label: 'Gouv-Pay', Icon: IconGouv, screen: 'GouvPay' },
    { key: 'historique', label: 'Historique', Icon: IconHistorique, screen: 'History' },
    { key: 'plus', label: 'Plus', Icon: IconPlus, screen: null, action: 'modal' },
  ];

  const handlePress = (item) => {
    if (item.screen === 'SendMoney') {
      navigation.navigate('SendMoney');
    } else if (item.screen === 'Withdraw') {
      navigation.navigate('Withdraw');
    } else if (item.screen === 'TransferToAgency') {
      navigation.navigate('TransferToAgency');
    } else if (item.screen === 'Payment') {
      navigation.navigate('Payment');
    } else if (item.screen === 'Shop') {
      navigation.navigate('Shop');
    } else if (item.screen === 'GouvPay') {
      navigation.navigate('GouvPay');
    } else if (item.screen === 'History') {
      navigation.navigate('History');
    } else if (item.key === 'plus') {
      setPlusModalVisible(true);
    }
  };

  const maskedPhone = '**** 4587';

  return (
    <MainLayout activeScreen="Home" onLogout={onLogout}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
        {/* CARTE SOLDE */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
              <IconEye visible={balanceVisible} />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceAmount}>
            {balanceVisible ? '125 000' : '• • • • •'} <Text style={styles.balanceCurrency}>FCFA</Text>
          </Text>

          <View style={styles.balanceBottom}>
            <View>
              <Text style={styles.accountLabel}>Compte principal</Text>
              <Text style={styles.accountNumber}>{maskedPhone}</Text>
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke="#FF6600" strokeWidth="2.5" strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* GRILLE ACTIONS RAPIDES */}
        <View style={styles.actionsGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity 
              key={item.key} 
              style={styles.actionItem}
              onPress={() => handlePress(item)}
            >
              <View style={styles.actionIconWrapper}>
                <item.Icon />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* BANNIÈRE VISA & CARTES */}
        <TouchableOpacity 
          style={styles.transferBanner} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Visa')}
        >
          <View style={styles.transferText}>
            <Text style={styles.transferTitle}>Visa & Cartes</Text>
            <Text style={styles.transferSub}>Payez avec votre carte ou rechargez</Text>
          </View>
          
          <View style={styles.transferImageWrapper}>
            <Image
              source={require('../assets/images/transfert.png')}
              style={styles.transferImage}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        {/* DÉPENSES CE MOIS */}
        <View style={styles.expensesSection}>
          <View style={styles.expensesHeader}>
            <Text style={styles.expensesTitle}>Dépenses ce mois-ci</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.voirTout}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.expensesAmount}>
            <Text style={styles.expensesValue}>125 000 <Text style={styles.expensesCurrency}>FCFA</Text></Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendArrow}>▲</Text>
              <Text style={styles.trendText}> 12%</Text>
            </View>
            <Text style={styles.vsText}>  vs mois dernier</Text>
          </View>

          <BarChart />
        </View>
      </ScrollView>

      {/* MODAL PLUS */}
      <PlusModal visible={plusModalVisible} onClose={() => setPlusModalVisible(false)} navigation={navigation} />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: '#008933',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  balanceCurrency: {
    fontSize: 18,
    fontWeight: '600',
  },
  balanceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  accountNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    color: '#444',
    fontWeight: '500',
    textAlign: 'center',
  },
  transferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  transferText: {
    flex: 1,
    paddingRight: 12,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  transferSub: {
    fontSize: 13,
    color: '#888',
  },
  transferImageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E8F5E9',
    overflow: 'hidden',
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  transferImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  expensesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expensesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  voirTout: {
    color: '#FF6600',
    fontSize: 13,
    fontWeight: '600',
  },
  expensesAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  expensesValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  expensesCurrency: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 10,
  },
  trendArrow: {
    color: '#10B981',
    fontSize: 10,
  },
  trendText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  vsText: {
    color: '#AAAAAA',
    fontSize: 12,
    marginLeft: 4,
  },
});