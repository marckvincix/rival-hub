import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Loading } from '@/src/components';
import { useAuthStore } from '@/src/store/authStore';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { exchangeSession } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const sessionId = params.session_id as string;
      
      if (!sessionId) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        await exchangeSession(sessionId);
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/(auth)/login');
      }
    };

    processAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Loading message="Autenticazione in corso..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  }
});
