import React, { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { useTourStore } from '../src/store/tourStore';
import { shouldShowHighlightsPaywall } from '../src/utils/paywallGate';
import { Loading, LanguageSelectionScreen, HighlightsPaywallModal } from '../src/components';
import { useNotifications } from '../src/hooks/useNotifications';
import { LanguageProvider, useLanguage } from '../src/contexts/LanguageContext';
import { configureAnonymousPurchases } from '../src/utils/purchases';
import '../src/i18n'; // Initialize i18n

function RootLayoutContent() {
  const { isLoading, checkAuth, user } = useAuthStore();
  const { isLanguageReady, needsLanguageSelection } = useLanguage();
  const tourActive = useTourStore((s) => s.active);
  const wasTourActiveRef = useRef(false);
  const [showPostTourPaywall, setShowPostTourPaywall] = useState(false);

  // The guided tour lives inside the tournaments screen, far from wherever
  // it was started (register/login). Rather than thread a callback all the
  // way through, watch the shared tour store here at the root and react to
  // the active -> inactive transition — fires whether the tour was finished
  // naturally or dismissed early via "Salta tour" on a coachmark.
  useEffect(() => {
    if (wasTourActiveRef.current && !tourActive) {
      shouldShowHighlightsPaywall().then((show) => { if (show) setShowPostTourPaywall(true); });
    }
    wasTourActiveRef.current = tourActive;
  }, [tourActive]);

  // Register push notifications when user is authenticated
  const { expoPushToken } = useNotifications();

  useEffect(() => {
    if (expoPushToken && user) {
      console.log('Push token ready for user:', user.email, '- Token:', expoPushToken?.substring(0, 20) + '...');
    }
  }, [expoPushToken, user]);

  useEffect(() => {
    // Configure RevenueCat anonymously first, so real prices are already
    // available (e.g. for paywall previews) even before checkAuth resolves
    // — it self-upgrades to the real identified user if one is found below.
    configureAnonymousPurchases();
    checkAuth();
  }, []);

  // Show loading while language is being initialized
  if (!isLanguageReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Show language selection screen on first launch
  if (needsLanguageSelection) {
    return <LanguageSelectionScreen />;
  }

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/callback" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tournament/[slug]" />
      </Stack>
      <HighlightsPaywallModal
        visible={showPostTourPaywall}
        onClose={() => setShowPostTourPaywall(false)}
        onSubscribed={() => setShowPostTourPaywall(false)}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <RootLayoutContent />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
});
