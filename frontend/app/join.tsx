import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useTranslation } from '../src/i18n';
import api from '../src/utils/api';

const RivalHubLogo = require('../assets/images/rival-hub-logo.jpg');

// Landing page for a collaborator invite link (shared from Settings ->
// Gestione Collaboratori -> Condividi). If the person already has the app
// open and is signed in, redeem immediately; otherwise send them into
// register/login carrying the code along, so afterAuth there can redeem it
// once they're signed in and land straight on the tournament instead of
// the usual first-time tour/paywall flow.
export default function JoinCollaboratorScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { t } = useTranslation();
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (authLoading || !code || !isAuthenticated) return;
    redeemAndGo();
  }, [authLoading, isAuthenticated, code]);

  const redeemAndGo = async () => {
    setRedeeming(true);
    try {
      const res = await api.post('/api/collaborators/redeem', { code: String(code).toUpperCase() });
      const joinedTournament = res.data?.tournament;
      router.replace((joinedTournament?.id ? `/(tabs)/tournaments?id=${joinedTournament.id}` : '/(tabs)') as any);
    } catch (error) {
      router.replace('/(tabs)' as any);
    }
  };

  if (authLoading || redeeming) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={RivalHubLogo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{t('collaborators.joinInviteTitle', 'Sei stato invitato a collaborare')}</Text>
        <Text style={styles.subtitle}>
          {t('collaborators.joinInviteSubtitle', 'Accedi o crea un account per unirti al torneo e iniziare a gestirlo.')}
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push({ pathname: '/(auth)/register', params: { collab_code: code || '' } })}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>{t('auth.register', 'Registrati')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push({ pathname: '/(auth)/login', params: { collab_code: code || '' } })}
        >
          <Text style={styles.secondaryBtnText}>{t('auth.login', 'Ho già un account')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  logo: {
    width: 140,
    height: 70,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
