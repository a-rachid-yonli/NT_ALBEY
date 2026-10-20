// context/AppLockContext.js
// ✅ Grace period cohérent (5s) + reset lock au logout
// 🔐 Intégration sécurité : expose isDeviceCompromised
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { isDeviceCompromised } from '../utils/security';

const AppLockContext = createContext(null);

// ✅ Délai de grâce : 5 secondes
const GRACE_PERIOD_MS = 5 * 1000;

// ✅ Max tentatives PIN avant déconnexion auto
const MAX_ATTEMPTS = 5;

export const AppLockProvider = ({ children }) => {
  const { user, logout } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  // ✅ NOUVEAU : état compromis exposé pour AppLockOverlay
  const [deviceCompromised, setDeviceCompromised] = useState(false);

  const backgroundTimeRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const userRef = useRef(user);

  // ✅ Détecter le compromis une seule fois au montage
  useEffect(() => {
    try {
      setDeviceCompromised(isDeviceCompromised());
    } catch (_) {
      setDeviceCompromised(false);
    }
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ✅ Reset du lock dès que l'utilisateur change (logout/login)
  useEffect(() => {
    if (!user) {
      setIsLocked(false);
      setAttempts(0);
      backgroundTimeRef.current = null;
    }
  }, [user]);

  // Écoute des changements d'état de l'app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // Passage en arrière-plan
      if (prevState === 'active' && nextState !== 'active') {
        backgroundTimeRef.current = Date.now();
      }

      // Retour au premier plan
      if (prevState !== 'active' && nextState === 'active') {
        if (!userRef.current) {
          backgroundTimeRef.current = null;
          return;
        }

        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed > GRACE_PERIOD_MS) {
            setIsLocked(true);
            setAttempts(0);
          }
        }
        backgroundTimeRef.current = null;
      }
    });

    return () => subscription.remove();
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
    setAttempts(0);
  }, []);

  const registerFailedAttempt = useCallback(() => {
    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        setIsLocked(false);
        setAttempts(0);
        setTimeout(() => logout(), 120);
      }
      return next;
    });
  }, [logout]);

  const value = {
    isLocked,
    unlock,
    attempts,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
    registerFailedAttempt,
    MAX_ATTEMPTS,
    // ✅ Exposé pour AppLockOverlay : si true → biométrie désactivée
    deviceCompromised,
  };

  return (
    <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
  );
};

export const useAppLock = () => {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within an AppLockProvider');
  return ctx;
};