import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Share,
  RefreshControl,
  Modal,
  Linking,
  Platform,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Loading, EmptyState, TeamLogo, MatchStatsModal, FieldView, BasketballCourtView, TennisCourtView, PadelCourtView, VolleyballCourtView, RugbyCourtView, HighlightsTab } from '../../src/components';
import { FavoriteButton } from '../../src/components/FavoriteButton';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';
import { Tournament, Team, Match, Standing, Scorer, PlayerStats, News, Formation, Player, Sport, getSportEmoji } from '../../src/types';

type TabId = 'standings' | 'teams' | 'matches' | 'scorers' | 'stats' | 'news' | 'info' | 'highlights';

export default function TournamentPublicPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();
  
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
  const [selectedAwayFormation, setSelectedAwayFormation] = useState<Formation | null>(null);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [publicFormationViewMode, setPublicFormationViewMode] = useState<'list' | 'field'>('field');
  // Teams tab state
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, any[]>>({});
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<any>(null);
  const [playerStatsData, setPlayerStatsData] = useState<any>(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);

  useEffect(() => { if (slug) loadData(); }, [slug]);

  // Polling for real-time updates (every 5 seconds)
  useEffect(() => {
    if (!tournament) return;
    
    const pollInterval = setInterval(async () => {
      try {
        // Only poll matches for real-time updates
        const matchesRes = await api.get(`/api/tournaments/${tournament.id}/matches-live`);
        setMatches(matchesRes.data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [tournament?.id]);

  const loadData = async () => {
    try {
      const tournamentRes = await api.get(`/api/tournaments/slug/${slug}`);
      const t = tournamentRes.data;
      setTournament(t);
      
      // Determine tournament sport type
      const isBasketball = t.sport === 'basket';
      const isTennis = t.sport === 'tennis';
      
      const [teamsRes, matchesRes, standingsRes, scorersRes, statsRes, newsRes, formationsRes] = await Promise.all([
        api.get(`/api/tournaments/${t.id}/teams`),
        api.get(`/api/tournaments/${t.id}/matches-live`), // Use live matches endpoint for real-time scores
        // Use sport-specific endpoints
        isBasketball 
          ? api.get(`/api/tournaments/${t.id}/basketball-standings`)
          : isTennis
            ? api.get(`/api/tournaments/${t.id}/tennis-standings`)
            : api.get(`/api/tournaments/${t.id}/standings`),
        isBasketball
          ? api.get(`/api/tournaments/${t.id}/basketball-scorers`)
          : api.get(`/api/tournaments/${t.id}/scorers`),
        isBasketball
          ? api.get(`/api/tournaments/${t.id}/basketball-stats`)
          : isTennis
            ? api.get(`/api/tournaments/${t.id}/tennis-stats`)
            : api.get(`/api/tournaments/${t.id}/player-stats`),
        api.get(`/api/tournaments/${t.id}/news?published_only=true`),
        api.get(`/api/tournaments/${t.id}/formations`)
      ]);
      setTeams(teamsRes.data); setMatches(matchesRes.data); setStandings(standingsRes.data);
      setScorers(scorersRes.data); setPlayerStats(statsRes.data); setNews(newsRes.data);
      setFormations(formationsRes.data || []);
      
      // For Tennis/Padel: Load players for all teams automatically
      const isPadel = t.sport === 'padel';
      if (isTennis || isPadel) {
        const playersData: Record<string, any[]> = {};
        await Promise.all(teamsRes.data.map(async (team: any) => {
          try {
            const playersRes = await api.get(`/api/teams/${team.id}/players`);
            playersData[team.id] = playersRes.data || [];
          } catch (e) {
            playersData[team.id] = [];
          }
        }));
        setTeamPlayers(playersData);
      }
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleShare = async () => {
    if (!tournament) return;
    try { await Share.share({ message: `Segui "${tournament.name}" su Rival Hub!` }); } catch (e) {}
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Squadra';
  const getStatusLabel = (status: string) => status === 'active' ? 'In corso' : status === 'completed' ? 'Terminato' : 'Bozza';
  const getCategoryLabel = (cat: string) => cat;
  const getFormatLabel = (f: string) => f === 'league' ? 'Campionato' : f === 'knockout' ? 'Eliminazione' : 'Gironi';
  
  // Check if tournament is basketball
  const isBasketball = tournament?.sport === 'basket';
  const isTennis = tournament?.sport === 'tennis';
  const isPadel = tournament?.sport === 'padel';
  const isVolleyball = tournament?.sport === 'pallavolo';
  const isRugby = tournament?.sport === 'rugby';
  const isRacketSport = isTennis || isPadel;
  const isDoubles = tournament?.game_format === 'doppio' || tournament?.game_format === 'doubles';
  
  // Get sport-specific icon
  const getSportIcon = (): string => {
    const sport = tournament?.sport || 'calcio';
    switch (sport) {
      case 'basket': return 'basketball';
      case 'tennis':
      case 'padel': return 'tennisball';
      case 'pallavolo': return 'tennisball-outline';
      case 'rugby': return 'american-football';
      case 'baseball': return 'baseball';
      default: return 'football';
    }
  };

  // Tennis point display helper
  const TENNIS_POINTS = ['0', '15', '30', '40'];
  const getTennisPointDisplay = (points: number, isDeuce: boolean, advantage: string | null, team: 'home' | 'away') => {
    if (isDeuce) {
      if (advantage === team) return 'AD';
      return '40';
    }
    return TENNIS_POINTS[points] || '0';
  };

  const handleOpenMatchStats = (match: Match) => {
    // Find the latest match data from the matches state (updated by polling)
    const latestMatch = matches.find(m => m.id === match.id) || match;
    setSelectedMatchForStats(latestMatch);
    setShowStatsModal(true);
  };

  // Format date for display
  const formatMatchDateTime = (match: Match) => {
    let result = '';
    if (match.match_date) {
      const date = new Date(match.match_date);
      result = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    if (match.match_time) {
      result += result ? ` • ${match.match_time}` : match.match_time;
    }
    return result || 'Data da definire';
  };

  // Add to calendar function
  const handleAddToCalendar = async (match: Match) => {
    const homeTeam = getTeamName(match.home_team_id);
    const awayTeam = getTeamName(match.away_team_id);
    const title = `${homeTeam} vs ${awayTeam}`;
    const location = tournament?.location || '';
    
    // Parse date and time
    let startDate = new Date();
    if (match.match_date) {
      startDate = new Date(match.match_date);
    }
    if (match.match_time) {
      const [hours, minutes] = match.match_time.split(':');
      startDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    }
    
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    
    // Format for calendar URLs
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    
    // Create Google Calendar URL
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(`Partita del torneo ${tournament?.name || ''}`)}`;
    
    // For iOS, we can try to open the calendar app
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Aggiungi al Calendario',
        'Scegli il calendario',
        [
          { text: 'Google Calendar', onPress: () => Linking.openURL(googleUrl) },
          { text: 'Annulla', style: 'cancel' }
        ]
      );
    } else {
      // For Android and web, open Google Calendar
      Linking.openURL(googleUrl);
    }
  };

  // Load players for a team
  const loadTeamPlayers = async (teamId: string) => {
    if (teamPlayers[teamId]) return; // Already loaded
    try {
      const response = await api.get(`/api/teams/${teamId}/players`);
      setTeamPlayers(prev => ({ ...prev, [teamId]: response.data || [] }));
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  // Toggle team expansion
  const handleTeamExpand = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      await loadTeamPlayers(teamId);
    }
  };

  // Load player stats
  const handleOpenPlayerStats = async (player: any) => {
    setSelectedPlayerForStats(player);
    setShowPlayerStatsModal(true);
    setLoadingPlayerStats(true);
    try {
      const response = await api.get(`/api/players/${player.id}/stats`);
      setPlayerStatsData(response.data);
    } catch (error) {
      console.error('Error loading player stats:', error);
      setPlayerStatsData(null);
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  if (loading) return <Loading message="Caricamento..." />;

  if (!tournament) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Torneo non trovato" description="Il torneo richiesto non esiste" actionLabel="Torna alla Home" onAction={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  // Dynamic tabs based on sport
  const getTeamTabLabel = () => {
    if (isRacketSport) {
      return isDoubles ? 'Coppie' : 'Giocatori';
    }
    return 'Squadre';
  };

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'standings', label: 'Classifica', icon: 'podium-outline' },
    { id: 'teams', label: getTeamTabLabel(), icon: isRacketSport ? 'person-outline' : 'people-outline' },
    { id: 'matches', label: 'Partite', icon: isRacketSport ? 'tennisball-outline' : 'football-outline' },
    { id: 'highlights', label: 'Highlights', icon: 'film-outline' },
    // Hide "Marcatori" for Tennis/Padel
    ...(isRacketSport ? [] : [{ id: 'scorers' as TabId, label: 'Marcatori', icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap }]),
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tournament.name}</Text>
          <Text style={styles.headerMeta}>{getCategoryLabel(tournament.category)} • {getStatusLabel(tournament.status)}</Text>
        </View>
        <FavoriteButton
          type="tournament"
          referenceId={tournament.id}
          isAuthenticated={!!user}
          size={22}
        />
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
                  <Text style={[styles.standingsHeaderText, { flex: 1 }]}>{isRacketSport ? (isDoubles ? 'Coppia' : 'Giocatore') : 'Squadra'}</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>G</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>V</Text>
                  {!isBasketball && !isRacketSport && <Text style={[styles.standingsHeaderText, { width: 30 }]}>P</Text>}
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>{isBasketball ? 'P' : 'S'}</Text>
                  {isBasketball && <Text style={[styles.standingsHeaderText, { width: 40 }]}>+/-</Text>}
                  <Text style={[styles.standingsHeaderText, { width: 40, fontWeight: '700' }]}>Pt</Text>
                </View>
                {standings.map((team: any, index) => (
                  <View key={team.team_id} style={[styles.standingsRow, index % 2 === 0 && styles.standingsRowAlt]}>
                    <Text style={[styles.standingsCell, { width: 30, fontWeight: '700' }]}>{team.position}</Text>
                    <View style={[styles.teamCell, { flex: 1 }]}>
                      <TeamLogo logo={team.team_logo} name={team.team_name} size="small" />
                      <Text style={styles.teamNameCell} numberOfLines={1}>{team.team_name}</Text>
                    </View>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.played}</Text>
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.wins}</Text>
                    {!isBasketball && <Text style={[styles.standingsCell, { width: 30 }]}>{team.draws}</Text>}
                    <Text style={[styles.standingsCell, { width: 30 }]}>{team.losses}</Text>
                    {isBasketball && <Text style={[styles.standingsCell, { width: 40, color: (team.point_difference || 0) >= 0 ? '#10B981' : '#EF4444' }]}>{(team.point_difference || 0) >= 0 ? '+' : ''}{team.point_difference || 0}</Text>}
                    <Text style={[styles.standingsCell, { width: 40, fontWeight: '700' }]}>{team.points}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <View style={styles.tabContent}>
            {teams.length === 0 ? <EmptyState icon="people-outline" title="Nessuna squadra" /> : (
              teams.map((team) => (
                <View key={team.id} style={styles.publicTeamCard}>
                  <TouchableOpacity 
                    style={styles.publicTeamHeader}
                    onPress={() => handleTeamExpand(team.id)}
                  >
                    <TeamLogo logo={team.logo} name={team.name} size="medium" />
                    <Text style={styles.publicTeamName}>{team.name}</Text>
                    <FavoriteButton
                      type="team"
                      referenceId={team.id}
                      isAuthenticated={!!user}
                      size={20}
                      style={{ marginRight: 4 }}
                    />
                    <Ionicons 
                      name={expandedTeamId === team.id ? 'chevron-up' : 'chevron-down'} 
                      size={24} 
                      color="#000" 
                    />
                  </TouchableOpacity>
                  {expandedTeamId === team.id && (
                    <View style={styles.publicPlayersAccordion}>
                      {!teamPlayers[team.id] || teamPlayers[team.id].length === 0 ? (
                        <Text style={styles.noPlayersText}>Nessun giocatore</Text>
                      ) : (
                        teamPlayers[team.id].map((player: any) => (
                          <TouchableOpacity 
                            key={player.id} 
                            style={styles.publicPlayerCard}
                            onPress={() => handleOpenPlayerStats(player)}
                          >
                            <View style={styles.publicPlayerAvatar}>
                              <Text style={styles.publicPlayerAvatarText}>
                                {player.number || player.full_name?.charAt(0) || '?'}
                              </Text>
                            </View>
                            <View style={styles.publicPlayerInfo}>
                              <Text style={styles.publicPlayerName}>{player.full_name}</Text>
                              <Text style={styles.publicPlayerRole}>{player.role}</Text>
                            </View>
                            <Ionicons name="stats-chart" size={18} color="#666" />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              ))
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
                  {roundMatches.map((match) => {
                    let homeFormation = formations.find(f => f.team_id === match.home_team_id);
                    let awayFormation = formations.find(f => f.team_id === match.away_team_id);
                    
                    // For Tennis/Padel: Create virtual formations from team players if no formation exists
                    if (isRacketSport) {
                      const homePlayers = teamPlayers[match.home_team_id] || [];
                      const awayPlayers = teamPlayers[match.away_team_id] || [];
                      
                      if (!homeFormation && homePlayers.length > 0) {
                        homeFormation = {
                          team_id: match.home_team_id,
                          module: isDoubles ? 'Doppio' : 'Singolo',
                          starters: homePlayers.map((p: any) => ({
                            player_id: p.id,
                            player_name: p.full_name,
                            player_number: p.number,
                          }))
                        };
                      }
                      
                      if (!awayFormation && awayPlayers.length > 0) {
                        awayFormation = {
                          team_id: match.away_team_id,
                          module: isDoubles ? 'Doppio' : 'Singolo',
                          starters: awayPlayers.map((p: any) => ({
                            player_id: p.id,
                            player_name: p.full_name,
                            player_number: p.number,
                          }))
                        };
                      }
                    }
                    
                    return (
                      <View key={match.id} style={styles.matchCard}>
                        <View style={styles.matchRow}>
                          <View style={styles.matchTeamColumn}>
                            <TeamLogo logo={teams.find(t => t.id === match.home_team_id)?.logo} name={getTeamName(match.home_team_id)} size="small" />
                            <Text style={styles.matchTeamName} numberOfLines={1}>{getTeamName(match.home_team_id)}</Text>
                          </View>
                          <View style={styles.matchCenterContent}>
                            {/* Tennis/Padel: Show detailed score (Sets, Games, Points) */}
                            {isRacketSport ? (
                              <View style={styles.tennisLiveScore}>
                                {/* Sets score */}
                                <Text style={styles.matchScore}>
                                  {(match as any).has_events || match.status === 'in_progress'
                                    ? `${(match as any).live_home_score || 0} - ${(match as any).live_away_score || 0}`
                                    : match.status === 'completed' 
                                      ? `${match.home_goals || 0} - ${match.away_goals || 0}` 
                                      : `0 - 0`}
                                </Text>
                                {/* Show current game details if match has currentGame data */}
                                {(match as any).currentGame && (
                                  <View style={styles.tennisCurrentGame}>
                                    <Text style={styles.tennisGameScore}>
                                      Game: {(match as any).currentGame?.homeGamesInSet ?? 0} - {(match as any).currentGame?.awayGamesInSet ?? 0}
                                    </Text>
                                    <Text style={styles.tennisPointScore}>
                                      {getTennisPointDisplay((match as any).currentGame?.homePoints || 0, (match as any).currentGame?.isDeuce, (match as any).currentGame?.advantage, 'home')} - {getTennisPointDisplay((match as any).currentGame?.awayPoints || 0, (match as any).currentGame?.isDeuce, (match as any).currentGame?.advantage, 'away')}
                                    </Text>
                                  </View>
                                )}
                                {/* LIVE badge - Show when match has currentGame data AND is not completed */}
                                {(match as any).currentGame && match.status !== 'completed' && (
                                  <Text style={styles.liveIndicator}>LIVE</Text>
                                )}
                              </View>
                            ) : (
                              <>
                                <Text style={styles.matchScore}>
                                  {/* Show live score from events, or static score if no events */}
                                  {((match as any).has_events || match.status === 'in_progress')
                                    ? `${(match as any).live_home_score} - ${(match as any).live_away_score}`
                                    : match.status === 'completed' 
                                      ? `${match.home_goals} - ${match.away_goals}` 
                                      : `0 - 0`}
                                </Text>
                                {/* Show LIVE badge when match is in_progress OR has events */}
                                {((match as any).has_events || match.status === 'in_progress') && match.status !== 'completed' && (
                                  <Text style={styles.liveIndicator}>LIVE</Text>
                                )}
                              </>
                            )}
                          </View>
                          <View style={styles.matchTeamColumn}>
                            <TeamLogo logo={teams.find(t => t.id === match.away_team_id)?.logo} name={getTeamName(match.away_team_id)} size="small" />
                            <Text style={styles.matchTeamName} numberOfLines={1}>{getTeamName(match.away_team_id)}</Text>
                          </View>
                        </View>
                        {/* Date and Time */}
                        <Text style={styles.matchDateTime}>{formatMatchDateTime(match)}</Text>
                        {/* Action Buttons Row */}
                        <View style={styles.matchActionsRow}>
                          <TouchableOpacity 
                            style={styles.statsButton} 
                            onPress={() => handleOpenMatchStats(match)}
                          >
                            <Ionicons name="stats-chart" size={14} color="#666" />
                            <Text style={styles.statsButtonText}>Statistiche</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.calendarButton} 
                            onPress={() => handleAddToCalendar(match)}
                          >
                            <Ionicons name="calendar-outline" size={18} color="#000" />
                          </TouchableOpacity>
                        </View>
                        
                        {/* Formations for this match */}
                        {(homeFormation || awayFormation) && (
                          <View style={styles.matchFormationsSection}>
                            <Text style={styles.matchFormationsTitle}>{isRacketSport ? 'Giocatori' : 'Formazioni'}</Text>
                            
                            {isRacketSport ? (
                              /* Tennis/Padel: Single "Vedi Campo" button showing both players */
                              <View style={styles.matchFormationCard}>
                                <TouchableOpacity 
                                  style={styles.matchFormationHeader}
                                  onPress={() => {
                                    setSelectedFormation(homeFormation || null);
                                    setSelectedAwayFormation(awayFormation || null);
                                    setShowFormationModal(true);
                                  }}
                                >
                                  <View style={styles.formationTeamInfo}>
                                    <View style={styles.tennisMatchPlayersRow}>
                                      {/* Home Player */}
                                      <View style={styles.tennisPlayerBadge}>
                                        <Text style={styles.tennisPlayerBadgeText}>
                                          {getTeamName(match.home_team_id).charAt(0)}
                                        </Text>
                                      </View>
                                      <Text style={styles.tennisVsText}>vs</Text>
                                      {/* Away Player */}
                                      <View style={[styles.tennisPlayerBadge, styles.tennisPlayerBadgeAway]}>
                                        <Text style={styles.tennisPlayerBadgeText}>
                                          {getTeamName(match.away_team_id).charAt(0)}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={styles.formationTeamDetails}>
                                      <Text style={styles.formationTeamName}>
                                        {getTeamName(match.home_team_id)} vs {getTeamName(match.away_team_id)}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.viewFormationBtn}>
                                    <Text style={styles.viewFormationBtnText}>Vedi Campo</Text>
                                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                  </View>
                                </TouchableOpacity>
                                {/* Show players preview */}
                                <View style={styles.formationPreview}>
                                  <View style={styles.tennisPlayersPreview}>
                                    <View style={styles.tennisPlayerPreviewSide}>
                                      <Text style={styles.tennisPlayerPreviewLabel}>🎾 {getTeamName(match.home_team_id)}</Text>
                                      {homeFormation?.starters.map((s: any, idx: number) => (
                                        <Text key={idx} style={styles.tennisPlayerPreviewName}>{s.player_name || '?'}</Text>
                                      ))}
                                    </View>
                                    <View style={styles.tennisPlayerPreviewSide}>
                                      <Text style={styles.tennisPlayerPreviewLabel}>🎾 {getTeamName(match.away_team_id)}</Text>
                                      {awayFormation?.starters.map((s: any, idx: number) => (
                                        <Text key={idx} style={styles.tennisPlayerPreviewName}>{s.player_name || '?'}</Text>
                                      ))}
                                    </View>
                                  </View>
                                </View>
                              </View>
                            ) : (
                              /* Soccer/Basketball: Separate cards for each team */
                              <>
                                {/* Home Team Formation */}
                                {homeFormation && (
                                  <View style={styles.matchFormationCard}>
                                    <TouchableOpacity 
                                      style={styles.matchFormationHeader}
                                      onPress={() => {
                                        setSelectedFormation(homeFormation);
                                        setSelectedAwayFormation(null);
                                        setShowFormationModal(true);
                                      }}
                                    >
                                      <View style={styles.formationTeamInfo}>
                                        <TeamLogo logo={teams.find(t => t.id === match.home_team_id)?.logo} name={getTeamName(match.home_team_id)} size="small" />
                                        <View style={styles.formationTeamDetails}>
                                          <Text style={styles.formationTeamName}>{getTeamName(match.home_team_id)}</Text>
                                          <Text style={styles.formationModuleBadge}>Modulo: {homeFormation.module}</Text>
                                        </View>
                                      </View>
                                      <View style={styles.viewFormationBtn}>
                                        <Text style={styles.viewFormationBtnText}>Vedi Campo</Text>
                                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                      </View>
                                    </TouchableOpacity>
                                    <View style={styles.formationPreview}>
                                      <Text style={styles.formationPreviewLabel}>Titolari ({homeFormation.starters.length}):</Text>
                                      <View style={styles.formationPlayersList}>
                                        {homeFormation.starters.slice(0, 6).map((s: any, idx: number) => (
                                          <View key={idx} style={styles.formationPlayerChip}>
                                            <Text style={styles.formationPlayerNumber}>{s.player_number || '-'}</Text>
                                            <Text style={styles.formationPlayerName}>{s.player_name?.split(' ')[0] || '?'}</Text>
                                          </View>
                                        ))}
                                        {homeFormation.starters.length > 6 && (
                                          <Text style={styles.formationMorePlayers}>+{homeFormation.starters.length - 6}</Text>
                                        )}
                                      </View>
                                    </View>
                                  </View>
                                )}
                                {/* Away Team Formation */}
                                {awayFormation && (
                                  <View style={styles.matchFormationCard}>
                                    <TouchableOpacity 
                                      style={styles.matchFormationHeader}
                                      onPress={() => {
                                        setSelectedFormation(awayFormation);
                                        setSelectedAwayFormation(null);
                                        setShowFormationModal(true);
                                      }}
                                    >
                                      <View style={styles.formationTeamInfo}>
                                        <TeamLogo logo={teams.find(t => t.id === match.away_team_id)?.logo} name={getTeamName(match.away_team_id)} size="small" />
                                        <View style={styles.formationTeamDetails}>
                                          <Text style={styles.formationTeamName}>{getTeamName(match.away_team_id)}</Text>
                                          <Text style={styles.formationModuleBadge}>Modulo: {awayFormation.module}</Text>
                                        </View>
                                      </View>
                                      <View style={styles.viewFormationBtn}>
                                        <Text style={styles.viewFormationBtnText}>Vedi Campo</Text>
                                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                      </View>
                                    </TouchableOpacity>
                                    <View style={styles.formationPreview}>
                                      <Text style={styles.formationPreviewLabel}>Titolari ({awayFormation.starters.length}):</Text>
                                      <View style={styles.formationPlayersList}>
                                        {awayFormation.starters.slice(0, 6).map((s: any, idx: number) => (
                                          <View key={idx} style={styles.formationPlayerChip}>
                                            <Text style={styles.formationPlayerNumber}>{s.player_number || '-'}</Text>
                                            <Text style={styles.formationPlayerName}>{s.player_name?.split(' ')[0] || '?'}</Text>
                                          </View>
                                        ))}
                                        {awayFormation.starters.length > 6 && (
                                          <Text style={styles.formationMorePlayers}>+{awayFormation.starters.length - 6}</Text>
                                        )}
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}

        {/* Scorers Tab */}
        {activeTab === 'scorers' && (
          <View style={styles.tabContent}>
            {scorers.length === 0 ? <EmptyState icon="trophy-outline" title={isBasketball ? "Nessun marcatore punti" : "Nessun marcatore"} /> : (
              scorers.slice(0, 20).map((scorer: any) => (
                <View key={scorer.player_id} style={styles.scorerCard}>
                  <View style={styles.scorerPosition}><Text style={styles.positionText}>{scorer.position}</Text></View>
                  <View style={styles.scorerInfo}>
                    <Text style={styles.scorerName}>{scorer.player_name}</Text>
                    <Text style={styles.scorerTeam}>{scorer.team_name}</Text>
                  </View>
                  <View style={styles.scorerStats}>
                    {isBasketball ? (
                      <>
                        <View style={styles.statItem}><Ionicons name="basketball" size={16} color="#000" /><Text style={styles.statValue}>{scorer.total_points || 0}</Text></View>
                        <View style={styles.statItem}><Text style={styles.statLabel}>PPG</Text><Text style={styles.statValue}>{scorer.ppg || 0}</Text></View>
                      </>
                    ) : (
                      <>
                        <View style={styles.statItem}><Ionicons name="football" size={16} color="#000" /><Text style={styles.statValue}>{scorer.goals}</Text></View>
                        <View style={styles.statItem}><Ionicons name="hand-left" size={16} color="#666" /><Text style={styles.statValue}>{scorer.assists}</Text></View>
                      </>
                    )}
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
              playerStats.slice(0, 30).map((player: any) => (
                <View key={player.player_id} style={styles.statsCard}>
                  <View style={styles.statsHeader}>
                    <Text style={styles.statsPlayerName}>{player.player_name}</Text>
                    <Text style={styles.statsTeamName}>{player.team_name}</Text>
                  </View>
                  <View style={styles.statsGrid}>
                    {isRacketSport ? (
                      /* Tennis/Padel Stats */
                      <>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.aces || 0}</Text><Text style={styles.statBoxLabel}>Ace</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#EF4444' }]}>{player.double_faults || 0}</Text><Text style={styles.statBoxLabel}>Doppi F.</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#10B981' }]}>{player.winners || 0}</Text><Text style={styles.statBoxLabel}>Winners</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#F59E0B' }]}>{player.unforced_errors || 0}</Text><Text style={styles.statBoxLabel}>Errori NF</Text></View>
                        {isPadel && <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#8B5CF6' }]}>{player.smash_winners || 0}</Text><Text style={styles.statBoxLabel}>Smash</Text></View>}
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.matches_played || 0}</Text><Text style={styles.statBoxLabel}>Partite</Text></View>
                      </>
                    ) : isBasketball ? (
                      <>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.total_points || 0}</Text><Text style={styles.statBoxLabel}>Punti</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.rebounds || 0}</Text><Text style={styles.statBoxLabel}>Rimb.</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.assists || 0}</Text><Text style={styles.statBoxLabel}>Assist</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.steals || 0}</Text><Text style={styles.statBoxLabel}>Rubate</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.blocks || 0}</Text><Text style={styles.statBoxLabel}>Stopp.</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#EF4444' }]}>{player.fouls || 0}</Text><Text style={styles.statBoxLabel}>Falli</Text></View>
                      </>
                    ) : (
                      <>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.goals}</Text><Text style={styles.statBoxLabel}>Gol</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.assists}</Text><Text style={styles.statBoxLabel}>Assist</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#EAB308' }]}>{player.yellow_cards}</Text><Text style={styles.statBoxLabel}>Amm.</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#DC2626' }]}>{player.red_cards}</Text><Text style={styles.statBoxLabel}>Esp.</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.appearances}</Text><Text style={styles.statBoxLabel}>Pres.</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#2563EB' }]}>{player.average_rating ? player.average_rating.toFixed(1) : '-'}</Text><Text style={styles.statBoxLabel}>Media</Text></View>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <View style={styles.tabContent}>
            {news.length === 0 ? <EmptyState icon="newspaper-outline" title="Nessuna news disponibile" /> : (
              news.map((item) => (
                <View key={item.id} style={styles.publicNewsCard}>
                  {item.photo && (
                    <Image source={{ uri: item.photo }} style={styles.publicNewsImage} />
                  )}
                  <View style={styles.publicNewsContent}>
                    <Text style={styles.publicNewsTitle}>{item.title}</Text>
                    {item.content && (
                      <Text style={styles.publicNewsDescription}>{item.content}</Text>
                    )}
                    <Text style={styles.publicNewsDate}>
                      📅 {item.published_at ? new Date(item.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data non disponibile'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Highlights Tab */}
        {activeTab === 'highlights' && tournament && (
          <HighlightsTab 
            tournamentId={tournament.id}
            isOrganizer={user?.user_id === tournament.organizer_id}
          />
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}><Ionicons name="trophy" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Nome</Text><Text style={styles.infoValue}>{tournament.name}</Text></View></View>
              <View style={styles.infoRow}><Ionicons name="people" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Categoria</Text><Text style={styles.infoValue}>{getCategoryLabel(tournament.category)}</Text></View></View>
              <View style={styles.infoRow}><Ionicons name="git-branch" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Formato</Text><Text style={styles.infoValue}>{getFormatLabel(tournament.format)}</Text></View></View>
              {tournament.start_date && (<View style={styles.infoRow}><Ionicons name="calendar" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>Data inizio</Text><Text style={styles.infoValue}>{new Date(tournament.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View></View>)}
              <View style={styles.infoRow}>
                <View style={[styles.statusDot, { backgroundColor: tournament.status === 'active' ? '#22C55E' : tournament.status === 'completed' ? '#EF4444' : '#EAB308' }]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Stato</Text>
                  <Text style={[styles.infoValue, { color: tournament.status === 'active' ? '#22C55E' : tournament.status === 'completed' ? '#EF4444' : '#EAB308' }]}>
                    {tournament.status === 'active' ? 'In corso' : tournament.status === 'completed' ? 'Terminato' : 'In attesa'}
                  </Text>
                </View>
              </View>
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
        sport={tournament?.sport}
      />

      {/* Formation Field Modal */}
      <Modal
        visible={showFormationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFormationModal(false)}
      >
        <SafeAreaView style={styles.formationModalContainer} edges={['top', 'bottom']}>
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
                  <Ionicons name={isRacketSport ? 'tennisball' : (isBasketball ? 'basketball' : (isVolleyball ? 'tennisball-outline' : 'football'))} size={18} color={publicFormationViewMode === 'field' ? '#FFF' : '#000'} />
                  <Text style={[styles.publicToggleText, publicFormationViewMode === 'field' && styles.publicToggleTextActive]}>Campo</Text>
                </TouchableOpacity>
              </View>

              {publicFormationViewMode === 'field' ? (
                <>
                  {!isRacketSport && (
                    <Text style={styles.formationModalModule}>Modulo: {selectedFormation.module}</Text>
                  )}
                  {isRacketSport ? (
                    isPadel ? (
                      <PadelCourtView
                        format={isDoubles ? 'doubles' : 'singles'}
                        homePlayers={selectedFormation?.starters?.map((s: any) => ({
                          player_id: s.player_id,
                          full_name: s.player_name,
                          number: s.player_number,
                        })) || []}
                        awayPlayers={selectedAwayFormation?.starters?.map((s: any) => ({
                          player_id: s.player_id,
                          full_name: s.player_name,
                          number: s.player_number,
                        })) || []}
                        homeTeamName={teams.find(t => t.id === selectedFormation?.team_id)?.name}
                        awayTeamName={teams.find(t => t.id === selectedAwayFormation?.team_id)?.name}
                      />
                    ) : (
                      <TennisCourtView
                        format={isDoubles ? 'doubles' : 'singles'}
                        homePlayers={selectedFormation?.starters?.map((s: any) => ({
                          player_id: s.player_id,
                          full_name: s.player_name,
                          number: s.player_number,
                        })) || []}
                        awayPlayers={selectedAwayFormation?.starters?.map((s: any) => ({
                          player_id: s.player_id,
                          full_name: s.player_name,
                          number: s.player_number,
                        })) || []}
                        homeTeamName={teams.find(t => t.id === selectedFormation?.team_id)?.name}
                        awayTeamName={teams.find(t => t.id === selectedAwayFormation?.team_id)?.name}
                      />
                    )
                  ) : isVolleyball ? (
                    <VolleyballCourtView
                      module={selectedFormation.module}
                      homePlayers={selectedFormation?.starters?.map((s: any) => ({
                        player_id: s.player_id,
                        full_name: s.player_name,
                        number: s.player_number,
                        position: s.position,
                      })) || []}
                      awayPlayers={[]}
                      homeTeamName={teams.find(t => t.id === selectedFormation?.team_id)?.name}
                    />
                  ) : isBasketball ? (
                    <BasketballCourtView
                      module={selectedFormation.module}
                      starters={selectedFormation?.starters?.map((s: any) => ({
                        player_id: s.player_id,
                        full_name: s.player_name,
                        number: s.player_number,
                        position: s.position,
                      })) || []}
                      gameFormat={tournament?.game_format || '5v5'}
                    />
                  ) : isRugby ? (
                    <RugbyCourtView
                      module={selectedFormation.module}
                      homePlayers={selectedFormation?.starters?.map((s: any) => ({
                        player_id: s.player_id,
                        full_name: s.player_name,
                        number: s.player_number,
                        position: s.position,
                      })) || []}
                      awayPlayers={[]}
                      homeTeamName={teams.find(t => t.id === selectedFormation?.team_id)?.name}
                      gameFormat={tournament?.game_format || '15v15'}
                    />
                  ) : (
                    <FieldView
                      module={selectedFormation.module}
                      starters={selectedFormation.starters}
                      gameFormat={tournament?.game_format || '11v11'}
                    />
                  )}
                </>
              ) : (
                <View style={styles.publicListView}>
                  {isRacketSport ? (
                    /* Tennis/Padel: Show both players */
                    <>
                      <View style={styles.publicPositionSection}>
                        <Text style={styles.publicPositionTitle}>🎾 {teams.find(t => t.id === selectedFormation?.team_id)?.name || 'Giocatore 1'}</Text>
                        {selectedFormation?.starters?.map((player: any, idx: number) => (
                          <View key={idx} style={styles.publicPlayerRow}>
                            <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                            <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                          </View>
                        ))}
                      </View>
                      {selectedAwayFormation && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🎾 {teams.find(t => t.id === selectedAwayFormation?.team_id)?.name || 'Giocatore 2'}</Text>
                          {selectedAwayFormation?.starters?.map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : isVolleyball ? (
                    /* Volleyball: Show volleyball-specific positions */
                    <>
                      {/* Palleggiatore */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'palleggiatore').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🎯 Palleggiatore</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'palleggiatore').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Opposto */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'opposto').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>💪 Opposto</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'opposto').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Schiacciatore */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'schiacciatore').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>⚡ Schiacciatore</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'schiacciatore').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Centrale */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'centrale').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🏐 Centrale</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'centrale').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Libero */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'libero').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🛡️ Libero</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'libero').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : isBasketball ? (
                    /* Basketball: Show basketball-specific positions */
                    <>
                      {/* Playmaker */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'playmaker').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🎯 Playmaker</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'playmaker').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Guardia */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'guardia').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🏀 Guardia</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'guardia').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Ala Piccola */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'ala_piccola').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🦅 Ala Piccola</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'ala_piccola').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Ala Grande */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'ala_grande').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>💪 Ala Grande</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'ala_grande').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Centro */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'centro').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🗼 Centro</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'centro').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : isRugby ? (
                    /* Rugby: Show rugby-specific positions */
                    <>
                      {/* Prima linea - Piloni e Tallonatore */}
                      {selectedFormation.starters.filter((s: any) => ['pilone_sinistro', 'tallonatore', 'pilone_destro'].includes(s.position)).length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>💪 Prima Linea</Text>
                          {selectedFormation.starters.filter((s: any) => ['pilone_sinistro', 'tallonatore', 'pilone_destro'].includes(s.position)).map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Seconda Linea */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'seconda_linea').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🏉 Seconda Linea</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'seconda_linea').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Terza Linea - Flanker e N.8 */}
                      {selectedFormation.starters.filter((s: any) => ['flanker', 'numero_8'].includes(s.position)).length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>⚡ Terza Linea</Text>
                          {selectedFormation.starters.filter((s: any) => ['flanker', 'numero_8'].includes(s.position)).map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Mediani */}
                      {selectedFormation.starters.filter((s: any) => ['mediano_mischia', 'mediano_apertura'].includes(s.position)).length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🔄 Mediani</Text>
                          {selectedFormation.starters.filter((s: any) => ['mediano_mischia', 'mediano_apertura'].includes(s.position)).map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Centri */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'centro').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🏃 Centri</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'centro').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Ali */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'ala').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🦅 Ali</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'ala').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Estremo */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'estremo').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🛡️ Estremo</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'estremo').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Portiere */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'goalkeeper').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🧤 Portiere</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'goalkeeper').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Difensori */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'defender').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🛡️ Difensori</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'defender').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Centrocampisti */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'midfielder').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>⚙️ Centrocampisti</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'midfielder').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Attaccanti */}
                      {selectedFormation.starters.filter((s: any) => s.position === 'forward').length > 0 && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>⚡ Attaccanti</Text>
                          {selectedFormation.starters.filter((s: any) => s.position === 'forward').map((player: any, idx: number) => (
                            <View key={idx} style={styles.publicPlayerRow}>
                              <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                              <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
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

      {/* Player Stats Modal */}
      <Modal
        visible={showPlayerStatsModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPlayerStatsModal(false)}
      >
        <TouchableOpacity 
          style={styles.playerStatsOverlay} 
          activeOpacity={1}
          onPress={() => setShowPlayerStatsModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.playerStatsContent}>
            <TouchableOpacity 
              style={styles.playerStatsClose}
              onPress={() => setShowPlayerStatsModal(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            {selectedPlayerForStats && (
              <>
                <View style={styles.playerStatsHeader}>
                  <View style={styles.playerStatsAvatar}>
                    <Text style={styles.playerStatsAvatarText}>
                      {selectedPlayerForStats.number || selectedPlayerForStats.full_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.playerStatsInfo}>
                    <Text style={styles.playerStatsName}>{selectedPlayerForStats.full_name}</Text>
                    <Text style={styles.playerStatsRole}>{selectedPlayerForStats.role}</Text>
                  </View>
                </View>

                {loadingPlayerStats ? (
                  <View style={styles.playerStatsLoading}>
                    <Text>Caricamento...</Text>
                  </View>
                ) : playerStatsData ? (
                  <>
                    <View style={styles.playerStatsGrid}>
                      {isRugby ? (
                        /* Rugby Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🏉</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.tries || 0}</Text>
                            <Text style={styles.playerStatLabel}>Mete</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>⚽</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.conversions || 0}</Text>
                            <Text style={styles.playerStatLabel}>Trasform.</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎯</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.penalties || 0}</Text>
                            <Text style={styles.playerStatLabel}>Punizioni</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>💫</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.drop_goals || 0}</Text>
                            <Text style={styles.playerStatLabel}>Drop</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🤝</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.tackles || 0}</Text>
                            <Text style={styles.playerStatLabel}>Placcaggi</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🟨</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.yellow_cards || 0}</Text>
                            <Text style={styles.playerStatLabel}>Gialli</Text>
                          </View>
                        </>
                      ) : isBasketball ? (
                        /* Basketball Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🏀</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.points || playerStatsData.total_points || 0}</Text>
                            <Text style={styles.playerStatLabel}>Punti</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🅰️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.assists || playerStatsData.basketball_assists || 0}</Text>
                            <Text style={styles.playerStatLabel}>Assist</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>📊</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.rebounds || 0}</Text>
                            <Text style={styles.playerStatLabel}>Rimbalzi</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🤚</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.steals || 0}</Text>
                            <Text style={styles.playerStatLabel}>Palle rub.</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🚫</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.blocks || 0}</Text>
                            <Text style={styles.playerStatLabel}>Stoppate</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>👟</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.appearances || 0}</Text>
                            <Text style={styles.playerStatLabel}>Presenze</Text>
                          </View>
                        </>
                      ) : isVolleyball ? (
                        /* Volleyball Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🏐</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.points || 0}</Text>
                            <Text style={styles.playerStatLabel}>Punti</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎯</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.aces || 0}</Text>
                            <Text style={styles.playerStatLabel}>Ace</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🧱</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.blocks || 0}</Text>
                            <Text style={styles.playerStatLabel}>Muri</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>💥</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.kills || 0}</Text>
                            <Text style={styles.playerStatLabel}>Attacchi</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🛡️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.digs || 0}</Text>
                            <Text style={styles.playerStatLabel}>Difese</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>👟</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.appearances || 0}</Text>
                            <Text style={styles.playerStatLabel}>Presenze</Text>
                          </View>
                        </>
                      ) : isTennis || isPadel ? (
                        /* Tennis/Padel Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎾</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.matches_won || 0}</Text>
                            <Text style={styles.playerStatLabel}>Vittorie</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>❌</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.matches_lost || 0}</Text>
                            <Text style={styles.playerStatLabel}>Sconfitte</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎯</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.aces || 0}</Text>
                            <Text style={styles.playerStatLabel}>Ace</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>💔</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.double_faults || 0}</Text>
                            <Text style={styles.playerStatLabel}>Doppi falli</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>📊</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.sets_won || 0}</Text>
                            <Text style={styles.playerStatLabel}>Set vinti</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎮</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.games_won || 0}</Text>
                            <Text style={styles.playerStatLabel}>Game vinti</Text>
                          </View>
                        </>
                      ) : (
                        /* Soccer Stats (default) */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>⚽</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.goals || 0}</Text>
                            <Text style={styles.playerStatLabel}>Gol</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🅰️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.assists || 0}</Text>
                            <Text style={styles.playerStatLabel}>Assist</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🟨</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.yellow_cards || 0}</Text>
                            <Text style={styles.playerStatLabel}>Gialli</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🟥</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.red_cards || 0}</Text>
                            <Text style={styles.playerStatLabel}>Rossi</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>👟</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.appearances || 0}</Text>
                            <Text style={styles.playerStatLabel}>Presenze</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>⏱️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.minutes_played || 0}</Text>
                            <Text style={styles.playerStatLabel}>Minuti</Text>
                          </View>
                        </>
                      )}
                    </View>
                    {playerStatsData.average_rating > 0 && (
                      <View style={styles.playerStatsRating}>
                        <Text style={styles.playerStatsRatingLabel}>⭐ Media Voto</Text>
                        <Text style={styles.playerStatsRatingValue}>{playerStatsData.average_rating?.toFixed(1)}</Text>
                        <Text style={styles.playerStatsRatingCount}>({playerStatsData.ratings_count || 0} voti)</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noStatsText}>Nessuna statistica disponibile</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
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
  matchCenterContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  matchTeamColumn: { alignItems: 'center', width: 80 },
  matchTeamName: { fontSize: 11, fontWeight: '500', color: '#000', marginTop: 4, textAlign: 'center' },
  matchScore: { fontSize: 22, fontWeight: '700', color: '#000' },
  liveIndicator: { fontSize: 10, fontWeight: '700', color: '#E53935', marginTop: 4, backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  // Tennis LIVE score styles
  tennisLiveScore: { alignItems: 'center', justifyContent: 'center' },
  tennisCurrentGame: { marginTop: 4, alignItems: 'center' },
  tennisGameScore: { fontSize: 12, fontWeight: '600', color: '#666' },
  tennisPointScore: { fontSize: 14, fontWeight: '700', color: '#2D8A2E', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  matchDateTime: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 8 },
  matchActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 10 },
  calendarButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  scorerCard: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  scorerPosition: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  positionText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  scorerInfo: { flex: 1 },
  scorerName: { fontSize: 15, fontWeight: '600', color: '#000' },
  scorerTeam: { fontSize: 13, color: '#666' },
  scorerStats: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#000' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#666' },
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
  statusDot: { width: 20, height: 20, borderRadius: 10 },
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
  // Public Teams Tab styles
  publicTeamCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  publicTeamHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  publicTeamName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#000', marginLeft: 12 },
  publicPlayersAccordion: { borderTopWidth: 2, borderTopColor: '#000', padding: 12 },
  noPlayersText: { fontSize: 14, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  publicPlayerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, marginBottom: 8 },
  publicPlayerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  publicPlayerAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  publicPlayerInfo: { flex: 1, marginLeft: 12 },
  publicPlayerRole: { fontSize: 12, color: '#666' },
  // Player Stats Modal styles
  playerStatsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  playerStatsContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 },
  playerStatsClose: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  playerStatsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  playerStatsAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  playerStatsAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 20 },
  playerStatsInfo: { marginLeft: 16 },
  playerStatsName: { fontSize: 18, fontWeight: '700', color: '#000' },
  playerStatsRole: { fontSize: 14, color: '#666' },
  playerStatsLoading: { alignItems: 'center', paddingVertical: 20 },
  playerStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  playerStatBox: { width: '30%', backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, alignItems: 'center' },
  playerStatIcon: { fontSize: 20, marginBottom: 4 },
  playerStatValue: { fontSize: 20, fontWeight: '700', color: '#000' },
  playerStatLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  playerStatsRating: { marginTop: 16, padding: 16, backgroundColor: '#FFF9E6', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playerStatsRatingLabel: { fontSize: 14, fontWeight: '600', color: '#000' },
  playerStatsRatingValue: { fontSize: 24, fontWeight: '700', color: '#EAB308' },
  playerStatsRatingCount: { fontSize: 12, color: '#666' },
  noStatsText: { fontSize: 14, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  // Match formations section
  matchFormationsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
  matchFormationsTitle: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 10 },
  matchFormationCard: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  matchFormationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  // Tennis match formations styles
  tennisMatchPlayersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tennisPlayerBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  tennisPlayerBadgeAway: { backgroundColor: '#555' },
  tennisPlayerBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  tennisVsText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tennisPlayersPreview: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  tennisPlayerPreviewSide: { alignItems: 'center', flex: 1 },
  tennisPlayerPreviewLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  tennisPlayerPreviewName: { fontSize: 13, color: '#000' },
  // Public News styles
  publicNewsCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  publicNewsImage: { width: '100%', height: 180, backgroundColor: '#F0F0F0' },
  publicNewsContent: { padding: 16 },
  publicNewsTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 8 },
  publicNewsDescription: { fontSize: 14, color: '#333', lineHeight: 22, marginBottom: 12 },
  publicNewsDate: { fontSize: 12, color: '#666' },
});
