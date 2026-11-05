// context/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  Alert as RNAlert,
  View as RNView,
  ScrollView as RNScrollView,
  TouchableOpacity as RNTouchableOpacity,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../translations';
import { translatePhrase } from '../translations/phrases';
import { useTheme, adaptViewStyleForDark, adaptTextStyleForDark } from './ThemeContext';
import { humanizeError } from '../utils/errorHandler';

const LanguageContext = createContext();
const LANGUAGE_KEY = '@ntalbey_language';

let currentLangGlobal = 'fr';
let customAlertHandler = null;

export const getCurrentLanguage = () => currentLangGlobal;

export const registerCustomAlertHandler = (handler) => {
  customAlertHandler = handler;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('fr');
  const [isReady, setIsReady] = useState(false);

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved && translations[saved]) {
          currentLangGlobal = saved;
          setLanguageState(saved);
        }
      } catch (error) {
        console.log('Erreur chargement langue:', error);
      } finally {
        setIsReady(true);
      }
    };
    loadLanguage();
  }, []);

  // Changer la langue et la sauvegarder
  const setLanguage = async (code) => {
    if (!translations[code]) return;
    currentLangGlobal = code;
    setLanguageState(code);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
    } catch (error) {
      console.log('Erreur sauvegarde langue:', error);
    }
  };

  // Fonction de traduction avec chemin type "home.balanceAvailable" ou phrase directe
  const t = (path, fallback = '') => {
    if (!path) return fallback ? translatePhrase(fallback, language) : '';
    const keys = path.split('.');
    let value = translations[language];
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        value = null;
        break;
      }
    }
    if (typeof value === 'string') {
      return value;
    }

    // Fallback sur le dictionnaire français puis traduction automatique de phrase
    let fallbackValue = translations.fr;
    for (const k of keys) {
      if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
        fallbackValue = fallbackValue[k];
      } else {
        fallbackValue = null;
        break;
      }
    }
    const baseText = (typeof fallbackValue === 'string' ? fallbackValue : null) || fallback || path;
    return translatePhrase(baseText, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return ctx;
};

// Fonction utilitaire pour traduire récursivement les enfants d'un composant Text
function translateChildren(children, lang) {
  if (!lang || lang === 'fr' || children == null || typeof children === 'boolean') {
    return children;
  }

  if (typeof children === 'string') {
    return translatePhrase(children, lang);
  }

  if (Array.isArray(children)) {
    const allPrimitive = children.every(
      (c) => typeof c === 'string' || typeof c === 'number' || c == null || typeof c === 'boolean'
    );
    if (allPrimitive) {
      const joined = children
        .filter((c) => c != null && typeof c !== 'boolean')
        .map((c) => String(c))
        .join('');
      const translatedJoined = translatePhrase(joined, lang);
      if (translatedJoined !== joined) {
        return translatedJoined;
      }
    }
    return children.map((child) => translateChildren(child, lang));
  }

  return children;
}

// Composant Text traduit automatiquement + adapté au Mode Sombre
export const TranslatedText = React.forwardRef(({ children, style, ...props }, ref) => {
  const ctx = useContext(LanguageContext);
  const { isDark } = useTheme();
  const lang = ctx ? ctx.language : currentLangGlobal;
  return (
    <RNText ref={ref} style={adaptTextStyleForDark(style, isDark)} {...props}>
      {translateChildren(children, lang)}
    </RNText>
  );
});

// Composant TextInput avec placeholder traduit + adapté au Mode Sombre
export const TranslatedTextInput = React.forwardRef(({ placeholder, placeholderTextColor, style, ...props }, ref) => {
  const ctx = useContext(LanguageContext);
  const { isDark } = useTheme();
  const lang = ctx ? ctx.language : currentLangGlobal;
  const translatedPlaceholder =
    typeof placeholder === 'string' && lang !== 'fr'
      ? translatePhrase(placeholder, lang)
      : placeholder;
  return (
    <RNTextInput
      ref={ref}
      placeholder={translatedPlaceholder}
      placeholderTextColor={isDark ? '#64748B' : placeholderTextColor}
      style={adaptTextStyleForDark(style, isDark)}
      {...props}
    />
  );
});

// Composants conteneurs adaptés automatiquement au Mode Sombre
export const ThemedView = React.forwardRef(({ style, ...props }, ref) => {
  const { isDark } = useTheme();
  return <RNView ref={ref} style={adaptViewStyleForDark(style, isDark)} {...props} />;
});

export const ThemedScrollView = React.forwardRef(({ style, contentContainerStyle, ...props }, ref) => {
  const { isDark } = useTheme();
  return (
    <RNScrollView
      ref={ref}
      style={adaptViewStyleForDark(style, isDark)}
      contentContainerStyle={adaptViewStyleForDark(contentContainerStyle, isDark)}
      {...props}
    />
  );
});

export const ThemedTouchableOpacity = React.forwardRef(({ style, ...props }, ref) => {
  const { isDark } = useTheme();
  return <RNTouchableOpacity ref={ref} style={adaptViewStyleForDark(style, isDark)} {...props} />;
});

export const ThemedKeyboardAvoidingView = React.forwardRef(({ style, ...props }, ref) => {
  const { isDark } = useTheme();
  return <RNKeyboardAvoidingView ref={ref} style={adaptViewStyleForDark(style, isDark)} {...props} />;
});

// Wrapper Alert.alert qui affiche la modale Premium, simplifie les erreurs et traduit tout
export const TranslatedAlert = {
  ...RNAlert,
  alert: (title, message, buttons, options) => {
    if (typeof customAlertHandler === 'function') {
      return customAlertHandler(title, message, buttons, options);
    }
    const lang = currentLangGlobal;
    const cleanMsg = typeof message === 'string' ? humanizeError(message) : message;
    const tTitle = typeof title === 'string' ? translatePhrase(title, lang) : title;
    const tMessage = typeof cleanMsg === 'string' ? translatePhrase(cleanMsg, lang) : cleanMsg;
    const tButtons = Array.isArray(buttons)
      ? buttons.map((btn) =>
          btn && typeof btn.text === 'string'
            ? { ...btn, text: translatePhrase(btn.text, lang) }
            : btn
        )
      : buttons;
    return RNAlert.alert(tTitle, tMessage, tButtons, options);
  },
};
