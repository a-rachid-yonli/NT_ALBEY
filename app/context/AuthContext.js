// context/AuthContext.js
// ✅ SÉPARATION : le numéro est mémorisé, mais la session n'est PAS restaurée
// 🔐 SÉCURITÉ : le numéro mémorisé est stocké dans SecureStore (chiffré au repos)
// ✨ v2 : AJOUT du flag `skipAutoBioOnce` pour empêcher l'auto-trigger biométrie
//         juste après un LOGOUT EXPLICITE (mais pas au redémarrage de l'app)
//
// 🎯 Comportement :
//   - Redémarrage de l'app  → auto-bio autorisée (flag = false)
//   - Logout explicite      → auto-bio skippée UNE fois (flag = true)
//                              puis consommée → au prochain retour ça reprend
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';

const AuthContext = createContext();

// ✅ Clé SecureStore (chiffrée)
const LAST_PHONE_KEY = 'ntalbey_last_phone';
// ✅ Flag "veut-on mémoriser ?" (AsyncStorage OK car non sensible)
const REMEMBER_PHONE_KEY = '@ntalbey_remember_phone';
// ✨ NOUVEAU : flag pour skip l'auto-trigger biométrie UNE SEULE fois
//    (positionné au logout explicite, consommé à l'affichage du LoginScreen)
const SKIP_AUTO_BIO_KEY = '@ntalbey_skip_auto_bio_once';

const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [lastUserPhone, setLastUserPhone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // ✨ NOUVEAU : flag exposé à LoginScreen pour skipper l'auto-bio
  const [skipAutoBioOnce, setSkipAutoBioOnce] = useState(false);

  // Au démarrage : on recharge UNIQUEMENT le dernier numéro (pas la session)
  // + on recharge le flag skipAutoBioOnce (persisté depuis AsyncStorage)
  useEffect(() => {
    const loadLastPhone = async () => {
      try {
        // ✅ Vérifier d'abord que l'utilisateur a accepté la mémorisation
        const remember = await AsyncStorage.getItem(REMEMBER_PHONE_KEY);

        // ✨ NOUVEAU : on recharge le flag skip au démarrage
        //    (si l'utilisateur a fait un logout explicite puis fermé l'app
        //     avant que le flag ait été consommé, on le récupère)
        try {
          const skipRaw = await AsyncStorage.getItem(SKIP_AUTO_BIO_KEY);
          if (skipRaw === 'true') {
            if (__DEV__) console.log('📌 [Auth] Flag skipAutoBioOnce restauré = true');
            setSkipAutoBioOnce(true);
          }
        } catch (_) {}

        if (remember === 'false') {
          setIsLoading(false);
          return;
        }

        let saved = null;
        try {
          saved = await SecureStore.getItemAsync(LAST_PHONE_KEY, SECURE_OPTS);
        } catch (secureErr) {
          // Fallback : migration depuis l'ancien AsyncStorage (une seule fois)
          saved = await AsyncStorage.getItem('@ntalbey_last_phone');
          if (saved) {
            try {
              await SecureStore.setItemAsync(LAST_PHONE_KEY, saved, SECURE_OPTS);
              await AsyncStorage.removeItem('@ntalbey_last_phone');
            } catch (_) {}
          }
        }

        if (saved) {
          const clean = String(saved).replace(/\s/g, '').replace(/^\+?227/, '');
          setLastUserPhone(clean);
        }
      } catch (error) {
        console.log('Erreur chargement dernier numéro:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLastPhone();
  }, []);

  const persistLastPhone = async (phone, remember = true) => {
    if (!phone) return;
    const clean = String(phone).replace(/\s/g, '').replace(/^\+?227/, '');
    setLastUserPhone(clean);
    try {
      if (remember) {
        await SecureStore.setItemAsync(LAST_PHONE_KEY, clean, SECURE_OPTS);
        await AsyncStorage.setItem(REMEMBER_PHONE_KEY, 'true');
      } else {
        await SecureStore.deleteItemAsync(LAST_PHONE_KEY, SECURE_OPTS);
        await AsyncStorage.setItem(REMEMBER_PHONE_KEY, 'false');
      }
    } catch (e) {
      console.log('Erreur sauvegarde dernier numéro:', e);
    }
  };

  const login = async (emailOrPhone, password) => {
    const userData = await API.login(emailOrPhone, password);
    setUser(userData);

    // ✨ NOUVEAU : on efface le flag skip (l'utilisateur s'est connecté)
    try {
      await AsyncStorage.removeItem(SKIP_AUTO_BIO_KEY);
    } catch (_) {}
    setSkipAutoBioOnce(false);

    await persistLastPhone(userData.phone || emailOrPhone, true);
    return userData;
  };

  const loginWithBiometric = async (emailOrPhone) => {
    const userData = await API.loginWithBiometric(emailOrPhone);
    setUser(userData);

    // ✨ NOUVEAU : on efface le flag skip (l'utilisateur s'est connecté)
    try {
      await AsyncStorage.removeItem(SKIP_AUTO_BIO_KEY);
    } catch (_) {}
    setSkipAutoBioOnce(false);

    await persistLastPhone(userData.phone || emailOrPhone, true);
    return userData;
  };

  const logout = async () => {
    if (__DEV__) console.log('🚪 [Auth] Logout explicite → pose flag skipAutoBioOnce');

    await API.logout();

    // ✨ NOUVEAU : pose le flag AVANT setUser(null) pour que LoginScreen
    //    le voie dès son premier render post-logout
    try {
      await AsyncStorage.setItem(SKIP_AUTO_BIO_KEY, 'true');
    } catch (_) {}
    setSkipAutoBioOnce(true);

    setUser(null);

    // ✅ Le numéro reste UNIQUEMENT si l'utilisateur a coché "se souvenir"
    try {
      const remember = await AsyncStorage.getItem(REMEMBER_PHONE_KEY);
      if (remember === 'false') {
        setLastUserPhone(null);
        try {
          await SecureStore.deleteItemAsync(LAST_PHONE_KEY, SECURE_OPTS);
        } catch (_) {}
      }
    } catch (_) {}
  };

  // ✅ NOUVEAU : permet à LoginScreen de gérer la préférence de mémorisation
  const setRememberPhone = async (remember) => {
    try {
      await AsyncStorage.setItem(REMEMBER_PHONE_KEY, remember ? 'true' : 'false');
      if (!remember) {
        setLastUserPhone(null);
        try {
          await SecureStore.deleteItemAsync(LAST_PHONE_KEY, SECURE_OPTS);
        } catch (_) {}
      }
    } catch (e) {
      console.log('Erreur setRememberPhone:', e);
    }
  };

  // ✨ NOUVEAU : consommé par LoginScreen une fois qu'il a lu le flag
  //    → au prochain retour sur LoginScreen (ex: relance app), l'auto-bio
  //      reprendra normalement
  const consumeSkipAutoBio = async () => {
    if (__DEV__) console.log('♻️ [Auth] Consommation flag skipAutoBioOnce');
    try {
      await AsyncStorage.removeItem(SKIP_AUTO_BIO_KEY);
    } catch (_) {}
    setSkipAutoBioOnce(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        lastUserPhone,
        login,
        loginWithBiometric,
        logout,
        setRememberPhone,
        // ✨ NOUVEAU
        skipAutoBioOnce,
        consumeSkipAutoBio,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);