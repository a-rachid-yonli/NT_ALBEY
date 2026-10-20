// screens/TransactionsScreen.js - Version simplifiée et lisible
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Share,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import MainLayout from '../components/MainLayout';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { useTransactions } from '../context/TransactionContext';
import { getLogoBase64 } from '../utils/pdfUtils';

// Icônes
const IconSearch = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#999" strokeWidth="1.8" />
    <Path d="M21 21l-4.35-4.35" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconShare = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12" stroke="#008933" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPDF = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8M8 18h6" stroke="#FF0000" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconRepeat = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M17 2l4 4-4 4M7 22l-4-4 4-4" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 6h16a2 2 0 012 2v2M21 18H5a2 2 0 01-2-2v-2" stroke="#FF6600" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// ────────────────────────────────────────────────────────────────
// Nettoyage des descriptions qui contiennent d'anciennes clés
// ────────────────────────────────────────────────────────────────
const cleanDescription = (raw) => {
  if (!raw) return 'Transaction';
  let text = String(raw);
  text = text.replace(/transferAgency\.transferTo/gi, 'Transfert au guichet à');
  text = text.replace(/sendMoney\.transferTo/gi, 'Transfert à');
  text = text.replace(/sendMoney\.beneficiary/gi, 'Bénéficiaire');
  text = text.replace(/cashIn\.sender/gi, 'Expéditeur');
  text = text.replace(/sendMoney\./gi, '');
  text = text.replace(/cashIn\./gi, '');
  text = text.replace(/transferAgency\./gi, '');
  text = text.replace(/history\./gi, '');
  text = text.replace(/common\./gi, '');
  text = text.replace(/payment\./gi, '');
  text = text.replace(/shop\./gi, '');
  text = text.replace(/gouvPay\./gi, '');
  text = text.replace(/withdraw\./gi, '');
  text = text.replace(/savings\./gi, '');
  return text.trim();
};

const getTypeIcon = (type) => {
  const map = {
    transfer: '📤',
    transfert: '📤',
    reception: '📥',
    payment: '💳',
    paiement: '💳',
    bill: '📄',
    facture: '📄',
    shop: '🛍️',
    achat: '🛍️',
    withdraw: '💰',
    retrait: '💰',
    visa_recharge: '💳',
    gouvpay: '🏛️',
    savings: '🏦',
    cashin: '📥',
    transferAgency: '🏦',
    send: '📤',
    default: '📋',
  };
  return map[type] || map.default;
};

const getColorForType = (type) => {
  const map = {
    transfer: '#FF6600',
    transfert: '#FF6600',
    send: '#FF6600',
    reception: '#3B82F6',
    payment: '#8B5CF6',
    paiement: '#8B5CF6',
    bill: '#10B981',
    facture: '#10B981',
    shop: '#EC4899',
    achat: '#EC4899',
    withdraw: '#F59E0B',
    retrait: '#F59E0B',
    visa_recharge: '#1A1F71',
    gouvpay: '#14B8A6',
    savings: '#008933',
    cashin: '#10B981',
    transferAgency: '#008933',
  };
  return map[type] || '#666';
};

const getLabelForType = (type) => {
  const labels = {
    transfer: 'Transfert',
    transfert: 'Transfert',
    send: 'Envoi d\'argent',
    reception: 'Réception',
    payment: 'Paiement',
    paiement: 'Paiement',
    bill: 'Facture',
    facture: 'Facture',
    shop: 'Achat boutique',
    achat: 'Achat',
    withdraw: 'Retrait',
    retrait: 'Retrait',
    visa_recharge: 'Recharge carte',
    gouvpay: 'Paiement Gouv',
    savings: 'Épargne',
    cashin: 'Encaissement',
    transferAgency: 'Transfert au guichet',
    default: 'Opération',
  };
  return labels[type] || labels.default;
};

export default function TransactionsScreen({ onLogout }) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { transactions, isLoading } = useTransactions();

  const totalDepenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceptions = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const nbTransactions = transactions.length;

  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => t.type === selectedFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.details?.beneficiary && t.details.beneficiary.toLowerCase().includes(q)) ||
        (t.details?.sender && t.details.sender.toLowerCase().includes(q)) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.details?.phone && t.details.phone.includes(q))
      );
    }
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
      if (date.toDateString() === today.toDateString()) group = 'Aujourd\'hui';
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${mo}/${y} à ${h}:${min}`;
  };

  // ─── HTML du PDF ────────────────────────────────────────────────
  const generatePDFHTML = (transaction, logoBase64) => {
    const isPositive = transaction.amount > 0;
    const amountStr = isPositive ? `+ ${transaction.amount.toLocaleString()} FCFA` : `- ${Math.abs(transaction.amount).toLocaleString()} FCFA`;
    const description = cleanDescription(transaction.description);

    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<div style="background:linear-gradient(135deg,#008933,#00A34D);color:white;padding:10px 30px;border-radius:10px;display:inline-block;font-weight:700;font-size:22px;letter-spacing:4px;box-shadow:0 4px 15px rgba(0,137,51,0.3);margin-bottom:6px;">NT ALBEY</div>`;

    const beneficiary = transaction.details?.beneficiary || transaction.details?.sender || '';
    const phone = transaction.details?.phone || '';

    return `<!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial,sans-serif; padding:40px 30px; max-width:600px; margin:0 auto; color:#1A1A1A; background:white; }
          .header { text-align:center; border-bottom:3px solid #008933; padding-bottom:20px; margin-bottom:25px; }
          .logo-container { display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:8px; }
          .logo { max-width:120px; height:auto; margin-bottom:8px; }
          .header h1 { color:#008933; font-size:20px; margin:0; letter-spacing:2px; font-weight:700; }
          .header .subtitle { color:#666; font-size:13px; margin-top:4px; }
          .transaction-id { text-align:center; color:#888; font-size:11px; margin-top:4px; margin-bottom:16px; }
          .highlight-box { background-color:#F8F9FC; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #008933; }
          .highlight-box .info-row { border-bottom:1px solid #E8E8E8; padding:10px 0; }
          .highlight-box .info-row:last-child { border-bottom:none; }
          .info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F0F0F0; }
          .info-row:last-child { border-bottom:none; }
          .info-label { color:#666; font-size:13px; font-weight:500; }
          .info-value { color:#1A1A1A; font-size:13px; font-weight:600; text-align:right; max-width:60%; word-break:break-word; }
          .info-value.reference { color:#008933; font-family:monospace; font-size:12px; }
          .info-value.amount-positive { color:#10B981; }
          .info-value.amount-negative { color:#1A1A1A; }
          .status-badge { background-color:#10B981; color:white; padding:3px 14px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; }
          .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #F0F0F0; color:#999; font-size:11px; }
          .footer .brand { color:#008933; font-weight:700; }
          .footer .date { font-size:9px; color:#BBB; margin-top:4px; }
        </style></head>
        <body>
          <div class="header">
            <div class="logo-container">${logoHtml}<h1>NT ALBEY</h1></div>
            <div class="subtitle">Reçu de transaction</div>
          </div>
          <div class="transaction-id">Transaction N° ${transaction.id}</div>
          <div class="highlight-box">
            <div class="info-row"><span class="info-label">📋 Type d'opération</span><span class="info-value">${description}</span></div>
            <div class="info-row"><span class="info-label">💰 Montant</span><span class="info-value ${isPositive ? 'amount-positive' : 'amount-negative'}">${amountStr}</span></div>
          </div>
          <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${formatFullDate(transaction.date)}</span></div>
          <div class="info-row"><span class="info-label">🔑 Référence</span><span class="info-value reference">${transaction.reference || 'Non disponible'}</span></div>
          ${beneficiary ? `<div class="info-row"><span class="info-label">👤 Personne</span><span class="info-value">${beneficiary}</span></div>` : ''}
          ${phone ? `<div class="info-row"><span class="info-label">📞 Téléphone</span><span class="info-value">${phone}</span></div>` : ''}
          <div class="info-row"><span class="info-label">✅ Statut</span><span class="info-value"><span class="status-badge">PAYÉ</span></span></div>
          <div class="info-row"><span class="info-label">💳 Compte débité</span><span class="info-value">Wallet principal •••• 4587</span></div>
          <div class="footer"><div class="brand">NT Albey</div><div>Votre argent, partout, tout le temps</div><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div></div>
        </body>
      </html>`;
  };

  // ─── Export PDF (fix Expo Go) ───────────────────────────────────
  const handleExportPDF = async (transaction) => {
    try {
      setExporting(true);
      const logoBase64 = await getLogoBase64();
      const html = generatePDFHTML(transaction, logoBase64);

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');

      const filename = `recu_transaction_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Reçu de transaction',
          UTI: 'com.adobe.pdf',
        });
      } else {
        const isPositive = transaction.amount > 0;
        const amountStr = isPositive ? `+ ${transaction.amount.toLocaleString()} FCFA` : `- ${Math.abs(transaction.amount).toLocaleString()} FCFA`;
        const description = cleanDescription(transaction.description);
        let text = `NT ALBEY - Reçu de transaction\nType : ${description}\nMontant : ${amountStr}\nDate : ${formatFullDate(transaction.date)}\nRéférence : ${transaction.reference || 'Non disponible'}`;
        if (transaction.details?.beneficiary) text += `\nBénéficiaire : ${transaction.details.beneficiary}`;
        if (transaction.details?.phone) text += `\nTéléphone : ${transaction.details.phone}`;
        await Share.share({ message: text });
      }
    } catch (error) {
      console.error('Erreur export PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF.\n' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async (transaction) => {
    const message = `NT Albey - Reçu de transaction\nType : ${cleanDescription(transaction.description)}\nMontant : ${formatAmount(transaction.amount)}\nDate : ${new Date(transaction.date).toLocaleString('fr-FR')}\nRéférence : ${transaction.reference}`;
    try {
      await Share.share({ message });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager cette transaction.');
    }
  };

  const handleRepeat = (transaction) => {
    Alert.alert(
      'Répéter cette transaction ?',
      `${cleanDescription(transaction.description)}\n${formatAmount(transaction.amount)}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Oui, répéter', onPress: () => Alert.alert('C\'est fait !', 'La transaction a été répétée avec succès.') }
      ]
    );
  };

  const filteredTransactions = getFilteredTransactions();
  const groupedTransactions = groupByDate(filteredTransactions);

  // ─── Filtres simplifiés ────────────────────────────────────────
  const filters = [
    { key: 'all', label: 'Tout', icon: '📋' },
    { key: 'transfer', label: 'Transferts', icon: '📤' },
    { key: 'reception', label: 'Réceptions', icon: '📥' },
    { key: 'payment', label: 'Paiements', icon: '💳' },
    { key: 'bill', label: 'Factures', icon: '📄' },
    { key: 'shop', label: 'Achats', icon: '🛍️' },
    { key: 'withdraw', label: 'Retraits', icon: '💰' },
    { key: 'savings', label: 'Épargne', icon: '🏦' },
  ];

  const statsMinWidth = width ? width - 32 : 350;
  const modalMaxHeight = height ? height * 0.85 : 700;

  if (isLoading) {
    return (
      <MainLayout activeScreen="Transactions" onLogout={onLogout}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#008933" />
          <Text style={{ marginTop: 16, color: '#666' }}>Chargement...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeScreen="Transactions" onLogout={onLogout}>
      <View style={{ flex: 1 }}>
        {/* Statistiques */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsContent}
        >
          <View style={[styles.statsContainer, { minWidth: statsMinWidth }]}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total dépensé</Text>
              <Text style={styles.statValueExpense}>{totalDepenses.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total reçu</Text>
              <Text style={styles.statValueIncome}>{totalReceptions.toLocaleString()} FCFA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Opérations</Text>
              <Text style={styles.statValueCount}>{nbTransactions}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <IconSearch />
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

        {/* Filtres horizontaux */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {filters.map((filter) => {
              const isActive = selectedFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(filter.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterChipIcon}>{filter.icon}</Text>
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Liste des transactions */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.transactionsList}
          style={styles.transactionsScroll}
        >
          {Object.keys(groupedTransactions).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>Vous n'avez encore rien fait ici.</Text>
            </View>
          ) : (
            Object.entries(groupedTransactions).map(([group, transactions]) => (
              <View key={group} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{group}</Text>
                {transactions.map(transaction => {
                  const icon = getTypeIcon(transaction.type);
                  const color = getColorForType(transaction.type);
                  const beneficiary = transaction.details?.beneficiary || transaction.details?.sender || '';
                  return (
                    <TouchableOpacity
                      key={transaction.id}
                      style={styles.transactionCard}
                      onPress={() => { setSelectedTransaction(transaction); setModalVisible(true); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.transactionIcon, { backgroundColor: `${color}15` }]}>
                        <Text style={styles.transactionIconText}>{icon}</Text>
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle} numberOfLines={1}>
                          {cleanDescription(transaction.description)}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {new Date(transaction.date).toLocaleDateString('fr-FR')} à {formatDate(transaction.date)}
                        </Text>
                        {beneficiary !== '' && <Text style={styles.transactionPhone}>👤 {beneficiary}</Text>}
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={[styles.transactionAmount, transaction.amount > 0 ? styles.amountPositive : styles.amountNegative]}>
                          {formatAmount(transaction.amount)}
                        </Text>
                        <View style={[styles.statusBadge, styles.statusSuccess]}>
                          <Text style={styles.statusText}>✓</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* MODAL DÉTAIL */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: modalMaxHeight }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détail de la transaction</Text>
              <View style={{ width: 40 }} />
            </View>
            {selectedTransaction && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailIconContainer}>
                  <View style={[styles.detailIcon, { backgroundColor: `${getColorForType(selectedTransaction.type)}15` }]}>
                    <Text style={styles.detailIconText}>{getTypeIcon(selectedTransaction.type)}</Text>
                  </View>
                </View>
                <Text style={styles.detailTitle}>{cleanDescription(selectedTransaction.description)}</Text>
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
                    <Text style={styles.detailLabel}>Date et heure</Text>
                    <Text style={styles.detailValue}>{formatFullDate(selectedTransaction.date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Référence</Text>
                    <Text style={styles.detailValueRef}>{selectedTransaction.reference || 'Non disponible'}</Text>
                  </View>
                  {selectedTransaction.details?.beneficiary && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bénéficiaire</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.details.beneficiary}</Text>
                    </View>
                  )}
                  {selectedTransaction.details?.sender && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expéditeur</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.details.sender}</Text>
                    </View>
                  )}
                  {selectedTransaction.details?.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Téléphone</Text>
                      <Text style={styles.detailValue}>{selectedTransaction.details.phone}</Text>
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
                    <Text style={styles.detailButtonText}>Copier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailButton, styles.pdfButton]}
                    onPress={() => handleExportPDF(selectedTransaction)}
                    disabled={exporting}
                  >
                    <IconPDF />
                    <Text style={[styles.detailButtonText, styles.pdfButtonText]}>
                      {exporting ? '...' : 'Partager'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailButton, styles.repeatButton]} onPress={() => handleRepeat(selectedTransaction)}>
                    <IconRepeat />
                    <Text style={[styles.detailButtonText, styles.repeatButtonText]}>Répéter</Text>
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
              <Text style={styles.filterModalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.filterModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.filterSectionTitle}>Type d'opération</Text>
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
  statsScroll: {
    paddingHorizontal: 16,
    marginTop: 12,
    flexGrow: 0,
  },
  statsContent: {
    paddingRight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
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
    textAlign: 'center',
  },
  statValueExpense: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6600',
  },
  statValueIncome: {
    fontSize: 13,
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
    height: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  filterWrapper: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    height: 38,
    minWidth: 80,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#008933',
    borderColor: '#008933',
  },
  filterChipIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  transactionsScroll: {
    flex: 1,
  },
  transactionsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 4,
  },
  groupContainer: {
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 8,
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
  transactionRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountPositive: {
    color: '#10B981',
  },
  amountNegative: {
    color: '#1A1A1A',
  },
  statusBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSuccess: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
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
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalCloseBtn: {
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconText: {
    fontSize: 28,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailAmount: {
    fontSize: 24,
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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  pdfButton: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FF000030',
  },
  pdfButtonText: {
    color: '#FF0000',
  },
  repeatButton: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FF660030',
  },
  repeatButtonText: {
    color: '#FF6600',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
  },
  filterOptionActive: {
    backgroundColor: '#008933',
  },
  filterOptionIcon: {
    fontSize: 14,
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
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});