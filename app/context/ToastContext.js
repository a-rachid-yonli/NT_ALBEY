// context/ToastContext.js
// ✨ Provider de toast global — permet d'afficher un toast premium
//    auto-dismiss n'importe où dans l'app (LoginScreen, HomeScreen, etc.)
//
// Usage :
//   const { showToast } = useToast();
//   showToast({ type: 'success', title: 'Bienvenue !' });
//
// Le toast disparaît TOUT SEUL — aucun clic requis.
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import { humanizeError } from '../utils/errorHandler';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  // ✨ Affiche un toast — remplace tout toast existant
  const showToast = useCallback((options) => {
    // Nettoie l'éventuel timer en cours
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Nouveau toast avec un id unique
    const isErr = options?.type === 'error' || options?.type === 'warning';
    const cleanTitle = typeof options?.title === 'string'
      ? options.title.replace(/^[✅⚠️❌✨🔒]+\s*/, '').trim()
      : options?.title;
    const cleanMsg = isErr && options?.message ? humanizeError(options.message) : options?.message;
    setToast({
      ...options,
      title: cleanTitle,
      message: cleanMsg,
      id: Date.now(),
    });
  }, []);

  // ✨ Cache le toast immédiatement
  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  // ✨ Sécurité : cleanup au démontage du provider
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};