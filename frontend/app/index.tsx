import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components';
import api from '../src/utils/api';
import { Tournament } from '../src/types';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await api.get('/api/tournaments/public');
      setTournaments(response.data.slice(0, 4));
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const searchTournaments = async () => {
    if (!searchQuery.trim()) {
      loadTournaments();
      return;
    }
    try {
      const response = await api.get(`/api/tournaments/public?search=${encodeURIComponent(searchQuery)}`);
      setTournaments(response.data);
    } catch (error) {
      console.error('Error searching tournaments:', error);
    }
  };

  const features = [
    { icon: 'trophy-outline' as const, title: 'Gestione Tornei', desc: 'Crea e gestisci tornei di qualsiasi sport' },
    { icon: 'people-outline' as const, title: 'Squadre', desc: 'Organizza rose e statistiche' },
    { icon: 'stats-chart-outline' as const, title: 'Classifiche', desc: 'Classifiche e risultati in tempo reale' },
    { icon: 'newspaper-outline' as const, title: 'News', desc: 'Pubblica aggiornamenti' },
  ];

  const plans = [
    { name: 'FREE', price: '0', features: ['1 torneo', 'Max 8 squadre', 'Statistiche base'] },
    { name: 'PRO', price: '39.99', period: '/anno', features: ['Tornei illimitati', 'Squadre illimitate', 'Statistiche complete', 'Collaboratori', 'Categorie per età', 'Export PDF', 'Senza pubblicità', 'Senza branding'] },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="trophy" size={24} color="#FFF" />
            </View>
            <Text style={styles.logoText}>Rival Hub</Text>
          </View>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Accedi</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Crea e gestisci i tuoi tornei</Text>
          <Text style={styles.heroSubtitle}>
            La piattaforma per creare, seguire ed organizzare tornei sportivi
          </Text>
          <Button
            title="Inizia Gratis"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            size="large"
            icon="rocket-outline"
          />
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cerca Torneo</Text>
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#000" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Nome del torneo..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchTournaments}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.searchButton} onPress={searchTournaments}>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Public Tournaments */}
        {tournaments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tornei Pubblici</Text>
            {tournaments.map((tournament) => (
              <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentCard}
                onPress={() => router.push(`/tournament/${tournament.slug}`)}
              >
                <View style={styles.tournamentIconContainer}>
                  <Ionicons name="trophy" size={24} color="#000" />
                </View>
                <View style={styles.tournamentInfo}>
                  <Text style={styles.tournamentName}>{tournament.name}</Text>
                  <Text style={styles.tournamentMeta}>
                    {tournament.category} • {tournament.location || 'Nessun luogo'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  tournament.status === 'active' && styles.statusActive
                ]}>
                  <Text style={[
                    styles.statusText,
                    tournament.status === 'active' && styles.statusTextActive
                  ]}>
                    {tournament.status === 'active' ? 'In corso' : tournament.status === 'completed' ? 'Terminato' : 'Bozza'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funzionalità</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name={feature.icon} size={28} color="#000" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Piani</Text>
          {plans.map((plan, index) => (
            <View key={index} style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currency}>€</Text>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>/mese</Text>
                </View>
              </View>
              <View style={styles.planFeatures}>
                {plan.features.map((feature, fIndex) => (
                  <View key={fIndex} style={styles.planFeature}>
                    <Ionicons name="checkmark" size={18} color="#000" />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              <Button
                title={plan.price === '0' ? 'Inizia Gratis' : 'Scegli Piano'}
                onPress={() => router.push('/(auth)/register')}
                variant={plan.name === 'PRO' ? 'primary' : 'outline'}
                fullWidth
              />
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="trophy" size={24} color="#FFF" />
            <Text style={styles.footerLogoText}>Rival Hub</Text>
          </View>
          <Text style={styles.copyright}>© 2026 Rival Hub</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginLeft: 10,
  },
  loginButton: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loginButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  hero: {
    padding: 24,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchIconContainer: {
    padding: 14,
    borderRightWidth: 2,
    borderRightColor: '#000',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
  },
  searchButton: {
    backgroundColor: '#000',
    padding: 14,
  },
  tournamentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  tournamentIconContainer: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  tournamentMeta: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: '#000',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  statusTextActive: {
    color: '#FFF',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureCard: {
    width: '50%',
    padding: 6,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#666',
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  period: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
  copyright: {
    fontSize: 12,
    color: '#666',
  },
});
