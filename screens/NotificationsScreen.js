import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import MainLayout from '../components/MainLayout';

const { width } = Dimensions.get('window');

// Icônes
const IconSuccess = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="1.8" />
    <Path d="M8 12.5l3 3 5-5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconWarning = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#FF6600" strokeWidth="1.8" />
    <Path d="M12 8v4M12 16h.01" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconInfo = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="1.8" />
    <Path d="M12 12h.01M12 8h.01" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconPromo = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="1.8" />
    <Path d="M12 6v6l4 2" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const notifications = [
  { id: 1, type: 'success', title: 'Transfert réussi', message: 'Vous avez reçu 50 000 FCFA de Aïssata Moussa', date: '2026-06-10T09:41:00', read: false },
  { id: 2, type: 'success', title: 'Paiement effectué', message: 'Votre paiement Nigelec de 27 500 FCFA a été effectué', date: '2026-06-10T08:30:00', read: false },
  { id: 3, type: 'info', title: 'Nouvelle fonctionnalité', message: 'Découvrez Gouv-Pay pour payer vos impôts', date: '2026-06-09T14:00:00', read: true },
  { id: 4, type: 'warning', title: 'Limite de transaction', message: 'Vous avez atteint 80% de votre limite mensuelle', date: '2026-06-08T10:00:00', read: true },
  { id: 5, type: 'promo', title: 'Offre spéciale', message: '-50% sur les forfaits Internet', date: '2026-06-07T09:00:00', read: true },
];

export default function NotificationsScreen({ onLogout }) {
  const [notifs, setNotifs] = useState(notifications);
  const [activeFilter, setActiveFilter] = useState('all');

  const unreadCount = notifs.filter(n => !n.read).length;

  const getFiltered = () => {
    if (activeFilter === 'all') return notifs;
    if (activeFilter === 'unread') return notifs.filter(n => !n.read);
    return notifs.filter(n => n.type === activeFilter);
  };

  const markAllAsRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
  };

  const deleteNotification = (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'success': return <IconSuccess />;
      case 'warning': return <IconWarning />;
      case 'info': return <IconInfo />;
      case 'promo': return <IconPromo />;
      default: return <IconSuccess />;
    }
  };

  const getTypeBgColor = (type) => {
    switch(type) {
      case 'success': return '#E8F5E9';
      case 'warning': return '#FFF3E0';
      case 'info': return '#E3F2FD';
      case 'promo': return '#FFF8E1';
      default: return '#F5F5F5';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    return date.toLocaleDateString('fr-FR');
  };

  const filtered = getFiltered();
  const filterLabels = { all: 'Toutes', unread: 'Non lues', success: 'Succès', warning: 'Alertes', info: 'Infos', promo: 'Promos' };

  return (
    <MainLayout activeScreen="Notifications" onLogout={onLogout}>
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <View><Text style={styles.screenTitle}>Notifications</Text>{unreadCount > 0 && <Text style={styles.unreadText}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>}</View>
          {unreadCount > 0 && <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}><Text style={styles.markAllText}>Tout marquer comme lu</Text></TouchableOpacity>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {Object.entries(filterLabels).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.filterChip, activeFilter === key && styles.filterChipActive]} onPress={() => setActiveFilter(key)}>
              <Text style={[styles.filterChipText, activeFilter === key && styles.filterChipTextActive]}>{label}{key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.notificationsList}>
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}><Text style={styles.emptyEmoji}>🔔</Text><Text style={styles.emptyTitle}>Aucune notification</Text></View>
          ) : (
            filtered.map(notif => (
              <TouchableOpacity key={notif.id} style={[styles.notificationCard, !notif.read && styles.notificationCardUnread]} onLongPress={() => deleteNotification(notif.id)}>
                <View style={[styles.notificationIcon, { backgroundColor: getTypeBgColor(notif.type) }]}>{getTypeIcon(notif.type)}</View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}><Text style={styles.notificationTitle}>{notif.title}</Text><Text style={styles.notificationDate}>{formatDate(notif.date)}</Text></View>
                  <Text style={styles.notificationMessage}>{notif.message}</Text>
                  {!notif.read && <View style={styles.unreadDot} />}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 16 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  unreadText: { fontSize: 12, color: '#008933', marginTop: 2 },
  markAllButton: { backgroundColor: '#F0FFF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#008933' },
  markAllText: { color: '#008933', fontSize: 12, fontWeight: '500' },
  filterChips: { paddingHorizontal: 20, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  filterChipActive: { backgroundColor: '#008933', borderColor: '#008933' },
  filterChipText: { fontSize: 13, color: '#666' },
  filterChipTextActive: { color: '#FFF' },
  notificationsList: { paddingHorizontal: 20, paddingBottom: 20 },
  notificationCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10 },
  notificationCardUnread: { backgroundColor: '#F0FFF4', borderLeftWidth: 3, borderLeftColor: '#008933' },
  notificationIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationContent: { flex: 1, position: 'relative' },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notificationTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  notificationDate: { fontSize: 10, color: '#888' },
  notificationMessage: { fontSize: 12, color: '#666', lineHeight: 16 },
  unreadDot: { position: 'absolute', top: 2, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#008933' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
});