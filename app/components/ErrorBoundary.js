// components/ErrorBoundary.js
import React from 'react';
import {
  StyleSheet,
  Platform,
} from 'react-native';
import { TranslatedText as Text, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity } from '../context/LanguageContext';
import { COLORS } from '../constants/colors';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.warn('🛡️ [ErrorBoundary] Erreur interceptée proprement:', error?.message);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🛡️</Text>
            </View>
            <Text style={styles.title}>Une erreur inattendue est survenue</Text>
            <Text style={styles.subtitle}>
              L'application a rencontré un problème temporaire. Vos données et votre solde sont en sécurité.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRetry}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  devBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  devText: {
    fontSize: 11,
    color: COLORS.danger,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default ErrorBoundary;
