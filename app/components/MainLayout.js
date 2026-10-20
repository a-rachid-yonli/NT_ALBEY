// components/MainLayout.js - Version PREMIUM harmonisée
// ✅ Design homogène avec les autres écrans
// ✅ Statut KYC réel depuis l'API
// ✅ Bottom nav flottant + menu drawer raffiné
// ✅ Logique 100% inchangée
// 🔐 SÉCURITÉ : affichage d'un badge "Appareil compromis" si root/jailbreak détecté
// ✅ FIX v2 : footer menu → logo NT Albey (image) au lieu du texte "NT"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '../services/api';
import { useTranslation } from '../context/LanguageContext';
import { AVAILABLE_LANGUAGES } from '../translations';
import { useAuth } from '../context/AuthContext';
import { isDeviceCompromised } from '../utils/security';

const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
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
  success:      '#10B981',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  shadow:       '#0F172A',
};

const IconHamburger = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M4 7h16M4 12h16M4 17h10" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const IconBell = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={COLORS.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLogout = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17l4-4-4-4M12 13h8" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconClose = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconHome = ({ active }) => {
  const c = active ? COLORS.accent : COLORS.textMuted;
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path d="M3 12L12 4l9 8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={active ? `${COLORS.accent}15` : 'none'} />
    </Svg>
  );
};

const IconHistory = ({ active }) => {
  const c = active ? COLORS.accent : COLORS.textMuted;
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill={active ? `${COLORS.accent}15` : 'none'} />
      <Path d="M12 7v5l3 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const IconQRPay = () => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="2" />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="2" />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="2" />
    <Path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2zM18 16h-2v2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const MenuIconNotifications = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MenuIconProfile = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={COLORS.primary} strokeWidth="2" />
  </Svg>
);

const MenuIconHelp = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.primary} strokeWidth="2" />
    <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MenuIconChevron = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M9 6l6 6-6 6" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const STATUS_LABELS = {
  active:    { label: 'Actif',       color: '#059669', bg: '#D1FAE5', dot: '#10B981' },
  pending:   { label: 'En attente',  color: '#D97706', bg: '#FEF3C7', dot: '#F59E0B' },
  suspended: { label: 'Suspendu',    color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  blocked:   { label: 'Bloqué',      color: '#991B1B', bg: '#FECACA', dot: '#DC2626' },
  closed:    { label: 'Fermé',       color: '#475569', bg: '#E2E8F0', dot: '#64748B' },
};

const KYC_STATUS_LABELS = {
  approved:  { label: 'Compte vérifié',         shortLabel: 'Vérifié',      icon: '✓',  color: '#059669', bg: '#D1FAE5' },
  pending:   { label: 'Vérification en cours',  shortLabel: 'En cours',     icon: '⏳', color: '#D97706', bg: '#FEF3C7' },
  rejected:  { label: 'Vérification refusée',   shortLabel: 'Refusé',       icon: '✕',  color: '#DC2626', bg: '#FEE2E2' },
  expired:   { label: 'Vérification expirée',   shortLabel: 'Expiré',       icon: '⌛', color: '#475569', bg: '#E2E8F0' },
  none:      { label: 'Compte non vérifié',     shortLabel: 'Non vérifié',  icon: '!',  color: '#D97706', bg: '#FEF3C7' },
};

const LanguageModal = ({ visible, onClose, currentLanguage, onSelect }) => {
  const { t } = useTranslation();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.languageModalOverlay}>
        <View style={styles.languageModalContent}>
          <View style={styles.modalDragHandle} />

          <View style={styles.languageModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.languageModalTitle}>{t('language.selectLanguage')}</Text>
              <Text style={styles.languageModalSubtitle}>Choisissez votre langue préférée</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.languageModalCloseButton} activeOpacity={0.7}>
              <IconClose />
            </TouchableOpacity>
          </View>

          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = currentLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageItem, isActive && styles.languageItemActive]}
                onPress={() => onSelect(lang.code)}
                activeOpacity={0.75}
              >
                <View style={[styles.languageItemAbbr, isActive && styles.languageItemAbbrActive]}>
                  <Text style={[styles.languageItemAbbrText, isActive && styles.languageItemAbbrTextActive]}>
                    {lang.code.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.languageItemTextContainer}>
                  <Text style={styles.languageItemNative}>{lang.nativeLabel}</Text>
                  <Text style={styles.languageItemLabel}>{lang.label}</Text>
                </View>
                {isActive && (
                  <View style={styles.languageItemCheck}>
                    <Text style={styles.languageItemCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

const BottomNav = ({ active, navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const items = [
    { key: 'Home',    label: t('layout.home'),    Icon: IconHome,    available: true },
    { key: 'QRPay',   label: '',                   Icon: null,        isSpecial: true, available: true },
    { key: 'History', label: t('layout.history'), Icon: IconHistory, available: true },
  ];

  const handlePress = (item) => {
    if (!item.available) {
      Alert.alert('Bientôt disponible', `La fonctionnalité "${item.label}" sera disponible prochainement.`, [{ text: 'D\'accord' }]);
      return;
    }
    if (item.key === 'QRPay') navigation.navigate('QRPay');
    else if (item.key === 'Home') navigation.navigate('Home');
    else if (item.key === 'History') navigation.navigate('History');
  };

  return (
    <View style={[styles.bottomNavWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
      <View style={styles.bottomNav}>
        {items.map((item) => {
          const isDisabled = !item.available;
          const isActive = active === item.key && !isDisabled;

          if (item.isSpecial) {
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.qrPayWrapper}
                onPress={() => handlePress(item)}
                activeOpacity={0.85}
              >
                <View style={styles.qrPayButton}>
                  <IconQRPay />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                <item.Icon active={isActive} />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive, isDisabled && styles.navLabelDisabled]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const HamburgerMenu = ({ visible, onClose, navigation, user = {}, kycStatus = null, isCompromised = false }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const menuItems = [
    {
      key: 'Notifications',
      label: t('layout.notifications'),
      subtitle: 'Alertes et messages',
      icon: <MenuIconNotifications />,
      screen: 'Notifications',
    },
    {
      key: 'Profile',
      label: t('layout.profile'),
      subtitle: 'Vos informations',
      icon: <MenuIconProfile />,
      screen: 'Profile',
    },
    {
      key: 'FAQ',
      label: t('layout.faq'),
      subtitle: 'Aide et support',
      icon: <MenuIconHelp />,
      screen: 'FAQ',
    },
  ];

  const userName  = user?.name || 'Client';
  const userPhone = user?.phone || '';
  const initial   = (userName || 'C').charAt(0).toUpperCase();

  const statusKey  = user?.status || 'active';
  const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS.active;

  const kycStatusKey = kycStatus?.status || 'none';
  const kycInfo = KYC_STATUS_LABELS[kycStatusKey] || KYC_STATUS_LABELS.none;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.menuOverlay}>
        <TouchableOpacity style={styles.menuBackdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.menuContainer, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
          <View style={styles.menuHeader}>
            <View style={styles.menuHeaderBrandBox}>
              <View style={styles.menuHeaderDot} />
              <Text style={styles.menuHeaderBrand}>MON COMPTE</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.menuCloseButton} activeOpacity={0.7}>
              <IconClose />
            </TouchableOpacity>
          </View>

          <View style={styles.userCard}>
            <View style={styles.userCardBgDecor} />

            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              </View>
              <View style={[styles.avatarStatus, { backgroundColor: statusInfo.dot }]} />
            </View>

            <Text style={styles.menuUserName} numberOfLines={1}>{userName}</Text>
            {!!userPhone && (
              <Text style={styles.menuUserPhone} numberOfLines={1}>+227 {userPhone}</Text>
            )}

            <View style={styles.badgesRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.dot }]} />
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>

              <View style={[styles.kycBadge, { backgroundColor: kycInfo.bg }]}>
                <Text style={[styles.kycBadgeIcon, { color: kycInfo.color }]}>{kycInfo.icon}</Text>
                <Text style={[styles.kycBadgeText, { color: kycInfo.color }]}>
                  {kycInfo.shortLabel}
                </Text>
              </View>
            </View>

            {/* 🔐 Badge de compromission */}
            {isCompromised && (
              <View style={styles.compromisedBadge}>
                <Text style={styles.compromisedBadgeText}>
                  ⚠️ Appareil rooté — Sécurité limitée
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.menuList}
            contentContainerStyle={styles.menuListContent}
          >
            <View style={styles.menuSectionHeader}>
              <View style={styles.menuSectionBadge}>
                <Text style={styles.menuSectionBadgeText}>⚙️</Text>
              </View>
              <Text style={styles.menuSectionTitle}>PARAMÈTRES</Text>
              <View style={styles.menuSectionLine} />
            </View>

            <View style={styles.menuCard}>
              {menuItems.map((item, idx) => {
                const isLast = idx === menuItems.length - 1;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.menuItem, !isLast && styles.menuItemBordered]}
                    onPress={() => { onClose(); if (item.screen) navigation.navigate(item.screen); }}
                    activeOpacity={0.55}
                  >
                    <View style={styles.menuItemIcon}>{item.icon}</View>

                    <View style={styles.menuItemTextWrap}>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {!!item.subtitle && (
                        <Text style={styles.menuItemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                      )}
                    </View>

                    <View style={styles.menuItemChevron}>
                      <MenuIconChevron />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.menuFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 16 }]}>
            <View style={styles.menuFooterLogo}>
              <Image
                source={require('../assets/images/logo-carre.png')}
                style={styles.menuFooterLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuFooterText}>NT Albey</Text>
              <Text style={styles.menuFooterSub}>Votre application mobile citoyenne</Text>
              <Text style={styles.menuFooterSub}>Version 1.0</Text>
            </View>
            <View style={styles.menuFooterBadge}>
              <Text style={styles.menuFooterBadgeText}>✓</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function MainLayout({ children, activeScreen, onLogout }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useTranslation();
  const { logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  // 🔐 NOUVEAU : flag compromis calculé une fois
  const [isCompromised, setIsCompromised] = useState(false);

  const bellShake = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    try {
      setIsCompromised(isDeviceCompromised());
    } catch (_) {
      setIsCompromised(false);
    }
  }, []);

  const loadUserAndNotifications = useCallback(async () => {
    try {
      const cachedUser = await API.getCurrentUser();

      let freshProfile = null;
      try {
        freshProfile = await API.getMyProfile();
      } catch (e) {
        if (__DEV__) console.log('⚠️ [MainLayout] getMyProfile échoué, fallback cache');
      }

      const p = freshProfile?.profile || {};
      const merged = {
        name:      p.full_name || p.name || cachedUser?.name || 'Client',
        phone:     p.phone_number || cachedUser?.phone || '',
        status:    p.status || cachedUser?.status || 'active',
        kyc_level: freshProfile?.kyc_level || cachedUser?.kyc_level || 'kyc1',
      };
      setUserProfile(merged);

      try {
        const kyc = await API.getKycStatus();
        setKycStatus(kyc || null);
      } catch (e) {
        setKycStatus(null);
      }

      const count = await API.getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement layout');
    }
  }, []);

  useEffect(() => {
    loadUserAndNotifications();
  }, [loadUserAndNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadUserAndNotifications();

      const interval = setInterval(() => {
        loadUserAndNotifications();
      }, 8000);

      return () => clearInterval(interval);
    }, [loadUserAndNotifications])
  );

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      Animated.sequence([
        Animated.timing(bellShake, { toValue: 1,  duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: 1,  duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: 0,  duration: 70, easing: Easing.linear, useNativeDriver: true }),
      ]).start();

      Animated.sequence([
        Animated.timing(badgePulse, { toValue: 1.4, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(badgePulse, { toValue: 1,   duration: 220, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ]).start();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, bellShake, badgePulse]);

  const bellRotate = bellShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const handleLogout = () => {
    Alert.alert(
      t('layout.logout'),
      t('layout.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('layout.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              if (__DEV__) console.error('Erreur lors de la déconnexion');
              if (onLogout && typeof onLogout === 'function') {
                try { onLogout(); } catch (e) {}
              }
            }
          }
        }
      ]
    );
  };

  const handleLanguageSelect = async (code) => {
    await setLanguage(code);
    setLanguageModalVisible(false);
    setTimeout(() => {
      Alert.alert('✅', t('language.languageChanged'));
    }, 100);
  };

  const currentLangData = AVAILABLE_LANGUAGES.find(l => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.hamburgerButton}
            activeOpacity={0.7}
          >
            <IconHamburger />
          </TouchableOpacity>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
          />
        </View>

        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.languageHeaderButton}
            onPress={() => setLanguageModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.languageHeaderAbbr}>
              {currentLangData.code.toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
              <IconBell />
            </Animated.View>
            {unreadCount > 0 && (
              <Animated.View
                style={[styles.bellBadge, { transform: [{ scale: badgePulse }] }]}
              >
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={styles.iconButton} activeOpacity={0.7}>
            <IconLogout />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {children}
      </View>

      <BottomNav active={activeScreen} navigation={navigation} />

      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
        user={userProfile || {}}
        kycStatus={kycStatus}
        isCompromised={isCompromised}
      />

      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        currentLanguage={language}
        onSelect={handleLanguageSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  logoImage: {
    width: 100,
    height: 44,
    resizeMode: 'contain',
    marginLeft: 2,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    position: 'relative',
  },
  languageHeaderButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  languageHeaderAbbr: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  content: { flex: 1 },

  bottomNavWrapper: {
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navIconWrap: {
    width: 44,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: COLORS.accentSoft,
  },
  navLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: COLORS.accent,
    fontWeight: '800',
  },
  navLabelDisabled: {
    color: COLORS.border,
  },
  qrPayWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPayButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 4,
    borderColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)' },
  menuBackdrop: { flex: 1 },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 320,
    backgroundColor: COLORS.surface,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },

  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  menuHeaderBrandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  menuHeaderBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.6,
  },
  menuCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  userCard: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    overflow: 'hidden',
    position: 'relative',
  },
  userCardBgDecor: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primarySoft,
    opacity: 0.7,
  },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  avatarStatus: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.surfaceAlt,
  },
  menuUserName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  menuUserPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  kycBadgeIcon: {
    fontSize: 11,
    fontWeight: '800',
  },
  kycBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // 🔐 Badge compromis
  compromisedBadge: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  compromisedBadgeText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  menuSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
  },
  menuSectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  menuSectionBadgeText: {
    fontSize: 11,
  },
  menuSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.6,
  },
  menuSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSoft,
  },

  menuList: { flex: 1 },
  menuListContent: { paddingBottom: 16 },

  menuCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
  },
  menuItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
  },
  menuItemTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  menuItemSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  menuItemChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  menuFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceAlt,
  },
  menuFooterLogo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  menuFooterLogoImage: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  menuFooterText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },
  menuFooterSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  menuFooterBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  menuFooterBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  languageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  languageModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  languageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  languageModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  languageModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  languageModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  languageItemActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  languageItemAbbr: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  languageItemAbbrActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageItemAbbrText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  languageItemAbbrTextActive: { color: '#FFFFFF' },
  languageItemTextContainer: { flex: 1 },
  languageItemNative: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  languageItemLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  languageItemCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageItemCheckText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});