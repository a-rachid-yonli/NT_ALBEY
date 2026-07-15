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

// Icône flèche
const IconArrowDown = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M8 15l4 4 4-4" stroke="#008933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconArrowUp = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M12 19V5M8 9l4-4 4 4" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ExpensesScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Données des dépenses par catégorie
  const expensesByCategory = [
    { id: 1, name: 'Transferts', amount: 50000, icon: '📤', color: '#FF6600', percentage: 40 },
    { id: 2, name: 'Paiements', amount: 31250, icon: '💳', color: '#10B981', percentage: 25 },
    { id: 3, name: 'Factures', amount: 25000, icon: '📄', color: '#3B82F6', percentage: 20 },
    { id: 4, name: 'Achats', amount: 18750, icon: '🛍️', color: '#8B5CF6', percentage: 15 },
  ];

  // Dépenses détaillées par jour
  const dailyExpenses = [
    { id: 1, title: 'Transfert à Amadou Ibrahim', amount: 25000, date: '10/06/2026', category: 'transfert', icon: '📤', color: '#FF6600' },
    { id: 2, title: 'Paiement Nigelec', amount: 27500, date: '10/06/2026', category: 'facture', icon: '⚡', color: '#10B981' },
    { id: 3, title: 'Réception de Aïssata Moussa', amount: 50000, date: '09/06/2026', category: 'reception', icon: '📥', color: '#3B82F6' },
    { id: 4, title: 'Achat Internet 5 Go', amount: 1000, date: '09/06/2026', category: 'achat', icon: '🌐', color: '#8B5CF6' },
    { id: 5, title: 'Retrait Agent NT', amount: 15000, date: '08/06/2026', category: 'retrait', icon: '💰', color: '#F59E0B' },
    { id: 6, title: 'Paiement Eau SEEN', amount: 8000, date: '08/06/2026', category: 'facture', icon: '💧', color: '#10B981' },
    { id: 7, title: 'Transfert à Maman', amount: 5000, date: '07/06/2026', category: 'transfert', icon: '📤', color: '#FF6600' },
    { id: 8, title: 'Recharge crédit NT', amount: 500, date: '07/06/2026', category: 'achat', icon: '📱', color: '#8B5CF6' },
    { id: 9, title: 'Paiement CANAL+', amount: 15000, date: '05/06/2026', category: 'facture', icon: '📺', color: '#10B981' },
    { id: 10, title: 'Achat Fibre NT', amount: 25000, date: '01/06/2026', category: 'achat', icon: '🔌', color: '#8B5CF6' },
  ];

  // Filtrer les dépenses par catégorie
  const getFilteredExpenses = () => {
    if (selectedCategory === 'all') return dailyExpenses.filter(e => e.amount < 0);
    return dailyExpenses.filter(e => e.category === selectedCategory && e.amount < 0);
  };

  // Statistiques
  const totalDepenses = dailyExpenses.filter(e => e.amount > 0 ? false : true).reduce((sum, e) => sum + e.amount, 0);
  const totalReceptions = dailyExpenses.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
  const nbTransactions = dailyExpenses.length;

  const formatAmount = (amount) => {
    return amount < 0 ? `- ${Math.abs(amount)} FCFA` : `+ ${amount} FCFA`;
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dépenses détaillées</Text>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
          <IconFilter />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* STATISTIQUES GLOBALES */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dépenses totales</Text>
            <Text style={styles.statValueExpense}>{Math.abs(totalDepenses).toLocaleString()} FCFA</Text>
            <View style={styles.statTrend}>
              <IconArrowUp />
              <Text style={styles.statTrendText}> +12% vs mai</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Reçus</Text>
            <Text style={styles.statValueIncome}>{totalReceptions.toLocaleString()} FCFA</Text>
            <View style={styles.statTrend}>
              <IconArrowDown />
              <Text style={styles.statTrendTextDown}> +8% vs mai</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.statValueCount}>{nbTransactions}</Text>
            <Text style={styles.statSubtext}>ce mois-ci</Text>
          </View>
        </View>

        {/* RÉPARTITION PAR CATÉGORIE */}
        <Text style={styles.sectionLabel}>📊 Répartition des dépenses</Text>
        <View style={styles.categoriesContainer}>
          {expensesByCategory.map((cat, index) => (
            <View key={cat.id} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                  <Text style={styles.categoryIconText}>{cat.icon}</Text>
                </View>
                <View style={styles.categoryText}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryAmount}>{cat.amount.toLocaleString()} FCFA</Text>
                </View>
              </View>
              <View style={styles.categoryPercentage}>
                <Text style={styles.categoryPercentText}>{cat.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* BARRE DE PROGRESSION */}
        <View style={styles.progressContainer}>
          {expensesByCategory.map((cat) => (
            <View
              key={cat.id}
              style={[
                styles.progressBar,
                { width: `${cat.percentage}%`, backgroundColor: cat.color }
              ]}
            />
          ))}
        </View>

        {/* FILTRES RAPIDES */}
        <Text style={styles.sectionLabel}>🔍 Filtrer par catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'transfert' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('transfert')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'transfert' && styles.filterChipTextActive]}>Transferts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'facture' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('facture')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'facture' && styles.filterChipTextActive]}>Factures</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'achat' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('achat')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'achat' && styles.filterChipTextActive]}>Achats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'retrait' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('retrait')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'retrait' && styles.filterChipTextActive]}>Retraits</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* LISTE DES DÉPENSES DÉTAILLÉES */}
        <Text style={styles.sectionLabel}>📋 Transactions du mois</Text>
        <View style={styles.transactionsList}>
          {getFilteredExpenses().map((expense, index) => (
            <View key={expense.id} style={styles.transactionItem}>
              <View style={[styles.transactionIcon, { backgroundColor: `${expense.color}15` }]}>
                <Text style={styles.transactionIconText}>{expense.icon}</Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>{expense.title}</Text>
                <Text style={styles.transactionDate}>{expense.date}</Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.transactionAmountText}>{formatAmount(-expense.amount)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📈 Analyse du mois</Text>
          <Text style={styles.infoText}>• Les transferts représentent 40% de vos dépenses</Text>
          <Text style={styles.infoText}>• Les factures sont en hausse de 15% ce mois</Text>
          <Text style={styles.infoText}>• Vous avez économisé 25 000 FCFA par rapport au mois dernier</Text>
        </View>

      </ScrollView>

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
              <Text style={styles.filterModalTitle}>Filtres avancés</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.filterModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Période</Text>
            <View style={styles.filterOptions}>
              {['week', 'month', 'year'].map(period => (
                <TouchableOpacity
                  key={period}
                  style={[styles.filterOption, selectedPeriod === period && styles.filterOptionActive]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[styles.filterOptionText, selectedPeriod === period && styles.filterOptionTextActive]}>
                    {period === 'week' ? 'Cette semaine' : period === 'month' ? 'Ce mois' : 'Cette année'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Trier par</Text>
            <View style={styles.filterOptions}>
              {['date', 'amount_desc', 'amount_asc'].map(sort => (
                <TouchableOpacity
                  key={sort}
                  style={styles.filterOption}
                  onPress={() => {}}
                >
                  <Text style={styles.filterOptionText}>
                    {sort === 'date' ? 'Date (récent → ancien)' :
                     sort === 'amount_desc' ? 'Montant (plus élevé → plus faible)' :
                     'Montant (plus faible → plus élevé)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
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
    height: 60,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#008933',
  },
  statSubtext: {
    fontSize: 9,
    color: '#AAA',
    marginTop: 2,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statTrendText: {
    fontSize: 10,
    color: '#FF6600',
  },
  statTrendTextDown: {
    fontSize: 10,
    color: '#10B981',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  categoryAmount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  categoryPercentage: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  categoryPercentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  filterChips: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  infoCard: {
    backgroundColor: '#F0FFF4',
    marginHorizontal: 16,
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
    justifyContent: 'flex-end',
  },
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
    paddingVertical: 10,
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