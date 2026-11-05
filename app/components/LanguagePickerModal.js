import React from 'react';
import {
  StyleSheet,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation, TranslatedText as Text, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView } from '../context/LanguageContext';
import { AVAILABLE_LANGUAGES } from '../translations';
import { COLORS } from '../constants/colors';

const LanguagePickerModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useTranslation();

  const handleSelect = async (code) => {
    await setLanguage(code);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={langStyles.overlay}>
        <View style={[langStyles.content, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
          <View style={langStyles.dragHandle} />

          <View style={langStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={langStyles.title}>{t('language.selectLanguage')}</Text>
              <Text style={langStyles.subtitle}>Choisissez votre langue préférée</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={langStyles.closeBtn} activeOpacity={0.7}>
              <Text style={langStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[langStyles.item, isActive && langStyles.itemActive]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.75}
              >
                <View style={[langStyles.abbr, isActive && langStyles.abbrActive]}>
                  <Text style={[langStyles.abbrText, isActive && langStyles.abbrTextActive]}>
                    {lang.code.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={langStyles.native}>{lang.nativeLabel}</Text>
                  <Text style={langStyles.label}>{lang.label}</Text>
                </View>
                {isActive && (
                  <View style={langStyles.check}>
                    <Text style={langStyles.checkText}>✓</Text>
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

// ═══════════════════════════════════════════════════════════════════════

const langStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  item: {
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
  itemActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  abbr: {
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
  abbrActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  abbrText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  abbrTextActive: {
    color: '#FFFFFF',
  },
  native: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES — REGISTER MODAL

export default LanguagePickerModal;
