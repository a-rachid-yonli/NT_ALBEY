// screens/NotificationsScreen.js - Version multilingue
// ✅ DESIGN PREMIUM : moderne, épuré, professionnel
// ✅ Dates relatives user-friendly (À l'instant, Il y a X min, Hier, etc.)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import MainLayout from '../components/MainLayout';
import { API } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  blue:         '#3B82F6',
  blueSoft:     '#DBEAFE',
  teal:         '#10B981',
  tealSoft:     '#D1FAE5',
  gold:         '#F59E0B',
  goldSoft:     '#FEF3C7',
  textPrimary:  '#0F172A',
  textSecondary:'#64748B',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  borderSoft:   '#F1F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAFC',
  background:   '#F1F5F9',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  shadow:       '#0F172A',
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconSuccess = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.teal} strokeWidth="2" />
    <Path d="M8 12.5l3 3 5-5" stroke={COLORS.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconWarning = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.accent} strokeWidth="2" />
    <Path d="M12 8v4M12 16h.01" stroke={COLORS.accent} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const IconInfo = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.blue} strokeWidth="2" />
    <Path d="M12 12h.01M12 8h.01" stroke={COLORS.blue} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const IconPromo = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.gold} strokeWidth="2" />
    <Path d="M12 6v6l4 2" stroke={COLORS.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBellBig = () => (
  <Svg width="48" height="48" viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
      stroke={COLORS.primary}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconCheckAll = ({ color = COLORS.primary }) => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M2 12l4 4L14 8" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 14l4 4 8-10" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// 🕒 FORMAT DATE USER-FRIENDLY (style WhatsApp / Gmail)
// ═══════════════════════════════════════════════════════════════
const MONTHS_SHORT_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const formatNotificationDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs    = now.getTime() - date.getTime();

  // Date dans le futur (ne devrait pas arriver, mais on sécurise)
  if (diffMs < 0) return 'À l\'instant';

  const diffSec   = Math.floor(diffMs / 1000);
  const diffMin   = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  // < 1 minute → À l'instant
  if (diffSec < 60) {
    return 'À l\'instant';
  }

  // < 60 minutes → Il y a X min
  if (diffMin < 60) {
    return `Il y a ${diffMin} min`;
  }

  // < 24 heures → Il y a X h
  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  // Calcul des jours calendaires (pas juste diffMs / 86400000)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNotif = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfNotif.getTime()) / 86400000
  );

  // Hier
  if (diffDays === 1) {
    return 'Hier';
  }

  // Il y a X jours (2 à 6 jours)
  if (diffDays >= 2 && diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }

  // Cette année → "12 janv."
  if (date.getFullYear() === now.getFullYear()) {
    const day   = date.getDate();
    const month = MONTHS_SHORT_FR[date.getMonth()];
    return `${day} ${month}`;
  }

  // Autre année → "12/01/2024"
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// ═══════════════════════════════════════════════════════════════
// 🔔 ÉCRAN DES NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
export default function NotificationsScreen({ onLogout }) {
  const { t } = useTranslation();
  const [notifs, setNotifs] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Charger les notifications depuis l'API
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await API.getNotifications();
        setNotifs(data);
      } catch (error) {
        console.error('Erreur chargement notifications:', error);
        Alert.alert(t('common.error'), t('notifications.loadError') || 'Impossible de charger les notifications');
      } finally {
        setIsLoading(false);
      }
    };
    loadNotifications();
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;

  const getFiltered = () => {
    if (activeFilter === 'all') return notifs;
    if (activeFilter === 'unread') return notifs.filter(n => !n.read);
    return notifs.filter(n => n.type === activeFilter);
  };

  const markAllAsRead = async () => {
    try {
      await API.markAllNotificationsAsRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      Alert.alert(t('common.success'), t('notifications.allMarkedRead') || 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      Alert.alert(t('common.error'), t('notifications.markError') || 'Impossible de marquer les notifications comme lues');
    }
  };

  const deleteNotification = (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = async (id) => {
    try {
      await API.markNotificationAsRead(id);
      setNotifs(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const handlePressNotification = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'success': return <IconSuccess />;
      case 'warning': return <IconWarning />;
      case 'info':    return <IconInfo />;
      case 'promo':   return <IconPromo />;
      default:        return <IconSuccess />;
    }
  };

  const getTypeBgColor = (type) => {
    switch(type) {
      case 'success': return COLORS.tealSoft;
      case 'warning': return COLORS.accentSoft;
      case 'info':    return COLORS.blueSoft;
      case 'promo':   return COLORS.goldSoft;
      default:        return COLORS.surfaceAlt;
    }
  };

  const filtered = getFiltered();

  // Définition des filtres avec icônes (traduits)
  const filters = [
    { key: 'all',     label: t('notifications.all'),           icon: '📋' },
    { key: 'unread',  label: t('notifications.unreadFilter'),  icon: '🔔' },
    { key: 'success', label: t('notifications.successFilter'), icon: '✅' },
    { key: 'warning', label: t('notifications.alertsFilter'),  icon: '⚠️' },
    { key: 'info',    label: t('notifications.infoFilter'),    icon: 'ℹ️' },
    { key: 'promo',   label: t('notifications.promosFilter'),  icon: '🎁' },
  ];

  if (isLoading) {
    return (
      <MainLayout activeScreen="Notifications" onLogout={onLogout}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeScreen="Notifications" onLogout={onLogout}>
      <View style={styles.content}>

        {/* ═══════════ HEADER PREMIUM ═══════════ */}
        <View style={styles.titleSection}>
          <View style={styles.titleLeft}>
            <Text style={styles.screenTitle}>{t('notifications.title')}</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount} {unreadCount > 1
                    ? t('notifications.unreadPlural')
                    : t('notifications.unread')}
                </Text>
              </View>
            )}
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllButton}
              activeOpacity={0.75}
            >
              <IconCheckAll color={COLORS.primary} />
              <Text style={styles.markAllText}>
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════ FILTRES ═══════════ */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {filters.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count = filter.key === 'unread' ? unreadCount : 0;

              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(filter.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.filterChipIcon}>{filter.icon}</Text>
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                    {count > 0 && ` (${count})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ═══════════ LISTE DES NOTIFICATIONS ═══════════ */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsList}
          style={styles.notificationsScroll}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <IconBellBig />
              </View>
              <Text style={styles.emptyTitle}>
                {t('notifications.noNotifications')}
              </Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'all'
                  ? t('notifications.noNotificationsYet')
                  : `${t('notifications.noNotificationsType')} "${filters.find(f => f.key === activeFilter)?.label}"`}
              </Text>
            </View>
          ) : (
            filtered.map((notif) => {
              const isUnread = !notif.read;
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notificationCard,
                    isUnread && styles.notificationCardUnread,
                  ]}
                  onPress={() => handlePressNotification(notif)}
                  onLongPress={() => deleteNotification(notif.id)}
                  activeOpacity={0.75}
                >
                  {/* Barre de gauche (uniquement si non-lue) */}
                  {isUnread && <View style={styles.unreadLeftBar} />}

                  {/* Icône */}
                  <View
                    style={[
                      styles.notificationIcon,
                      { backgroundColor: getTypeBgColor(notif.type) },
                    ]}
                  >
                    {getTypeIcon(notif.type)}
                  </View>

                  {/* Contenu */}
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          isUnread && styles.notificationTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {notif.title}
                      </Text>

                      {isUnread && <View style={styles.unreadDot} />}
                    </View>

                    <Text
                      style={styles.notificationMessage}
                      numberOfLines={2}
                    >
                      {notif.message}
                    </Text>

                    <Text style={styles.notificationDate}>
                      {formatNotificationDate(notif.date)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ═══════════════ LOADING ═══════════════
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // ═══════════════ HEADER ═══════════════
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 18,
    gap: 12,
  },
  titleLeft: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  unreadBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  unreadBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  markAllText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ═══════════════ FILTRES ═══════════════
  filterWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
    height: 38,
    minWidth: 80,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  filterChipIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // ═══════════════ LISTE ═══════════════
  notificationsScroll: {
    flex: 1,
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 4,
  },

  // ═══════════════ CARTE NOTIFICATION ═══════════════
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  notificationCardUnread: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary + '25',
  },
  unreadLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },

  // ═══════════════ ICÔNE TYPE ═══════════════
  notificationIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },

  // ═══════════════ CONTENU ═══════════════
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    letterSpacing: -0.1,
  },
  notificationTitleUnread: {
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  notificationMessage: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    fontWeight: '500',
  },
  notificationDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    flexShrink: 0,
  },

  // ═══════════════ EMPTY STATE ═══════════════
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
  },
});