import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Loading } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament, Match } from '../../src/types';

const RivalHubLogo = require('../../assets/images/rival-hub-logo.jpg');

// Sport configuration with labels and icons
const SPORT_CONFIG: Record<string, { label: string; icon: string }> = {
  'all': { label: 'Tutti', icon: 'apps' },
  'calcio': { label: 'Calcio', icon: 'football' },
  'basket': { label: 'Basket', icon: 'basketball' },
  'tennis': { label: 'Tennis', icon: 'tennisball' },
  'padel': { label: 'Padel', icon: 'tennisball' },
  'pallavolo': { label: 'Pallavolo', icon: 'football-outline' },
  'rugby': { label: 'Rugby', icon: 'american-football' },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [allTeamsData, setAllTeamsData] = useState<Record<string, number>>({});
  const [allMatchesData, setAllMatchesData] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activeTournaments: 0,
    totalTeams: 0,
    pendingMatches: 0
  });

  const loadData = async () => {
    try {
      const response = await api.get('/api/tournaments');
      const tournamentsData = response.data as Tournament[];
      setTournaments(tournamentsData);

      // Store teams and matches per tournament for filtering
      const teamsPerTournament: Record<string, number> = {};
      const matchesPerTournament: Record<string, number> = {};
      
      for (const tournament of tournamentsData) {
        try {
          const teamsRes = await api.get(`/api/tournaments/${tournament.id}/teams`);
          teamsPerTournament[tournament.id] = teamsRes.data.length;
          
          const matchesRes = await api.get(`/api/tournaments/${tournament.id}/matches`);
          matchesPerTournament[tournament.id] = matchesRes.data.filter((m: Match) => m.status === 'scheduled').length;
        } catch (e) {
          teamsPerTournament[tournament.id] = 0;
          matchesPerTournament[tournament.id] = 0;
        }
      }

      setAllTeamsData(teamsPerTournament);
      setAllMatchesData(matchesPerTournament);

      // Calculate initial stats (all sports)
      updateStats(tournamentsData, teamsPerTournament, matchesPerTournament, 'all');
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update stats based on selected sport
  const updateStats = (
    tournamentsData: Tournament[], 
    teamsData: Record<string, number>, 
    matchesData: Record<string, number>,
    sport: string
  ) => {
    const filteredTournaments = sport === 'all' 
      ? tournamentsData 
      : tournamentsData.filter(t => (t.sport || 'calcio') === sport);
    
    let totalTeams = 0;
    let pendingMatches = 0;
    
    filteredTournaments.forEach(t => {
      totalTeams += teamsData[t.id] || 0;
      pendingMatches += matchesData[t.id] || 0;
    });

    setStats({
      totalTournaments: filteredTournaments.length,
      activeTournaments: filteredTournaments.filter(t => t.status === 'active').length,
      totalTeams,
      pendingMatches
    });
  };

  // Handle sport filter change
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    updateStats(tournaments, allTeamsData, allMatchesData, sport);
  };

  // Get unique sports from tournaments
  const getAvailableSports = (): string[] => {
    const sports = new Set<string>();
    tournaments.forEach(t => {
      sports.add(t.sport || 'calcio');
    });
    return ['all', ...Array.from(sports)];
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'In corso';
      case 'completed': return 'Terminato';
      default: return 'Bozza';
    }
  };

  if (loading) {
    return <Loading message="Caricamento..." />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Utente';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={RivalHubLogo} style={styles.logoImage} resizeMode="contain" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Ciao, {firstName}</Text>
            <Text style={styles.subtitle}>Gestisci i tuoi tornei</Text>
          </View>
        </View>

        {/* Sport Filter Pills */}
        {tournaments.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.sportFilterContainer}
            contentContainerStyle={styles.sportFilterContent}
          >
            {getAvailableSports().map((sport) => {
              const config = SPORT_CONFIG[sport] || { label: sport, icon: 'football' };
              const isSelected = selectedSport === sport;
              return (
                <TouchableOpacity
                  key={sport}
                  style={[styles.sportPill, isSelected && styles.sportPillActive]}
                  onPress={() => handleSportChange(sport)}
                >
                  <Ionicons 
                    name={config.icon as any} 
                    size={16} 
                    color={isSelected ? '#FFF' : '#000'} 
                  />
                  <Text style={[styles.sportPillText, isSelected && styles.sportPillTextActive]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Row 1 */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trophy-outline" size={24} color="#000" />
              </View>
              <Text style={styles.statValue}>{stats.totalTournaments}</Text>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>Tornei</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flash" size={24} color="#000" />
              </View>
              <Text style={styles.statValue}>{stats.activeTournaments}</Text>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>In corso</Text>
              </View>
            </View>
          </View>
          {/* Row 2 */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people-outline" size={24} color="#000" />
              </View>
              <Text style={styles.statValue}>{stats.totalTeams}</Text>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>Squadre</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time-outline" size={24} color="#000" />
              </View>
              <Text style={styles.statValue}>{stats.pendingMatches}</Text>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>Da giocare</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nuovo Torneo Button */}
        <TouchableOpacity 
          style={styles.newTournamentButton}
          onPress={() => router.push('/(tabs)/tournaments')}
        >
          <Ionicons name="add" size={28} color="#FFF" />
          <Text style={styles.newTournamentText}>Nuovo torneo</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ height: 16 }} />

        {/* I tuoi tornei Section */}
        <View style={styles.tournamentsCard}>
          <View style={styles.tournamentsHeader}>
            <Text style={styles.tournamentsTitle}>I tuoi tornei</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/tournaments')}
            >
              <Text style={styles.viewAllText}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>

          {tournaments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nessun torneo creato</Text>
            </View>
          ) : (
            tournaments.slice(0, 3).map((tournament) => (
              <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentItem}
                onPress={() => router.push(`/(tabs)/tournaments?id=${tournament.id}`)}
              >
                <View style={styles.tournamentInfo}>
                  <Text style={styles.tournamentName}>{tournament.name}</Text>
                  <Text style={styles.tournamentMeta}>
                    {tournament.category} - {tournament.location || 'Campo'}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{getStatusLabel(tournament.status)}</Text>
                  </View>
                </View>
                <View style={styles.tournamentActions}>
                  <Ionicons name="chevron-forward" size={24} color="#FFF" />
                  <TouchableOpacity onPress={() => router.push(`/tournament/${tournament.slug}`)}>
                    <Ionicons name="eye-outline" size={20} color="#FFF" style={styles.eyeIcon} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 60,
    height: 48,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  // Stats Grid
  statsGrid: {
    marginBottom: 16,
  },
  // Sport Filter Pills
  sportFilterContainer: {
    marginBottom: 16,
    maxHeight: 44,
  },
  sportFilterContent: {
    paddingHorizontal: 0,
    gap: 8,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  sportPillActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  sportPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  sportPillTextActive: {
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    marginTop: 22,
  },
  statIconContainer: {
    position: 'absolute',
    top: -22,
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  statLabelContainer: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  // New Tournament Button
  newTournamentButton: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  newTournamentText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  // Tournaments Card
  tournamentsCard: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tournamentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },
  tournamentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  viewAllButton: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  tournamentItem: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  tournamentMeta: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  tournamentActions: {
    alignItems: 'center',
  },
  eyeIcon: {
    marginTop: 8,
  },
});
