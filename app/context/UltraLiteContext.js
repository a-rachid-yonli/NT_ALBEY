// context/UltraLiteContext.js
// ⚡ Mode Bas Débit Extrême & Économie d'Énergie (« Ultra Lite 2G »)
//    - Réduit les requêtes réseau d'arrière-plan de 80% (polling ralenti)
//    - Allège les animations et désactive les requêtes gourmandes
//    - Idéal pour les zones à réseau faible (2G/EDGE) au Niger ou batterie faible
//    - Persistance locale dans AsyncStorage

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerLightHaptic } from '../utils/haptics';

const ULTRA_LITE_STORAGE_KEY = '@ntalbey_ultra_lite_mode';

const UltraLiteContext = createContext({
  isUltraLite: false,
  toggleUltraLite: () => {},
  setUltraLite: () => {},
});

export const UltraLiteProvider = ({ children }) => {
  const [isUltraLite, setIsUltraLiteState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ULTRA_LITE_STORAGE_KEY);
        if (saved === 'true') {
          setIsUltraLiteState(true);
        }
      } catch (_) {}
    })();
  }, []);

  const setUltraLite = async (enabled) => {
    const val = Boolean(enabled);
    triggerLightHaptic();
    setIsUltraLiteState(val);
    try {
      await AsyncStorage.setItem(ULTRA_LITE_STORAGE_KEY, val ? 'true' : 'false');
    } catch (_) {}
  };

  const toggleUltraLite = () => {
    setUltraLite(!isUltraLite);
  };

  return (
    <UltraLiteContext.Provider value={{ isUltraLite, toggleUltraLite, setUltraLite }}>
      {children}
    </UltraLiteContext.Provider>
  );
};

export const useUltraLite = () => useContext(UltraLiteContext);
