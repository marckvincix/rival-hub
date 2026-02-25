import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/store/authStore';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{name?: string; email?: string; password?: string; confirmPassword?: string}>({});

  const validate = () => {
    const newErrors: {name?: string; email?: string; password?: string; confirmPassword?: string} = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome richiesto';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email non valida';
    }
    
    if (!password) {
      newErrors.password = 'Password richiesta';
    } else if (password.length < 6) {
      newErrors.password = 'Minimo 6 caratteri';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Le password non coincidono';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    try {
      setLoading(true);
      await register(email, password, name);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Errore di registrazione');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const callbackUrl = Linking.createURL('(auth)/callback');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(callbackUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);
      
      if (result.type === 'success' && result.url) {
        const url = result.url;
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          const params = new URLSearchParams(hash);
          const sessionId = params.get('session_id');
          
          if (sessionId) {
            router.push({ pathname: '/(auth)/callback', params: { session_id: sessionId } });
          }
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Errore', 'Errore durante il login con Google');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="football" size={48} color="#1E40AF" />
            </View>
            <Text style={styles.title}>Crea un Account</Text>
            <Text style={styles.subtitle}>Inizia a gestire i tuoi tornei oggi</Text>
          </View>

          {/* Google Login */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
            <Ionicons name="logo-google" size={20} color="#1F2937" />
            <Text style={styles.googleButtonText}>Registrati con Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oppure</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Nome"
              placeholder="Il tuo nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />
            
            <Input
              label="Email"
              placeholder="tuaemail@esempio.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            
            <Input
              label="Password"
              placeholder="Minimo 6 caratteri"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />
            
            <Input
              label="Conferma Password"
              placeholder="Ripeti la password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <Button
              title="Registrati"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="large"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Hai già un account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Accedi</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
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
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 4,
  },
});
