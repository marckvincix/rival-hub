import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { Button, Card } from '@/src/components';
import api from '@/src/utils/api';
import { Tournament } from '@/src/types';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      const response = await api.get('/api/tournaments/public');
      setTournaments(response.data.slice(0, 6));
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTournaments = async () => {
    if (!searchQuery.trim()) {
      loadTournaments();
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/api/tournaments/public?search=${encodeURIComponent(searchQuery)}`);
      setTournaments(response.data);
    } catch (error) {
      console.error('Error searching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'trophy-outline' as const, title: 'Gestione Tornei', desc: 'Crea e gestisci tornei di calcio facilmente' },
    { icon: 'people-outline' as const, title: 'Squadre e Giocatori', desc: 'Organizza rose complete con statistiche' },
    { icon: 'stats-chart-outline' as const, title: 'Classifiche Live', desc: 'Aggiornamenti in tempo reale' },
    { icon: 'newspaper-outline' as const, title: 'News e Aggiornamenti', desc: 'Pubblica notizie per i tuoi tifosi' },
  ];

  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'sempre gratis',
      features: ['1 torneo attivo', 'Max 8 squadre', 'Statistiche base', 'Branding GoalManager'],
      highlighted: false
    },
    {
      name: 'Pro',
      price: '9.99',
      period: '/mese',
      features: ['Tornei illimitati', 'Squadre illimitate', 'Statistiche complete', 'News e notifiche', 'Nessun branding'],
      highlighted: true
    },
    {
      name: 'Club',
      price: '19.99',
      period: '/mese',
      features: ['Tutto del Pro', 'Collaboratori multipli', 'Categorie età', 'URL personalizzato', 'Export PDF'],
      highlighted: false
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="football" size={32} color="#1E40AF" />
            <Text style={styles.logoText}>GoalManager</Text>
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
          <Text style={styles.heroTitle}>Gestisci i tuoi tornei di calcio come un professionista</Text>
          <Text style={styles.heroSubtitle}>
            La piattaforma completa per scuole calcio, accademie e organizzatori di tornei amatoriali
          </Text>
          <View style={styles.heroButtons}>
            <Button
              title="Inizia Gratis"
              onPress={() => router.push('/(auth)/register')}
              variant="primary"
              size="large"
              icon="rocket-outline"
            />
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Cerca un Torneo</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nome del torneo..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchTournaments}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.searchButton} onPress={searchTournaments}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Public Tournaments */}
        {tournaments.length > 0 && (
          <View style={styles.tournamentsSection}>
            <Text style={styles.sectionTitle}>Tornei in Evidenza</Text>
            {tournaments.map((tournament) => (
              <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentCard}
                onPress={() => router.push(`/tournament/${tournament.slug}`)}
              >
                <View style={styles.tournamentInfo}>
                  <View style={styles.tournamentLogo}>
                    {tournament.logo ? (
                      <Image source={{ uri: tournament.logo }} style={styles.tournamentLogoImage} />
                    ) : (
                      <Ionicons name="trophy" size={24} color="#1E40AF" />
                    )}
                  </View>
                  <View style={styles.tournamentDetails}>
                    <Text style={styles.tournamentName}>{tournament.name}</Text>
                    <Text style={styles.tournamentMeta}>
                      {tournament.category} • {tournament.location || 'Luogo non specificato'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: tournament.status === 'active' ? '#059669' : '#6B7280' }
                ]}>
                  <Text style={styles.statusText}>
                    {tournament.status === 'active' ? 'In corso' : tournament.status === 'completed' ? 'Completato' : 'Bozza'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Funzionalità</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={28} color="#1E40AF" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Piani e Prezzi</Text>
          <View style={styles.plansContainer}>
            {plans.map((plan, index) => (
              <View 
                key={index} 
                style={[
                  styles.planCard, 
                  plan.highlighted && styles.planCardHighlighted
                ]}
              >
                {plan.highlighted && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Più Popolare</Text>
                  </View>
                )}
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currency}>€</Text>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>{plan.period}</Text>
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, fIndex) => (
                    <View key={fIndex} style={styles.planFeature}>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                      <Text style={styles.planFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <Button
                  title={plan.price === '0' ? 'Inizia Gratis' : 'Scegli Piano'}
                  onPress={() => router.push('/(auth)/register')}
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  fullWidth
                />
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="football" size={24} color="#9CA3AF" />
            <Text style={styles.footerLogoText}>GoalManager</Text>
          </View>
          <Text style={styles.footerText}>
            La piattaforma italiana per la gestione di tornei di calcio giovanile e amatoriale
          </Text>
          <Text style={styles.copyright}>© 2025 GoalManager. Tutti i diritti riservati.</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E40AF',
    marginLeft: 8,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  hero: {
    padding: 24,
    backgroundColor: '#1E40AF',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  heroButtons: {
    alignItems: 'center',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingLeft: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#1E40AF',
    padding: 14,
    borderRadius: 12,
    margin: 4,
  },
  tournamentsSection: {
    padding: 20,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tournamentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tournamentLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tournamentLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  tournamentDetails: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  tournamentMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureCard: {
    width: '50%',
    padding: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  pricingSection: {
    padding: 20,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planCardHighlighted: {
    borderColor: '#1E40AF',
    backgroundColor: '#FAFBFF',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#1E40AF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1F2937',
  },
  period: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 20,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    backgroundColor: '#1F2937',
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
    color: '#9CA3AF',
    marginLeft: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  copyright: {
    fontSize: 12,
    color: '#6B7280',
  },
});
