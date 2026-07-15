import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  Modal,
  Share,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Icône retour
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône filtre
const IconFilter = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16M6 12h12M9 18h6" stroke="#666" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// Icône recherche
const IconSearch = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#999" strokeWidth="1.8" />
    <Path d="M21 21l-4.35-4.35" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// Icône partage
const IconShare = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Icône téléchargement
const IconDownload = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function HistoryScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Données des transactions
  const transactions = [
    { 
      id: 1, 
      type: 'transfert', 
      title: 'Transfert à Amadou Ibrahim',
      amount: -25000,
      date: '2026-06-10T09:41:00',
      status: 'success',
      icon: '📤',
      color: '#FF6600',
      phone: '93 45 22 71',
      reference: 'TRF25052024094518'
    },
    { 
      id: 2, 
      type: 'paiement', 
      title: 'Paiement Nigelec',
      amount: -27500,
      date: '2026-06-10T08:30:00',
      status: 'success',
      icon: '⚡',
      color: '#10B981',
      reference: 'BILL25052024094518'
    },
    { 
      id: 3, 
      type: 'reception', 
      title: 'Réception de Aïssata Moussa',
      amount: 50000,
      date: '2026-06-09T17:20:00',
      status: 'success',
      icon: '📥',
      color: '#3B82F6',
      phone: '83 35 62 00',
      reference: 'REC123456789'
    },
    { 
      id: 4, 
      type: 'achat', 
      title: 'Achat Internet 5 Go',
      amount: -1000,
      date: '2026-06-09T14:05:00',
      status: 'success',
      icon: '🌐',
      color: '#8B5CF6',
      reference: 'ACH987654321'
    },
    { 
      id: 5, 
      type: 'retrait', 
      title: 'Retrait Agent NT',
      amount: -15000,
      date: '2026-06-08T11:30:00',
      status: 'success',
      icon: '💰',
      color: '#F59E0B',
      reference: 'WTD456789123'
    },
    { 
      id: 6, 
      type: 'paiement', 
      title: 'Paiement Eau NDE',
      amount: -8000,
      date: '2026-06-08T10:15:00',
      status: 'success',
      icon: '💧',
      color: '#3B82F6',
      reference: 'WTR789123456'
    },
    { 
      id: 7, 
      type: 'transfert', 
      title: 'Transfert à Maman',
      amount: -5000,
      date: '2026-06-07T16:45:00',
      status: 'success',
      icon: '📤',
      color: '#FF6600',
      phone: '83 78 90 11',
      reference: 'TRF456789123'
    },
    { 
      id: 8, 
      type: 'recharge', 
      title: 'Recharge crédit NT',
      amount: -500,
      date: '2026-06-07T09:20:00',
      status: 'success',
      icon: '📱',
      color: '#EC4899',
      reference: 'RCH321654987'
    },
  ];

  // Filtrer les transactions
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Filtre par type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => t.type === selectedFilter);
    }
    
    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.phone && t.phone.includes(searchQuery))
      );
    }
    
    // Trier par date (plus récent en premier)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return filtered;
  };

  const getFilteredByType = () => {
    let filtered = [...transactions];
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Hier, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  };

  const getAmountStyle = (amount) => ({
    color: amount > 0 ? '#10B981' : '#1A1A1A',
    fontWeight: '600',
  });

  const getAmountPrefix = (amount) => amount > 0 ? '+ ' : '- ';

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleShare = async (transaction) => {
    const message = `NT Albey - Transaction\nType: ${transaction.title}\nMontant: ${transaction.amount > 0 ? '+' : ''}${transaction.amount} FCFA\nDate: ${new Date(transaction.date).toLocaleString('fr-FR')}\nRéférence: ${transaction.reference}`;
    try {
      await Share.share({ message });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager');
    }
  };

  const filteredTransactions = getFilteredTransactions();

  // Statistiques
  const totalDepense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReception = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique</Text>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
          <IconFilter />
        </TouchableOpacity>
      </View>

      {/* STATISTIQUES RAPIDES */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total dépensé</Text>
          <Text style={styles.statValueExpense}>{totalDepense.toLocaleString()} FCFA</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total reçu</Text>
          <Text style={styles.statValueIncome}>{totalReception.toLocaleString()} FCFA</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Transactions</Text>
          <Text style={styles.statValueCount}>{totalTransactions}</Text>
        </View>
      </View>

      {/* BARRE DE RECHERCHE */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <IconSearch />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une transaction..."
          placeholderTextColor="#AAA"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FILTRES RAPIDES */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'transfert' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('transfert')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'transfert' && styles.filterChipTextActive]}>Transferts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'reception' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('reception')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'reception' && styles.filterChipTextActive]}>Réceptions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'paiement' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('paiement')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'paiement' && styles.filterChipTextActive]}>Paiements</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'achat' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('achat')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'achat' && styles.filterChipTextActive]}>Achats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'retrait' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('retrait')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'retrait' && styles.filterChipTextActive]}>Retraits</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LISTE DES TRANSACTIONS */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.transactionsList}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptyText}>Aucune transaction trouvée pour ce filtre</Text>
          </View>
        ) : (
          filteredTransactions.map((transaction, index) => {
            const isLast = index === filteredTransactions.length - 1;
            return (
              <TouchableOpacity
                key={transaction.id}
                style={[styles.transactionCard, !isLast && styles.transactionCardBorder]}
                onPress={() => handleTransactionPress(transaction)}
              >
                <View style={[styles.transactionIcon, { backgroundColor: `${transaction.color}15` }]}>
                  <Text style={styles.transactionIconText}>{transaction.icon}</Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.title}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                  {transaction.phone && (
                    <Text style={styles.transactionPhone}>{transaction.phone}</Text>
                  )}
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[styles.transactionAmountValue, getAmountStyle(transaction.amount)]}>
                    {getAmountPrefix(transaction.amount)}{Math.abs(transaction.amount).toLocaleString()} FCFA
                  </Text>
                  <View style={[styles.statusBadge, transaction.status === 'success' && styles.statusSuccess]}>
                    <Text style={styles.statusText}>✓</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODAL DÉTAIL TRANSACTION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détail de la transaction</Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedTransaction && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailIconContainer}>
                  <View style={[styles.detailIcon, { backgroundColor: `${selectedTransaction.color}15` }]}>
                    <Text style={styles.detailIconText}>{selectedTransaction.icon}</Text>
                  </View>
                </View>

                <Text style={styles.detailTitle}>{selectedTransaction.title}</Text>
                <Text style={[styles.detailAmount, selectedTransaction.amount > 0 ? styles.detailAmountPositive : styles.detailAmountNegative]}>
                  {selectedTransaction.amount > 0 ? '+' : '-'}{Math.abs(selectedTransaction.amount).toLocaleString()} FCFA
                </Text>

                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Statut</Text>
                    <View style={styles.statusBadgeLarge}>
                      <Text style={styles.statusTextLarge}>✓ Payé</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{new Date(selectedTransaction.date).toLocaleString('fr-FR')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Référence</Text>
                    <Text style={styles.detailValueRef}>{selectedTransaction.reference}</Text>
                  </View>
                  {selectedTransaction.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Téléphone</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.phone}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Compte débité</Text>
                    <Text style={styles.detailValue}>Wallet principal •••• 4587</Text>
                  </View>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailButton} onPress={() => handleShare(selectedTransaction)}>
                    <IconShare />
                    <Text style={styles.detailButtonText}>Partager</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailButton}>
                    <IconDownload />
                    <Text style={styles.detailButtonText}>Télécharger</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL FILTRES AVANCÉS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.filterModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Type de transaction</Text>
            <View style={styles.filterOptions}>
              {['all', 'transfert', 'reception', 'paiement', 'achat', 'retrait'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterOption, typeFilter === type && styles.filterOptionActive]}
                  onPress={() => setTypeFilter(type)}
                >
                  <Text style={[styles.filterOptionText, typeFilter === type && styles.filterOptionTextActive]}>
                    {type === 'all' ? 'Tous' : 
                     type === 'transfert' ? 'Transferts' :
                     type === 'reception' ? 'Réceptions' :
                     type === 'paiement' ? 'Paiements' :
                     type === 'achat' ? 'Achats' : 'Retraits'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Période</Text>
            <View style={styles.filterOptions}>
              {['all', 'today', 'week', 'month'].map(period => (
                <TouchableOpacity
                  key={period}
                  style={[styles.filterOption, dateRange === period && styles.filterOptionActive]}
                  onPress={() => setDateRange(period)}
                >
                  <Text style={[styles.filterOptionText, dateRange === period && styles.filterOptionTextActive]}>
                    {period === 'all' ? 'Toujours' :
                     period === 'today' ? 'Aujourd\'hui' :
                     period === 'week' ? 'Cette semaine' : 'Ce mois'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => {
                setFilterModalVisible(false);
                // Appliquer les filtres
                let newFilter = selectedFilter;
                if (typeFilter !== 'all') newFilter = typeFilter;
                setSelectedFilter(newFilter);
              }}
            >
              <Text style={styles.applyButtonText}>Appliquer les filtres</Text>
            </TouchableOpacity>
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
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  statValueExpense: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6600',
  },
  statValueIncome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  statValueCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008933',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    color: '#999',
    fontSize: 14,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#008933',
    borderColor: '#008933',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 22,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#888',
  },
  transactionPhone: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSuccess: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  // Modal styles
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
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconText: {
    fontSize: 32,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailAmountPositive: {
    color: '#10B981',
  },
  detailAmountNegative: {
    color: '#1A1A1A',
  },
  detailCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  detailValueRef: {
    fontSize: 12,
    fontWeight: '500',
    color: '#008933',
  },
  statusBadgeLarge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusTextLarge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailButtonText: {
    color: '#008933',
    fontSize: 14,
    fontWeight: '600',
  },
  // Filter modal
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  filterModalClose: {
    fontSize: 20,
    color: '#666',
    padding: 8,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterOptionActive: {
    backgroundColor: '#008933',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  applyButton: {
    backgroundColor: '#008933',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});