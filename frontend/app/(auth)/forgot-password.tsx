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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../src/components';
import { useTranslation } from '../../src/i18n';
import api from '../../src/utils/api';

const RivalHubLogo = require('../../assets/images/rival-hub-logo.jpg');

// Two steps in one screen rather than two routes: requesting the code and
// consuming it are really one flow, and staying on the same screen lets us
// keep the email typed in step 1 without round-tripping it through params.
type Step = 'request' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; code?: string; newPassword?: string; confirmPassword?: string }>({});

  const handleRequestCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: t('errors.emailInvalid', 'Email non valida') });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setStep('reset');
    } catch (error) {
      // The backend always returns success here regardless of whether the
      // email exists, so a failure this point is a real network/server
      // problem, not "email not found".
      Alert.alert(t('common.error', 'Errore'), t('auth.forgotPasswordError', 'Impossibile inviare il codice. Riprova.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors: typeof errors = {};
    if (!code.trim() || code.trim().length !== 6) newErrors.code = t('auth.resetCodeLengthError', 'Inserisci il codice a 6 cifre');
    if (!newPassword || newPassword.length < 6) newErrors.newPassword = t('errors.passwordTooShort', 'Almeno 6 caratteri');
    if (newPassword !== confirmPassword) newErrors.confirmPassword = t('auth.passwordMismatch', 'Le password non coincidono');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { email: email.trim(), code: code.trim(), new_password: newPassword });
      Alert.alert(
        t('auth.resetSuccessTitle', 'Password reimpostata'),
        t('auth.resetSuccessMessage', 'Ora puoi accedere con la nuova password.'),
        [{ text: t('common.ok', 'OK'), onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      Alert.alert(t('common.error', 'Errore'), error?.response?.data?.detail || t('auth.resetCodeInvalid', 'Codice non valido o scaduto'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step === 'reset' ? setStep('request') : router.back())}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image source={RivalHubLogo} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>{t('auth.forgotPassword', 'Password dimenticata?')}</Text>
            <Text style={styles.subtitle}>
              {step === 'request'
                ? t('auth.forgotPasswordHint', 'Inserisci la tua email: ti manderemo un codice per reimpostare la password.')
                : t('auth.resetPasswordHint', 'Inserisci il codice ricevuto via email e la nuova password.')}
            </Text>
          </View>

          {step === 'request' ? (
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
              <Button
                title={t('auth.sendCode', 'Invia codice')}
                onPress={handleRequestCode}
                loading={loading}
                fullWidth
                size="large"
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.emailReminder}>{email}</Text>
              <Input
                label={t('auth.resetCode', 'Codice')}
                placeholder="000000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                error={errors.code}
              />
              <Input
                label={t('auth.newPassword', 'Nuova password')}
                placeholder={t('auth.passwordPlaceholder', 'La tua password')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                error={errors.newPassword}
              />
              <Input
                label={t('auth.confirmPassword', 'Conferma password')}
                placeholder={t('auth.passwordPlaceholder', 'La tua password')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                error={errors.confirmPassword}
              />
              <Button
                title={t('auth.resetPassword', 'Reimposta password')}
                onPress={handleResetPassword}
                loading={loading}
                fullWidth
                size="large"
              />
              <TouchableOpacity onPress={handleRequestCode} style={styles.resendLink} disabled={loading}>
                <Text style={styles.resendText}>{t('auth.resendCode', 'Non hai ricevuto il codice? Invia di nuovo')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 24 },
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
  header: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 120, height: 60, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 21 },
  form: { marginBottom: 24 },
  emailReminder: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center', fontWeight: '600' },
  resendLink: { alignSelf: 'center', marginTop: 16 },
  resendText: { fontSize: 14, fontWeight: '600', color: '#000', textDecorationLine: 'underline' },
});
