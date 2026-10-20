// screens/FAQScreen.js - Version premium harmonisée
// ✅ Design homogène avec les autres écrans (mêmes radius, ombres, palette, badges)
// ✅ Multilingue + Chatbot unifié + Visa retiré
// ✅ Logique 100% inchangée
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { API } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

// ═══════════════════════════════════════════════════════════
// 🎨 PALETTE CENTRALISÉE (identique à tous les écrans)
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

// ═══════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronDown = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// ✅ Catégories à masquer (fonctionnalités "coming soon")
const HIDDEN_CATEGORY_IDS = ['cards'];

export default function FAQScreen({ navigation }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [faqData, setFaqData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement des FAQ depuis l'API (logique inchangée)
  useEffect(() => {
    const loadFaq = async () => {
      try {
        const data = await API.getFaq();
        const filtered = (data || []).filter(
          (cat) => !HIDDEN_CATEGORY_IDS.includes(cat.id)
        );
        setFaqData(filtered);
      } catch (error) {
        console.error('Erreur chargement FAQ:', error);
        Alert.alert(
          t('common.error'),
          t('faq.loadError') || 'Impossible de charger les questions fréquentes.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadFaq();
  }, []);

  const toggleExpand = (categoryId, questionIndex) => {
    const key = `${categoryId}-${questionIndex}`;
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Ouvre le ChatbotScreen unifié (logique inchangée)
  const handleOpenChatbot = () => {
    navigation.navigate('Chatbot');
  };

  // Filtrage selon la recherche (logique inchangée)
  const filteredFaq = faqData
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0);

  // ═══════════════ LOADING ═══════════════
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <IconBack />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('faq.title')}</Text>
            <Text style={styles.headerSubtitle}>Centre d'aide</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ═══════════ HEADER ═══════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('faq.title')}</Text>
          <Text style={styles.headerSubtitle}>Centre d'aide</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════ ILLUSTRATION (hero premium) ═══════════ */}
        <View style={styles.heroContainer}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroEmoji}>❓</Text>
          </View>
          <Text style={styles.heroTitle}>{t('faq.illustration')}</Text>
          <Text style={styles.heroSubtitle}>{t('faq.subtitle')}</Text>
        </View>

        {/* ═══════════ RECHERCHE ═══════════ */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconWrap}>
            <IconSearch />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={t('faq.searchPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════ CATÉGORIES ET QUESTIONS ═══════════ */}
        {filteredFaq.map((category) => (
          <View key={category.id} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconWrap}>
                <Text style={styles.categoryIconText}>{category.icon}</Text>
              </View>
              <Text style={styles.categoryTitle}>{category.category}</Text>
            </View>

            {category.questions.map((item, index) => {
              const key = `${category.id}-${index}`;
              const isExpanded = expandedItems[key];

              return (
                <View key={key} style={styles.questionContainer}>
                  <TouchableOpacity
                    style={styles.questionItem}
                    onPress={() => toggleExpand(category.id, index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questionText}>{item.q}</Text>
                    <View
                      style={[
                        styles.chevronContainer,
                        isExpanded && styles.chevronExpanded,
                      ]}
                    >
                      <IconChevronDown
                        color={isExpanded ? COLORS.primary : COLORS.textMuted}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* ═══════════ CONTACT SUPPORT ═══════════ */}
        <View style={styles.supportCard}>
          <View style={styles.supportIconWrap}>
            <Text style={styles.supportIcon}>💬</Text>
          </View>
          <Text style={styles.supportTitle}>{t('faq.notFound')}</Text>
          <Text style={styles.supportText}>{t('faq.contactUs')}</Text>
          <View style={styles.supportButtons}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleOpenChatbot}
              activeOpacity={0.85}
            >
              <Text style={styles.supportButtonText}>
                🤖 {t('chatbot.title')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.supportButton, styles.supportButtonSecondary]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.supportButtonText,
                  styles.supportButtonSecondaryText,
                ]}
              >
                {t('faq.call')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM — HARMONISÉS
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 30 },

  // ═══════════════ HEADER ═══════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  // ═══════════════ LOADING ═══════════════
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // ═══════════════ HERO ═══════════════
  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 24,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ═══════════════ RECHERCHE ═══════════════
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
    height: 52,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  // ═══════════════ CATÉGORIE ═══════════════
  categoryContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    marginBottom: 8,
    gap: 10,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
  },
  categoryIconText: { fontSize: 18 },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },

  // ═══════════════ QUESTIONS ═══════════════
  questionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    paddingRight: 12,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: COLORS.primarySoft,
  },
  answerContainer: {
    paddingBottom: 14,
    paddingTop: 0,
    paddingLeft: 2,
  },
  answerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ═══════════════ SUPPORT CARD ═══════════════
  supportCard: {
    backgroundColor: COLORS.primarySoft,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
    alignItems: 'center',
  },
  supportIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  supportIcon: { fontSize: 26 },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  supportButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  supportButtonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}40`,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  supportButtonSecondaryText: {
    color: COLORS.primary,
  },
});