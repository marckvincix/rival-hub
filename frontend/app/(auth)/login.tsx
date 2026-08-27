import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, HighlightsPaywallModal, WelcomeTourModal } from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';
import { useTourStore } from '../../src/store/tourStore';
import { shouldShowHighlightsPaywall } from '../../src/utils/paywallGate';
import { useTranslation } from '../../src/i18n';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RivalHubLogo = require('../../assets/images/rival-hub-logo.jpg');
const ONBOARDING_SEEN_KEY_PREFIX = '@rival_hub_onboarding_seen_';

export default function LoginScreen() {
  const router = useRouter();
  const { login, appleLogin } = useAuthStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showHighlightsPaywall, setShowHighlightsPaywall] = useState(false);

  // Second step: existing users who log in without an active subscription
  // see the Highlights Plus paywall once (tracked per-account so it doesn't
  // nag them on every login) — on top of it already being reachable any
  // time from the Highlights section itself.
  const maybeShowPaywallThenNavigate = async () => {
    const show = await shouldShowHighlightsPaywall();
    if (show) {
      setShowHighlightsPaywall(true);
    } else {
      router.replace('/(tabs)');
    }
  };

  // First step: anyone whose account has never seen the welcome/tour prompt
  // (new signups, and any existing account logging in for the first time
  // since this was added) sees it once before the Highlights paywall check.
  const afterLogin = async () => {
    const { user } = useAuthStore.getState();
    if (!user?.user_id) {
      router.replace('/(tabs)');
      return;
    }
    const onboardingKey = `${ONBOARDING_SEEN_KEY_PREFIX}${user.user_id}`;
    let onboardingSeen = false;
    try {
      onboardingSeen = (await AsyncStorage.getItem(onboardingKey)) === 'true';
    } catch {
      // ignore storage errors, default to showing it
    }
    if (onboardingSeen) {
      await maybeShowPaywallThenNavigate();
    } else {
      try { await AsyncStorage.setItem(onboardingKey, 'true'); } catch { /* ignore */ }
      setShowWelcomeTour(true);
    }
  };

  // "Salta" on the welcome prompt: skip the tour, fall through to the same
  // once-per-account paywall check a returning user who's already seen the
  // prompt gets.
  const skipTour = () => {
    setShowWelcomeTour(false);
    maybeShowPaywallThenNavigate();
  };

  // "Inizia il tour": jump into tournament creation with the guided tour
  // active. The Highlights paywall is deferred until the tour finishes (see
  // the global watcher in app/_layout.tsx) since this screen is long
  // unmounted by then.
  const startTour = () => {
    setShowWelcomeTour(false);
    useTourStore.getState().start();
    router.replace('/(tabs)/tournaments?create=true' as any);
  };

  const validate = () => {
    const newErrors: {email?: string; password?: string} = {};
    if (!email.trim()) newErrors.email = t('errors.emailRequired', 'Email required');
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('errors.emailInvalid', 'Invalid email');
    if (!password) newErrors.password = t('errors.passwordRequired', 'Password required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await login(email, password);
      await afterLogin();
    } catch (error: any) {
      Alert.alert(t('common.error', 'Error'), error.message || t('auth.loginError', 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // For web platform, use window.location.origin for proper redirect
      // For mobile, use EXPO_PUBLIC_BACKEND_URL to ensure it works across environments
      // No parentheses here: this string is sent to Google as redirect_uri
      // and re-echoed back verbatim in its 302 — Google's own URL handling
      // re-encodes "(" / ")" in a way that breaks openAuthSessionAsync's
      // plain string-prefix match against the returned URL, so this has to
      // stay a plain path even though it doesn't correspond to a real
      // Expo Router screen (the in-app navigation target below is separate).
      const callbackUrl = Platform.OS === 'web'
        ? `${window.location.origin}/auth-callback`
        : `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('/api', '') || window.location.origin}/auth-callback`;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '')}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);
      if (result.type === 'success' && result.url) {
        const url = result.url;
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          const query = url.substring(queryIndex + 1);
          const params = new URLSearchParams(query);
          const code = params.get('code');
          if (code) {
            router.push({ pathname: '/(auth)/callback', params: { code, redirect_uri: callbackUrl } });
          }
        }
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('auth.loginError', 'Google login failed'));
    }
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('no identity token');
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      await appleLogin(credential.identityToken, fullName);
      await afterLogin();
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(t('common.error', 'Error'), t('alerts.errorLoginApple', 'Apple login failed'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image source={RivalHubLogo} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>{t('auth.welcomeBack', 'Welcome Back')}</Text>
            <Text style={styles.subtitle}>{t('auth.accessAccount', 'Access your account')}</Text>
          </View>

          {/* Google Login */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={20} color="#000" />
            <Text style={styles.googleButtonText}>{t('auth.continueWithGoogle', 'Continue with Google')}</Text>
          </TouchableOpacity>

          {/* Apple Login (iOS only) */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleLogin}
            />
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or', 'or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label={t('auth.email', 'Email')}
              placeholder={t('auth.emailPlaceholder', 'youremail@example.com')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            
            <Input
              label={t('auth.password', 'Password')}
              placeholder={t('auth.passwordPlaceholder', 'Your password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />

            <Button
              title={t('auth.login', 'Login')}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="large"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount', "Don't have an account?")}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>{t('auth.register', 'Register')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <WelcomeTourModal
        visible={showWelcomeTour}
        onStart={startTour}
        onSkip={skipTour}
      />

      <HighlightsPaywallModal
        visible={showHighlightsPaywall}
        onClose={() => {
          setShowHighlightsPaywall(false);
          router.replace('/(tabs)');
        }}
        onSubscribed={() => {
          setShowHighlightsPaywall(false);
          router.replace('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 120,
    height: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginLeft: 12,
  },
  appleButton: {
    height: 50,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#000',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
});
