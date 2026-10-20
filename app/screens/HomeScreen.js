// screens/HomeScreen.js - Version PREMIUM harmonisée
// ✅ Logique 100% inchangée
// ✅ PULL-TO-REFRESH
// ✅ v2 : "Encaisser" retiré → "Points de vente" → "+" Coming Soon
// ✅ v3 : Cards Solde + Téléphone RÉDUITES (230 → 170)
// ✅ v4 : Actions rapides RÉDUITES + header SUPPRIMÉ
// ✨ v5 : QR Code du compte en bas (carte compacte)
// ✨ v6 : QR PERMANENT — régénération AUTO silencieuse toutes les 4 min
// ✨ v7 : QR SEUL — plus de texte autour (ni eyebrow, ni titre, ni badge)
//         QR centré, agrandi (150-200px)
// ✨ v8 : MASCOTTE ALBEY — UNIQUEMENT dans la Balance Card (bas-droite, agrandie)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Alert,
  RefreshControl,
  AppState,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import MainLayout from '../components/MainLayout';
import { useTransactions } from '../context/TransactionContext';
import { API } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { encodeQRData } from '../utils/qrUtils';

// ═══════════════════════════════════════════════════════════
// 🎨 PALETTE
// ═══════════════════════════════════════════════════════════
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
  iconOrange:   '#FF6600',
  iconBlue:     '#3B82F6',
  iconGreen:    '#008933',
  iconTeal:     '#10B981',
  iconPurple:   '#8B5CF6',
};

const AUTO_REFRESH_INTERVAL_MS = 5000;
const QR_AUTO_REGEN_INTERVAL_MS = 4 * 60 * 1000;

// ═══════════════════════════════════════════════════════════
// 🎯 ICÔNES
// ═══════════════════════════════════════════════════════════
const IconCompteACompte = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke={COLORS.iconOrange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke={COLORS.iconOrange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconEnvoiMoiMeme = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v12M8 11l4 4 4-4" stroke={COLORS.iconBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 20h14" stroke={COLORS.iconBlue} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconTransfertArgent = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="8" width="16" height="12" rx="2" stroke={COLORS.iconGreen} strokeWidth="1.8" />
    <Path d="M12 4L8 8h8L12 4z" stroke={COLORS.iconGreen} strokeWidth="1.8" strokeLinejoin="round" />
    <Path d="M9 14l3 3 3-3" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 11v6" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconStore = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l1.5-5h15L21 9" stroke={COLORS.iconPurple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9" stroke={COLORS.iconPurple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" stroke={COLORS.iconPurple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="9" y="14" width="6" height="6" rx="1" stroke={COLORS.iconPurple} strokeWidth="1.8" />
  </Svg>
);

const IconBoutique = () => (
  <Image
    source={require('../assets/images/boutique.png')}
    style={{ width: 26, height: 26, resizeMode: 'contain' }}
  />
);

const IconPlus = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={COLORS.textMuted} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const IconEye = ({ visible }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" />
  </Svg>
);

const IconArrowRight = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPhone = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0122 16.92z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconClose = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLocation = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconNav = ({ color = '#FFFFFF' }) => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M3 11l18-8-8 18-2-8-8-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════
// 🎨 PATTERN
// ═══════════════════════════════════════════════════════════
const LogoPattern = () => {
  const { width = 400, height = 800 } = useWindowDimensions();
  const LOGO_SIZE = 42;
  const GAP = 10;
  const STEP = LOGO_SIZE + GAP;
  const cols = Math.ceil(width / STEP) + 1;
  const rows = Math.ceil(height / STEP) + 2;

  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push(
        <Image
          key={`bg-logo-${row}-${col}`}
          source={require('../assets/patern.png')}
          style={styles.patternLogo}
          resizeMode="contain"
        />
      );
    }
  }

  return (
    <View style={styles.patternContainer} pointerEvents="none">
      <View style={styles.patternGrid}>{tiles}</View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// 📱 CARTE SOLDE TÉLÉPHONE
// ═══════════════════════════════════════════════════════════
const PhoneBalanceCard = ({ phoneData, fallbackPhone, onRecharge }) => {
  const { t } = useTranslation();
  const displayPhone = (phoneData && phoneData.phoneNumber) || fallbackPhone || '---';

  if (!phoneData) {
    return (
      <LinearGradient
        colors={['#008933', '#00A34D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.phoneCard}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>{t('common.loading')}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#008933', '#00A34D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.phoneCard}
    >
      <View style={styles.cardDecorCircle} pointerEvents="none" />

      <View style={styles.phoneCardTop}>
        <View style={styles.phoneCardHeader}>
          <View style={styles.phoneCardIcon}><IconPhone /></View>
          <Text style={styles.phoneCardTitle}>{t('home.phoneBalance')}</Text>
        </View>
        <Text style={styles.phoneNumber}>{displayPhone}</Text>
      </View>

      <View style={styles.phoneCardGrid}>
        <View style={styles.phoneCardItem}>
          <Text style={styles.phoneCardItemLabel}>📞 {t('home.credit')}</Text>
          <Text style={styles.phoneCardItemValue}>
            {phoneData.credit?.toLocaleString() || 0}
            <Text style={styles.phoneCardItemUnit}> F</Text>
          </Text>
        </View>
        <View style={styles.phoneCardItemDivider} />
        <View style={styles.phoneCardItem}>
          <Text style={styles.phoneCardItemLabel}>📶 {t('home.call')}</Text>
          <Text style={styles.phoneCardItemValue}>
            {phoneData.callMinutes || 0}
            <Text style={styles.phoneCardItemUnit}> min</Text>
          </Text>
        </View>
        <View style={styles.phoneCardItemDivider} />
        <View style={styles.phoneCardItem}>
          <Text style={styles.phoneCardItemLabel}>🌐 {t('home.internet')}</Text>
          <Text style={styles.phoneCardItemValue}>
            {phoneData.dataAmount || 0}
            <Text style={styles.phoneCardItemUnit}> {phoneData.dataUnit || 'GB'}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.phoneCardGrid}>
        <View style={[styles.phoneCardItem, { flex: 1 }]}>
          <Text style={styles.phoneCardItemLabel}>✉️ {t('home.sms')}</Text>
          <Text style={styles.phoneCardItemValue}>
            {phoneData.smsCount || 0}
            <Text style={styles.phoneCardItemUnit}> SMS</Text>
          </Text>
        </View>
        <View style={styles.phoneCardItemDivider} />
        <View style={[styles.phoneCardItem, { flex: 1 }]}>
          <Text style={styles.phoneCardItemLabel}>📱 {t('home.bonus')}</Text>
          <Text style={styles.phoneCardItemValue}>
            {phoneData.bonus || 0}
            <Text style={styles.phoneCardItemUnit}> F</Text>
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.phoneCardRecharge} onPress={onRecharge} activeOpacity={0.85}>
        <Text style={styles.phoneCardRechargeText}>{t('home.recharge')}</Text>
        <IconArrowRight />
      </TouchableOpacity>
    </LinearGradient>
  );
};

// ═══════════════════════════════════════════════════════════
// ✨ CARTE QR CODE — QR SEUL (mascotte retirée)
// ═══════════════════════════════════════════════════════════
const MyQRCard = ({ qrValue, qrSize }) => {
  return (
    <View style={styles.qrCard}>
      <QRCode
        value={qrValue}
        size={qrSize}
        color={COLORS.textPrimary}
        backgroundColor="#FFFFFF"
        logo={require('../assets/images/logo-carre.png')}
        logoSize={qrSize * 0.20}
        logoBackgroundColor="#FFFFFF"
        logoBorderRadius={10}
        logoMargin={4}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// 🏪 MODAL POINTS DE VENTE
// ═══════════════════════════════════════════════════════════
const PointOfSaleModal = ({ visible, onClose, points = [], isLoading = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsetsSafe();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return points;
    const q = searchQuery.toLowerCase().trim();
    return points.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  }, [points, searchQuery]);

  const handleNavigate = (point) => {
    if (!point.lat || !point.lng) {
      Alert.alert('Information', 'Coordonnées GPS non disponibles pour ce point de vente.');
      return;
    }
    const url = Platform.select({
      ios:     `http://maps.apple.com/?daddr=${point.lat},${point.lng}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`,
    });
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de cartes.');
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.psModalOverlay}>
        <TouchableOpacity style={styles.psModalBackdrop} onPress={onClose} activeOpacity={1} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.psModalWrapper}
        >
          <View style={[styles.psModalContent, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20 }]}>
            <View style={styles.psDragHandle} />

            <View style={styles.psHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.psTitle}>Points de vente</Text>
                <Text style={styles.psSubtitle}>
                  {isLoading
                    ? 'Chargement…'
                    : `${filtered.length} ${filtered.length > 1 ? 'agences disponibles' : 'agence disponible'}`}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.psCloseButton} activeOpacity={0.7}>
                <IconClose />
              </TouchableOpacity>
            </View>

            <View style={styles.psSearchWrapper}>
              <View style={styles.psSearchIcon}><IconSearch /></View>
              <TextInput
                style={styles.psSearchInput}
                placeholder="Rechercher une agence, une ville…"
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.psSearchClear} activeOpacity={0.7}>
                  <Text style={styles.psSearchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading ? (
              <View style={styles.psLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.psLoadingText}>Chargement des agences…</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.psEmptyContainer}>
                <View style={styles.psEmptyIconWrap}><IconStore /></View>
                <Text style={styles.psEmptyTitle}>Aucun point de vente</Text>
                <Text style={styles.psEmptyText}>
                  {searchQuery
                    ? 'Aucune agence ne correspond à votre recherche.'
                    : 'Aucune agence disponible pour le moment.'}
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.psListContent}
                keyboardShouldPersistTaps="handled"
              >
                {filtered.map((point, idx) => (
                  <View key={String(point.id ?? idx)} style={styles.psCard}>
                    <View style={styles.psCardLeft}>
                      <View style={styles.psCardIconWrap}>
                        <IconLocation color={COLORS.primary} />
                      </View>
                    </View>
                    <View style={styles.psCardBody}>
                      <Text style={styles.psCardName} numberOfLines={1}>
                        {point.name || 'Agence NT Albey'}
                      </Text>
                      <Text style={styles.psCardAddress} numberOfLines={1}>
                        {point.address || 'Adresse non disponible'}
                      </Text>
                      <View style={styles.psCardActions}>
                        <TouchableOpacity
                          style={styles.psCardBtn}
                          onPress={() => handleNavigate(point)}
                          activeOpacity={0.85}
                        >
                          <IconNav />
                          <Text style={styles.psCardBtnText}>Y aller</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

function useSafeAreaInsetsSafe() {
  try {
    const { useSafeAreaInsets } = require('react-native-safe-area-context');
    return useSafeAreaInsets();
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

// ═══════════════════════════════════════════════════════════
// 🏠 HOME SCREEN
// ═══════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const { logout } = useAuth();
  const nav = useNavigation();
  const { t } = useTranslation();

  const [balanceVisible, setBalanceVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef(null);
  const scrollViewRef = useRef(null);

  const {
    balance,
    refreshWallet,
    wallet,
    isLoading: walletLoading,
  } = useTransactions();

  const [phoneData, setPhoneData] = useState(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(true);
  const [userName, setUserName] = useState('Client');
  const [userPhone, setUserPhone] = useState('');

  const [pointsOfSale, setPointsOfSale] = useState([]);
  const [isPointsLoading, setIsPointsLoading] = useState(false);
  const [pointsModalVisible, setPointsModalVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // ✨ État QR Code
  const [qrValue, setQrValue] = useState('');
  const qrInitializedRef = useRef(false);
  const qrRegenTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // ✨ QR plus grand (puisqu'il est seul, sans texte)
  const qrSize = Math.min(200, Math.max(150, Math.floor(width * 0.5)));

  const chatButtonSize = 56;
  const pan = useRef(new Animated.ValueXY({ x: width - chatButtonSize - 20, y: height - 200 })).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        isDragging.current = false;
      },
      onPanResponderMove: (e, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          isDragging.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(e, gestureState);
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const maxX = width - chatButtonSize;
        const maxY = height - chatButtonSize - 100;
        const newX = Math.min(Math.max(pan.x._value, 0), maxX);
        const newY = Math.min(Math.max(pan.y._value, 0), maxY);
        pan.setValue({ x: newX, y: newY });
        if (!isDragging.current) navigation.navigate('Chatbot');
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
      const interval = setInterval(() => {
        refreshWallet();
      }, AUTO_REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [refreshWallet])
  );

  const generateMyQR = useCallback((user) => {
    if (!user?.phone) return;
    try {
      const encrypted = encodeQRData({
        type: 'ntalbey',
        subtype: 'receive',
        phone: String(user.phone).replace(/\s/g, '').replace(/^\+?227/, ''),
        name: user.name || undefined,
      });
      setQrValue(encrypted);
    } catch (e) {
      if (__DEV__) console.log('❌ [HomeScreen] Erreur génération QR:', e?.message);
    }
  }, []);

  // Génération initiale (une seule fois)
  useEffect(() => {
    if (!qrInitializedRef.current && userPhone && userName) {
      qrInitializedRef.current = true;
      generateMyQR({ name: userName, phone: userPhone });
    }
  }, [userPhone, userName, generateMyQR]);

  // ✨ Régénération AUTOMATIQUE toutes les 4 minutes
  useEffect(() => {
    if (!userPhone) return;

    if (qrRegenTimerRef.current) {
      clearInterval(qrRegenTimerRef.current);
    }

    qrRegenTimerRef.current = setInterval(() => {
      generateMyQR({ name: userName, phone: userPhone });
    }, QR_AUTO_REGEN_INTERVAL_MS);

    return () => {
      if (qrRegenTimerRef.current) {
        clearInterval(qrRegenTimerRef.current);
        qrRegenTimerRef.current = null;
      }
    };
  }, [userPhone, userName, generateMyQR]);

  // ✨ Régénération IMMÉDIATE au retour au premier plan
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState !== 'active' && nextState === 'active') {
        if (userPhone && userName) {
          generateMyQR({ name: userName, phone: userPhone });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userPhone, userName, generateMyQR]);

  const loadUserAndPhoneData = useCallback(async () => {
    try {
      const user = await API.getCurrentUser();
      const phone = user?.phone || '';
      const name = user?.name || 'Client';

      setUserPhone(phone);
      setUserName(name);

      try {
        const response = await API.getPhoneRealBalance(phone);

        let formattedData = {
          phoneNumber: phone,
          credit: 0,
          callMinutes: 0,
          dataAmount: 0,
          dataUnit: 'Mo',
          smsCount: 0,
          bonus: 0,
        };

        if (response.success) {
          const credit = parseFloat(String(response.solde).replace(' XOF', '')) || 0;
          const callMinutes = parseInt(String(response.r_minuteTR).replace('Min', '')) || 0;

          const rawInternetStr = String(response.r_internet || '');
          let dataAmount = 0;
          let dataUnit = 'Mo';

          if (rawInternetStr.includes('GB')) {
            dataAmount = parseFloat(rawInternetStr.replace('GB', '')) || 0;
            dataUnit = 'GB';
          } else if (rawInternetStr.includes('Mo')) {
            const moValue = parseFloat(rawInternetStr.replace('Mo', '')) || 0;
            if (moValue >= 1024) {
              dataAmount = (moValue / 1024).toFixed(1);
              dataUnit = 'GB';
            } else {
              dataAmount = moValue;
              dataUnit = 'Mo';
            }
          }

          const smsCount = parseInt(String(response.r_smsNT).replace('SMS', '')) || 0;

          formattedData = {
            phoneNumber: phone,
            credit: credit,
            callMinutes: callMinutes,
            dataAmount: dataAmount,
            dataUnit: dataUnit,
            smsCount: smsCount,
            bonus: 0,
          };
        } else {
          const credit = parseFloat(String(response.solde).replace(' XOF', '')) || 0;
          formattedData.credit = credit;
        }

        setPhoneData(formattedData);
      } catch (error) {
        console.error('❌ [HomeScreen] Erreur chargement solde téléphone:', error);
        setPhoneData({
          phoneNumber: phone,
          credit: 0,
          callMinutes: 0,
          dataAmount: 0,
          dataUnit: 'Mo',
          smsCount: 0,
          bonus: 0,
        });
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    } finally {
      setIsPhoneLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserAndPhoneData();
  }, [loadUserAndPhoneData]);

  const loadPointsOfSale = useCallback(async () => {
    if (pointsOfSale.length > 0) return;
    setIsPointsLoading(true);
    try {
      const data = await API.getWithdrawLocations();
      setPointsOfSale(Array.isArray(data) ? data : []);
    } catch (e) {
      setPointsOfSale([]);
    } finally {
      setIsPointsLoading(false);
    }
  }, [pointsOfSale.length]);

  const handleOpenPointsModal = useCallback(() => {
    setPointsModalVisible(true);
    loadPointsOfSale();
  }, [loadPointsOfSale]);

  const handleComingSoon = useCallback(() => {
    Alert.alert(
      '✨ Bientôt disponible',
      'De nouvelles fonctionnalités arrivent très bientôt sur NT Albey.\n\nRestez connectés !',
      [{ text: 'Compris', style: 'default' }]
    );
  }, []);

  const handlePullRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshWallet(),
        loadUserAndPhoneData(),
      ]);
    } catch (e) {
      if (__DEV__) console.log('⚠️ [HomeScreen] Erreur pull-to-refresh:', e?.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refreshWallet, loadUserAndPhoneData]);

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const quickActions = [
    { key: 'boutique',      label: t('home.shop'),             Icon: IconBoutique,        screen: 'Shop',                bg: `${COLORS.iconOrange}15` },
    { key: 'compteacompte', label: t('home.accountToAccount'), Icon: IconCompteACompte,   screen: 'SendMoney',           bg: `${COLORS.iconOrange}15` },
    { key: 'envoimoi',      label: t('home.selfTransfer'),     Icon: IconEnvoiMoiMeme,    screen: 'Withdraw',            bg: `${COLORS.iconBlue}15`   },
    { key: 'transfert',     label: t('home.moneyTransfer'),    Icon: IconTransfertArgent, screen: 'TransferToAgency',    bg: `${COLORS.iconGreen}15`  },
    { key: 'pointdevente',  label: 'Points de vente',          Icon: IconStore,           action: handleOpenPointsModal, bg: `${COLORS.iconPurple}15` },
    { key: 'comingsoon',    label: 'Bientôt...',               Icon: IconPlus,            action: handleComingSoon,      bg: `${COLORS.textMuted}12`  },
  ];

  const slides = [
    {
      id: 'balance',
      component: (
        <LinearGradient
          colors={['#008933', '#00A34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.cardDecorCircle} pointerEvents="none" />

          {/* ✨ Mascotte Albey — coin bas-droite, agrandie */}
          <Image
            source={require('../assets/mascotte.png')}
            style={styles.balanceMascot}
            resizeMode="contain"
          />

          <View style={styles.balanceTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>
                {t('home.balanceAvailable')}
                {wallet?.currency_code ? ` • ${wallet.currency_code}` : ''}
              </Text>
              <Text style={styles.balanceAmount}>
                {walletLoading && !balance
                  ? '• • • • •'
                  : balanceVisible
                    ? `${balance.toLocaleString('fr-FR')} FCFA`
                    : '• • • • •'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setBalanceVisible(!balanceVisible)}
              style={styles.eyeButton}
              activeOpacity={0.8}
            >
              <IconEye visible={balanceVisible} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceBottom}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>{t('home.accountHolder')}</Text>
              <Text style={styles.accountNumber} numberOfLines={1}>{userName}</Text>
            </View>
          </View>
        </LinearGradient>
      ),
    },
    {
      id: 'phone',
      component: (
        <PhoneBalanceCard
          phoneData={phoneData}
          fallbackPhone={userPhone}
          onRecharge={() => navigation.navigate('Shop')}
        />
      ),
    },
  ];

  const handlePress = (item) => {
    if (item.action) {
      item.action();
      return;
    }
    if (item.screen === 'SendMoney') navigation.navigate('SendMoney');
    else if (item.screen === 'Withdraw') navigation.navigate('Withdraw');
    else if (item.screen === 'TransferToAgency') navigation.navigate('TransferToAgency');
    else if (item.screen === 'CashIn') navigation.navigate('CashIn');
    else if (item.screen === 'Shop') navigation.navigate('Shop');
  };

  const onScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(index);
  };

  return (
    <MainLayout activeScreen="Home" onLogout={handleLogout}>
      <View style={styles.homeContainer}>
        <LogoPattern />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
              progressBackgroundColor={COLORS.surface}
              title="Actualisation…"
              titleColor={COLORS.textSecondary}
            />
          }
        >
          {/* ═══ CAROUSEL ═══ */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={slides}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyExtractor={(item, index) => `slide-${item.id}-${index}`}
              renderItem={({ item }) => (
                <View style={{ width, paddingHorizontal: 16 }}>
                  {item.component}
                </View>
              )}
              style={{ width }}
            />

            <View style={styles.paginationContainer}>
              {slides.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[styles.paginationDot, currentSlide === index && styles.paginationDotActive]}
                />
              ))}
            </View>
          </View>

          {/* ═══ ACTIONS RAPIDES ═══ */}
          <View style={styles.actionsWrapper}>
            <View style={styles.actionsGrid}>
              {quickActions.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.actionItem}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconWrapper, { backgroundColor: item.bg }]}>
                    <item.Icon />
                  </View>
                  <Text style={styles.actionLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ✨ MON QR CODE — QR SEUL */}
          {qrValue && (
            <View style={styles.qrSection}>
              <MyQRCard qrValue={qrValue} qrSize={qrSize} />
            </View>
          )}
        </ScrollView>

        {/* ═══ CHAT BUTTON ═══ */}
        <Animated.View
          style={[styles.chatButtonContainer, { transform: pan.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.chatButton}>
            <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </Animated.View>

        {/* ═══ MODAL POINTS DE VENTE ═══ */}
        <PointOfSaleModal
          visible={pointsModalVisible}
          onClose={() => setPointsModalVisible(false)}
          points={pointsOfSale}
          isLoading={isPointsLoading}
        />
      </View>
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  homeContainer: { flex: 1, position: 'relative' },
  scrollContent: { paddingBottom: 100, paddingTop: 12 },

  // Pattern
  patternContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingTop: 4 },
  patternLogo: { width: 42, height: 42, marginRight: 10, marginBottom: 10, opacity: 0.045 },

  // Carousel
  carouselContainer: { position: 'relative', zIndex: 1 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 6 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  paginationDotActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  // Balance card
  balanceCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 170,
    justifyContent: 'space-between',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  cardDecorCircle: {
    position: 'absolute', top: -60, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // ✨ Mascotte Albey dans la Balance Card (agrandie 76 → 110)
  balanceMascot: {
    position: 'absolute',
    right: 10 ,
    bottom: 0,
    width: 120,
    height: 120,
    zIndex: 2,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  balanceAmount: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  eyeButton: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  balanceBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)',
  },
  accountInfo: { flex: 1 },
  accountLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
  accountNumber: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },

  // Phone card
  phoneCard: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    height: 170,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  phoneCardTop: { marginBottom: 2 },
  phoneCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  phoneCardIcon: {
    width: 20, height: 20, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  phoneCardTitle: {
    color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  phoneNumber: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.8, marginTop: 1 },
  phoneCardGrid: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
  },
  phoneCardItem: { flex: 1, alignItems: 'center' },
  phoneCardItemDivider: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
  phoneCardItemLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '600',
    marginBottom: 1, letterSpacing: 0.2, textTransform: 'uppercase',
  },
  phoneCardItemValue: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  phoneCardItemUnit: { fontSize: 8, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },
  phoneCardRecharge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, marginTop: 2,
  },
  phoneCardRechargeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // Actions rapides
  actionsWrapper: { paddingHorizontal: 16, marginTop: 16 },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 2,
    borderWidth: 1, borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 14 },
      android: { elevation: 3 },
    }),
  },
  actionItem: { width: '33.33%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  actionIconWrapper: {
    width: 46, height: 46, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  actionLabel: {
    fontSize: 10, color: COLORS.textPrimary, fontWeight: '700',
    textAlign: 'center', letterSpacing: 0.1,
    paddingHorizontal: 4, lineHeight: 13,
  },

  // ✨ QR Card — QR SEUL, centré
  qrSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },

  // Chat button
  chatButtonContainer: { position: 'absolute', top: 0, left: 0, zIndex: 10 },
  chatButton: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  // Modal Points de vente
  psModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  psModalBackdrop: { flex: 1 },
  psModalWrapper: { justifyContent: 'flex-end' },
  psModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 8,
    maxHeight: '88%', minHeight: 400,
  },
  psDragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 8, marginBottom: 16,
  },
  psHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  psTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  psSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, fontWeight: '500' },
  psCloseButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  psSearchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14, paddingHorizontal: 12, height: 48,
    borderWidth: 1, borderColor: COLORS.borderSoft, marginBottom: 16,
  },
  psSearchIcon: { marginRight: 8 },
  psSearchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0, fontWeight: '500' },
  psSearchClear: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  psSearchClearText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  psListContent: { paddingBottom: 8, gap: 10 },
  psCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  psCardLeft: { marginRight: 12 },
  psCardIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${COLORS.primary}15`,
  },
  psCardBody: { flex: 1, justifyContent: 'space-between' },
  psCardName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1 },
  psCardAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },
  psCardActions: { flexDirection: 'row', marginTop: 10 },
  psCardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  psCardBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  psLoadingContainer: { alignItems: 'center', paddingVertical: 60 },
  psLoadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  psEmptyContainer: { alignItems: 'center', paddingVertical: 60 },
  psEmptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  psEmptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  psEmptyText: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: 'center', paddingHorizontal: 24,
    lineHeight: 19, fontWeight: '500',
  },
});