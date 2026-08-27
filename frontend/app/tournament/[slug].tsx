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
  Image,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Loading, EmptyState, TeamLogo, FieldView, BasketballCourtView, TennisCourtView, PadelCourtView, VolleyballCourtView, RugbyCourtView, HighlightsTab, ProductCarousel } from '../../src/components';
import { FavoriteButton } from '../../src/components/FavoriteButton';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/utils/api';
import { Tournament, Team, Match, Standing, Scorer, PlayerStats, News, Formation, Player, Sport, getSportEmoji } from '../../src/types';
import { useTranslation } from '../../src/i18n';
import { parseFlexibleDate } from '../../src/utils/helpers';

type TabId = 'standings' | 'teams' | 'matches' | 'scorers' | 'stats' | 'news' | 'info' | 'highlights';

export default function TournamentPublicPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();

  // Helper function to translate "Giornata X" to the current language
  const translateRoundName = (round: string): string => {
    if (!round) return '';
    // Extract number from "Giornata X" format
    const match = round.match(/Giornata\s+(\d+)/i);
    if (match) {
      const number = match[1];
      return t('matches.roundNumber', { number });
    }
    // Translate other common round names
    if (round === 'Altro') return t('common.other', 'Other');
    return round;
  };

  // Translate player role from Italian to current language
  const translateRole = (role: string) => {
    if (!role) return '-';
    const sport = tournament?.sport || 'calcio';
    
    const roleMapping: Record<string, Record<string, string>> = {
      'calcio': {
        'Portiere': 'roles.soccer.goalkeeper',
        'Difensore': 'roles.soccer.defender',
        'Centrocampista': 'roles.soccer.midfielder',
        'Attaccante': 'roles.soccer.forward',
        'Goalkeeper': 'roles.soccer.goalkeeper',
        'Defender': 'roles.soccer.defender',
        'Midfielder': 'roles.soccer.midfielder',
        'Forward': 'roles.soccer.forward',
      },
      'basket': {
        'Playmaker': 'roles.basketball.pointGuard',
        'Guardia': 'roles.basketball.guard',
        'Ala Piccola': 'roles.basketball.smallForward',
        'Ala Grande': 'roles.basketball.powerForward',
        'Centro': 'roles.basketball.center',
        'Point Guard': 'roles.basketball.pointGuard',
        'Guard': 'roles.basketball.guard',
        'Small Forward': 'roles.basketball.smallForward',
        'Power Forward': 'roles.basketball.powerForward',
        'Center': 'roles.basketball.center',
      },
      'pallavolo': {
        'Palleggiatore': 'roles.volleyball.setter',
        'Schiacciatore': 'roles.volleyball.outsideHitter',
        'Opposto': 'roles.volleyball.opposite',
        'Libero': 'roles.volleyball.libero',
        'Centrale': 'roles.volleyball.middleBlocker',
        'Setter': 'roles.volleyball.setter',
        'Outside Hitter': 'roles.volleyball.outsideHitter',
        'Opposite': 'roles.volleyball.opposite',
        'Middle Blocker': 'roles.volleyball.middleBlocker',
      },
      'rugby': {
        'Pilone': 'roles.rugby.prop',
        'Tallonatore': 'roles.rugby.hooker',
        'Flanker': 'roles.rugby.flanker',
        'Mediano di mischia': 'roles.rugby.scrumHalf',
        'Ala': 'roles.rugby.winger',
        'Centro': 'roles.rugby.centre',
        'Estremo': 'roles.rugby.fullback',
        'Prop': 'roles.rugby.prop',
        'Hooker': 'roles.rugby.hooker',
        'Scrum Half': 'roles.rugby.scrumHalf',
        'Winger': 'roles.rugby.winger',
        'Centre': 'roles.rugby.centre',
        'Fullback': 'roles.rugby.fullback',
      }
    };
    
    const sportMapping = roleMapping[sport] || roleMapping['calcio'];
    const translationKey = sportMapping[role];
    
    if (translationKey) {
      return t(translationKey, role);
    }
    
    return role;
  };
  
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
  // Private tournaments: 'needs_code' before any attempt, 'invalid_code'
  // after a wrong one — kept distinct from a plain "not found" so the user
  // sees a code-entry screen instead of a dead end.
  const [privateAccess, setPrivateAccess] = useState<'unknown' | 'needs_code' | 'invalid_code'>('unknown');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

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

  const loadData = async (codeOverride?: string) => {
    try {
      const code = codeOverride ?? accessCodeInput;
      const url = `/api/tournaments/slug/${slug}${code ? `?code=${encodeURIComponent(code)}` : ''}`;
      const tournamentRes = await api.get(url);
      const t = tournamentRes.data;
      setTournament(t);
      setPrivateAccess('unknown');
      
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
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail === 'private_code_required') {
        setPrivateAccess('needs_code');
      } else if (detail === 'private_code_invalid') {
        setPrivateAccess('invalid_code');
      } else {
        console.error('Error:', error);
      }
    } finally { setLoading(false); setRefreshing(false); }
  };

  const handleUnlockWithCode = async () => {
    if (!accessCodeInput.trim()) return;
    setCheckingCode(true);
    setLoading(true);
    await loadData(accessCodeInput.trim());
    setCheckingCode(false);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleShare = async () => {
    if (!tournament) return;
    const publicUrl = `${(process.env.EXPO_PUBLIC_BACKEND_URL || '').replace('/api', '')}/tournament/${tournament.slug}`;
    const message = `Segui "${tournament.name}" su Rival Hub!\n${publicUrl}`;
    try {
      // `url` only does anything on iOS (its own share sheet field, kept
      // separate from the message there) — Android and the fallback text
      // share both ignore it, so the link has to live in `message` too for
      // it to actually show up everywhere.
      await Share.share({ message, url: publicUrl, title: tournament.name });
    } catch (e) {}
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || t('teams.team', 'Team');
  const getStatusLabel = (status: string) => status === 'active' ? t('tournaments.active', 'In progress') : status === 'completed' ? t('tournaments.completed', 'Completed') : t('tournaments.draft', 'Draft');
  const getCategoryLabel = (cat: string) => {
    const categoryMap: Record<string, string> = {
      'Open': t('categories.open', 'Open'),
      'Senior': t('categories.senior', 'Senior'),
      'U18': t('categories.u18', 'U18'),
      'U16': t('categories.u16', 'U16'),
      'U14': t('categories.u14', 'U14'),
      'U12': t('categories.u12', 'U12'),
      'U10': t('categories.u10', 'U10'),
      'U8': t('categories.u8', 'U8'),
    };
    return categoryMap[cat] || cat;
  };
  const getFormatLabel = (f: string) => {
    if (f === 'league') return t('tournaments.formatLeague', 'League');
    if (f === 'knockout') return t('tournaments.formatKnockout', 'Knockout');
    if (f === 'groups_knockout') return t('tournaments.formatGroupsKnockout', 'Groups + Knockout');
    return t('tournaments.formatChampionship', 'Championship');
  };
  
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
    return result || t('matches.dateTBD', 'Date TBD');
  };

  // Player ratings bottom sheet — shows how each player was scored for a
  // given match, in traditional lineup order per sport (e.g. for calcio:
  // goalkeeper → defenders → midfielders → forwards), matching how
  // translateRole's own per-sport mapping groups roles. Keyed by sport
  // (not a single flat role→order map) since the same role name can mean
  // different things in different sports (e.g. "Centro" in basket vs rugby).
  const ROLE_SORT_ORDER_BY_SPORT: Record<string, Record<string, number>> = {
    calcio: {
      'Portiere': 0, 'Goalkeeper': 0,
      'Difensore': 1, 'Defender': 1,
      'Centrocampista': 2, 'Midfielder': 2,
      'Attaccante': 3, 'Forward': 3,
    },
    basket: {
      'Playmaker': 0, 'Point Guard': 0,
      'Guardia': 1, 'Guard': 1,
      'Ala Piccola': 2, 'Small Forward': 2,
      'Ala Grande': 3, 'Power Forward': 3,
      'Centro': 4, 'Center': 4,
    },
    pallavolo: {
      'Palleggiatore': 0, 'Setter': 0,
      'Libero': 1,
      'Centrale': 2, 'Middle Blocker': 2,
      'Schiacciatore': 3, 'Outside Hitter': 3,
      'Opposto': 4, 'Opposite': 4,
    },
    rugby: {
      'Pilone': 0, 'Prop': 0,
      'Tallonatore': 1, 'Hooker': 1,
      'Mediano di mischia': 2, 'Scrum Half': 2,
      'Flanker': 3,
      'Centro': 4, 'Centre': 4,
      'Ala': 5, 'Winger': 5,
      'Estremo': 6, 'Fullback': 6,
    },
  };
  const ROLE_SORT_ORDER = ROLE_SORT_ORDER_BY_SPORT[tournament?.sport || 'calcio'] || ROLE_SORT_ORDER_BY_SPORT.calcio;
  const [showRatingsSheet, setShowRatingsSheet] = useState(false);
  const [ratingsSheetMatch, setRatingsSheetMatch] = useState<Match | null>(null);
  const [matchRatings, setMatchRatings] = useState<any[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  const openRatingsSheet = async (match: Match) => {
    setRatingsSheetMatch(match);
    setShowRatingsSheet(true);
    setLoadingRatings(true);
    try {
      const response = await api.get(`/api/matches/${match.id}/ratings`);
      setMatchRatings(response.data || []);
    } catch (error) {
      setMatchRatings([]);
    } finally {
      setLoadingRatings(false);
    }
  };

  // Add to calendar function
  const handleAddToCalendar = async (match: Match) => {
    const homeTeam = getTeamName(match.home_team_id);
    const awayTeam = getTeamName(match.away_team_id);
    const title = `${homeTeam} vs ${awayTeam}`;

    // A match can override the tournament's own venue with its own pitch —
    // prefer that, and fall back through the tournament's venue name/
    // address and finally its plain location string.
    const venueName = match.venue_name || tournament?.venue_name || '';
    const venueAddress = match.venue_address || tournament?.venue_address || '';
    const location = [venueName, venueAddress].filter(Boolean).join(', ') || tournament?.location || '';

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

    // Everything worth knowing about the match and its tournament, since
    // the calendar app's "location" field isn't always tappable/mapped the
    // same way on every platform — repeating it as plain text here means
    // it's readable either way.
    const detailsLines = [
      `${homeTeam} vs ${awayTeam}`,
      tournament?.name ? `Torneo: ${tournament.name}` : null,
      tournament?.category ? `Categoria: ${tournament.category}` : null,
      match.round ? `Turno: ${translateRoundName(match.round)}` : null,
      venueName ? `Campo: ${venueName}` : null,
      venueAddress ? `Indirizzo: ${venueAddress}` : null,
      tournament?.slug ? `${(process.env.EXPO_PUBLIC_BACKEND_URL || '').replace('/api', '')}/tournament/${tournament.slug}` : null,
    ].filter(Boolean).join('\n');

    // Create Google Calendar URL
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(detailsLines)}`;
    
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

  if (privateAccess === 'needs_code' || privateAccess === 'invalid_code') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.privateGateContainer}>
            <View style={styles.privateGateIcon}>
              <Ionicons name="lock-closed" size={28} color="#FFF" />
            </View>
            <Text style={styles.privateGateTitle}>{t('tournaments.privateTitle', 'Torneo privato')}</Text>
            <Text style={styles.privateGateDesc}>{t('tournaments.privateDesc', "Questo torneo è privato. Inserisci il codice d'accesso per vederlo.")}</Text>
            <TextInput
              style={styles.privateGateInput}
              value={accessCodeInput}
              onChangeText={setAccessCodeInput}
              placeholder={t('tournaments.enterCodePlaceholder', 'Codice a 6 caratteri')}
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            {privateAccess === 'invalid_code' && (
              <Text style={styles.privateGateError}>{t('tournaments.invalidCode', 'Codice non valido, riprova.')}</Text>
            )}
            <TouchableOpacity style={styles.privateGateButton} onPress={handleUnlockWithCode} disabled={checkingCode}>
              <Text style={styles.privateGateButtonText}>{checkingCode ? '...' : t('tournaments.unlock', 'Sblocca')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
      return isDoubles ? t('tournaments.pairs') : t('tournaments.players');
    }
    return t('teams.title', 'Teams');
  };

  const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'standings', label: t('stats.standings', 'Standings'), icon: 'podium-outline' },
    { id: 'teams', label: getTeamTabLabel(), icon: isRacketSport ? 'person-outline' : 'people-outline' },
    { id: 'matches', label: t('tournaments.matches', 'Matches'), icon: isRacketSport ? 'tennisball-outline' : 'football-outline' },
    // Hide "Marcatori" for Tennis/Padel
    ...(isRacketSport ? [] : [{ id: 'scorers' as TabId, label: t('soccer.topScorers', 'Scorers'), icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap }]),
    { id: 'stats', label: t('stats.title', 'Stats'), icon: 'stats-chart-outline' },
    { id: 'highlights', label: t('highlights.title', 'Highlights'), icon: 'film-outline' },
    { id: 'news', label: t('news.title', 'News'), icon: 'newspaper-outline' },
    { id: 'info', label: t('common.info', 'Info'), icon: 'information-circle-outline' },
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
            {standings.length === 0 ? <EmptyState icon="podium-outline" title={t('stats.noStandings', 'No standings')} /> : (
              <View style={styles.standingsTable}>
                <View style={styles.standingsHeader}>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>#</Text>
                  <Text style={[styles.standingsHeaderText, { flex: 1 }]}>{isRacketSport ? (isDoubles ? t('teams.pair', 'Pair') : t('teams.player', 'Player')) : t('teams.team', 'Team')}</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>{t('stats.matchesPlayedShort', 'MP')}</Text>
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>{t('stats.winsShort', 'W')}</Text>
                  {!isBasketball && !isRacketSport && <Text style={[styles.standingsHeaderText, { width: 30 }]}>{t('stats.drawsShort', 'D')}</Text>}
                  <Text style={[styles.standingsHeaderText, { width: 30 }]}>{isBasketball ? t('stats.lossesShort', 'L') : t('stats.lossesShort', 'L')}</Text>
                  {isBasketball && <Text style={[styles.standingsHeaderText, { width: 40 }]}>+/-</Text>}
                  <Text style={[styles.standingsHeaderText, { width: 40, fontWeight: '700' }]}>{t('stats.pointsShort', 'Pts')}</Text>
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
            {tournament?.sport && (
              <ProductCarousel sport={tournament.sport as Sport} title={t('products.sponsoredTitle', 'Prodotti consigliati')} />
            )}
          </View>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <View style={styles.tabContent}>
            {teams.length === 0 ? <EmptyState icon="people-outline" title={t('teams.noTeams', 'No teams')} /> : (
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
                        <Text style={styles.noPlayersText}>{t('teams.noPlayers', 'No players')}</Text>
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
                              <Text style={styles.publicPlayerRole}>{translateRole(player.role)}</Text>
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
            {matches.length === 0 ? <EmptyState icon="football-outline" title={t('tournaments.noMatches', 'No matches')} /> : (
              sortedRounds.map(([round, roundMatches]) => (
                <View key={round} style={styles.matchesGroup}>
                  <Text style={styles.matchesGroupTitle}>{translateRoundName(round)}</Text>
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
                          module: isDoubles ? t('tennis.doubles', 'Doubles') : t('tennis.singles', 'Singles'),
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
                          module: isDoubles ? t('tennis.doubles', 'Doubles') : t('tennis.singles', 'Singles'),
                          starters: awayPlayers.map((p: any) => ({
                            player_id: p.id,
                            player_name: p.full_name,
                            player_number: p.number,
                          }))
                        };
                      }
                    }
                    
                    const isLive = ((match as any).has_events || match.status === 'in_progress') && match.status !== 'completed';
                    const liveEvents: any[] = (match as any).live_events || [];
                    const eventIcon = (type: string) => (
                      type === 'goal' || type === 'penalty_goal' ? '⚽'
                      : type === 'yellow_card' ? '🟨'
                      : type === 'red_card' ? '🟥'
                      : type === 'assist' ? '🅰️'
                      : type === 'points_3pt' ? '3️⃣'
                      : type === 'points_2pt' ? '2️⃣'
                      : type === 'points_1pt' ? '1️⃣'
                      : null
                    );
                    const homeLiveEvents = liveEvents.filter(e => e.team_id === match.home_team_id);
                    const awayLiveEvents = liveEvents.filter(e => e.team_id === match.away_team_id);

                    return (
                      <View key={match.id} style={[styles.matchCard, isLive && styles.matchCardLive]}>
                        <View style={styles.matchRow}>
                          <View style={styles.matchTeamColumn}>
                            <TeamLogo logo={teams.find(t => t.id === match.home_team_id)?.logo} name={getTeamName(match.home_team_id)} size="small" />
                            <Text style={styles.matchTeamName} numberOfLines={1}>{getTeamName(match.home_team_id)}</Text>
                            {homeLiveEvents.map((e, idx) => eventIcon(e.event_type) && (
                              <Text key={idx} style={styles.matchLiveEventLine} numberOfLines={1}>{eventIcon(e.event_type)} {e.player_name}</Text>
                            ))}
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
                                      {t('tennis.game', 'Game')}: {(match as any).currentGame?.homeGamesInSet ?? 0} - {(match as any).currentGame?.awayGamesInSet ?? 0}
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
                            {awayLiveEvents.map((e, idx) => eventIcon(e.event_type) && (
                              <Text key={idx} style={styles.matchLiveEventLine} numberOfLines={1}>{eventIcon(e.event_type)} {e.player_name}</Text>
                            ))}
                          </View>
                        </View>
                        {/* Date and Time */}
                        <Text style={styles.matchDateTime}>{formatMatchDateTime(match)}</Text>
                        {/* Ratings — shown regardless of live/completed status, since
                            the organizer can score players any time after the match.
                            Not calcio-specific: role-based sorting/labels already
                            adapt to whatever sport the tournament is. */}
                        <TouchableOpacity style={styles.ratingsSheetButton} onPress={() => openRatingsSheet(match)}>
                          <Ionicons name="star-outline" size={16} color="#000" />
                          <Text style={styles.ratingsSheetButtonText}>{t('soccer.ratings', 'Voti')}</Text>
                        </TouchableOpacity>
                        {/* Action Buttons Row */}
                        {!isLive && (
                          <View style={styles.matchActionsRow}>
                            <TouchableOpacity
                              style={styles.calendarButton}
                              onPress={() => handleAddToCalendar(match)}
                            >
                              <Ionicons name="calendar-outline" size={18} color="#000" />
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Formations for this match */}
                        {(homeFormation || awayFormation) && (
                          <View style={styles.matchFormationsSection}>
                            <Text style={styles.matchFormationsTitle}>{isRacketSport ? t('tournaments.players') : t('tournaments.formations')}</Text>
                            
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
                                    <Text style={styles.viewFormationBtnText}>{t('tournaments.viewField', 'View Field')}</Text>
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
                                          <Text style={styles.formationModuleBadge}>{t('tournaments.formation', 'Formation')}: {homeFormation.module}</Text>
                                        </View>
                                      </View>
                                      <View style={styles.viewFormationBtn}>
                                        <Text style={styles.viewFormationBtnText}>{t('tournaments.viewField', 'View Field')}</Text>
                                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                      </View>
                                    </TouchableOpacity>
                                    <View style={styles.formationPreview}>
                                      <Text style={styles.formationPreviewLabel}>{t('tournaments.starters', 'Starters')} ({homeFormation.starters.length}):</Text>
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
                                          <Text style={styles.formationModuleBadge}>{t('tournaments.formation', 'Formation')}: {awayFormation.module}</Text>
                                        </View>
                                      </View>
                                      <View style={styles.viewFormationBtn}>
                                        <Text style={styles.viewFormationBtnText}>{t('tournaments.viewField', 'View Field')}</Text>
                                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                                      </View>
                                    </TouchableOpacity>
                                    <View style={styles.formationPreview}>
                                      <Text style={styles.formationPreviewLabel}>{t('tournaments.starters', 'Starters')} ({awayFormation.starters.length}):</Text>
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
                        {tournament?.sport && (
                          <ProductCarousel sport={tournament.sport as Sport} title={t('products.sponsoredTitle', 'Prodotti consigliati')} />
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
            {scorers.length === 0 ? <EmptyState icon="trophy-outline" title={isBasketball ? t('basketball.noPointScorers', 'No point scorers') : t('soccer.noScorers', 'No scorers')} /> : (
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
            {tournament?.sport && (
              <ProductCarousel sport={tournament.sport as Sport} title={t('products.sponsoredTitle', 'Prodotti consigliati')} />
            )}
          </View>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <View style={styles.tabContent}>
            {playerStats.length === 0 ? <EmptyState icon="stats-chart-outline" title={t('tennis.noStats')} /> : (
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
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.matches_played || 0}</Text><Text style={styles.statBoxLabel}>{t('tournaments.matches')}</Text></View>
                      </>
                    ) : isBasketball ? (
                      <>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.total_points || 0}</Text><Text style={styles.statBoxLabel}>{t('basketball.points')}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.rebounds || 0}</Text><Text style={styles.statBoxLabel}>{t('basketball.reboundsShort')}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.assists || 0}</Text><Text style={styles.statBoxLabel}>{t('basketball.assistsShort')}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.steals || 0}</Text><Text style={styles.statBoxLabel}>{t('basketball.stealsShort')}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.blocks || 0}</Text><Text style={styles.statBoxLabel}>{t('basketball.blocksShort')}</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#EF4444' }]}>{player.fouls || 0}</Text><Text style={styles.statBoxLabel}>{t('basketball.fouls')}</Text></View>
                      </>
                    ) : (
                      <>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.goals}</Text><Text style={styles.statBoxLabel}>{t('soccer.goals')}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.assists}</Text><Text style={styles.statBoxLabel}>{t('soccer.assists')}</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#EAB308' }]}>{player.yellow_cards}</Text><Text style={styles.statBoxLabel}>{t('soccer.yellowCard')}</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#DC2626' }]}>{player.red_cards}</Text><Text style={styles.statBoxLabel}>{t('soccer.redCard')}</Text></View>
                        <View style={styles.statBox}><Text style={styles.statBoxValue}>{player.appearances}</Text><Text style={styles.statBoxLabel}>{t('stats.appearances', 'Apps')}</Text></View>
                        <View style={styles.statBox}><Text style={[styles.statBoxValue, { color: '#2563EB' }]}>{player.average_rating ? player.average_rating.toFixed(1) : '-'}</Text><Text style={styles.statBoxLabel}>{t('stats.avgRating', 'Avg')}</Text></View>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
            {tournament?.sport && (
              <ProductCarousel sport={tournament.sport as Sport} title={t('products.sponsoredTitle', 'Prodotti consigliati')} />
            )}
          </View>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <View style={styles.tabContent}>
            {news.length === 0 ? <EmptyState icon="newspaper-outline" title={t('tennis.noNews', 'No news available')} /> : (
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
                      📅 {item.published_at ? new Date(item.published_at).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('common.dateNotAvailable', 'Date not available')}
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
              <View style={styles.infoRow}><Ionicons name="trophy" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('common.name', 'Name')}</Text><Text style={styles.infoValue}>{tournament.name}</Text></View></View>
              <View style={styles.infoRow}><Ionicons name="people" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('tournaments.category', 'Category')}</Text><Text style={styles.infoValue}>{getCategoryLabel(tournament.category)}</Text></View></View>
              <View style={styles.infoRow}><Ionicons name="git-branch" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('tournaments.format', 'Format')}</Text><Text style={styles.infoValue}>{getFormatLabel(tournament.format)}</Text></View></View>
              {tournament.start_date && parseFlexibleDate(tournament.start_date) && (<View style={styles.infoRow}><Ionicons name="calendar" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('tournaments.startDate', 'Start date')}</Text><Text style={styles.infoValue}>{parseFlexibleDate(tournament.start_date)!.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View></View>)}
              <View style={styles.infoRow}>
                <View style={[styles.statusDot, { backgroundColor: tournament.status === 'active' ? '#22C55E' : tournament.status === 'completed' ? '#EF4444' : '#EAB308' }]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('tournaments.status', 'Status')}</Text>
                  <Text style={[styles.infoValue, { color: tournament.status === 'active' ? '#22C55E' : tournament.status === 'completed' ? '#EF4444' : '#EAB308' }]}>
                    {tournament.status === 'active' ? t('tournaments.inProgress', 'In progress') : tournament.status === 'completed' ? t('tournaments.completed', 'Completed') : t('tournaments.pending', 'Pending')}
                  </Text>
                </View>
              </View>
              {tournament.location && (<View style={styles.infoRow}><Ionicons name="location" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('tournaments.location', 'Location')}</Text><Text style={styles.infoValue}>{tournament.location}</Text></View></View>)}
              {tournament.venue_name && (<View style={styles.infoRow}><Ionicons name="business" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('tournaments.venueName', 'Venue Name')}</Text><Text style={styles.infoValue}>{tournament.venue_name}</Text></View></View>)}
              {tournament.venue_address && (<View style={styles.infoRow}><Ionicons name="navigate" size={20} color="#000" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('tournaments.venueAddress', 'Venue Address')}</Text><Text style={styles.infoValue}>{tournament.venue_address}</Text></View></View>)}
            </View>
            <Text style={styles.teamsTitle}>{t('teams.title', 'Teams')} ({teams.length})</Text>
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
              <Text style={styles.shareBarText}>{t('common.share', 'Share')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
              <Text style={styles.formationModalClose}>{t('common.close')}</Text>
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
                  <Text style={[styles.publicToggleText, publicFormationViewMode === 'list' && styles.publicToggleTextActive]}>{t('formation.list')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.publicToggleButton, publicFormationViewMode === 'field' && styles.publicToggleButtonActive]}
                  onPress={() => setPublicFormationViewMode('field')}
                >
                  <Ionicons name={isRacketSport ? 'tennisball' : (isBasketball ? 'basketball' : (isVolleyball ? 'tennisball-outline' : 'football'))} size={18} color={publicFormationViewMode === 'field' ? '#FFF' : '#000'} />
                  <Text style={[styles.publicToggleText, publicFormationViewMode === 'field' && styles.publicToggleTextActive]}>{t('formation.field')}</Text>
                </TouchableOpacity>
              </View>

              {publicFormationViewMode === 'field' ? (
                <>
                  {!isRacketSport && (
                    <Text style={styles.formationModalModule}>{t('tournaments.formation', 'Formation')}: {selectedFormation.module}</Text>
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
                        <Text style={styles.publicPositionTitle}>🎾 {teams.find(t => t.id === selectedFormation?.team_id)?.name || t('common.player', 'Player') + ' 1'}</Text>
                        {selectedFormation?.starters?.map((player: any, idx: number) => (
                          <View key={idx} style={styles.publicPlayerRow}>
                            <Text style={styles.publicPlayerNumber}>{player.player_number || '-'}</Text>
                            <Text style={styles.publicPlayerName}>{player.player_name || '?'}</Text>
                          </View>
                        ))}
                      </View>
                      {selectedAwayFormation && (
                        <View style={styles.publicPositionSection}>
                          <Text style={styles.publicPositionTitle}>🎾 {teams.find(t => t.id === selectedAwayFormation?.team_id)?.name || t('common.player', 'Player') + ' 2'}</Text>
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
                          <Text style={styles.publicPositionTitle}>🎯 {t('basketball.playmaker')}</Text>
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
                          <Text style={styles.publicPositionTitle}>🏀 {t('basketball.guard')}</Text>
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
                          <Text style={styles.publicPositionTitle}>🦅 {t('basketball.smallForward')}</Text>
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
                          <Text style={styles.publicPositionTitle}>💪 {t('basketball.powerForward')}</Text>
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
                          <Text style={styles.publicPositionTitle}>🗼 {t('basketball.center')}</Text>
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
                          <Text style={styles.publicPositionTitle}>🧤 {t('formation.goalkeeper')}</Text>
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
                          <Text style={styles.publicPositionTitle}>🛡️ {t('formation.defenders')}</Text>
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
                          <Text style={styles.publicPositionTitle}>⚙️ {t('formation.midfielders')}</Text>
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
                          <Text style={styles.publicPositionTitle}>⚡ {t('formation.forwards')}</Text>
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
                <Text style={styles.benchSectionTitle}>🔁 {t('tournaments.bench')} ({selectedFormation.bench?.length || 0})</Text>
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
                  <Text style={styles.noBenchText}>{t('formation.noBenchPlayers')}</Text>
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
                    <Text style={styles.playerStatsRole}>{translateRole(selectedPlayerForStats.role || '')}</Text>
                  </View>
                </View>

                {loadingPlayerStats ? (
                  <View style={styles.playerStatsLoading}>
                    <Text>{t('common.loading', 'Loading...')}</Text>
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
                            <Text style={styles.playerStatLabel}>{t('rugby.triesShort', 'Tries')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>⚽</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.conversions || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('rugby.conversionsShort', 'Conv.')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎯</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.penalties || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('rugby.penaltiesShort', 'Pen.')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>💫</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.drop_goals || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('rugby.dropGoalsShort', 'Drop')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🤝</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.tackles || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('rugby.tacklesShort', 'Tackles')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🟨</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.yellow_cards || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('soccer.yellowShort', 'Yellow')}</Text>
                          </View>
                        </>
                      ) : isBasketball ? (
                        /* Basketball Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🏀</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.points || playerStatsData.total_points || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('basketball.points')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🅰️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.assists || playerStatsData.basketball_assists || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('basketball.assists')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>📊</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.rebounds || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('basketball.rebounds')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🤚</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.steals || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('basketball.steals')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🚫</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.blocks || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('basketball.blocks')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>👟</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.appearances || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('basketball.appearances')}</Text>
                          </View>
                        </>
                      ) : isVolleyball ? (
                        /* Volleyball Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🏐</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.points || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('volleyball.points')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎯</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.aces || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('volleyball.aces')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🧱</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.blocks || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('volleyball.blocks')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>💥</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.kills || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('volleyball.attacks')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🛡️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.digs || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('volleyball.digs')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>👟</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.appearances || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('volleyball.appearances')}</Text>
                          </View>
                        </>
                      ) : isTennis || isPadel ? (
                        /* Tennis/Padel Stats */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎾</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.matches_won || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('tennis.wins', 'Wins')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>❌</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.matches_lost || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('tennis.losses', 'Losses')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎯</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.aces || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('tennis.ace', 'Ace')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>💔</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.double_faults || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('tennis.doubleFaults', 'Double Faults')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>📊</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.sets_won || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('tennis.setsWon', 'Sets Won')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🎮</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.games_won || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('tennis.gamesWon', 'Games Won')}</Text>
                          </View>
                        </>
                      ) : (
                        /* Soccer Stats (default) */
                        <>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>⚽</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.goals || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('soccer.goals', 'Goals')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🅰️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.assists || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('soccer.assists', 'Assists')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🟨</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.yellow_cards || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('soccer.yellowShort', 'Yellow')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>🟥</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.red_cards || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('soccer.redShort', 'Red')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>👟</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.appearances || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('stats.appearances', 'Apps')}</Text>
                          </View>
                          <View style={styles.playerStatBox}>
                            <Text style={styles.playerStatIcon}>⏱️</Text>
                            <Text style={styles.playerStatValue}>{playerStatsData.minutes_played || 0}</Text>
                            <Text style={styles.playerStatLabel}>{t('stats.minutes', 'Mins')}</Text>
                          </View>
                        </>
                      )}
                    </View>
                    {playerStatsData.average_rating > 0 && (
                      <View style={styles.playerStatsRating}>
                        <Text style={styles.playerStatsRatingLabel}>⭐ {t('stats.avgRating', 'Avg Rating')}</Text>
                        <Text style={styles.playerStatsRatingValue}>{playerStatsData.average_rating?.toFixed(1)}</Text>
                        <Text style={styles.playerStatsRatingCount}>({playerStatsData.ratings_count || 0} {t('stats.votes', 'votes')})</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noStatsText}>{t('stats.noStatsAvailable', 'No statistics available')}</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Player Ratings Bottom Sheet */}
      <Modal
        visible={showRatingsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingsSheet(false)}
      >
        <View style={styles.ratingsSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowRatingsSheet(false)} />
          <View style={styles.ratingsSheet}>
            <View style={styles.ratingsSheetHandle} />
            <TouchableOpacity style={styles.ratingsSheetClose} onPress={() => setShowRatingsSheet(false)}>
              <Ionicons name="close" size={22} color="#000" />
            </TouchableOpacity>
            <Text style={styles.ratingsSheetTitle}>{t('soccer.ratings', 'Voti')}</Text>
            {ratingsSheetMatch && (
              <Text style={styles.ratingsSheetSubtitle}>
                {getTeamName(ratingsSheetMatch.home_team_id)} - {getTeamName(ratingsSheetMatch.away_team_id)}
              </Text>
            )}
            <ScrollView style={styles.ratingsSheetScroll} showsVerticalScrollIndicator={false}>
              {loadingRatings ? (
                <Text style={styles.ratingsSheetEmpty}>{t('common.loading', 'Loading...')}</Text>
              ) : matchRatings.length === 0 ? (
                <Text style={styles.ratingsSheetEmpty}>{t('soccer.noRatingsYet', 'Nessun voto assegnato ancora per questa partita.')}</Text>
              ) : (
                [
                  { teamId: ratingsSheetMatch?.home_team_id, label: getTeamName(ratingsSheetMatch?.home_team_id || '') },
                  { teamId: ratingsSheetMatch?.away_team_id, label: getTeamName(ratingsSheetMatch?.away_team_id || '') },
                ].map(({ teamId, label }) => {
                  const teamRatings = matchRatings
                    .filter((r) => r.team_id === teamId)
                    .sort((a, b) => (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99));
                  if (teamRatings.length === 0) return null;
                  return (
                    <View key={teamId} style={styles.ratingsSheetTeamSection}>
                      <Text style={styles.ratingsSheetTeamName}>{label}</Text>
                      {teamRatings.map((r) => (
                        <View key={r.player_id} style={styles.ratingsSheetRow}>
                          <View style={styles.ratingsSheetPlayerInfo}>
                            <Text style={styles.ratingsSheetPlayerNumber}>{r.player_number ?? '-'}</Text>
                            <View>
                              <Text style={styles.ratingsSheetPlayerName}>{r.player_name}</Text>
                              <Text style={styles.ratingsSheetPlayerRole}>{translateRole(r.role || '')}</Text>
                            </View>
                          </View>
                          <View style={styles.ratingsSheetValueBox}>
                            <Text style={styles.ratingsSheetValue}>{r.rating}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  // Player ratings bottom sheet
  ratingsSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ratingsSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, maxHeight: '80%' },
  ratingsSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 12 },
  ratingsSheetClose: { position: 'absolute', top: 14, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  ratingsSheetTitle: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 2 },
  ratingsSheetSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  ratingsSheetScroll: { marginBottom: 12 },
  ratingsSheetEmpty: { fontSize: 14, color: '#666', textAlign: 'center', paddingVertical: 32 },
  ratingsSheetTeamSection: { marginBottom: 20 },
  ratingsSheetTeamName: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 10 },
  ratingsSheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  ratingsSheetPlayerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingsSheetPlayerNumber: { width: 28, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#000' },
  ratingsSheetPlayerName: { fontSize: 15, fontWeight: '600', color: '#000' },
  ratingsSheetPlayerRole: { fontSize: 12, color: '#888', marginTop: 1 },
  ratingsSheetValueBox: { minWidth: 36, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#000', alignItems: 'center' },
  ratingsSheetValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  // Private-tournament access code gate
  privateGateContainer: { flex: 1, justifyContent: 'center', padding: 28 },
  privateGateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  privateGateTitle: { fontSize: 22, fontWeight: '800', color: '#000', textAlign: 'center', marginBottom: 8 },
  privateGateDesc: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  privateGateInput: { borderWidth: 2, borderColor: '#000', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 20, fontWeight: '700', letterSpacing: 4, textAlign: 'center', color: '#000' },
  privateGateError: { color: '#D00', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  privateGateButton: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  privateGateButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
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
  matchCardLive: { borderColor: '#E53935', backgroundColor: '#FFF5F5' },
  matchLiveEventLine: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 2 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchCenterContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  matchTeamColumn: { alignItems: 'center', width: 92 },
  matchTeamName: { fontSize: 14, fontWeight: '600', color: '#000', marginTop: 4, textAlign: 'center' },
  matchScore: { fontSize: 22, fontWeight: '700', color: '#000' },
  liveIndicator: { fontSize: 10, fontWeight: '700', color: '#E53935', marginTop: 4, backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  // Tennis LIVE score styles
  tennisLiveScore: { alignItems: 'center', justifyContent: 'center' },
  tennisCurrentGame: { marginTop: 4, alignItems: 'center' },
  tennisGameScore: { fontSize: 12, fontWeight: '600', color: '#666' },
  tennisPointScore: { fontSize: 14, fontWeight: '700', color: '#2D8A2E', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  matchDateTime: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 8 },
  matchActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 10 },
  ratingsSheetButton: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#000', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14, marginTop: 10 },
  ratingsSheetButtonText: { fontSize: 13, fontWeight: '700', color: '#000' },
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
