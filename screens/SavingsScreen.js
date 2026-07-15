// screens/SavingsScreen.js - Version sans AsyncStorage
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// ===== ICÔNES =====
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSavings = () => (
  <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill="#E8F5E9" />
    <Circle cx="50" cy="50" r="45" stroke="#008933" strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="30" y="35" width="40" height="35" rx="4" fill="#008933" />
    <Rect x="45" y="25" width="10" height="15" rx="2" fill="#FFD700" />
    <Path d="M35 45 L45 55 L65 35" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="65" cy="40" r="5" fill="#FFD700" />
  </Svg>
);

const IconLock = ({ locked }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="11" width="14" height="10" rx="2" stroke={locked ? "#FF6600" : "#10B981"} strokeWidth="1.8" />
    <Path d="M8 11V7a4 4 0 018 0v4" stroke={locked ? "#FF6600" : "#10B981"} strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1.2" fill={locked ? "#FF6600" : "#10B981"} />
  </Svg>
);

const IconPlus = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#008933" strokeWidth="1.8" />
    <Path d="M8 12h8M12 8v8" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconAddMoney = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconWithdrawIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconLockClosed = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="11" width="14" height="10" rx="2" stroke="#FF6600" strokeWidth="1.8" />
    <Path d="M8 11V7a4 4 0 018 0v4" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1.2" fill="#FF6600" />
  </Svg>
);

const IconLockOpen = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="11" width="14" height="10" rx="2" stroke="#10B981" strokeWidth="1.8" />
    <Path d="M8 11V7a4 4 0 018 0v4" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1.2" fill="#10B981" />
  </Svg>
);

const IconTrash = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" stroke="#FF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 10v7M14 10v7" stroke="#FF4444" strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" stroke="#FF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ===== SCREEN PRINCIPAL =====
export default function SavingsScreen({ navigation }) {
  const [savings, setSavings] = useState([
    {
      id: '1',
      name: 'Voyage à Paris',
      goal: 500000,
      balance: 125000,
      lockDate: '2026-12-25',
      autoSave: true,
      autoAmount: 25000,
      autoFrequency: 'monthly',
      createdAt: '2026-06-01',
      transactions: [
        { id: 't1', type: 'add', amount: 50000, date: '2026-06-01', note: 'Départ' },
        { id: 't2', type: 'add', amount: 25000, date: '2026-06-10', note: 'Épargne mensuelle' },
        { id: 't3', type: 'add', amount: 50000, date: '2026-06-15', note: 'Bonus' },
      ]
    },
    {
      id: '2',
      name: 'Achat Maison',
      goal: 2000000,
      balance: 350000,
      lockDate: '2027-01-15',
      autoSave: false,
      autoAmount: 0,
      autoFrequency: 'monthly',
      createdAt: '2026-01-15',
      transactions: [
        { id: 't4', type: 'add', amount: 150000, date: '2026-01-15', note: 'Départ' },
        { id: 't5', type: 'add', amount: 100000, date: '2026-02-15', note: 'Épargne mensuelle' },
        { id: 't6', type: 'add', amount: 100000, date: '2026-03-15', note: 'Épargne mensuelle' },
      ]
    },
    {
      id: '3',
      name: "Fonds d'urgence",
      goal: 300000,
      balance: 75000,
      lockDate: '',
      autoSave: true,
      autoAmount: 10000,
      autoFrequency: 'weekly',
      createdAt: '2026-05-01',
      transactions: [
        { id: 't7', type: 'add', amount: 25000, date: '2026-05-01', note: 'Départ' },
        { id: 't8', type: 'add', amount: 10000, date: '2026-05-08', note: 'Épargne hebdomadaire' },
        { id: 't9', type: 'add', amount: 10000, date: '2026-05-15', note: 'Épargne hebdomadaire' },
        { id: 't10', type: 'add', amount: 10000, date: '2026-05-22', note: 'Épargne hebdomadaire' },
        { id: 't11', type: 'add', amount: 10000, date: '2026-05-29', note: 'Épargne hebdomadaire' },
        { id: 't12', type: 'add', amount: 10000, date: '2026-06-05', note: 'Épargne hebdomadaire' },
      ]
    },
  ]);

  const [selectedSavings, setSelectedSavings] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  
  // États pour création
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newLockDate, setNewLockDate] = useState('');
  const [newAutoSave, setNewAutoSave] = useState(false);
  const [newAutoAmount, setNewAutoAmount] = useState('');
  const [newAutoFrequency, setNewAutoFrequency] = useState('monthly');
  
  // États pour ajout/retrait
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [operationType, setOperationType] = useState('add');

  const handleCreateSavings = () => {
    if (!newName.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un nom à votre épargne');
      return;
    }
    if (!newGoal || parseInt(newGoal) <= 0) {
      Alert.alert('Erreur', 'Veuillez définir un objectif valide');
      return;
    }
    if (parseInt(newGoal) > 100000000) {
      Alert.alert('Erreur', 'Objectif trop élevé (max 100 000 000 FCFA)');
      return;
    }

    const newSavings = {
      id: Date.now().toString(),
      name: newName.trim(),
      goal: parseInt(newGoal),
      balance: 0,
      lockDate: newLockDate || '',
      autoSave: newAutoSave,
      autoAmount: newAutoSave ? parseInt(newAutoAmount) || 0 : 0,
      autoFrequency: newAutoFrequency,
      createdAt: new Date().toISOString(),
      transactions: [],
    };

    setSavings([...savings, newSavings]);
    setCreateModalVisible(false);
    resetCreateForm();
    Alert.alert('Succès', `L'épargne "${newName}" a été créée avec succès !`);
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewGoal('');
    setNewLockDate('');
    setNewAutoSave(false);
    setNewAutoAmount('');
    setNewAutoFrequency('monthly');
  };

  const handleAddMoney = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (parseInt(amount) > 125000) {
      Alert.alert('Erreur', 'Solde insuffisant. Votre solde est de 125 000 FCFA');
      return;
    }
    setOperationType('add');
    setPinModalVisible(true);
  };

  const handleWithdrawMoney = () => {
    if (!selectedSavings) return;
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (parseInt(amount) > selectedSavings.balance) {
      Alert.alert('Erreur', `Solde insuffisant dans cette épargne (${selectedSavings.balance} FCFA)`);
      return;
    }
    
    if (selectedSavings.lockDate) {
      const today = new Date();
      const lockDate = new Date(selectedSavings.lockDate);
      if (today < lockDate) {
        Alert.alert(
          'Épargne bloquée',
          `Cette épargne est bloquée jusqu'au ${selectedSavings.lockDate}. Vous ne pouvez pas retirer avant cette date.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    setOperationType('withdraw');
    setPinModalVisible(true);
  };

  const confirmOperation = () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer votre PIN à 4 chiffres');
      return;
    }
    
    if (pin === '0000') {
      const amountNum = parseInt(amount);
      const updatedSavings = savings.map(s => {
        if (s.id === selectedSavings.id) {
          const newBalance = operationType === 'add' 
            ? s.balance + amountNum 
            : s.balance - amountNum;
          
          const newTransaction = {
            id: Date.now().toString(),
            type: operationType,
            amount: amountNum,
            date: new Date().toISOString(),
            note: operationType === 'add' ? 'Ajout manuel' : 'Retrait manuel',
          };
          
          return {
            ...s,
            balance: newBalance,
            transactions: [newTransaction, ...s.transactions],
          };
        }
        return s;
      });
      
      setSavings(updatedSavings);
      setPinModalVisible(false);
      setPin('');
      setAmount('');
      
      Alert.alert(
        'Succès', 
        operationType === 'add' 
          ? `${amountNum} FCFA ajoutés à l'épargne "${selectedSavings.name}"` 
          : `${amountNum} FCFA retirés de l'épargne "${selectedSavings.name}"`
      );
      
      setAddModalVisible(false);
      setWithdrawModalVisible(false);
      setSelectedSavings(null);
    } else {
      Alert.alert('Erreur', 'PIN incorrect. Veuillez réessayer.');
      setPin('');
    }
  };

  const handleDeleteSavings = (savingsId) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer cette épargne ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            const updated = savings.filter(s => s.id !== savingsId);
            setSavings(updated);
            if (selectedSavings?.id === savingsId) {
              setSelectedSavings(null);
              setModalVisible(false);
            }
            Alert.alert('Succès', 'Épargne supprimée avec succès');
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non bloqué';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString() + ' FCFA';
  };

  const getProgress = (balance, goal) => {
    return Math.min((balance / goal) * 100, 100);
  };

  const isLocked = (lockDate) => {
    if (!lockDate) return false;
    return new Date() < new Date(lockDate);
  };

  // Rendu du détail
  const renderSavingsDetail = () => {
    if (!selectedSavings) return null;
    
    const progress = getProgress(selectedSavings.balance, selectedSavings.goal);
    const locked = isLocked(selectedSavings.lockDate);
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedSavings(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setSelectedSavings(null);
              }} style={styles.detailClose}>
                <Text style={styles.detailCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>{selectedSavings.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteSavings(selectedSavings.id)}>
                <IconTrash />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailGoalContainer}>
                <View style={styles.detailGoalRow}>
                  <Text style={styles.detailGoalLabel}>Objectif</Text>
                  <Text style={styles.detailGoalValue}>{formatCurrency(selectedSavings.goal)}</Text>
                </View>
                <View style={styles.detailProgressBar}>
                  <View style={[styles.detailProgressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.detailProgressText}>{progress.toFixed(0)}% atteint</Text>
              </View>

              <View style={styles.detailStats}>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Solde actuel</Text>
                  <Text style={styles.detailStatValue}>{formatCurrency(selectedSavings.balance)}</Text>
                </View>
                <View style={styles.detailStatDivider} />
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Statut</Text>
                  <View style={[styles.detailStatusBadge, locked ? styles.detailStatusLocked : styles.detailStatusUnlocked]}>
                    {locked ? <IconLockClosed /> : <IconLockOpen />}
                    <Text style={[styles.detailStatusText, locked ? styles.detailStatusTextLocked : styles.detailStatusTextUnlocked]}>
                      {locked ? 'Bloqué' : 'Débloqué'}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedSavings.lockDate && (
                <View style={styles.detailLockInfo}>
                  <Text style={styles.detailLockLabel}>🔒 Date de déblocage</Text>
                  <Text style={styles.detailLockDate}>{formatDate(selectedSavings.lockDate)}</Text>
                </View>
              )}

              {selectedSavings.autoSave && (
                <View style={styles.detailAutoInfo}>
                  <Text style={styles.detailAutoLabel}>🤖 Épargne automatique</Text>
                  <Text style={styles.detailAutoText}>
                    {formatCurrency(selectedSavings.autoAmount)} / {selectedSavings.autoFrequency === 'weekly' ? 'semaine' : 'mois'}
                  </Text>
                </View>
              )}

              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.detailActionButton, styles.detailAddButton]} 
                  onPress={() => {
                    setAddModalVisible(true);
                    setAmount('');
                  }}
                >
                  <IconAddMoney />
                  <Text style={styles.detailAddButtonText}>Ajouter</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.detailActionButton, styles.detailWithdrawButton]} 
                  onPress={() => {
                    if (locked) {
                      Alert.alert('Épargne bloquée', `Cette épargne est bloquée jusqu'au ${formatDate(selectedSavings.lockDate)}`);
                      return;
                    }
                    setWithdrawModalVisible(true);
                    setAmount('');
                  }}
                >
                  <IconWithdrawIcon />
                  <Text style={styles.detailWithdrawButtonText}>Retirer</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.detailHistoryTitle}>📜 Historique</Text>
              {selectedSavings.transactions.length === 0 ? (
                <Text style={styles.detailHistoryEmpty}>Aucune transaction</Text>
              ) : (
                selectedSavings.transactions.slice(0, 10).map((t) => (
                  <View key={t.id} style={styles.detailHistoryItem}>
                    <View style={[
                      styles.detailHistoryIcon, 
                      t.type === 'add' ? styles.detailHistoryAdd : styles.detailHistoryWithdraw
                    ]}>
                      <Text style={styles.detailHistoryIconText}>{t.type === 'add' ? '+' : '-'}</Text>
                    </View>
                    <View style={styles.detailHistoryInfo}>
                      <Text style={styles.detailHistoryNote}>{t.note || (t.type === 'add' ? 'Ajout' : 'Retrait')}</Text>
                      <Text style={styles.detailHistoryDate}>{new Date(t.date).toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <Text style={[
                      styles.detailHistoryAmount,
                      t.type === 'add' ? styles.detailHistoryAmountAdd : styles.detailHistoryAmountWithdraw
                    ]}>
                      {t.type === 'add' ? '+' : '-'}{t.amount.toLocaleString()} FCFA
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconBack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Épargne</Text>
        <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.createButton}>
          <IconPlus />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        <View style={styles.illustrationContainer}>
          <IconSavings />
          <Text style={styles.illustrationText}>Épargnez pour vos projets</Text>
          <Text style={styles.illustrationSubtext}>Bloquez vos fonds jusqu'à une date souhaitée</Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total épargné</Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(savings.reduce((sum, s) => sum + s.balance, 0))}
          </Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{savings.length} épargne{savings.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {savings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏦</Text>
            <Text style={styles.emptyTitle}>Aucune épargne</Text>
            <Text style={styles.emptyText}>Créez votre première épargne dès maintenant</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Créer une épargne</Text>
            </TouchableOpacity>
          </View>
        ) : (
          savings.map((saving) => {
            const progress = getProgress(saving.balance, saving.goal);
            const locked = isLocked(saving.lockDate);
            return (
              <TouchableOpacity
                key={saving.id}
                style={styles.savingCard}
                onPress={() => {
                  setSelectedSavings(saving);
                  setModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.savingHeader}>
                  <View style={styles.savingNameContainer}>
                    <Text style={styles.savingName}>{saving.name}</Text>
                    {locked && (
                      <View style={styles.savingLockBadge}>
                        <IconLock locked={true} />
                        <Text style={styles.savingLockText}>Bloqué</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.savingBalance}>{formatCurrency(saving.balance)}</Text>
                </View>

                <View style={styles.savingGoalRow}>
                  <Text style={styles.savingGoal}>Objectif: {formatCurrency(saving.goal)}</Text>
                  <Text style={styles.savingProgressText}>{progress.toFixed(0)}%</Text>
                </View>

                <View style={styles.savingProgressBar}>
                  <View style={[styles.savingProgressFill, { width: `${progress}%` }]} />
                </View>

                {saving.lockDate && (
                  <Text style={styles.savingLockDate}>
                    🔒 Déblocage le {formatDate(saving.lockDate)}
                  </Text>
                )}

                {saving.autoSave && (
                  <View style={styles.savingAutoBadge}>
                    <Text style={styles.savingAutoText}>
                      🤖 Auto-épargne: {formatCurrency(saving.autoAmount)} / {saving.autoFrequency === 'weekly' ? 'semaine' : 'mois'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>

      {/* MODAL CRÉATION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => {
          setCreateModalVisible(false);
          resetCreateForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalTitle}>Nouvelle épargne</Text>
              <TouchableOpacity onPress={() => {
                setCreateModalVisible(false);
                resetCreateForm();
              }} style={styles.createModalClose}>
                <Text style={styles.createModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nom de l'épargne</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Voyage, Maison, Fonds d'urgence..."
                placeholderTextColor="#AAA"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Objectif (FCFA)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>FCFA</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor="#CCC"
                  keyboardType="numeric"
                  value={newGoal}
                  onChangeText={setNewGoal}
                />
              </View>

              <Text style={styles.inputLabel}>Date de déblocage (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 2026-12-25 ou laisser vide"
                placeholderTextColor="#AAA"
                value={newLockDate}
                onChangeText={setNewLockDate}
              />
              <Text style={styles.inputHelper}>Format: AAAA-MM-JJ. Laissez vide pour un accès immédiat</Text>

              <View style={styles.autoSaveContainer}>
                <View style={styles.autoSaveRow}>
                  <Text style={styles.autoSaveLabel}>🤖 Épargne automatique</Text>
                  <Switch
                    value={newAutoSave}
                    onValueChange={setNewAutoSave}
                    trackColor={{ false: '#D1D5DB', true: '#008933' }}
                    thumbColor={newAutoSave ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>

                {newAutoSave && (
                  <>
                    <Text style={styles.inputLabel}>Montant automatique</Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>FCFA</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor="#CCC"
                        keyboardType="numeric"
                        value={newAutoAmount}
                        onChangeText={setNewAutoAmount}
                      />
                    </View>

                    <Text style={styles.inputLabel}>Fréquence</Text>
                    <View style={styles.frequencyContainer}>
                      <TouchableOpacity
                        style={[styles.frequencyChip, newAutoFrequency === 'weekly' && styles.frequencyChipActive]}
                        onPress={() => setNewAutoFrequency('weekly')}
                      >
                        <Text style={[styles.frequencyText, newAutoFrequency === 'weekly' && styles.frequencyTextActive]}>
                          Hebdomadaire
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.frequencyChip, newAutoFrequency === 'monthly' && styles.frequencyChipActive]}
                        onPress={() => setNewAutoFrequency('monthly')}
                      >
                        <Text style={[styles.frequencyText, newAutoFrequency === 'monthly' && styles.frequencyTextActive]}>
                          Mensuel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity style={styles.createConfirmButton} onPress={handleCreateSavings}>
                <Text style={styles.createConfirmButtonText}>Créer l'épargne</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL AJOUT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => {
          setAddModalVisible(false);
          setAmount('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>Ajouter de l'argent</Text>
            <Text style={styles.actionModalSubtitle}>
              À l'épargne "{selectedSavings?.name}"
            </Text>
            
            <Text style={styles.inputLabel}>Montant à ajouter</Text>
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

            <View style={styles.actionModalButtons}>
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.actionCancelButton]} 
                onPress={() => {
                  setAddModalVisible(false);
                  setAmount('');
                }}
              >
                <Text style={styles.actionCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.actionConfirmButton]} 
                onPress={handleAddMoney}
              >
                <Text style={styles.actionConfirmButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL RETRAIT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={() => {
          setWithdrawModalVisible(false);
          setAmount('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.actionModalTitle}>Retirer de l'argent</Text>
            <Text style={styles.actionModalSubtitle}>
              De l'épargne "{selectedSavings?.name}"
            </Text>
            
            <Text style={styles.inputLabel}>Montant à retirer</Text>
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

            <View style={styles.actionModalButtons}>
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.actionCancelButton]} 
                onPress={() => {
                  setWithdrawModalVisible(false);
                  setAmount('');
                }}
              >
                <Text style={styles.actionCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionModalButton, styles.actionWithdrawConfirmButton]} 
                onPress={handleWithdrawMoney}
              >
                <Text style={styles.actionConfirmButtonText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PIN */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={pinModalVisible}
        onRequestClose={() => {
          setPinModalVisible(false);
          setPin('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModalContent}>
            <IconSavings />
            <Text style={styles.pinModalTitle}>Confirmation</Text>
            <Text style={styles.pinModalSubtitle}>
              {operationType === 'add' ? 'Ajout de ' : 'Retrait de '}
              {amount} FCFA
            </Text>
            <Text style={styles.pinModalSubtitle2}>
              {operationType === 'add' ? 'vers' : 'de'} l'épargne "{selectedSavings?.name}"
            </Text>
            
            <Text style={styles.pinModalLabel}>Entrez votre PIN pour confirmer</Text>
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
            
            <View style={styles.pinModalButtons}>
              <TouchableOpacity 
                style={[styles.pinModalButton, styles.pinCancelButton]} 
                onPress={() => {
                  setPinModalVisible(false);
                  setPin('');
                }}
              >
                <Text style={styles.pinCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.pinModalButton, styles.pinConfirmButton]} 
                onPress={confirmOperation}
              >
                <Text style={styles.pinConfirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DÉTAIL */}
      {renderSavingsDetail()}
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
  createButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  illustrationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
  },
  illustrationSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  totalCard: {
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
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  totalBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#008933',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  savingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  savingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  savingNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  savingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  savingLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  savingLockText: {
    fontSize: 10,
    color: '#FF6600',
    fontWeight: '600',
  },
  savingBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#008933',
  },
  savingGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  savingGoal: {
    fontSize: 12,
    color: '#888',
  },
  savingProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#008933',
  },
  savingProgressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  savingProgressFill: {
    height: '100%',
    backgroundColor: '#008933',
    borderRadius: 3,
  },
  savingLockDate: {
    fontSize: 11,
    color: '#FF6600',
    marginTop: 8,
  },
  savingAutoBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  savingAutoText: {
    fontSize: 10,
    color: '#008933',
    fontWeight: '500',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContent: {
    width: width - 40,
    maxHeight: height * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  createModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
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
  inputHelper: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingBottom: 8,
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
  autoSaveContainer: {
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  autoSaveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoSaveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  frequencyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  frequencyChipActive: {
    backgroundColor: '#008933',
    borderColor: '#008933',
  },
  frequencyText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  frequencyTextActive: {
    color: '#FFFFFF',
  },
  createConfirmButton: {
    backgroundColor: '#008933',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  createConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  actionModalContent: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 20,
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
  actionModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionCancelButton: {
    backgroundColor: '#F5F5F5',
  },
  actionCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  actionConfirmButton: {
    backgroundColor: '#008933',
  },
  actionWithdrawConfirmButton: {
    backgroundColor: '#FF6600',
  },
  actionConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  pinModalContent: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  pinModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
  },
  pinModalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#008933',
  },
  pinModalSubtitle2: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  pinModalLabel: {
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
  pinModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pinModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pinCancelButton: {
    backgroundColor: '#F5F5F5',
  },
  pinCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  pinConfirmButton: {
    backgroundColor: '#008933',
  },
  pinConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  detailModalContent: {
    width: width - 20,
    maxHeight: height * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseText: {
    fontSize: 18,
    color: '#666',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  detailGoalContainer: {
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailGoalLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailGoalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: '100%',
    backgroundColor: '#008933',
    borderRadius: 4,
  },
  detailProgressText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    textAlign: 'right',
  },
  detailStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  detailStatLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  detailStatusLocked: {
    backgroundColor: '#FFF3E0',
  },
  detailStatusUnlocked: {
    backgroundColor: '#E8F5E9',
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailStatusTextLocked: {
    color: '#FF6600',
  },
  detailStatusTextUnlocked: {
    color: '#10B981',
  },
  detailLockInfo: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailLockLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailLockDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6600',
  },
  detailAutoInfo: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailAutoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailAutoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#008933',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailAddButton: {
    backgroundColor: '#008933',
  },
  detailAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailWithdrawButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF6600',
  },
  detailWithdrawButtonText: {
    color: '#FF6600',
    fontSize: 14,
    fontWeight: '600',
  },
  detailHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  detailHistoryEmpty: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    paddingVertical: 20,
  },
  detailHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detailHistoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailHistoryAdd: {
    backgroundColor: '#E8F5E9',
  },
  detailHistoryWithdraw: {
    backgroundColor: '#FFF3E0',
  },
  detailHistoryIconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailHistoryInfo: {
    flex: 1,
  },
  detailHistoryNote: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  detailHistoryDate: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 2,
  },
  detailHistoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailHistoryAmountAdd: {
    color: '#008933',
  },
  detailHistoryAmountWithdraw: {
    color: '#FF6600',
  },
});