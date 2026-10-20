// context/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../translations';

const LanguageContext = createContext();
const LANGUAGE_KEY = '@ntalbey_language';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('fr');
  const [isReady, setIsReady] = useState(false);

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved && translations[saved]) {
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
    setLanguageState(code);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
    } catch (error) {
      console.log('Erreur sauvegarde langue:', error);
    }
  };

  // Fonction de traduction avec chemin type "home.balanceAvailable"
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const keys = path.split('.');
    let value = translations[language];
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Fallback sur le français
        let fallbackValue = translations.fr;
        for (const k of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
            fallbackValue = fallbackValue[k];
          } else {
            fallbackValue = null;
            break;
          }
        }
        return fallbackValue || fallback || path;
      }
    }
    return typeof value === 'string' ? value : (fallback || path);
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