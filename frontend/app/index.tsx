import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  FlatList,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components';
import api from '../src/utils/api';
import { Tournament, getSportEmoji } from '../src/types';
import DateTimePicker from '@react-native-community/datetimepicker';

const RivalHubLogo = require('../assets/images/rival-hub-logo.jpg');
const RivalHubLogoWhite = require('../assets/images/rival-hub-logo-white.png');

// Categories
const CATEGORIES = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'Open', 'Senior'];

// Sports with game formats
const SPORTS = [
  { key: 'calcio_11', label: 'Calcio 11', sport: 'calcio', format: '11v11' },
  { key: 'calcio_8', label: 'Calcio 8', sport: 'calcio', format: '8v8' },
  { key: 'calcio_7', label: 'Calcio 7', sport: 'calcio', format: '7v7' },
  { key: 'calcio_5', label: 'Calcio 5', sport: 'calcio', format: '5v5' },
  { key: 'basket_5', label: 'Basket 5v5', sport: 'basket', format: '5v5' },
  { key: 'basket_3', label: 'Basket 3v3', sport: 'basket', format: '3v3' },
  { key: 'padel_doppio', label: 'Padel Doppio', sport: 'padel', format: 'doubles' },
  { key: 'padel_singolo', label: 'Padel Singolo', sport: 'padel', format: 'singles' },
  { key: 'tennis_doppio', label: 'Tennis Doppio', sport: 'tennis', format: 'doubles' },
  { key: 'tennis_singolo', label: 'Tennis Singolo', sport: 'tennis', format: 'singles' },
  { key: 'pallavolo', label: 'Pallavolo', sport: 'pallavolo', format: '6v6' },
  { key: 'rugby', label: 'Rugby', sport: 'rugby', format: '15v15' },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  
  // Tournaments
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
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
      // Sort by created_at descending (most recent first)
      const sorted = response.data.sort((a: Tournament, b: Tournament) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setAllTournaments(sorted);
      setTournaments(sorted);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  // Filter and search tournaments
  const filteredTournaments = useMemo(() => {
    let result = [...allTournaments];
    
    // Search by name
    if (searchQuery.trim()) {
      result = result.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Search by location
    if (locationQuery.trim()) {
      result = result.filter(t => 
        t.location?.toLowerCase().includes(locationQuery.toLowerCase())
      );
    }
    
    // Filter by date
    if (selectedDate) {
      const filterDateStr = selectedDate.toISOString().split('T')[0];
      result = result.filter(t => {
        if (!t.start_date) return false;
        return t.start_date.startsWith(filterDateStr);
      });
    }
    
    // Filter by category
    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory);
    }
    
    // Filter by sport
    if (selectedSport) {
      const sportConfig = SPORTS.find(s => s.key === selectedSport);
      if (sportConfig) {
        result = result.filter(t => {
          const tournamentSport = t.sport || 'calcio';
          const tournamentFormat = t.game_format || '11v11';
          return tournamentSport === sportConfig.sport && 
                 (sportConfig.format === tournamentFormat || !t.game_format);
        });
      }
    }
    
    // Always sort by created_at descending
    return result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [allTournaments, searchQuery, locationQuery, selectedDate, selectedCategory, selectedSport]);

  // Check if any filter is active
  const hasActiveFilters = selectedDate || selectedCategory || selectedSport;
  
  // Count active filters
  const activeFilterCount = [selectedDate, selectedCategory, selectedSport].filter(Boolean).length;

  // Reset all filters
  const resetFilters = () => {
    setSelectedDate(null);
    setSelectedCategory(null);
    setSelectedSport(null);
    setSearchQuery('');
    setLocationQuery('');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const features = [
    { icon: 'trophy-outline' as const, title: 'Gestione Tornei', desc: 'Crea e gestisci tornei di qualsiasi sport' },
    { icon: 'people-outline' as const, title: 'Squadre', desc: 'Organizza rose e statistiche' },
    { icon: 'stats-chart-outline' as const, title: 'Classifiche', desc: 'Classifiche e risultati in tempo reale' },
    { icon: 'newspaper-outline' as const, title: 'News', desc: 'Pubblica aggiornamenti' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={RivalHubLogo} style={styles.logoImage} resizeMode="contain" />
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
            title="Inizia Ora"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            size="large"
            icon="rocket-outline"
          />
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cerca Torneo</Text>
          
          {/* Search by Name */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#000" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Nome del torneo..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Search by Location */}
          <View style={[styles.searchContainer, { marginTop: 10 }]}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="location" size={20} color="#000" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Città o luogo..."
              value={locationQuery}
              onChangeText={setLocationQuery}
              placeholderTextColor="#999"
            />
          </View>

          {/* Filters Row */}
          <View style={styles.filtersSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
            >
              {/* Date Filter */}
              <TouchableOpacity 
                style={[styles.filterChip, selectedDate && styles.filterChipActive]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={selectedDate ? '#FFF' : '#000'} />
                <Text style={[styles.filterChipText, selectedDate && styles.filterChipTextActive]}>
                  {selectedDate ? formatDate(selectedDate) : 'Data'}
                </Text>
                {selectedDate && (
                  <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.filterClearBtn}>
                    <Ionicons name="close-circle" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Category Filter */}
              <TouchableOpacity 
                style={[styles.filterChip, selectedCategory && styles.filterChipActive]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Ionicons name="flag-outline" size={16} color={selectedCategory ? '#FFF' : '#000'} />
                <Text style={[styles.filterChipText, selectedCategory && styles.filterChipTextActive]}>
                  {selectedCategory || 'Categoria'}
                </Text>
                {selectedCategory && (
                  <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.filterClearBtn}>
                    <Ionicons name="close-circle" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Sport Filter */}
              <TouchableOpacity 
                style={[styles.filterChip, selectedSport && styles.filterChipActive]}
                onPress={() => setShowSportPicker(true)}
              >
                <Ionicons name="football-outline" size={16} color={selectedSport ? '#FFF' : '#000'} />
                <Text style={[styles.filterChipText, selectedSport && styles.filterChipTextActive]}>
                  {selectedSport ? SPORTS.find(s => s.key === selectedSport)?.label : 'Sport'}
                </Text>
                {selectedSport && (
                  <TouchableOpacity onPress={() => setSelectedSport(null)} style={styles.filterClearBtn}>
                    <Ionicons name="close-circle" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Reset Button */}
              {hasActiveFilters && (
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                  <Ionicons name="refresh" size={16} color="#000" />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            
            {/* Active filters count badge */}
            {activeFilterCount > 0 && (
              <View style={styles.activeFiltersBadge}>
                <Text style={styles.activeFiltersBadgeText}>{activeFilterCount} filtri attivi</Text>
              </View>
            )}
          </View>
        </View>

        {/* Public Tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tornei Pubblici</Text>
            <Text style={styles.resultsCount}>{filteredTournaments.length} risultati</Text>
          </View>
          
          {filteredTournaments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>Nessun torneo trovato</Text>
              <Text style={styles.emptyStateSubtext}>Prova a modificare i filtri di ricerca</Text>
            </View>
          ) : (
            filteredTournaments.map((tournament) => (
              <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentCard}
                onPress={() => router.push(`/tournament/${tournament.slug}`)}
              >
                <View style={styles.tournamentIconContainer}>
                  <Text style={styles.sportEmojiBadge}>{getSportEmoji(tournament.sport || 'calcio')}</Text>
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
            ))
          )}
        </View>

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

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Image source={RivalHubLogoWhite} style={styles.footerLogoImage} resizeMode="contain" />
          </View>
          <Text style={styles.copyright}>© 2026 Rival Hub</Text>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleziona Data</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setSelectedDate(date);
                  }}
                  style={{ height: 200 }}
                />
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonText}>Conferma</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date && event.type === 'set') setSelectedDate(date);
            }}
          />
        )
      )}

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Categoria</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalListItem, selectedCategory === cat && styles.modalListItemActive]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[styles.modalListItemText, selectedCategory === cat && styles.modalListItemTextActive]}>
                    {cat}
                  </Text>
                  {selectedCategory === cat && <Ionicons name="checkmark" size={20} color="#FFF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sport Picker Modal */}
      <Modal visible={showSportPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Sport</Text>
              <TouchableOpacity onPress={() => setShowSportPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {SPORTS.map((sport) => (
                <TouchableOpacity
                  key={sport.key}
                  style={[styles.modalListItem, selectedSport === sport.key && styles.modalListItemActive]}
                  onPress={() => {
                    setSelectedSport(sport.key);
                    setShowSportPicker(false);
                  }}
                >
                  <Text style={[styles.modalListItemText, selectedSport === sport.key && styles.modalListItemTextActive]}>
                    {getSportEmoji(sport.sport)} {sport.label}
                  </Text>
                  {selectedSport === sport.key && <Ionicons name="checkmark" size={20} color="#FFF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  logoImage: {
    width: 100,
    height: 40,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
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
  // Filters
  filtersSection: {
    marginTop: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  filterChipActive: {
    backgroundColor: '#000',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterClearBtn: {
    marginLeft: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  activeFiltersBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeFiltersBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  // Tournament cards
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
  sportEmojiBadge: {
    fontSize: 24,
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
  // Features
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
  // Footer
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
  footerLogoImage: {
    width: 100,
    height: 50,
  },
  copyright: {
    fontSize: 12,
    color: '#666',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalList: {
    maxHeight: 300,
  },
  modalListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  modalListItemActive: {
    backgroundColor: '#000',
  },
  modalListItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalListItemTextActive: {
    color: '#FFF',
  },
  modalButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
