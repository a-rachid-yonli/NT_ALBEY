// screens/ExpensesScreen.js - Version multilingue
import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { API } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

const { width = 400, height = 800 } = Dimensions.get('window') || {};

// Icônes (inchangées)
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconFilter = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16M6 12h12M9 18h6" stroke="#666" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

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

// ✅ FONCTION QUI RETOURNE LE MAPPING TRADUIT
const getCategoryMap = (t) => ({
  transfer: { name: t('history.transfers'), icon: '📤', color: '#FF6600' },
  bill: { name: t('history.billsFilter'), icon: '📄', color: '#3B82F6' },
  shop: { name: t('history.purchases'), icon: '🛍️', color: '#8B5CF6' },
  withdraw: { name: t('history.withdrawals'), icon: '💰', color: '#F59E0B' },
  reception: { name: t('history.receptions'), icon: '📥', color: '#10B981' },
  visa_recharge: { name: t('expenses.visaRecharge') || 'Recharge carte', icon: '💳', color: '#EC4899' },
  savings: { name: t('history.savingsFilter'), icon: '🏦', color: '#06B6D4' },
  gouvpay: { name: 'Gouv-Pay', icon: '🏛️', color: '#008933' },
  default: { name: t('expenses.other') || 'Autre', icon: '📌', color: '#888' },
});

export default function ExpensesScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const categoryMap = getCategoryMap(t);

  // Chargement des transactions depuis l'API
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await API.getTransactions();
        setTransactions(data);
      } catch (error) {
        console.error('Erreur chargement transactions:', error);
        Alert.alert(t('common.error'), t('expenses.loadError') || 'Impossible de charger les transactions.');
      } finally {
        setIsLoading(false);
      }
    };
    loadTransactions();
  }, []);

  // Filtrer les transactions par catégorie (uniquement les dépenses pour l'affichage)
  const getFilteredExpenses = () => {
    const expenses = transactions.filter(t => t.amount < 0);
    if (selectedCategory === 'all') return expenses;
    return expenses.filter(t => t.type === selectedCategory);
  };

  // Calcul des statistiques
  const totalDepenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const totalReceptions = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const nbTransactions = transactions.length;

  // Calcul des dépenses par catégorie (pour le graphique en barres)
  const expensesByCategory = () => {
    const expenses = transactions.filter(t => t.amount < 0);
    const total = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const map = {};
    expenses.forEach(t => {
      const type = t.type || 'default';
      if (!map[type]) map[type] = 0;
      map[type] += Math.abs(t.amount);
    });
    // Convertir en tableau avec pourcentage
    const result = Object.keys(map).map(type => {
      const cat = categoryMap[type] || categoryMap.default;
      return {
        id: type,
        name: cat.name,
        amount: map[type],
        icon: cat.icon,
        color: cat.color,
        percentage: total > 0 ? Math.round((map[type] / total) * 100) : 0,
      };
    });
    // Trier par montant décroissant
    result.sort((a, b) => b.amount - a.amount);
    return result;
  };

  // Formatage d'un montant
  const formatAmount = (amount) => {
    return amount < 0 ? `- ${Math.abs(amount).toLocaleString()} FCFA` : `+ ${amount.toLocaleString()} FCFA`;
  };

  // Affichage du chargement
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('expenses.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#008933" />
          <Text style={{ marginTop: 16, color: '#666' }}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  const catData = expensesByCategory();
  const filteredExpenses = getFilteredExpenses();

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('expenses.title')}</Text>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.filterButton}>
          <IconFilter />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* STATISTIQUES GLOBALES */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('expenses.totalExpenses')}</Text>
            <Text style={styles.statValueExpense}>{Math.abs(totalDepenses).toLocaleString()} FCFA</Text>
            <View style={styles.statTrend}>
              <IconArrowUp />
              <Text style={styles.statTrendText}> {t('expenses.allOperations') || 'toutes opérations'}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('expenses.totalReceived')}</Text>
            <Text style={styles.statValueIncome}>{totalReceptions.toLocaleString()} FCFA</Text>
            <View style={styles.statTrend}>
              <IconArrowDown />
              <Text style={styles.statTrendTextDown}> {t('expenses.allOperations') || 'toutes opérations'}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('expenses.transactions')}</Text>
            <Text style={styles.statValueCount}>{nbTransactions}</Text>
            <Text style={styles.statSubtext}>{t('expenses.total') || 'total'}</Text>
          </View>
        </View>

        {/* RÉPARTITION PAR CATÉGORIE */}
        <Text style={styles.sectionLabel}>{t('expenses.distribution')}</Text>
        {catData.length > 0 ? (
          <>
            <View style={styles.categoriesContainer}>
              {catData.map((cat) => (
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
              {catData.map((cat) => (
                <View
                  key={cat.id}
                  style={[
                    styles.progressBar,
                    { width: `${cat.percentage}%`, backgroundColor: cat.color }
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('expenses.noExpenses') || 'Aucune dépense enregistrée'}</Text>
          </View>
        )}

        {/* FILTRES RAPIDES */}
        <Text style={styles.sectionLabel}>{t('expenses.filterByCategory')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>{t('expenses.allCategories')}</Text>
          </TouchableOpacity>
          {catData.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, selectedCategory === cat.id && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat.id && styles.filterChipTextActive]}>
                {cat.icon} {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LISTE DES DÉPENSES DÉTAILLÉES */}
        <Text style={styles.sectionLabel}>{t('expenses.monthTransactions')}</Text>
        <View style={styles.transactionsList}>
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => {
              const cat = categoryMap[expense.type] || categoryMap.default;
              return (
                <View key={expense.id} style={styles.transactionItem}>
                  <View style={[styles.transactionIcon, { backgroundColor: `${cat.color}15` }]}>
                    <Text style={styles.transactionIconText}>{cat.icon}</Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{expense.description || t('history.transactions')}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(expense.date).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={styles.transactionAmountText}>{formatAmount(expense.amount)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('expenses.noTransactionCategory') || 'Aucune transaction pour cette catégorie'}</Text>
            </View>
          )}
        </View>

        {/* INFO SUPPLÉMENTAIRE */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('expenses.monthAnalysis')}</Text>
          <Text style={styles.infoText}>• {t('expenses.analysisTotal') || 'Les dépenses totales s\'élèvent à'} {Math.abs(totalDepenses).toLocaleString()} FCFA</Text>
          <Text style={styles.infoText}>• {t('expenses.analysisReceived') || 'Vous avez reçu'} {totalReceptions.toLocaleString()} FCFA</Text>
          <Text style={styles.infoText}>• {nbTransactions} {t('expenses.analysisTransactions') || 'transactions effectuées'}</Text>
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
              <Text style={styles.filterModalTitle}>{t('expenses.advancedFilters')}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.filterModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>{t('expenses.period')}</Text>
            <View style={styles.filterOptions}>
              {['week', 'month', 'year'].map(period => (
                <TouchableOpacity
                  key={period}
                  style={[styles.filterOption, selectedPeriod === period && styles.filterOptionActive]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[styles.filterOptionText, selectedPeriod === period && styles.filterOptionTextActive]}>
                    {period === 'week' ? t('expenses.thisWeek') : period === 'month' ? t('expenses.thisMonth') : t('expenses.thisYear')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>{t('expenses.sortBy')}</Text>
            <View style={styles.filterOptions}>
              {['date', 'amount_desc', 'amount_asc'].map(sort => (
                <TouchableOpacity
                  key={sort}
                  style={styles.filterOption}
                  onPress={() => {}}
                >
                  <Text style={styles.filterOptionText}>
                    {sort === 'date' ? (t('expenses.sortDate') || 'Date (récent → ancien)') :
                     sort === 'amount_desc' ? (t('expenses.sortAmountDesc') || 'Montant (plus élevé → plus faible)') :
                     (t('expenses.sortAmountAsc') || 'Montant (plus faible → plus élevé)')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>{t('expenses.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles (inchangés)
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
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
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