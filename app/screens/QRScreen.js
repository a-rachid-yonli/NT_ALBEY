// screens/QRScreen.js - Mon QR (QR SEUL) + Scanner
// ✨ v4 : Onglet "Mon QR" → UNIQUEMENT le QR Code (aucun texte, aucune info)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Modal,
  Share,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Linking,
  Animated,
  Easing,
  StatusBar,
  AppState,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import MainLayout from '../components/MainLayout';
import { useTranslation, TranslatedText as Text, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity } from '../context/LanguageContext';
import { API } from '../services/api';
import { decodeQRData, encodeQRData, QR_PREFIX } from '../utils/qrUtils';

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
};

const QR_AUTO_REGEN_INTERVAL_MS = 4 * 60 * 1000;

// ============================================================
// ICÔNES
// ============================================================
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconFlashOn = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L4.09 12.97A1 1 0 005 14.5h5.5l-1 7.5L19 11.03A1 1 0 0018 9.5h-5.5l.5-7.5z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
  </Svg>
);

const IconFlashOff = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L4.09 12.97A1 1 0 005 14.5h5.5l-1 7.5L19 11.03A1 1 0 0018 9.5h-5.5l.5-7.5z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
  </Svg>
);

const IconShare = ({ color = COLORS.primary }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPhone = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0122 16.92z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheck = () => (
  <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.primary} strokeWidth="2" />
    <Path d="M7.5 12.5l3 3 6-6" stroke={COLORS.primary} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconQRTab = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
    <Path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 19.5v1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconScanTab = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 12h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// ============================================================
// MON QR — QR SEUL, RIEN D'AUTRE
// ============================================================
const MyQRTab = () => {
  const { width } = useWindowDimensions();
  const [qrValue, setQrValue] = useState('');
  const [userName, setUserName] = useState('Client');
  const [userPhone, setUserPhone] = useState('');

  const qrInitializedRef = useRef(false);
  const qrRegenTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const qrSize = Math.min(280, Math.max(200, Math.floor(width * 0.7)));

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
      if (__DEV__) console.log('❌ [QRScreen] Erreur génération QR:', e?.message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await API.getCurrentUser();
        if (!mounted) return;
        const phone = user?.phone || '';
        const name = user?.name || 'Client';
        setUserPhone(phone);
        setUserName(name);
        if (!qrInitializedRef.current && phone) {
          qrInitializedRef.current = true;
          generateMyQR({ name, phone });
        }
      } catch (e) {
        if (__DEV__) console.log('❌ [QRScreen] Erreur chargement user:', e?.message);
      }
    })();
    return () => { mounted = false; };
  }, [generateMyQR]);

  useEffect(() => {
    if (!userPhone) return;
    if (qrRegenTimerRef.current) clearInterval(qrRegenTimerRef.current);
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
    return () => subscription.remove();
  }, [userPhone, userName, generateMyQR]);

  if (!qrValue) {
    return (
      <View style={styles.myQrContainer}>
        <View style={styles.myQrCard}>
          <View style={styles.qrLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.myQrContainer}>
      <View style={styles.myQrCard}>
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
    </View>
  );
};

// ============================================================
// SCANNER — Onglet "Scanner"
// ============================================================
const QRScannerTab = ({ navigation }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const FRAME_SIZE = Math.min(width - 80, 260);

  const frameTop = containerSize.height > 0 ? (containerSize.height - FRAME_SIZE) / 2 : 0;
  const frameLeft = containerSize.width > 0 ? (containerSize.width - FRAME_SIZE) / 2 : 0;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    if (permission?.granted && !scanned) loop.start();
    return () => loop.stop();
  }, [permission?.granted, scanned]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, FRAME_SIZE - 9],
  });

  const analyzeData = (raw) => {
    const decrypted = decodeQRData(raw);
    if (decrypted && decrypted.type === 'ntalbey') {
      return { kind: 'ntalbey', ...decrypted, raw };
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.type === 'ntalbey' || parsed.type === 'phone' || parsed.phone)) {
        return { kind: 'ntalbey', ...parsed, raw };
      }
      return { kind: 'json', raw, parsed };
    } catch (_) {}
    const cleaned = String(raw).replace(/[\s\-()]/g, '');
    if (/^\+?\d{8,15}$/.test(cleaned)) return { kind: 'phone', phone: cleaned, raw };
    if (/^https?:\/\//i.test(raw)) return { kind: 'url', url: raw, raw };
    if (typeof raw === 'string' && raw.startsWith(QR_PREFIX)) {
      return { kind: 'ntalbey_invalid', raw };
    }
    return { kind: 'text', raw };
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    const analyzed = analyzeData(data);
    setScannedData(analyzed);
    setResultModalVisible(true);
  };

  const closeResult = () => {
    setResultModalVisible(false);
    setTimeout(() => {
      setScannedData(null);
      setScanned(false);
    }, 250);
  };

  const handleSendMoney = (data) => {
    const phone = typeof data === 'string' ? data : data?.phone;
    if (!phone) return;
    const name = typeof data === 'object' ? data?.name : undefined;
    const amount = typeof data === 'object' ? data?.amount : undefined;
    const note = typeof data === 'object' ? data?.note : undefined;
    closeResult();
    navigation.navigate('SendMoney', {
      prefilledPhone: phone,
      prefilledName: name,
      prefilledAmount: amount,
      prefilledNote: note,
    });
  };

  const handleOpenUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        closeResult();
      } else {
        Alert.alert(t('common.error'), 'Impossible d\'ouvrir ce lien');
      }
    } catch (e) {
      Alert.alert(t('common.error'), 'Lien invalide');
    }
  };

  const handleShare = async () => {
    if (!scannedData?.raw) return;
    try { await Share.share({ message: scannedData.raw }); } catch (_) {}
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initialisation caméra...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.permissionIconWrapper}>
          <Text style={{ fontSize: 48 }}>📷</Text>
        </View>
        <Text style={styles.permissionTitle}>Accès caméra requis</Text>
        <Text style={styles.permissionText}>
          Pour scanner un QR Code, NT Albey a besoin d'accéder à votre caméra.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={styles.scannerContainer}
      onLayout={(e) => setContainerSize(e.nativeEvent.layout)}
    >
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {containerSize.height > 0 && (
        <>
          <View style={[styles.dark, { top: 0, left: 0, right: 0, height: frameTop }]} pointerEvents="none" />
          <View style={[styles.dark, { top: frameTop + FRAME_SIZE, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
          <View style={[styles.dark, { top: frameTop, left: 0, width: frameLeft, height: FRAME_SIZE }]} pointerEvents="none" />
          <View style={[styles.dark, { top: frameTop, left: frameLeft + FRAME_SIZE, right: 0, height: FRAME_SIZE }]} pointerEvents="none" />

          <View
            style={[styles.frame, { top: frameTop, left: frameLeft, width: FRAME_SIZE, height: FRAME_SIZE }]}
            pointerEvents="none"
          >
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {!scanned && (
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]}
              />
            )}
          </View>

          <View
            style={[styles.instructionWrapper, { top: frameTop + FRAME_SIZE + 26 }]}
            pointerEvents="none"
          >
            <Text style={styles.instructionTitle}>Alignez le QR Code</Text>
            <Text style={styles.instructionSubtitle}>Le scan est automatique</Text>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.torchButton}
        onPress={() => setTorchOn(v => !v)}
        activeOpacity={0.85}
      >
        {torchOn ? <IconFlashOn /> : <IconFlashOff />}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={resultModalVisible}
        onRequestClose={closeResult}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.resultIconWrapper}>
              <IconCheck />
            </View>
            <Text style={styles.resultTitle}>QR Code détecté</Text>
            <Text style={styles.resultSubtitle}>Contenu décodé avec succès</Text>

            {scannedData?.kind === 'ntalbey' && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerEmoji}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerTitle}>Paiement NT Albey</Text>
                  <Text style={styles.infoBannerText}>
                    {scannedData?.name ? `${scannedData.name}` : 'Destinataire'}
                    {scannedData?.phone ? ` • ${scannedData.phone}` : ''}
                    {scannedData?.amount ? ` • ${Number(scannedData.amount).toLocaleString()} FCFA` : ''}
                  </Text>
                </View>
              </View>
            )}

            {scannedData?.kind === 'ntalbey_invalid' && (
              <View style={[styles.infoBanner, styles.infoBannerDanger]}>
                <Text style={styles.infoBannerEmoji}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoBannerTitle, { color: '#991B1B' }]}>
                    QR Code NT Albey invalide ou expiré
                  </Text>
                  <Text style={[styles.infoBannerText, { color: '#991B1B' }]}>
                    Ce QR Code est expiré, corrompu, ou provient d'une autre version.
                  </Text>
                </View>
              </View>
            )}

            {scannedData?.kind !== 'ntalbey' && scannedData?.kind !== 'ntalbey_invalid' && (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>CONTENU</Text>
                <Text style={styles.resultValue} numberOfLines={5}>
                  {scannedData?.raw}
                </Text>
              </View>
            )}

            {(scannedData?.kind === 'phone' || (scannedData?.kind === 'ntalbey' && scannedData?.phone)) && (
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={() => handleSendMoney(scannedData)}
                activeOpacity={0.85}
              >
                <IconPhone />
                <Text style={styles.actionPrimaryText}>
                  {scannedData?.kind === 'phone' ? `Envoyer à ${scannedData.phone}` : 'Payer maintenant'}
                </Text>
              </TouchableOpacity>
            )}

            {scannedData?.kind === 'url' && (
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={() => handleOpenUrl(scannedData.url)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionPrimaryText}>🌐 Ouvrir le lien</Text>
              </TouchableOpacity>
            )}

            <View style={styles.resultButtons}>
              <TouchableOpacity style={styles.actionSecondary} onPress={handleShare} activeOpacity={0.75}>
                <IconShare color={COLORS.primary} />
                <Text style={styles.actionSecondaryText}>Partager</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionSecondary} onPress={closeResult} activeOpacity={0.75}>
                <Text style={styles.actionSecondaryText}>🔄 Rescanner</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeSheetButton} onPress={closeResult} activeOpacity={0.75}>
              <Text style={styles.closeSheetText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================
// ÉCRAN PRINCIPAL — 2 onglets
// ============================================================
export default function QRScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('myqr'); // 'myqr' | 'scan'

  return (
    <MainLayout activeScreen="QRPay">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={['#008933', '#00A34D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <IconBack />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{activeTab === 'myqr' ? 'Mon QR Code' : 'Scanner'}</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'myqr' ? 'Partagez votre QR pour recevoir' : 'Scannez un QR Code NT Albey'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </LinearGradient>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'myqr' && styles.tabButtonActive]}
            onPress={() => setActiveTab('myqr')}
            activeOpacity={0.8}
          >
            <IconQRTab color={activeTab === 'myqr' ? '#FFFFFF' : COLORS.primary} />
            <Text style={[styles.tabLabel, activeTab === 'myqr' && styles.tabLabelActive]}>
              Mon QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'scan' && styles.tabButtonActive]}
            onPress={() => setActiveTab('scan')}
            activeOpacity={0.8}
          >
            <IconScanTab color={activeTab === 'scan' ? '#FFFFFF' : COLORS.primary} />
            <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>
              Scanner
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {activeTab === 'myqr' ? (
            <MyQRTab />
          ) : (
            <QRScannerTab navigation={navigation} />
          )}
        </View>
      </View>
    </MainLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  backButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, letterSpacing: 0.5, fontWeight: '500' },

  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -18,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    zIndex: 5,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabLabel: { fontSize: 14, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.2 },
  tabLabelActive: { color: '#FFFFFF' },

  // Mon QR — QR SEUL
  myQrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  myQrCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  qrLoading: {
    width: 240, height: 240,
    alignItems: 'center', justifyContent: 'center',
  },

  // Permission / loading
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  permissionIconWrapper: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  permissionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, letterSpacing: -0.3 },
  permissionText: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', marginBottom: 24,
    lineHeight: 21, fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15, paddingHorizontal: 32,
    borderRadius: 14, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // Scanner
  scannerContainer: {
    flex: 1, backgroundColor: '#000',
    position: 'relative', overflow: 'hidden',
  },
  dark: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  frame: { position: 'absolute' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#00E676' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },
  scanLine: {
    position: 'absolute', left: 10, right: 10, top: 0,
    height: 3, borderRadius: 2, backgroundColor: '#00E676',
    shadowColor: '#00E676', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 10, elevation: 8,
  },
  instructionWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  instructionTitle: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  instructionSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, fontWeight: '500' },
  torchButton: {
    position: 'absolute', bottom: 40,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center', left: '50%', marginLeft: -28,
  },

  // Modal résultat
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  resultSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20 },
  resultIconWrapper: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primarySoft,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  resultTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
  resultSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20, fontWeight: '500' },
  resultCard: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  resultLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 6, fontWeight: '800' },
  resultValue: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary, lineHeight: 21 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: COLORS.accent,
    borderWidth: 1, borderColor: `${COLORS.accent}25`,
  },
  infoBannerDanger: {
    backgroundColor: COLORS.dangerSoft,
    borderLeftColor: COLORS.danger,
    borderColor: `${COLORS.danger}25`,
  },
  infoBannerEmoji: { fontSize: 24 },
  infoBannerTitle: { fontSize: 14, fontWeight: '800', color: '#7A4A1A', letterSpacing: -0.1 },
  infoBannerText: { fontSize: 12, color: '#7A4A1A', marginTop: 2, opacity: 0.85, fontWeight: '500' },

  actionPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.primary,
    paddingVertical: 15, borderRadius: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  actionPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  resultButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primarySoft,
    paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: `${COLORS.primary}25`,
  },
  actionSecondaryText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },

  closeSheetButton: {
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 13, borderRadius: 14,
    alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  closeSheetText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
});