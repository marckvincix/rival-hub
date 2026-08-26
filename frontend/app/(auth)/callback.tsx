import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Loading } from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { googleLogin } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const code = params.code as string;
      const redirectUri = params.redirect_uri as string;
      if (!code || !redirectUri) {
        router.replace('/(auth)/login');
        return;
      }
      try {
        await googleLogin(code, redirectUri);
        router.replace('/(tabs)');
      } catch (error) {
        router.replace('/(auth)/login');
      }
    };
    processAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Loading message="Autenticazione..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  }
});
