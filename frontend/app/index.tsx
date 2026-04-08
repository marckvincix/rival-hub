import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../src/store/authStore';
import api from '../src/utils/api';
import { Tournament, getSportEmoji } from '../src/types';
import DateTimePicker from '@react-native-community/datetimepicker';

const RivalHubLogo = require('../assets/images/rival-hub-logo.jpg');
const RivalHubLogoWhite = require('../assets/images/rival-hub-logo-white.png');
const HeroIllustration = require('../assets/images/hero-illustration.jpg');

// Sport configurations with their specific categories/formats
const SPORT_CATEGORIES: Record<string, { label: string; emoji: string; formats: { key: string; label: string }[] }> = {
  'calcio': {
    label: 'Calcio',
    emoji: '⚽',
    formats: [
      { key: '11v11', label: 'Calcio a 11' },
      { key: '8v8', label: 'Calcio a 8' },
      { key: '7v7', label: 'Calcio a 7' },
      { key: '6v6', label: 'Calcio a 6' },
      { key: '5v5', label: 'Calcio a 5' },
    ]
  },
  'basket': {
    label: 'Basket',
    emoji: '🏀',
    formats: [
      { key: '5v5', label: 'Basket 5v5' },
      { key: '3v3', label: 'Basket 3v3' },
    ]
  },
  'padel': {
    label: 'Padel',
    emoji: '🎾',
    formats: [
      { key: 'doubles', label: 'Doppio' },
      { key: 'singles', label: 'Singolo' },
    ]
  },
  'tennis': {
    label: 'Tennis',
    emoji: '🎾',
    formats: [
      { key: 'doubles', label: 'Doppio' },
      { key: 'singles', label: 'Singolo' },
    ]
  },
  'pallavolo': {
    label: 'Pallavolo',
    emoji: '🏐',
    formats: [
      { key: '6v6', label: 'Pallavolo 6v6' },
      { key: '4v4', label: 'Beach Volley' },
    ]
  },
  'rugby': {
    label: 'Rugby',
    emoji: '🏉',
    formats: [
      { key: '15v15', label: 'Rugby XV' },
      { key: '7v7', label: 'Rugby 7' },
    ]
  },
  'hockey': {
    label: 'Hockey',
    emoji: '🏒',
    formats: [
      { key: '6v6', label: 'Hockey 6v6' },
      { key: '5v5', label: 'Hockey 5v5' },
    ]
  },
  'pallamano': {
    label: 'Pallamano',
    emoji: '🤾',
    formats: [
      { key: '7v7', label: 'Pallamano 7v7' },
    ]
  },
};

// Age categories (common for most sports)
const AGE_CATEGORIES = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'Open', 'Senior', 'Master'];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { t, i18n } = useTranslation();
  
  // Translated sport categories
  const translatedSportCategories = useMemo(() => ({
    'calcio': {
      label: t('sports.soccer', 'Soccer'),
      emoji: '⚽',
      formats: [
        { key: '11v11', label: t('sports.soccer11', '11v11') },
        { key: '8v8', label: t('sports.soccer8', '8v8') },
        { key: '7v7', label: t('sports.soccer7', '7v7') },
        { key: '6v6', label: t('sports.soccer6', '6v6') },
        { key: '5v5', label: t('sports.soccer5', '5v5') },
      ]
    },
    'basket': {
      label: t('sports.basketball', 'Basketball'),
      emoji: '🏀',
      formats: [
        { key: '5v5', label: t('sports.basketball5', '5v5') },
        { key: '3v3', label: t('sports.basketball3', '3v3') },
      ]
    },
    'padel': {
      label: t('sports.padel', 'Padel'),
      emoji: '🎾',
      formats: [
        { key: 'singolo', label: t('sports.singles', 'Singles') },
        { key: 'doppio', label: t('sports.doubles', 'Doubles') },
      ]
    },
    'tennis': {
      label: t('sports.tennis', 'Tennis'),
      emoji: '🎾',
      formats: [
        { key: 'singolo', label: t('sports.singles', 'Singles') },
        { key: 'doppio', label: t('sports.doubles', 'Doubles') },
      ]
    },
    'pallavolo': {
      label: t('sports.volleyball', 'Volleyball'),
      emoji: '🏐',
      formats: [
        { key: '6v6', label: t('sports.volleyball6', '6v6') },
        { key: '4v4', label: t('sports.beachVolleyball', 'Beach 4v4') },
        { key: '2v2', label: t('sports.beachVolleyball2', 'Beach 2v2') },
      ]
    },
    'rugby': {
      label: t('sports.rugby', 'Rugby'),
      emoji: '🏉',
      formats: [
        { key: '15v15', label: t('sports.rugbyUnion', 'Union 15v15') },
        { key: '7v7', label: t('sports.rugbySevens', 'Sevens 7v7') },
      ]
    },
    'baseball': {
      label: t('sports.baseball', 'Baseball'),
      emoji: '⚾',
      formats: [
        { key: '9v9', label: t('sports.baseball9', '9v9') },
      ]
    },
    'hockey': {
      label: t('sports.hockey', 'Hockey'),
      emoji: '🏑',
      formats: [
        { key: '11v11', label: t('sports.fieldHockey', 'Field 11v11') },
        { key: '6v6', label: t('sports.indoorHockey', 'Indoor 6v6') },
      ]
    },
    'pallamano': {
      label: t('sports.handball', 'Handball'),
      emoji: '🤾',
      formats: [
        { key: '7v7', label: t('sports.handball7', '7v7') },
      ]
    },
  }), [t, i18n.language]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Modal states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // Tournaments
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);

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
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  // Get available sports from tournaments (only sports with at least one tournament)
  const availableSports = useMemo(() => {
    const sports = new Set<string>();
    allTournaments.forEach(t => {
      const sport = t.sport || 'calcio';
      if (translatedSportCategories[sport]) {
        sports.add(sport);
      }
    });
    return Array.from(sports);
  }, [allTournaments]);

  // Get available formats for selected sport (only formats with tournaments)
  const availableFormats = useMemo(() => {
    if (!selectedSport) return [];
    
    const sportConfig = translatedSportCategories[selectedSport];
    if (!sportConfig) return [];
    
    // Get formats that have at least one tournament
    const formatsWithTournaments = new Set<string>();
    allTournaments.forEach(t => {
      if ((t.sport || 'calcio') === selectedSport && t.game_format) {
        formatsWithTournaments.add(t.game_format);
      }
    });
    
    // Return all formats for the sport (show all options)
    return sportConfig.formats;
  }, [selectedSport, allTournaments]);

  // Get available categories from tournaments for selected sport
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    allTournaments.forEach(t => {
      if (!selectedSport || (t.sport || 'calcio') === selectedSport) {
        if (t.category) {
          categories.add(t.category);
        }
      }
    });
    return Array.from(categories).sort((a, b) => {
      const indexA = AGE_CATEGORIES.indexOf(a);
      const indexB = AGE_CATEGORIES.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [selectedSport, allTournaments]);

  // Filter tournaments
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
    
    // Filter by sport
    if (selectedSport) {
      result = result.filter(t => (t.sport || 'calcio') === selectedSport);
    }
    
    // Filter by format
    if (selectedFormat) {
      result = result.filter(t => t.game_format === selectedFormat);
    }
    
    // Filter by category
    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory);
    }
    
    // Always sort by created_at descending
    return result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [allTournaments, searchQuery, locationQuery, selectedDate, selectedSport, selectedFormat, selectedCategory]);

  // Check if any filter is active
  const hasActiveFilters = selectedDate || selectedSport || selectedFormat || selectedCategory;
  
  // Count active filters
  const activeFilterCount = [selectedDate, selectedSport, selectedFormat, selectedCategory].filter(Boolean).length;

  // Reset all filters
  const resetFilters = () => {
    setSelectedDate(null);
    setSelectedSport(null);
    setSelectedFormat(null);
    setSelectedCategory(null);
    setSearchQuery('');
    setLocationQuery('');
  };

  // When sport changes, reset format and category
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    setSelectedFormat(null);
    setSelectedCategory(null);
    setShowSportPicker(false);
  };

  const formatDate = (date: Date) => {
    const locale = i18n.language === 'it' ? 'it-IT' : 
                   i18n.language === 'fr' ? 'fr-FR' :
                   i18n.language === 'de' ? 'de-DE' :
                   i18n.language === 'es' ? 'es-ES' :
                   i18n.language === 'pt' ? 'pt-PT' :
                   i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const features = [
    { icon: 'trophy-outline' as const, title: t('home.featureTournaments', 'Tournament Management'), desc: t('home.featureTournamentsDesc', 'Create and manage tournaments of any sport') },
    { icon: 'people-outline' as const, title: t('home.featureTeams', 'Teams'), desc: t('home.featureTeamsDesc', 'Organize rosters and statistics') },
    { icon: 'stats-chart-outline' as const, title: t('home.featureStandings', 'Standings'), desc: t('home.featureStandingsDesc', 'Real-time standings and results') },
    { icon: 'newspaper-outline' as const, title: t('home.featureNews', 'News'), desc: t('home.featureNewsDesc', 'Publish updates') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section - New Design */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t('home.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('home.subtitle')}
          </Text>
          <View style={styles.heroImageContainer}>
            <Image source={HeroIllustration} style={styles.heroImage} resizeMode="contain" />
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.heroButtonText}>{t('home.startNow')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.searchTournament')}</Text>
          
          {/* Search by Name */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#000" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder={t('home.tournamentName')}
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
              placeholder={t('home.cityOrPlace')}
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
                  {selectedDate ? formatDate(selectedDate) : t('home.date')}
                </Text>
                {selectedDate && (
                  <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.filterClearBtn}>
                    <Ionicons name="close-circle" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Sport Filter - Only show sports with tournaments */}
              {availableSports.length > 0 && (
                <TouchableOpacity 
                  style={[styles.filterChip, selectedSport && styles.filterChipActive]}
                  onPress={() => setShowSportPicker(true)}
                >
                  <Text style={{ fontSize: 16 }}>
                    {selectedSport ? translatedSportCategories[selectedSport]?.emoji : '🏆'}
                  </Text>
                  <Text style={[styles.filterChipText, selectedSport && styles.filterChipTextActive]}>
                    {selectedSport ? translatedSportCategories[selectedSport]?.label : t('home.sport')}
                  </Text>
                  {selectedSport && (
                    <TouchableOpacity onPress={() => { setSelectedSport(null); setSelectedFormat(null); setSelectedCategory(null); }} style={styles.filterClearBtn}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}

              {/* Format Filter - Only show after sport is selected */}
              {selectedSport && availableFormats.length > 0 && (
                <TouchableOpacity 
                  style={[styles.filterChip, selectedFormat && styles.filterChipActive]}
                  onPress={() => setShowFormatPicker(true)}
                >
                  <Ionicons name="grid-outline" size={16} color={selectedFormat ? '#FFF' : '#000'} />
                  <Text style={[styles.filterChipText, selectedFormat && styles.filterChipTextActive]}>
                    {selectedFormat ? availableFormats.find(f => f.key === selectedFormat)?.label : t('home.format', 'Format')}
                  </Text>
                  {selectedFormat && (
                    <TouchableOpacity onPress={() => setSelectedFormat(null)} style={styles.filterClearBtn}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}

              {/* Category Filter - Only show after sport is selected */}
              {selectedSport && availableCategories.length > 0 && (
                <TouchableOpacity 
                  style={[styles.filterChip, selectedCategory && styles.filterChipActive]}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Ionicons name="flag-outline" size={16} color={selectedCategory ? '#FFF' : '#000'} />
                  <Text style={[styles.filterChipText, selectedCategory && styles.filterChipTextActive]}>
                    {selectedCategory || t('home.category', 'Category')}
                  </Text>
                  {selectedCategory && (
                    <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.filterClearBtn}>
                      <Ionicons name="close-circle" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}

              {/* Reset Button */}
              {hasActiveFilters && (
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                  <Ionicons name="refresh" size={16} color="#000" />
                  <Text style={styles.resetButtonText}>{t('common.refresh', 'Reset')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            
            {/* Active filters count badge */}
            {activeFilterCount > 0 && (
              <View style={styles.activeFiltersBadge}>
                <Text style={styles.activeFiltersBadgeText}>{activeFilterCount} {t('home.activeFilters', 'active filters')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Public Tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tournaments.publicTournaments')}</Text>
            <Text style={styles.resultsCount}>{filteredTournaments.length} {t('home.results', 'results')}</Text>
          </View>
          
          {filteredTournaments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>{t('home.noTournaments')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('home.tryChangingFilters', 'Try changing search filters')}</Text>
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
                    {tournament.category} • {tournament.location || t('home.noLocation', 'No location')}
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
                    {tournament.status === 'active' ? t('matches.live') : tournament.status === 'completed' ? t('tournaments.completed') : t('tournaments.draft')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.features', 'Features')}</Text>
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
                  <Text style={styles.modalTitle}>{t('home.selectDate', 'Select Date')}</Text>
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
                  <Text style={styles.modalButtonText}>{t('common.confirm')}</Text>
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

      {/* Sport Picker Modal */}
      <Modal visible={showSportPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.selectSport', 'Select Sport')}</Text>
              <TouchableOpacity onPress={() => setShowSportPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {availableSports.map((sport) => {
                const config = translatedSportCategories[sport];
                if (!config) return null;
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.modalListItem, selectedSport === sport && styles.modalListItemActive]}
                    onPress={() => handleSportChange(sport)}
                  >
                    <Text style={[styles.modalListItemText, selectedSport === sport && styles.modalListItemTextActive]}>
                      {config.emoji} {config.label}
                    </Text>
                    {selectedSport === sport && <Ionicons name="checkmark" size={20} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Format Picker Modal */}
      <Modal visible={showFormatPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.selectFormat', 'Select Format')}</Text>
              <TouchableOpacity onPress={() => setShowFormatPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {availableFormats.map((format) => (
                <TouchableOpacity
                  key={format.key}
                  style={[styles.modalListItem, selectedFormat === format.key && styles.modalListItemActive]}
                  onPress={() => {
                    setSelectedFormat(format.key);
                    setShowFormatPicker(false);
                  }}
                >
                  <Text style={[styles.modalListItemText, selectedFormat === format.key && styles.modalListItemTextActive]}>
                    {format.label}
                  </Text>
                  {selectedFormat === format.key && <Ionicons name="checkmark" size={20} color="#FFF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.selectCategory', 'Select Category')}</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {availableCategories.map((cat) => (
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 0,
    backgroundColor: '#FFF',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 0,
    lineHeight: 22,
  },
  heroImageContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 0,
  },
  heroImage: {
    width: '100%',
    height: 400,
  },
  heroButton: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    borderWidth: 1.5,
    borderColor: '#CCC',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  heroButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
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
