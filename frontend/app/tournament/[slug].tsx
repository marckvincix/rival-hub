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

  useEffect(() => { if (slug) loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const tournamentRes = await api.get(`/api/tournaments/slug/${slug}`);
      const t = tournamentRes.data;
      setTournament(t);
      const [teamsRes, matchesRes, standingsRes, scorersRes, statsRes, newsRes] = await Promise.all([
        api.get(`/api/tournaments/${t.id}/teams`),
        api.get(`/api/tournaments/${t.id}/matches`),
        api.get(`/api/tournaments/${t.id}/standings`),
        api.get(`/api/tournaments/${t.id}/scorers`),
        api.get(`/api/tournaments/${t.id}/player-stats`),
        api.get(`/api/tournaments/${t.id}/news?published_only=true`)
      ]);
      setTeams(teamsRes.data); setMatches(matchesRes.data); setStandings(standingsRes.data);
      setScorers(scorersRes.data); setPlayerStats(statsRes.data); setNews(newsRes.data);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleShare = async () => {
    if (!tournament) return;
    try { await Share.share({ message: `Segui "${tournament.name}" su GoalManager!` }); } catch (e) {}
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Squadra';
  const getStatusLabel = (status: string) => status === 'active' ? 'In corso' : status === 'completed' ? 'Completato' : 'Bozza';
  const getCategoryLabel = (cat: string) => cat;
  const getFormatLabel = (f: string) => f === 'league' ? 'Campionato' : f === 'knockout' ? 'Eliminazione' : 'Gironi';

  if (loading) return <Loading message="Caricamento..." />;

  if (!tournament) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Torneo non trovato" description="Il torneo richiesto non esiste" actionLabel="Torna alla Home" onAction={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'standings', label: 'Classifica', icon: 'podium-outline' },
    { id: 'matches', label: 'Partite', icon: 'football-outline' },
    { id: 'scorers', label: 'Marcatori', icon: 'trophy-outline' },
    { id: 'stats', label: 'Stats', icon: 'stats-chart-outline' },
    { id: 'news', label: 'News', icon: 'newspaper-outline' },
    { id: 'info', label: 'Info', icon: 'information-circle-outline' },
  ];

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
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
          <Text style={styles.headerMeta}>{getCategoryLabel(tournament.category)} • {getStatusLabel(tournament.status)}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? '#FFF' : '#000'} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <View style={styles.tabContent}>
            {standings.length === 0 ? <EmptyState icon="podium-outline" title="Nessuna classifica" /> : (
              <View style={styles.standingsTable}>
                <View style={styles.standingsHeader}>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>#</Text>
                  <Text style={[styles.standingsHeaderText, { flex: 1 }]}>Squadra</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>G</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>V</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>P</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>S</Text>
                  <Text style={[styles.standingsHeaderText, { width: 40, fontWeight: '700' }]}>Pt</Text>
                </View>
                {standings.map((team, index) => (
                  <View key={team.team_id} style={[styles.standingsRow, index % 2 === 0 && styles.standingsRowAlt]}>
                    <Text style={[styles.standingsCell, { width: 30, fontWeight: '700' }]}>{team.position}</Text>
                    <View style={[styles.teamCell, { flex: 1 }]}>
                      <TeamLogo logo={team.team_logo} name={team.team_name} size="small" />
                      <Text style={styles.teamNameCell} numberOfLines={1}>{team.team_name}</Text>
                    </View>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.played}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.wins}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.draws}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.losses}</Text>
                    <Text style={[styles.standingsCell, { width: 40, fontWeight: '700' }]}>{team.points}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <View style={styles.tabContent}>
            {matches.length === 0 ? <EmptyState icon="football-outline" title="Nessuna partita" /> : (
              Object.entries(matchesByRound).map(([round, roundMatches]) => (
                <View key={round} style={styles.matchesGroup}>
                  <Text style={styles.matchesGroupTitle}>{round}</Text>
                  {roundMatches.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                      <View style={styles.matchTeams}>
                        <TeamLogo logo={teams.find(t => t.id === match.home_team_id)?.logo} name={getTeamName(match.home_team_id)} size="small" />
                        <Text style={styles.matchTeamNameHome} numberOfLines={1}>{getTeamName(match.home_team_id)}</Text>
                        <View style={styles.matchResult}>
                          {match.status === 'completed' ? (
                            <Text style={styles.matchScore}>{match.home_goals} - {match.away_goals}</Text>
                          ) : <Text style={styles.matchVs}>vs</Text>}
                        </View>
                        <Text style={styles.matchTeamNameAway} numberOfLines={1}>{getTeamName(match.away_team_id)}</Text>
                        <TeamLogo logo={teams.find(t => t.id === match.away_team_id)?.logo} name={getTeamName(match.away_team_id)} size="small" />
                      </View>
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
            {scorers.length === 0 ? <EmptyState icon="trophy-outline" title="Nessun marcatore" /> : (
              scorers.slice(0, 20).map((scorer) => (
                <View key={scorer.player_id} style={styles.scorerCard}>
                  <View style={styles.scorerPosition}><Text style={styles.positionText}>{scorer.position}</Text></View>
                  <View style={styles.scorerInfo}>
                    <Text style={styles.scorerName}>{scorer.player_name}</Text>
                    <Text style={styles.scorerTeam}>{scorer.team_name}</Text>
                  </View>
                  <View style={styles.scorerStats}>
                    <View style={styles.statItem}><Ionicons name="football" size={16} color="#000" /><Text style={styles.statValue}>{scorer.goals}</Text></View>
                    <View style={styles.statItem}><Ionicons name="hand-left" size={16} color="#666" /><Text style={styles.statValue}>{scorer.assists}</Text></View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <View style={styles.tabContent}>
            {playerStats.length === 0 ? <EmptyState icon="stats-chart-outline" title="Nessuna statistica" /> : (
              playerStats.slice(0, 30).map((player) => (
                <View key={player.player_id} style={styles.statsCard}>
                  <View style={styles.statsHeader}>
                    <Text style={styles.statsPlayerName}>{player.player_name}</Text>
                    <Text style={styles.statsTeamName}>{player.team_name}</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.goals}</Text><Text style={styles.statBoxLabel}>Gol</Text></View>
                    <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.assists}</Text><Text style={styles.statBoxLabel}>Assist</Text></View>
                    <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#EAB308' }]}>{player.yellow_cards}</Text><Text style={styles.statBoxLabel}>Amm.</Text></View>
                    <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#DC2626' }]}>{player.red_cards}</Text><Text style={styles.statBoxLabel}>Esp.</Text></View>
                    <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.appearances}</Text><Text style={styles.statBoxLabel}>Pres.</Text></View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <View style={styles.tabContent}>
            {news.length === 0 ? <EmptyState icon="newspaper-outline" title="Nessuna news" /> : (
              news.map((item) => (
                <View key={item.id} style={styles.newsCard}>
                  <Text style={styles.newsTitle}>{item.title}</Text>
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
              <View style={styles.infoRow}><Ionicons name="trophy" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Nome</Text><Text style={styles.infoValue}>{tournament.name}</Text></View></View>
              <View style={styles.infoRow}><Ionicons name="people" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Categoria</Text><Text style={styles.infoValue}>{getCategoryLabel(tournament.category)}</Text></View></View>
              <View style={styles.infoRow}><Ionicons name="git-branch" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Formato</Text><Text style={styles.infoValue}>{getFormatLabel(tournament.format)}</Text></View></View>
              {tournament.location && (<View style={styles.infoRow}><Ionicons name="location" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Luogo</Text><Text style={styles.infoValue}>{tournament.location}</Text></View></View>)}
            </View>
            <Text style={styles.teamsTitle}>Squadre ({teams.length})</Text>
            <View style={styles.teamsList}>
              {teams.map((team) => (
                <View key={team.id} style={styles.teamItem}>
                  <TeamLogo logo={team.logo} name={team.name} size="medium" />
                  <Text style={styles.teamItemName}>{team.name}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.shareBar} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#FFF" />
              <Text style={styles.shareBarText}>Condividi</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: '#000' },
  backButton: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  headerMeta: { fontSize: 13, color: '#666' },
  shareButton: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabsContainer: { backgroundColor: '#FFF', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: '#000' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 16, borderWidth: 2, borderColor: '#000' },
  tabActive: { backgroundColor: '#000' },
  tabText: { fontSize: 12, color: '#000', marginLeft: 4, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  standingsTable: { borderWidth: 2, borderColor: '#000', borderRadius: 12, overflow: 'hidden' },
  standingsHeader: { flexDirection: 'row', backgroundColor: '#000', padding: 12 },
  standingsHeaderText: { color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  standingsRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  standingsRowAlt: { backgroundColor: '#F9F9F9' },
  standingsCell: { fontSize: 13, color: '#000', textAlign: 'center' },
  teamCell: { flexDirection: 'row', alignItems: 'center' },
  teamNameCell: { fontSize: 13, fontWeight: '600', color: '#000', marginLeft: 8, flex: 1 },
  matchesGroup: { marginBottom: 24 },
  matchesGroupTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  matchCard: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, marginBottom: 8 },
  matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  matchTeamNameHome: { fontSize: 13, fontWeight: '600', color: '#000', marginLeft: 8, marginRight: 8 },
  matchTeamNameAway: { fontSize: 13, fontWeight: '600', color: '#000', marginLeft: 8, marginRight: 8 },
  matchResult: { paddingHorizontal: 8 },
  matchScore: { fontSize: 18, fontWeight: '700', color: '#000' },
  matchVs: { fontSize: 14, color: '#999' },
  scorerCard: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  scorerPosition: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  positionText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  scorerInfo: { flex: 1 },
  scorerName: { fontSize: 15, fontWeight: '600', color: '#000' },
  scorerTeam: { fontSize: 13, color: '#666' },
  scorerStats: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#000' },
  statsCard: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, marginBottom: 8 },
  statsHeader: { marginBottom: 12 },
  statsPlayerName: { fontSize: 15, fontWeight: '700', color: '#000' },
  statsTeamName: { fontSize: 13, color: '#666' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center' },
  statBoxValue: { fontSize: 18, fontWeight: '700', color: '#000' },
  statBoxLabel: { fontSize: 11, color: '#666' },
  newsCard: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, marginBottom: 12 },
  newsTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 8 },
  newsContent: { fontSize: 14, color: '#666', lineHeight: 20 },
  infoCard: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  infoContent: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#000' },
  teamsTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  teamsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  teamItem: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 12, alignItems: 'center', width: '47%' },
  teamItemName: { fontSize: 13, fontWeight: '600', color: '#000', marginTop: 8, textAlign: 'center' },
  shareBar: { backgroundColor: '#000', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  shareBarText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
