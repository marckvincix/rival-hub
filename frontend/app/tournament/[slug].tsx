import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Share,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Loading, EmptyState, TeamLogo } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament, Team, Match, Standing, Scorer, PlayerStats, News } from '../../src/types';
import { formatDate, getStatusLabel, getCategoryLabel, getFormatLabel, getEventTypeLabel } from '../../src/utils/helpers';

type TabId = 'standings' | 'matches' | 'scorers' | 'stats' | 'news' | 'info';

export default function TournamentPublicPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('standings');

  useEffect(() => {
    if (slug) {
      loadTournamentData();
    }
  }, [slug]);

  const loadTournamentData = async () => {
    try {
      // Load tournament info
      const tournamentRes = await api.get(`/api/tournaments/slug/${slug}`);
      const tournamentData = tournamentRes.data;
      setTournament(tournamentData);

      // Load related data
      const [teamsRes, matchesRes, standingsRes, scorersRes, statsRes, newsRes] = await Promise.all([
        api.get(`/api/tournaments/${tournamentData.id}/teams`),
        api.get(`/api/tournaments/${tournamentData.id}/matches`),
        api.get(`/api/tournaments/${tournamentData.id}/standings`),
        api.get(`/api/tournaments/${tournamentData.id}/scorers`),
        api.get(`/api/tournaments/${tournamentData.id}/player-stats`),
        api.get(`/api/tournaments/${tournamentData.id}/news?published_only=true`)
      ]);

      setTeams(teamsRes.data);
      setMatches(matchesRes.data);
      setStandings(standingsRes.data);
      setScorers(scorersRes.data);
      setPlayerStats(statsRes.data);
      setNews(newsRes.data);
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTournamentData();
  };

  const handleShare = async () => {
    if (!tournament) return;
    try {
      await Share.share({
        message: `Segui il torneo "${tournament.name}" su GoalManager!`,
        url: `https://goalmanager.app/tournament/${tournament.slug}`
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Squadra';
  };

  if (loading) {
    return <Loading message="Caricamento torneo..." />;
  }

  if (!tournament) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Torneo non trovato"
          description="Il torneo richiesto non esiste o è privato"
          actionLabel="Torna alla Home"
          onAction={() => router.replace('/')}
        />
      </SafeAreaView>
    );
  }

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'standings', label: 'Classifica', icon: 'podium-outline' },
    { id: 'matches', label: 'Partite', icon: 'football-outline' },
    { id: 'scorers', label: 'Marcatori', icon: 'trophy-outline' },
    { id: 'stats', label: 'Statistiche', icon: 'stats-chart-outline' },
    { id: 'news', label: 'News', icon: 'newspaper-outline' },
    { id: 'info', label: 'Info', icon: 'information-circle-outline' },
  ];

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    const round = match.round || 'Altro';
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
          <Text style={styles.headerMeta}>
            {getCategoryLabel(tournament.category)} • {getStatusLabel(tournament.status)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#1E40AF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons 
                name={tab.icon} 
                size={18} 
                color={activeTab === tab.id ? '#1E40AF' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <View style={styles.tabContent}>
            {standings.length === 0 ? (
              <EmptyState
                icon="podium-outline"
                title="Nessuna classifica"
                description="La classifica sarà disponibile dopo le prime partite"
              />
            ) : (
              <View style={styles.standingsTable}>
                {/* Table Header */}
                <View style={styles.standingsHeader}>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>#</Text>
                  <Text style={[styles.standingsHeaderText, { flex: 1 }]}>Squadra</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>G</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>V</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>P</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>S</Text>
                  <Text style={[styles.standingsHeaderText, { width: 40 }]}>DR</Text>
                  <Text style={[styles.standingsHeaderText, { width: 40, fontWeight: '700' }]}>Pt</Text>
                </View>
                {standings.map((team, index) => (
                  <View 
                    key={team.team_id} 
                    style={[
                      styles.standingsRow,
                      index % 2 === 0 && styles.standingsRowAlt
                    ]}
                  >
                    <Text style={[styles.standingsCell, { width: 30, fontWeight: '700' }]}>
                      {team.position}
                    </Text>
                    <View style={[styles.teamCell, { flex: 1 }]}>
                      <TeamLogo logo={team.team_logo} name={team.team_name} size="small" />
                      <Text style={styles.teamName} numberOfLines={1}>{team.team_name}</Text>
                    </View>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.played}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.wins}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.draws}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.losses}</Text>
                    <Text style={[styles.standingsCell, { width: 40 }]}>
                      {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                    </Text>
                    <Text style={[styles.standingsCell, { width: 40, fontWeight: '700', color: '#1E40AF' }]}>
                      {team.points}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <View style={styles.tabContent}>
            {matches.length === 0 ? (
              <EmptyState
                icon="football-outline"
                title="Nessuna partita"
                description="Il calendario delle partite non è ancora disponibile"
              />
            ) : (
              Object.entries(matchesByRound).map(([round, roundMatches]) => (
                <View key={round} style={styles.matchesGroup}>
                  <Text style={styles.matchesGroupTitle}>{round}</Text>
                  {roundMatches.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                      <View style={styles.matchTeams}>
                        <View style={styles.matchTeam}>
                          <TeamLogo logo={teams.find(t => t.id === match.home_team_id)?.logo} name={getTeamName(match.home_team_id)} size="small" />
                          <Text style={styles.matchTeamName} numberOfLines={1}>
                            {getTeamName(match.home_team_id)}
                          </Text>
                        </View>
                        <View style={styles.matchResult}>
                          {match.status === 'completed' ? (
                            <Text style={styles.matchScore}>
                              {match.home_goals} - {match.away_goals}
                            </Text>
                          ) : (
                            <Text style={styles.matchVs}>vs</Text>
                          )}
                        </View>
                        <View style={[styles.matchTeam, { alignItems: 'flex-end' }]}>
                          <Text style={styles.matchTeamName} numberOfLines={1}>
                            {getTeamName(match.away_team_id)}
                          </Text>
                          <TeamLogo logo={teams.find(t => t.id === match.away_team_id)?.logo} name={getTeamName(match.away_team_id)} size="small" />
                        </View>
                      </View>
                      {match.match_date && (
                        <Text style={styles.matchDate}>
                          {match.match_date} {match.match_time && `• ${match.match_time}`}
                        </Text>
                      )}
                      {match.venue && (
                        <Text style={styles.matchVenue}>{match.venue}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Scorers Tab */}
        {activeTab === 'scorers' && (
          <View style={styles.tabContent}>
            {scorers.length === 0 ? (
              <EmptyState
                icon="trophy-outline"
                title="Nessun marcatore"
                description="La classifica marcatori sarà disponibile dopo i primi gol"
              />
            ) : (
              scorers.slice(0, 20).map((scorer) => (
                <View key={scorer.player_id} style={styles.scorerCard}>
                  <View style={styles.scorerPosition}>
                    <Text style={styles.positionText}>{scorer.position}</Text>
                  </View>
                  <View style={styles.scorerInfo}>
                    <Text style={styles.scorerName}>{scorer.player_name}</Text>
                    <Text style={styles.scorerTeam}>{scorer.team_name}</Text>
                  </View>
                  <View style={styles.scorerStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="football" size={16} color="#1E40AF" />
                      <Text style={styles.statValue}>{scorer.goals}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="hand-left" size={16} color="#059669" />
                      <Text style={styles.statValue}>{scorer.assists}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <View style={styles.tabContent}>
            {playerStats.length === 0 ? (
              <EmptyState
                icon="stats-chart-outline"
                title="Nessuna statistica"
                description="Le statistiche saranno disponibili dopo le prime partite"
              />
            ) : (
              playerStats.slice(0, 30).map((player) => (
                <View key={player.player_id} style={styles.statsCard}>
                  <View style={styles.statsHeader}>
                    <Text style={styles.statsPlayerName}>{player.player_name}</Text>
                    <Text style={styles.statsTeamName}>{player.team_name}</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxValue}>{player.goals}</Text>
                      <Text style={styles.statBoxLabel}>Gol</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxValue}>{player.assists}</Text>
                      <Text style={styles.statBoxLabel}>Assist</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statBoxValue, { color: '#EAB308' }]}>{player.yellow_cards}</Text>
                      <Text style={styles.statBoxLabel}>Amm.</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statBoxValue, { color: '#DC2626' }]}>{player.red_cards}</Text>
                      <Text style={styles.statBoxLabel}>Esp.</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxValue}>{player.appearances}</Text>
                      <Text style={styles.statBoxLabel}>Pres.</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <View style={styles.tabContent}>
            {news.length === 0 ? (
              <EmptyState
                icon="newspaper-outline"
                title="Nessuna news"
                description="Non ci sono ancora aggiornamenti per questo torneo"
              />
            ) : (
              news.map((item) => (
                <View key={item.id} style={styles.newsCard}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
                  <Text style={styles.newsDate}>{formatDate(item.published_at || item.created_at)}</Text>
                  <Text style={styles.newsContent} numberOfLines={4}>{item.content}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="trophy" size={20} color="#1E40AF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nome Torneo</Text>
                  <Text style={styles.infoValue}>{tournament.name}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="people" size={20} color="#1E40AF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Categoria</Text>
                  <Text style={styles.infoValue}>{getCategoryLabel(tournament.category)}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="git-branch" size={20} color="#1E40AF" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Formato</Text>
                  <Text style={styles.infoValue}>{getFormatLabel(tournament.format)}</Text>
                </View>
              </View>
              
              {tournament.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#1E40AF" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Luogo</Text>
                    <Text style={styles.infoValue}>{tournament.location}</Text>
                  </View>
                </View>
              )}
              
              {tournament.start_date && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={20} color="#1E40AF" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>
                      {tournament.start_date} {tournament.end_date && `- ${tournament.end_date}`}
                    </Text>
                  </View>
                </View>
              )}

              {tournament.description && (
                <View style={styles.infoRow}>
                  <Ionicons name="document-text" size={20} color="#1E40AF" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Descrizione</Text>
                    <Text style={styles.infoValue}>{tournament.description}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Teams List */}
            <Text style={styles.teamsTitle}>Squadre Partecipanti ({teams.length})</Text>
            <View style={styles.teamsList}>
              {teams.map((team) => (
                <View key={team.id} style={styles.teamItem}>
                  <TeamLogo logo={team.logo} name={team.name} size="medium" />
                  <Text style={styles.teamItemName}>{team.name}</Text>
                </View>
              ))}
            </View>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareBar} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#FFFFFF" />
              <Text style={styles.shareBarText}>Condividi Torneo</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  shareButton: {
    padding: 8,
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  // Standings styles
  standingsTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  standingsHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E40AF',
    padding: 12,
  },
  standingsHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  standingsRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  standingsCell: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  // Matches styles
  matchesGroup: {
    marginBottom: 24,
  },
  matchesGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 8,
    flex: 1,
  },
  matchResult: {
    paddingHorizontal: 16,
  },
  matchScore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E40AF',
  },
  matchVs: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  matchDate: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  matchVenue: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  // Scorers styles
  scorerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scorerPosition: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  scorerInfo: {
    flex: 1,
  },
  scorerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  scorerTeam: {
    fontSize: 13,
    color: '#6B7280',
  },
  scorerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  // Stats styles
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  statsHeader: {
    marginBottom: 12,
  },
  statsPlayerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsTeamName: {
    fontSize: 13,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  // News styles
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  newsContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  // Info styles
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  teamsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  teamsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  teamItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '47%',
  },
  teamItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  shareBar: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
