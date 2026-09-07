import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import { useAuthStore } from '../src/store/authStore';
import { Loading, LanguageSelectionScreen } from '../src/components';
import { useNotifications } from '../src/hooks/useNotifications';
import { LanguageProvider, useLanguage } from '../src/contexts/LanguageContext';
import { configureAnonymousPurchases } from '../src/utils/purchases';
import '../src/i18n'; // Initialize i18n

function RootLayoutContent() {
  const { isLoading, checkAuth, user } = useAuthStore();
  const { isLanguageReady, needsLanguageSelection } = useLanguage();
  // Display font for the full-page paywalls (FullPagePaywall.tsx) — the
  // rest of the app keeps the system font, this is loaded once at boot so
  // there's no flash of the wrong font the first time a paywall shows.
  const [fontsLoaded] = useFonts({ Anton_400Regular });

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

  // Show loading while language/fonts are being initialized
  if (!isLanguageReady || !fontsLoaded) {
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
        <Stack.Screen name="(auth)/forgot-password" />
        <Stack.Screen name="(auth)/callback" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tournament/[slug]" />
        <Stack.Screen name="join" />
      </Stack>
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
