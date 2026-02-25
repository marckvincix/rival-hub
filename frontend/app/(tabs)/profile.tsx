import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button, Card } from '../../src/components';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Esci', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const getPlanColor = () => {
    switch (user?.plan) {
      case 'pro': return '#7C3AED';
      case 'club': return '#059669';
      default: return '#6B7280';
    }
  };

  const getPlanFeatures = () => {
    switch (user?.plan) {
      case 'pro':
        return [
          'Tornei illimitati',
          'Squadre illimitate',
          'Statistiche complete',
          'News e notifiche',
          'Nessun branding'
        ];
      case 'club':
        return [
          'Tutto del Pro',
          'Collaboratori multipli',
          'Categorie età',
          'URL personalizzato',
          'Export PDF'
        ];
      default:
        return [
          '1 torneo attivo',
          'Max 8 squadre',
          'Statistiche base',
          'Branding GoalManager'
        ];
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profilo</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'Utente'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.planBadge, { backgroundColor: `${getPlanColor()}20` }]}>
            <Ionicons 
              name={user?.plan === 'club' ? 'diamond' : user?.plan === 'pro' ? 'star' : 'person'} 
              size={16} 
              color={getPlanColor()} 
            />
            <Text style={[styles.planBadgeText, { color: getPlanColor() }]}>
              Piano {user?.plan?.toUpperCase() || 'FREE'}
            </Text>
          </View>
        </View>

        {/* Current Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Il tuo Piano</Text>
          <Card>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>
                Piano {user?.plan?.toUpperCase() || 'FREE'}
              </Text>
              {user?.plan !== 'club' && (
                <TouchableOpacity>
                  <Text style={styles.upgradeLink}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.planFeatures}>
              {getPlanFeatures().map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Upgrade Options */}
        {user?.plan === 'free' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Passa a un Piano Superiore</Text>
            
            <Card>
              <View style={styles.upgradeCard}>
                <View style={styles.upgradeHeader}>
                  <Ionicons name="star" size={24} color="#7C3AED" />
                  <View style={styles.upgradeInfo}>
                    <Text style={styles.upgradeName}>Piano Pro</Text>
                    <Text style={styles.upgradePrice}>€9.99/mese o €79/anno</Text>
                  </View>
                </View>
                <Text style={styles.upgradeDesc}>
                  Tornei e squadre illimitate, statistiche complete, nessun branding
                </Text>
                <Button
                  title="Scegli Pro"
                  onPress={() => Alert.alert('Stripe', 'Integrazione Stripe in modalità test')}
                  variant="primary"
                  fullWidth
                />
              </View>
            </Card>

            <Card>
              <View style={styles.upgradeCard}>
                <View style={styles.upgradeHeader}>
                  <Ionicons name="diamond" size={24} color="#059669" />
                  <View style={styles.upgradeInfo}>
                    <Text style={styles.upgradeName}>Piano Club</Text>
                    <Text style={styles.upgradePrice}>€19.99/mese o €149/anno</Text>
                  </View>
                </View>
                <Text style={styles.upgradeDesc}>
                  Tutto del Pro + collaboratori, categorie età, URL personalizzato, export PDF
                </Text>
                <Button
                  title="Scegli Club"
                  onPress={() => Alert.alert('Stripe', 'Integrazione Stripe in modalità test')}
                  variant="secondary"
                  fullWidth
                />
              </View>
            </Card>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="notifications-outline" size={20} color="#1E40AF" />
              </View>
              <Text style={styles.settingText}>Notifiche</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#059669" />
              </View>
              <Text style={styles.settingText}>Supporto</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-text-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.settingText}>Termini e Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Button
            title="Esci"
            onPress={handleLogout}
            variant="outline"
            icon="log-out-outline"
            fullWidth
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Ionicons name="football" size={24} color="#9CA3AF" />
          <Text style={styles.appName}>GoalManager</Text>
          <Text style={styles.appVersion}>Versione 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  upgradeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  upgradeCard: {
    gap: 12,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeInfo: {
    marginLeft: 12,
  },
  upgradeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  upgradePrice: {
    fontSize: 13,
    color: '#6B7280',
  },
  upgradeDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1F2937',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 8,
  },
  appVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
