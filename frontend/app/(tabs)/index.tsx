import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Loading } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament, Match } from '../../src/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

      let totalTeams = 0;
      let pendingMatches = 0;
      
      for (const tournament of tournamentsData) {
        try {
          const teamsRes = await api.get(`/api/tournaments/${tournament.id}/teams`);
          totalTeams += teamsRes.data.length;
          
          const matchesRes = await api.get(`/api/tournaments/${tournament.id}/matches`);
          pendingMatches += matchesRes.data.filter((m: Match) => m.status === 'scheduled').length;
        } catch (e) {}
      }

      setStats({
        totalTournaments: tournamentsData.length,
        activeTournaments: tournamentsData.filter(t => t.status === 'active').length,
        totalTeams,
        pendingMatches
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      case 'completed': return 'Completato';
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
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Ciao, {firstName}</Text>
            <Text style={styles.subtitle}>Gestisci i tuoi tornei</Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{user?.plan?.toUpperCase() || 'FREE'}</Text>
          </View>
        </View>

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
    paddingBottom: 100,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
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
  planBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  planText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Stats Grid
  statsGrid: {
    marginBottom: 16,
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
