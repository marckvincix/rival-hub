import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Share,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Loading, EmptyState, TeamLogo, MatchStatsModal, FieldView } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament, Team, Match, Standing, Scorer, PlayerStats, News, Formation } from '../../src/types';

type TabId = 'standings' | 'matches' | 'formations' | 'scorers' | 'stats' | 'news' | 'info';

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
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('standings');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<Match | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [publicFormationViewMode, setPublicFormationViewMode] = useState<'list' | 'field'>('field');

  useEffect(() => { if (slug) loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const tournamentRes = await api.get(`/api/tournaments/slug/${slug}`);
      const t = tournamentRes.data;
      setTournament(t);
      const [teamsRes, matchesRes, standingsRes, scorersRes, statsRes, newsRes, formationsRes] = await Promise.all([
        api.get(`/api/tournaments/${t.id}/teams`),
        api.get(`/api/tournaments/${t.id}/matches`),
        api.get(`/api/tournaments/${t.id}/standings`),
        api.get(`/api/tournaments/${t.id}/scorers`),
        api.get(`/api/tournaments/${t.id}/player-stats`),
        api.get(`/api/tournaments/${t.id}/news?published_only=true`),
        api.get(`/api/tournaments/${t.id}/formations`)
      ]);
      setTeams(teamsRes.data); setMatches(matchesRes.data); setStandings(standingsRes.data);
      setScorers(scorersRes.data); setPlayerStats(statsRes.data); setNews(newsRes.data);
      setFormations(formationsRes.data || []);
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

  const handleOpenMatchStats = (match: Match) => {
    setSelectedMatchForStats(match);
    setShowStatsModal(true);
  };

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
    { id: 'formations', label: 'Formazioni', icon: 'grid-outline' },
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

  // Sort rounds in reverse order (most recent first)
  const sortedRounds = Object.entries(matchesByRound).sort((a, b) => {
    // Extract number from round name (e.g., "Giornata 5" -> 5)
    const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
    const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
    return numB - numA; // Descending order
  });

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
              sortedRounds.map(([round, roundMatches]) => (
                <View key={round} style={styles.matchesGroup}>
                  <Text style={styles.matchesGroupTitle}>{round}</Text>
                  {roundMatches.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                      <View style={styles.matchRow}>
                        <TeamLogo logo={teams.find(t => t.id === match.home_team_id)?.logo} name={getTeamName(match.home_team_id)} size="small" />
                        <View style={styles.matchCenterContent}>
                          <Text style={styles.matchTeamName} numberOfLines={1}>{getTeamName(match.home_team_id)}</Text>
                          <Text style={styles.matchScore}>
                            {match.status === 'completed' ? `${match.home_goals} - ${match.away_goals}` : '0 - 0'}
                          </Text>
                          <Text style={styles.matchTeamName} numberOfLines={1}>{getTeamName(match.away_team_id)}</Text>
                        </View>
                        <TeamLogo logo={teams.find(t => t.id === match.away_team_id)?.logo} name={getTeamName(match.away_team_id)} size="small" />
                      </View>
                      {/* Statistiche Button */}
                      <TouchableOpacity 
                        style={styles.statsButton} 
                        onPress={() => handleOpenMatchStats(match)}
                      >
                        <Ionicons name="stats-chart" size={14} color="#666" />
                        <Text style={styles.statsButtonText}>Statistiche</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Formations Tab */}
        {activeTab === 'formations' && (
          <View style={styles.tabContent}>
            {formations.length === 0 ? (
              <EmptyState icon="grid-outline" title="Nessuna formazione" description="Le squadre non hanno ancora impostato le formazioni" />
            ) : (
              formations.map((formation) => {
                const team = teams.find(t => t.id === formation.team_id);
                return (
                  <View key={formation.id} style={styles.formationCard}>
                    <TouchableOpacity 
                      style={styles.formationCardHeader}
                      onPress={() => {
                        setSelectedFormation(formation);
                        setShowFormationModal(true);
                      }}
                    >
                      <View style={styles.formationTeamInfo}>
                        <TeamLogo logo={team?.logo} name={team?.name || 'Squadra'} size="small" />
                        <View style={styles.formationTeamDetails}>
                          <Text style={styles.formationTeamName}>{team?.name || 'Squadra'}</Text>
                          <Text style={styles.formationModuleBadge}>Modulo: {formation.module}</Text>
                        </View>
                      </View>
                      <View style={styles.viewFormationBtn}>
                        <Text style={styles.viewFormationBtnText}>Vedi Campo</Text>
                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                    {/* Mini formation preview */}
                    <View style={styles.formationPreview}>
                      <Text style={styles.formationPreviewLabel}>Titolari ({formation.starters.length}):</Text>
                      <View style={styles.formationPlayersList}>
                        {formation.starters.slice(0, 6).map((s, idx) => (
                          <View key={idx} style={styles.formationPlayerChip}>
                            <Text style={styles.formationPlayerNumber}>{s.player_number || '-'}</Text>
                            <Text style={styles.formationPlayerName}>{s.player_name?.split(' ')[0] || '?'}</Text>
                          </View>
                        ))}
                        {formation.starters.length > 6 && (
                          <Text style={styles.formationMorePlayers}>+{formation.starters.length - 6}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
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

      {/* Match Stats Modal */}
      <MatchStatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        match={selectedMatchForStats}
        getTeamName={getTeamName}
      />

      {/* Formation Field Modal */}
      <Modal
        visible={showFormationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFormationModal(false)}
      >
        <SafeAreaView style={styles.formationModalContainer}>
          <View style={styles.formationModalHeader}>
            <TouchableOpacity onPress={() => setShowFormationModal(false)}>
              <Text style={styles.formationModalClose}>Chiudi</Text>
            </TouchableOpacity>
            <Text style={styles.formationModalTitle}>
              {teams.find(t => t.id === selectedFormation?.team_id)?.name || 'Formazione'}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          {selectedFormation && (
            <ScrollView style={{ flex: 1 }}>
              {/* View Toggle */}
              <View style={styles.publicViewToggle}>
                <TouchableOpacity
                  style={[styles.publicToggleButton, publicFormationViewMode === 'list' && styles.publicToggleButtonActive]}
                  onPress={() => setPublicFormationViewMode('list')}
                >
                  <Ionicons name="list" size={18} color={publicFormationViewMode === 'list' ? '#FFF' : '#000'} />
                  <Text style={[styles.publicToggleText, publicFormationViewMode === 'list' && styles.publicToggleTextActive]}>Lista</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.publicToggleButton, publicFormationViewMode === 'field' && styles.publicToggleButtonActive]}
                  onPress={() => setPublicFormationViewMode('field')}
                >
                  <Ionicons name="football" size={18} color={publicFormationViewMode === 'field' ? '#FFF' : '#000'} />
                  <Text style={[styles.publicToggleText, publicFormationViewMode === 'field' && styles.publicToggleTextActive]}>Campo</Text>
                </TouchableOpacity>
              </View>

              {publicFormationViewMode === 'field' ? (
                <>
                  <Text style={styles.formationModalModule}>Modulo: {selectedFormation.module}</Text>
                  <FieldView
                    module={selectedFormation.module}
                    starters={selectedFormation.starters}
                    gameFormat={tournament?.game_format || '11v11'}
                  />
                </>
              ) : (
                <View style={styles.publicListView}>
                  {/* Portiere */}
                  {selectedFormation.starters.filter(s => s.position === 'goalkeeper').length > 0 && (
                    <View style={styles.publicPositionSection}>
                      <Text style={styles.publicPositionTitle}>🧤 Portiere</Text>
                      {selectedFormation.starters.filter(s => s.position === 'goalkeeper').map((player, idx) => (
                        <View key={idx} style={styles.publicPlayerRow}>
                          <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                          <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Difensori */}
                  {selectedFormation.starters.filter(s => s.position === 'defender').length > 0 && (
                    <View style={styles.publicPositionSection}>
                      <Text style={styles.publicPositionTitle}>🛡️ Difensori</Text>
                      {selectedFormation.starters.filter(s => s.position === 'defender').map((player, idx) => (
                        <View key={idx} style={styles.publicPlayerRow}>
                          <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                          <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Centrocampisti */}
                  {selectedFormation.starters.filter(s => s.position === 'midfielder').length > 0 && (
                    <View style={styles.publicPositionSection}>
                      <Text style={styles.publicPositionTitle}>⚙️ Centrocampisti</Text>
                      {selectedFormation.starters.filter(s => s.position === 'midfielder').map((player, idx) => (
                        <View key={idx} style={styles.publicPlayerRow}>
                          <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                          <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Attaccanti */}
                  {selectedFormation.starters.filter(s => s.position === 'forward').length > 0 && (
                    <View style={styles.publicPositionSection}>
                      <Text style={styles.publicPositionTitle}>⚡ Attaccanti</Text>
                      {selectedFormation.starters.filter(s => s.position === 'forward').map((player, idx) => (
                        <View key={idx} style={styles.publicPlayerRow}>
                          <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                          <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Bench Section */}
              <View style={styles.benchSection}>
                <Text style={styles.benchSectionTitle}>🔁 Panchina ({selectedFormation.bench?.length || 0})</Text>
                {selectedFormation.bench && selectedFormation.bench.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.benchScroll}>
                    {selectedFormation.bench.map((player: any, idx: number) => (
                      <View key={idx} style={styles.benchPlayerChip}>
                        <Text style={styles.benchPlayerNumber}>{player.player_number || '-'}</Text>
                        <Text style={styles.benchPlayerName}>{player.player_name || '?'}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noBenchText}>Nessun giocatore in panchina</Text>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  tabsContainer: { backgroundColor: '#FFF', paddingVertical: 12 },
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
  matchCard: { borderWidth: 2, borderColor: '#000', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 8, marginBottom: 8 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchCenterContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  matchTeamName: { fontSize: 14, fontWeight: '500', color: '#000' },
  matchScore: { fontSize: 14, fontWeight: '500', color: '#000', marginHorizontal: 6 },
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
  statsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0F0F0', borderRadius: 8, marginTop: 10 },
  statsButtonText: { fontSize: 13, color: '#666', fontWeight: '500' },
  // Formation styles
  formationCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  formationCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  formationTeamInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  formationTeamDetails: { marginLeft: 12 },
  formationTeamName: { fontSize: 16, fontWeight: '700', color: '#000' },
  formationModuleBadge: { fontSize: 13, color: '#2D8A2E', fontWeight: '600' },
  viewFormationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2D8A2E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  viewFormationBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  formationPreview: { padding: 12, backgroundColor: '#F9F9F9', borderTopWidth: 1, borderTopColor: '#EEE' },
  formationPreviewLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 },
  formationPlayersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  formationPlayerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  formationPlayerNumber: { fontSize: 11, fontWeight: '700', color: '#000', marginRight: 4 },
  formationPlayerName: { fontSize: 11, color: '#333' },
  formationMorePlayers: { fontSize: 12, color: '#666', fontStyle: 'italic', alignSelf: 'center' },
  // Formation Modal
  formationModalContainer: { flex: 1, backgroundColor: '#FFF' },
  formationModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  formationModalClose: { fontSize: 16, color: '#666' },
  formationModalTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  formationModalModule: { fontSize: 14, fontWeight: '600', color: '#2D8A2E', textAlign: 'center', paddingVertical: 12 },
  benchSection: { padding: 16, backgroundColor: '#F9F9F9', marginTop: 16 },
  benchSectionTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 12 },
  benchScroll: { flexDirection: 'row' },
  benchPlayerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  benchPlayerNumber: { fontSize: 13, fontWeight: '700', color: '#000', marginRight: 6 },
  benchPlayerName: { fontSize: 13, color: '#333' },
  noBenchText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  // Public view toggle
  publicViewToggle: { flexDirection: 'row', margin: 16, backgroundColor: '#F0F0F0', borderRadius: 8, padding: 4 },
  publicToggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6, gap: 6 },
  publicToggleButtonActive: { backgroundColor: '#000' },
  publicToggleText: { fontSize: 14, fontWeight: '500', color: '#000' },
  publicToggleTextActive: { color: '#FFF' },
  // Public list view
  publicListView: { padding: 16 },
  publicPositionSection: { marginBottom: 20 },
  publicPositionTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 10 },
  publicPlayerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 8 },
  publicPlayerNumber: { fontSize: 14, fontWeight: '700', color: '#000', width: 30 },
  publicPlayerName: { fontSize: 14, color: '#000', flex: 1 },
});
