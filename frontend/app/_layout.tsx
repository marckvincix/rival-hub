import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { Loading } from '../src/components';
import { useNotifications } from '../src/hooks/useNotifications';

export default function RootLayout() {
  const { isLoading, checkAuth, user } = useAuthStore();
  
  // Register push notifications when user is authenticated
  const { expoPushToken } = useNotifications();
  
  useEffect(() => {
    if (expoPushToken && user) {
      console.log('Push token ready for user:', user.email, '- Token:', expoPushToken?.substring(0, 20) + '...');
    }
  }, [expoPushToken, user]);

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return <Loading message="Caricamento..." />;
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
    </>
  );
}
