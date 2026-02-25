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
import { useAuthStore } from '@/src/store/authStore';
import { Card, Button, EmptyState, Loading } from '@/src/components';
import api from '@/src/utils/api';
import { Tournament, Match } from '@/src/types';
import { formatDate, getStatusLabel } from '@/src/utils/helpers';

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

      // Calculate stats
      let totalTeams = 0;
      let pendingMatches = 0;
      
      for (const tournament of tournamentsData) {
        try {
          const teamsRes = await api.get(`/api/tournaments/${tournament.id}/teams`);
          totalTeams += teamsRes.data.length;
          
          const matchesRes = await api.get(`/api/tournaments/${tournament.id}/matches`);
          pendingMatches += matchesRes.data.filter((m: Match) => m.status === 'scheduled').length;
        } catch (e) {
          // Ignore individual fetch errors
        }
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

  if (loading) {
    return <Loading message="Caricamento dashboard..." />;
  }

  const statCards = [
    { icon: 'trophy' as const, value: stats.totalTournaments, label: 'Tornei Totali', color: '#1E40AF' },
    { icon: 'flash' as const, value: stats.activeTournaments, label: 'In Corso', color: '#059669' },
    { icon: 'people' as const, value: stats.totalTeams, label: 'Squadre', color: '#7C3AED' },
    { icon: 'time' as const, value: stats.pendingMatches, label: 'Partite da Giocare', color: '#EA580C' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ciao, {user?.name?.split(' ')[0] || 'Organizzatore'}</Text>
            <Text style={styles.subtitle}>Gestisci i tuoi tornei</Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{user?.plan?.toUpperCase() || 'FREE'}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/tournaments')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="add-circle" size={28} color="#1E40AF" />
              </View>
              <Text style={styles.actionText}>Nuovo Torneo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (tournaments.length > 0) {
                  router.push(`/tournament/${tournaments[0].slug}`);
                }
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="eye" size={28} color="#059669" />
              </View>
              <Text style={styles.actionText}>Vedi Pubblico</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Tournaments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>I Tuoi Tornei</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tournaments')}>
              <Text style={styles.seeAll}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>

          {tournaments.length === 0 ? (
            <Card>
              <EmptyState
                icon="trophy-outline"
                title="Nessun torneo"
                description="Crea il tuo primo torneo per iniziare"
                actionLabel="Crea Torneo"
                onAction={() => router.push('/(tabs)/tournaments')}
              />
            </Card>
          ) : (
            tournaments.slice(0, 3).map((tournament) => (
              <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentCard}
                onPress={() => router.push(`/(tabs)/tournaments?id=${tournament.id}`)}
              >
                <View style={styles.tournamentInfo}>
                  <View style={styles.tournamentIcon}>
                    <Ionicons name="trophy" size={24} color="#1E40AF" />
                  </View>
                  <View style={styles.tournamentDetails}>
                    <Text style={styles.tournamentName}>{tournament.name}</Text>
                    <Text style={styles.tournamentMeta}>
                      {tournament.category} • {tournament.location || 'Nessun luogo'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: tournament.status === 'active' ? '#ECFDF5' : 
                                     tournament.status === 'completed' ? '#F3F4F6' : '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: tournament.status === 'active' ? '#059669' : 
                             tournament.status === 'completed' ? '#6B7280' : '#D97706' }
                  ]}>
                    {getStatusLabel(tournament.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Plan Upgrade Banner */}
        {user?.plan === 'free' && (
          <View style={styles.upgradeBanner}>
            <View style={styles.upgradeContent}>
              <Ionicons name="star" size={32} color="#F59E0B" />
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Passa a Pro</Text>
                <Text style={styles.upgradeDesc}>Sblocca tornei e squadre illimitate</Text>
              </View>
            </View>
            <Button
              title="Upgrade"
              onPress={() => router.push('/(tabs)/profile')}
              variant="secondary"
              size="small"
            />
          </View>
        )}
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
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  planBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  planText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tournamentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tournamentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeBanner: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upgradeText: {
    marginLeft: 12,
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  upgradeDesc: {
    fontSize: 13,
    color: '#B45309',
  },
});
