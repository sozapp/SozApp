import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '@/constants/theme';
import { reportError } from '@/constants/sentry';

const ACCENT = '#C4956A';
const BACKGROUND = '#0A0A08';
const TEXT = '#E8E0D0';
const TEXT_SECONDARY = 'rgba(232,224,208,0.55)';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * En dış seviye crash yakalayıcı. React'te error boundary'ler zorunlu olarak
 * class component olmak zorunda (hook karşılığı yok). Provider ağacının
 * (ThemeProvider dahil) EN dışında render edildiği için burada `useTheme()`
 * gibi context hook'larına güvenilemez — fallback UI, SplashScreen.tsx'teki
 * gibi sabit (hardcoded) renk/font değerleriyle çiziliyor.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Yakalanan render hatası:', error, errorInfo.componentStack);
    reportError('ErrorBoundary', error);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  handleGoHome = (): void => {
    this.setState({ error: null });
    router.replace('/(tabs)');
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <View style={styles.iconWrap}>
              <Ionicons name="alert-circle-outline" size={48} color={ACCENT} />
            </View>
            <Text style={styles.title}>Bir şeyler ters gitti</Text>
            <Text style={styles.description}>
              Beklenmedik bir hata oluştu. Yeniden deneyebilir veya ana sayfaya dönebilirsiniz.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={this.handleRetry} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>Yeniden Dene</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={this.handleGoHome} activeOpacity={0.9}>
              <Text style={styles.secondaryBtnText}>Ana Sayfaya Dön</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(196,149,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: TEXT,
    fontFamily: fonts.thin,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: ACCENT,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF8EE',
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(196,149,80,0.35)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: TEXT,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
});
