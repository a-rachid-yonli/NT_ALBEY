import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  Share,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import MainLayout from '../components/MainLayout';

const { width, height } = Dimensions.get('window');

// Icônes SVG
const IconSearch = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#999" strokeWidth="1.8" />
    <Path d="M21 21l-4.35-4.35" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconFilter = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16M6 12h12M9 18h6" stroke="#666" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconShare = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconRepeat = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M17 2l4 4-4 4M7 22l-4-4 4-4" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 6h16a2 2 0 012 2v2M21 18H5a2 2 0 01-2-2v-2" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// Icônes pour les types de transactions
const getTypeIcon = (type) => {
  switch(type) {
    case 'transfert': return '📤';
    case 'reception': return '📥';
    case 'paiement': return '💳';
    case 'facture': return '📄';
    case 'achat': return '🛍️';
    case 'retrait': return '💰';
    default: return '📋';
  }
};

// Données des transactions
const allTransactions = [
  { id: 1, type: 'transfert', title: 'Transfert à Amadou Ibrahim', amount: -25000, date: '2026-06-10T09:41:00', status: 'success', icon: '📤', color: '#FF6600', phone: '93 45 22 71', reference: 'TRF25052024094518' },
  { id: 2, type: 'paiement', title: 'Paiement Nigelec', amount: -27500, date: '2026-06-10T08:30:00', status: 'success', icon: '⚡', color: '#10B981', reference: 'BILL25052024094518' },
  { id: 3, type: 'reception', title: 'Réception de Aïssata Moussa', amount: 50000, date: '2026-06-09T17:20:00', status: 'success', icon: '📥', color: '#3B82F6', phone: '83 35 62 00', reference: 'REC123456789' },
  { id: 4, type: 'achat', title: 'Achat Internet 5 Go', amount: -1000, date: '2026-06-09T14:05:00', status: 'success', icon: '🌐', color: '#8B5CF6', reference: 'ACH987654321' },
  { id: 5, type: 'retrait', title: 'Retrait Agent NT', amount: -15000, date: '2026-06-08T11:30:00', status: 'success', icon: '💰', color: '#F59E0B', reference: 'WTD456789123' },
  { id: 6, type: 'facture', title: 'Paiement Eau SEEN', amount: -8000, date: '2026-06-08T10:15:00', status: 'success', icon: '💧', color: '#10B981', reference: 'WTR789123456' },
  { id: 7, type: 'transfert', title: 'Transfert à Maman', amount: -5000, date: '2026-06-07T16:45:00', status: 'success', icon: '📤', color: '#FF6600', phone: '83 78 90 11', reference: 'TRF456789123' },
  { id: 8, type: 'achat', title: 'Recharge crédit NT', amount: -500, date: '2026-06-07T09:20:00', status: 'success', icon: '📱', color: '#8B5CF6', reference: 'RCH321654987' },
  { id: 9, type: 'facture', title: 'Paiement CANAL+', amount: -15000, date: '2026-06-05T14:30:00', status: 'success', icon: '📺', color: '#10B981', reference: 'CAN987654321' },
  { id: 10, type: 'achat', title: 'Achat Fibre NT', amount: -25000, date: '2026-06-01T10:00:00', status: 'success', icon: '🔌', color: '#8B5CF6', reference: 'FBR456789123' },
  { id: 11, type: 'reception', title: 'Réception de Habibou Dan Galadima', amount: 20000, date: '2026-05-28T12:00:00', status: 'success', icon: '📥', color: '#3B82F6', phone: '93 12 45 98', reference: 'REC987654321' },
  { id: 12, type: 'transfert', title: 'Transfert à Ibrahim Hassane', amount: -10000, date: '2026-05-25T09:15:00', status: 'success', icon: '📤', color: '#FF6600', phone: '83 15 20 45', reference: 'TRF789123456' },
];

export default function TransactionsScreen({ onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const totalDepenses = allTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceptions = allTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const nbTransactions = allTransactions.length;

  const getFilteredTransactions = () => {
    let filtered = [...allTransactions];
    if (selectedFilter !== 'all') filtered = filtered.filter(t => t.type === selectedFilter);
    if (searchQuery) filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.phone && t.phone.includes(searchQuery)) || (t.reference && t.reference.toLowerCase().includes(searchQuery.toLowerCase())));
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    return filtered;
  };

  const groupByDate = (transactions) => {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 30);

    transactions.forEach(t => {
      const date = new Date(t.date);
      let group = '';
      if (date.toDateString() === today.toDateString()) group = "Aujourd'hui";
      else if (date.toDateString() === yesterday.toDateString()) group = 'Hier';
      else if (date >= weekStart) group = 'Cette semaine';
      else if (date >= monthStart) group = 'Ce mois';
      else group = 'Plus ancien';
      if (!groups[group]) groups[group] = [];
      groups[group].push(t);
    });
    return groups;
  };

  const formatAmount = (amount) => amount < 0 ? `- ${Math.abs(amount).toLocaleString()} FCFA` : `+ ${amount.toLocaleString()} FCFA`;
  const formatDate = (dateString) => { const date = new Date(dateString); return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`; };

  const handleShare = async (transaction) => {
    const message = `NT Albey - Transaction\nType: ${transaction.title}\nMontant: ${formatAmount(transaction.amount)}\nDate: ${new Date(transaction.date).toLocaleString('fr-FR')}\nRéférence: ${transaction.reference}`;
    try { await Share.share({ message }); } catch (error) { Alert.alert('Erreur', 'Impossible de partager'); }
  };

  const handleRepeat = (transaction) => {
    Alert.alert('Répéter', `Voulez-vous refaire cette transaction ?\n${transaction.title}\n${formatAmount(transaction.amount)}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => Alert.alert('Succès', 'Transaction répétée avec succès !') }
    ]);
  };

  const filteredTransactions = getFilteredTransactions();
  const groupedTransactions = groupByDate(filteredTransactions);
  
  // Liste des filtres avec icônes et couleurs
  const filters = [
    { key: 'all', label: 'Tous', icon: '📋', color: '#008933' },
    { key: 'transfert', label: 'Transferts', icon: '📤', color: '#FF6600' },
    { key: 'reception', label: 'Réceptions', icon: '📥', color: '#10B981' },
    { key: 'paiement', label: 'Paiements', icon: '💳', color: '#3B82F6' },
    { key: 'facture', label: 'Factures', icon: '📄', color: '#8B5CF6' },
    { key: 'achat', label: 'Achats', icon: '🛍️', color: '#F59E0B' },
    { key: 'retrait', label: 'Retraits', icon: '💰', color: '#EC4899' },
  ];

  return (
    <MainLayout activeScreen="Transactions" onLogout={onLogout}>
      <View style={{ flex: 1 }}>
        {/* Statistiques */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total dépensé</Text>
              <Text style={styles.statValueExpense}>{totalDepenses.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total reçu</Text>
              <Text style={styles.statValueIncome}>{totalReceptions.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Transactions</Text>
              <Text style={styles.statValueCount}>{nbTransactions}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <IconSearch />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Rechercher par nom, numéro, référence..." 
            placeholderTextColor="#AAA" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres horizontaux avec icônes - UNIFORMISÉS */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterChips}
          contentContainerStyle={styles.filterChipsContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text style={styles.filterChipIcon}>{filter.icon}</Text>
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.key && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste des transactions */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.transactionsList}>
          {Object.keys(groupedTransactions).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>Aucune transaction trouvée pour ce filtre</Text>
            </View>
          ) : (
            Object.entries(groupedTransactions).map(([group, transactions]) => (
              <View key={group}>
                <Text style={styles.groupTitle}>{group}</Text>
                {transactions.map(transaction => (
                  <TouchableOpacity 
                    key={transaction.id} 
                    style={styles.transactionCard} 
                    onPress={() => { setSelectedTransaction(transaction); setModalVisible(true); }}
                  >
                    <View style={[styles.transactionIcon, { backgroundColor: `${transaction.color}15` }]}>
                      <Text style={styles.transactionIconText}>{transaction.icon}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{transaction.title}</Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.date).toLocaleDateString('fr-FR')} à {formatDate(transaction.date)}
                      </Text>
                      {transaction.phone && <Text style={styles.transactionPhone}>{transaction.phone}</Text>}
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, transaction.amount > 0 ? styles.amountPositive : styles.amountNegative]}>
                        {formatAmount(transaction.amount)}
                      </Text>
                      <View style={[styles.statusBadge, transaction.status === 'success' && styles.statusSuccess]}>
                        <Text style={styles.statusText}>✓</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* MODAL DÉTAIL */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détail</Text>
              <View style={{ width: 40 }} />
            </View>
            {selectedTransaction && (
              <ScrollView>
                <View style={styles.detailIconContainer}>
                  <View style={[styles.detailIcon, { backgroundColor: `${selectedTransaction.color}15` }]}>
                    <Text style={styles.detailIconText}>{selectedTransaction.icon}</Text>
                  </View>
                </View>
                <Text style={styles.detailTitle}>{selectedTransaction.title}</Text>
                <Text style={[styles.detailAmount, selectedTransaction.amount > 0 ? styles.detailAmountPositive : styles.detailAmountNegative]}>
                  {formatAmount(selectedTransaction.amount)}
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
                  <TouchableOpacity style={styles.detailButton} onPress={() => handleRepeat(selectedTransaction)}>
                    <IconRepeat />
                    <Text style={styles.detailButtonText}>Répéter</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL FILTRES */}
      <Modal animationType="slide" transparent visible={filterModalVisible} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtres avancés</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.filterModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.filterSectionTitle}>Type de transaction</Text>
            <View style={styles.filterOptions}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterOption, selectedFilter === filter.key && styles.filterOptionActive]}
                  onPress={() => setSelectedFilter(filter.key)}
                >
                  <Text style={styles.filterOptionIcon}>{filter.icon}</Text>
                  <Text style={[styles.filterOptionText, selectedFilter === filter.key && styles.filterOptionTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  statsScroll: { paddingHorizontal: 16, marginTop: 12 },
  statsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8 },
  statCard: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  statDivider: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  statLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  statValueExpense: { fontSize: 13, fontWeight: '700', color: '#FF6600' },
  statValueIncome: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  statValueCount: { fontSize: 14, fontWeight: '700', color: '#008933' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  clearText: { color: '#999', fontSize: 14, padding: 8 },
  
  // Filtres uniformisés
  filterChips: { marginTop: 16 },
  filterChipsContent: { paddingHorizontal: 16, gap: 10 },
  filterChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 24, 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E0E0E0',
  },
  filterChipActive: { 
    backgroundColor: '#008933', 
    borderColor: '#008933',
  },
  filterChipIcon: { 
    fontSize: 14,
  },
  filterChipText: { 
    fontSize: 13, 
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: { 
    color: '#FFFFFF',
  },
  
  transactionsList: { paddingHorizontal: 16, paddingBottom: 20 },
  groupTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 12 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10 },
  transactionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  transactionIconText: { fontSize: 22 },
  transactionInfo: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  transactionDate: { fontSize: 11, color: '#888' },
  transactionPhone: { fontSize: 11, color: '#AAA', marginTop: 2 },
  transactionRight: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  amountPositive: { color: '#10B981' },
  amountNegative: { color: '#1A1A1A' },
  statusBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusSuccess: { backgroundColor: '#10B981' },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalCloseText: { fontSize: 20, color: '#666', padding: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  detailIconContainer: { alignItems: 'center', marginBottom: 16 },
  detailIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  detailIconText: { fontSize: 32 },
  detailTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  detailAmount: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  detailAmountPositive: { color: '#10B981' },
  detailAmountNegative: { color: '#1A1A1A' },
  detailCard: { backgroundColor: '#F8F9FC', borderRadius: 16, padding: 16, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#1A1A1A' },
  detailValueRef: { fontSize: 12, fontWeight: '500', color: '#008933' },
  statusBadgeLarge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusTextLarge: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: 12 },
  detailButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F0FFF4', paddingVertical: 12, borderRadius: 12 },
  detailButtonText: { color: '#008933', fontSize: 14, fontWeight: '600' },
  filterModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  filterModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  filterModalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  filterModalClose: { fontSize: 20, color: '#666', padding: 8 },
  filterSectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12, marginTop: 16 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 24, 
    backgroundColor: '#F5F5F5',
  },
  filterOptionActive: { backgroundColor: '#008933' },
  filterOptionIcon: { fontSize: 14 },
  filterOptionText: { fontSize: 13, color: '#666' },
  filterOptionTextActive: { color: '#FFFFFF' },
  applyButton: { backgroundColor: '#008933', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  applyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});