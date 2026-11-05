// App.js - Point d'entrée principal (Architecture Modularisée)
// ✅ Navigation racine & Providers
// ✅ Splash screen animé avec durée réelle 5.5s + fallback 6s
// ✅ AuthProvider, AppLockProvider, ToastProvider, TransactionProvider

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { TransactionProvider } from './context/TransactionContext';
import { UltraLiteProvider } from './context/UltraLiteContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { AppLockProvider } from './context/AppLockContext';
import AppLockOverlay from './components/AppLockOverlay';
import { ToastProvider } from './context/ToastContext';
import ToastOverlay from './components/ToastOverlay';
import PremiumAlertOverlay from './components/PremiumAlertOverlay';
import NetworkStatusBanner from './components/NetworkStatusBanner';
import AnimatedSplash from './components/AnimatedSplash';
import { installGlobalErrorShield } from './utils/errorHandler';

// Activer immédiatement le bouclier anti-erreurs techniques Expo Go
installGlobalErrorShield();

// Écrans
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SendMoneyScreen from './screens/SendMoneyScreen';
import WithdrawScreen from './screens/WithdrawScreen';
import ShopScreen from './screens/ShopScreen';
import HistoryScreen from './screens/HistoryScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import QRScreen from './screens/QRScreen';
import TransferToAgencyScreen from './screens/TransferToAgencyScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import FAQScreen from './screens/FAQScreen';

// Constantes réexportées pour rétrocompatibilité
export { COLORS } from './constants/colors';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();

  const [splashDone, setSplashDone] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAuthReady(true);
    }
  }, [isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const showSplash = !authReady || !splashDone;

  if (showSplash) {
    return <AnimatedSplash onFinish={() => setSplashDone(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyle: { backgroundColor: isDark ? '#0B1120' : '#F6F8F7' },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
            <Stack.Screen name="Withdraw" component={WithdrawScreen} />
            <Stack.Screen name="Shop" component={ShopScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="QRPay" component={QRScreen} />
            <Stack.Screen name="TransferToAgency" component={TransferToAgencyScreen} />
            <Stack.Screen name="Chatbot" component={ChatbotScreen} />
            <Stack.Screen name="FAQ" component={FAQScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ErrorBoundary>
            <AuthProvider>
              <AppLockProvider>
                <TransactionProvider>
                  <UltraLiteProvider>
                    <ToastProvider>
                      <RootNavigator />
                      <AppLockOverlay />
                      <ToastOverlay />
                      <NetworkStatusBanner />
                      <PremiumAlertOverlay />
                    </ToastProvider>
                  </UltraLiteProvider>
                </TransactionProvider>
              </AppLockProvider>
            </AuthProvider>
          </ErrorBoundary>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
