// screens/HomeScreen.js - Version PREMIUM harmonisée
// ✅ Logique 100% inchangée
// ✅ PULL-TO-REFRESH
// ✨ v27 : TAILLE D'ICÔNE PAR BOUTON (iconSize)
// ✨ v28 : AJOUT DE L'ICÔNE CUSTOM POUR LES POINTS DE VENTE (point_de_vente.png)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Image,
  Platform,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  Modal,
  Linking,
  RefreshControl,
  Vibration,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MainLayout from '../components/MainLayout';
import { useTransactions } from '../context/TransactionContext';
import { API } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation, TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView, ThemedKeyboardAvoidingView as KeyboardAvoidingView } from '../context/LanguageContext';

// ═══════════════════════════════════════════════════════════
// 🎨 PALETTE
// ═══════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  textPrimary:  '#0B1220',
  textSecondary:'#5A6474',
  textMuted:    '#A0A8B4',
  border:       '#E7EAF0',
  borderSoft:   '#F3F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#FAFBFD',
  background:   '#FFFFFF',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  success:      '#10B981',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  shadow:       '#0B1220',
  iconOrange:   '#FF6600',
  iconBlue:     '#3B82F6',
  iconGreen:    '#008933',
  iconTeal:     '#10B981',
  iconPurple:   '#8B5CF6',
};

const AUTO_REFRESH_INTERVAL_MS = 5000;

const hapticTap = (intensity = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (intensity === 'heavy') Vibration.vibrate(20);
    else if (intensity === 'medium') Vibration.vibrate(12);
    else Vibration.vibrate(6);
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════════
// 🎯 ICÔNES — PNG CUSTOM STYLISÉES
// ═══════════════════════════════════════════════════════════

const IconCompteACompte = ({ size = 30 }) => (
  <Image
    source={require('../assets/compte_a_compte.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

const IconEnvoiMoiMeme = ({ size = 31 }) => (
  <Image
    source={require('../assets/envoi_a_moi_meme.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

const IconTransfertArgent = ({ size = 32 }) => (
  <Image
    source={require("../assets/transfert_dargent.png")}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

const IconBoutique = ({ size = 30 }) => (
  <Image
    source={require('../assets/images/boutique.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

// ✅ v28 : Nouvelle icône PNG pour les points de vente
const IconPointDeVente = ({ size = 30 }) => (
  <Image
    source={require('../assets/point_de_vente.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

// ─── Autres icônes SVG (inchangées) ────────────────────────
const IconPlus = ({ color = COLORS.textMuted, size = 28 }) => (
  <Image
    source={require('../assets/bientot.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

const IconLightning = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round">
    <Path d="M13 2L4.09 12.97A1 1 0 005 14.5h5.5l-1 7.5L19 11.03A1 1 0 0018 9.5h-5.5l.5-7.5z" />
  </Svg>
);

const IconEye = ({ visible }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" />
        <Circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M1 1l22 22" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const IconArrowRight = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPhone = ({ color = '#FFFFFF', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconClose = ({ color = COLORS.textSecondary, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLocation = ({ color = COLORS.primary, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconNav = ({ color = '#FFFFFF', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 11l18-8-8 18-2-8-8-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════
// 🎨 PATTERN
// ═══════════════════════════════════════════════════════════
const LogoPattern = () => {
  const { width = 400, height = 800 } = useWindowDimensions();
  const LOGO_SIZE = 38;
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
        colors={['#007B30', '#009D42', '#2AB56A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.phoneCard}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 12, fontWeight: '500' }}>{t('common.loading')}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#063D21', '#007D32', '#00A847']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.phoneCard}
    >
      <View style={styles.cardDecorCircle} pointerEvents="none" />
      <View style={styles.cardDecorCircle2} pointerEvents="none" />

      <View style={styles.phoneCardTop}>
        <View style={styles.phoneCardHeader}>
          <View style={styles.phoneCardIcon}><IconPhone color="#FFFFFF" size={15} /></View>
          <Text style={styles.phoneCardTitle}>{t('home.phoneBalance')}</Text>
        </View>
        <View style={styles.phoneCardIdentity}>
          <Text style={styles.phoneNumber}>{displayPhone}</Text>
          <View style={styles.accountStatus}>
            <View style={styles.accountStatusDot} />
            <Text style={styles.accountStatusText}>ACTIF</Text>
          </View>
        </View>
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
// 🏪 MODAL POINTS DE VENTE
// ═══════════════════════════════════════════════════════════
const PointOfSaleModal = ({ visible, onClose, points = [], isLoading = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsetsSafe();
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      sheetTranslateY.setValue(0);
    }
  }, [visible, sheetTranslateY]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return points;
    const q = searchQuery.toLowerCase().trim();
    return points.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  }, [points, searchQuery]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetTranslateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          Animated.timing(sheetTranslateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleNavigate = (point) => {
    hapticTap('light');
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
        <Animated.View
          style={[
            styles.psSheetContent,
            {
              maxHeight: '88%',
              paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
          {...sheetPanResponder.panHandlers}
        >
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
            <TouchableOpacity onPress={onClose} style={styles.psCloseBtn} activeOpacity={0.7}>
              <IconClose />
            </TouchableOpacity>
          </View>

          <View style={styles.psSearchRow}>
            <View style={styles.psSearchIconWrap}>
              <IconSearch />
            </View>
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
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.psSearchClear}
                activeOpacity={0.7}
              >
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
              <View style={styles.psEmptyIconWrap}>
                <IconPointDeVente size={28} />
              </View>
              <Text style={styles.psEmptyTitle}>Aucun point de vente</Text>
              <Text style={styles.psEmptyText}>
                {searchQuery
                  ? 'Aucune agence ne correspond à votre recherche.'
                  : 'Aucune agence disponible pour le moment.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, idx) => String(item.id ?? idx)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.psListContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.psCard}>
                  <View style={styles.psCardAvatar}>
                    <IconLocation color={COLORS.primary} size={20} />
                  </View>
                  <View style={styles.psCardBody}>
                    <Text style={styles.psCardName} numberOfLines={1}>
                      {item.name || 'Agence NT Albey'}
                    </Text>
                    <Text style={styles.psCardAddress} numberOfLines={1}>
                      {item.address || 'Adresse non disponible'}
                    </Text>
                    <TouchableOpacity
                      style={styles.psCardBtn}
                      onPress={() => handleNavigate(item)}
                      activeOpacity={0.85}
                    >
                      <IconNav size={12} />
                      <Text style={styles.psCardBtnText}>Y aller</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </Animated.View>
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
// ⚡ ACTION ITEM — MICRO-ANIMATION + ICONSIZE PAR BOUTON
// ═══════════════════════════════════════════════════════════
const ActionItem = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.92,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const IconComponent = item.Icon;
  const iconProps = item.iconSize ? { size: item.iconSize } : {};

  return (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
    >
      <Animated.View
        style={[
          styles.actionIconWrapper,
          item.bgStyle,
          { transform: [{ scale }] },
        ]}
      >
        <View style={[styles.actionIconHalo, item.haloStyle]}>
          <IconComponent {...iconProps} />
        </View>
      </Animated.View>
      <Text style={styles.actionLabel} numberOfLines={2}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

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

  const { balance, refreshWallet, wallet, isLoading: walletLoading } = useTransactions();

  const [phoneData, setPhoneData] = useState(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(true);
  const [userName, setUserName] = useState('Client');
  const [userPhone, setUserPhone] = useState('');

  const [pointsOfSale, setPointsOfSale] = useState([]);
  const [isPointsLoading, setIsPointsLoading] = useState(false);
  const [pointsModalVisible, setPointsModalVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const chatButtonSize = 54;
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
      await Promise.all([refreshWallet(), loadUserAndPhoneData()]);
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

  // ═══════════════════════════════════════════════════════════
  // ⚡ QUICK ACTIONS — STYLES + ICONSIZE
  // ═══════════════════════════════════════════════════════════
  const quickActions = [
    {
      key: 'boutique',
      label: 'Boutique NT',
      Icon: IconBoutique,
      iconSize: 36,
      screen: 'Shop',
      bgStyle: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FFEDD5',
        ...Platform.select({
          ios: { shadowColor: '#FF6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      },
      haloStyle: { backgroundColor: 'rgba(255, 102, 0, 0.08)' },
    },
    {
      key: 'compteacompte',
      label: 'Compte à Compte',
      Icon: IconCompteACompte,
      iconSize: 36,
      screen: 'SendMoney',
      bgStyle: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FFEDD5',
        ...Platform.select({
          ios: { shadowColor: '#FF6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      },
      haloStyle: { backgroundColor: 'rgba(255, 102, 0, 0.08)' },
    },
    {
      key: 'envoimoi',
      label: 'Envoi à moi même',
      Icon: IconEnvoiMoiMeme,
      iconSize: 36,
      screen: 'Withdraw',
      bgStyle: {
        backgroundColor: '#EFF6FF',
        borderColor: '#DBEAFE',
        ...Platform.select({
          ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      },
      haloStyle: { backgroundColor: 'rgba(59, 130, 246, 0.08)' },
    },
    {
      key: 'transfert',
      label: "Transfert d'argent",
      Icon: IconTransfertArgent,
      iconSize: 36,
      screen: 'TransferToAgency',
      bgStyle: {
        backgroundColor: '#ECFDF5',
        borderColor: '#D1FAE5',
        ...Platform.select({
          ios: { shadowColor: '#008933', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      },
      haloStyle: { backgroundColor: 'rgba(0, 137, 51, 0.08)' },
    },
    {
      key: 'pointdevente',
      label: 'Points de vente',
      Icon: IconPointDeVente, // ✅ v28 : Nouvelle icône custom
      iconSize: 36,
      action: handleOpenPointsModal,
      bgStyle: {
        backgroundColor: '#F5F3FF',
        borderColor: '#EDE9FE',
        ...Platform.select({
          ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      },
      haloStyle: { backgroundColor: 'rgba(139, 92, 246, 0.08)' },
    },
    {
      key: 'comingsoon',
      label: 'Bientôt...',
      Icon: IconPlus,
      iconSize: 36,
      action: handleComingSoon,
      bgStyle: {
        backgroundColor: '#F8FAFC',
        borderColor: '#F1F5F9',
        ...Platform.select({
          ios: { shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
          android: { elevation: 1 },
        }),
      },
      haloStyle: { backgroundColor: 'rgba(148, 163, 184, 0.08)' },
    },
  ];

  const slides = [
    {
      id: 'balance',
      component: (
        <LinearGradient
          colors={['#063D21', '#007D32', '#00A847']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.cardDecorCircle} pointerEvents="none" />
          <View style={styles.cardDecorCircle2} pointerEvents="none" />

          <View style={styles.balanceTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>
                {t('home.balanceAvailable')}
                {wallet?.currency_code ? ` • ${wallet.currency_code}` : ''}
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

          <View style={styles.balanceAmountRow}>
            <Text style={styles.balanceAmount} numberOfLines={1}>
              {walletLoading && !balance
                ? '•••••'
                : balanceVisible
                  ? `${balance.toLocaleString('fr-FR')}`
                  : '••••••'}
            </Text>
            {balanceVisible && <Text style={styles.balanceCurrency}>FCFA</Text>}
          </View>

          <View style={styles.balanceBottom}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>{t('home.accountHolder')}</Text>
              <Text style={styles.accountNumber} numberOfLines={1}>{userName}</Text>
            </View>
            <View style={styles.accountStatus}>
              <View style={styles.accountStatusDot} />
              <Text style={styles.accountStatusText}>ACTIF</Text>
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
    else if (item.screen === 'Shop') navigation.navigate('Shop');
  };

  const onScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(index);
  };

  return (
    <MainLayout activeScreen="Home" onLogout={handleLogout}>
      <View style={styles.homeContainer}>
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

          {/* ═══ EN-TÊTE ACTIONS RAPIDES ═══ */}
          <View style={styles.quickActionsHeader}>
            <View style={styles.quickActionsHeading}>
              <Text style={styles.quickActionsTitle}>Actions rapides</Text>
            </View>
          </View>

          {/* ═══ GRILLE ACTIONS RAPIDES ═══ */}
          <View style={styles.actionsWrapper}>
            <View style={styles.actionsGrid}>
              {quickActions.map((item) => (
                <ActionItem
                  key={item.key}
                  item={item}
                  onPress={() => handlePress(item)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* ═══ CHAT BUTTON ═══ */}
        <Animated.View
          style={[styles.chatButtonContainer, { transform: pan.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.chatButton}>
            <Image
              source={require('../assets/support.png')}
              style={{ width: 38, height: 38 }}
              resizeMode="contain"
            />
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
  homeContainer: { flex: 1, position: 'relative', backgroundColor: '#F6F8F7' },
  scrollContent: { paddingBottom: 105, paddingTop: 12 },

  patternContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingTop: 4 },
  patternLogo: { width: 38, height: 38, marginRight: 10, marginBottom: 10, opacity: 0.045 },

  carouselContainer: { position: 'relative', zIndex: 1 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D6DDD8' },
  paginationDotActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  // ═══ BALANCE CARD — 220px ═══
  balanceCard: {
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 19,
    height: 210,
    justifyContent: 'space-between',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#006B28',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: { elevation: 11 },
    }),
  },
  cardDecorCircle: {
    position: 'absolute', top: -65, right: -55,
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  cardDecorCircle2: {
    position: 'absolute', bottom: -85, left: -65,
    width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: {
    color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: -4,
  },
  balanceAmount: {
    flexShrink: 1,
    color: '#FFFFFF', fontSize: 38, fontWeight: '800',
    letterSpacing: -1.2,
  },
  balanceCurrency: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14,
    fontWeight: '700', letterSpacing: 1.2,
  },
  eyeButton: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  balanceBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.22)',
  },
  accountInfo: { flex: 1 },
  accountLabel: {
    color: 'rgba(255,255,255,0.8)', fontSize: 10.5,
    fontWeight: '600', letterSpacing: 0.65, textTransform: 'uppercase',
  },
  accountNumber: {
    color: '#FFFFFF', fontSize: 15,
    fontWeight: '800', marginTop: 4, letterSpacing: 0.35,
  },
  accountStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  accountStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A7F3D0',
  },
  accountStatusText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  // ═══ PHONE CARD — 220px ═══
  phoneCard: {
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 19,
    width: '100%',
    height: 210,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 9 },
        shadowOpacity: 0.3,
        shadowRadius: 17,
      },
      android: { elevation: 11 },
    }),
  },
  phoneCardTop: { marginBottom: 3 },
  phoneCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 7, marginBottom: 3,
  },
  phoneCardIcon: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  phoneCardTitle: {
    color: 'rgba(255,255,255,0.92)', fontSize: 10.5,
    fontWeight: '700', letterSpacing: 0.85, textTransform: 'uppercase',
  },
  phoneNumber: {
    color: '#FFFFFF', fontSize: 15, fontWeight: '800',
    letterSpacing: 0.65, marginTop: 3,
  },
  phoneCardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  phoneCardGrid: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.22)',
  },
  phoneCardItem: { flex: 1, alignItems: 'center' },
  phoneCardItemDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.22)' },
  phoneCardItemLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 8.5,
    fontWeight: '800', marginBottom: 1.5,
    letterSpacing: 0.35, textTransform: 'uppercase',
  },
  phoneCardItemValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: -0.1 },
  phoneCardItemUnit: { fontSize: 8.5, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  phoneCardRecharge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.25)',
    height: 30, paddingHorizontal: 15, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    marginTop: 3,
  },
  phoneCardRechargeText: {
    color: '#FFFFFF', fontSize: 11.5,
    fontWeight: '800', letterSpacing: 0.35,
  },

  // ═══ EN-TÊTE ACTIONS RAPIDES ═══
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
    gap: 9,
  },
  quickActionsHeading: { flex: 1 },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.25,
  },
  quickActionsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  quickActionsBadge: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAF6EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  // ═══ GRILLE ACTIONS RAPIDES ═══
  actionsWrapper: { paddingHorizontal: 16 },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -3,
  },
  actionItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 3,
  },

  actionIconWrapper: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  actionIconHalo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionLabel: {
    fontSize: 11.5,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.1,
    paddingHorizontal: 2,
    lineHeight: 15,
    minHeight: 30,
  },

  // ═══ CHAT BUTTON ═══
  chatButtonContainer: { position: 'absolute', top: 0, left: 0, zIndex: 10 },
  chatButton: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  // ═══════════════════════════════════════════════════════════
  // MODAL POINTS DE VENTE
  // ═══════════════════════════════════════════════════════════
  psModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.5)',
    justifyContent: 'flex-end',
  },
  psModalBackdrop: { flex: 1 },
  psSheetContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  psDragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  psHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  psTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  psSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  psCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  psSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
    height: 48,
  },
  psSearchIconWrap: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  psSearchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  psSearchClear: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  psSearchClearText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '700',
  },

  psListContent: {
    paddingBottom: 20,
    gap: 8,
  },

  psCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  psCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    flexShrink: 0,
  },
  psCardBody: { flex: 1 },
  psCardName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  psCardAddress: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  psCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  psCardBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  psLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  psLoadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  psEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  psEmptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  psEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  psEmptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});