import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { Button, EmptyState, Loading, Input, FormationModal, SportSelector } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament, Formation, Player, Sport, SPORTS_CONFIG, getSportConfig, getSportEmoji } from '../../src/types';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BasketballMatchModal, TennisMatchModal, PadelMatchModal, VolleyballMatchModal, RugbyMatchModal, HighlightsUploadModal } from '../../src/components';

const CATEGORIES = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Senior', 'Open'];

// Format labels will be handled dynamically with translations

export default function TournamentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();

  // Translation helper functions
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('tournaments.draft');
      case 'active': return t('tournaments.active');
      case 'completed': return t('tournaments.completed');
      default: return status;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'league': return t('tournaments.formatLeague', 'League');
      case 'knockout': return t('tournaments.formatKnockout', 'Knockout');
      case 'groups_knockout': return t('tournaments.formatGroupsKnockout', 'Groups + Knockout');
      default: return format;
    }
  };

  const FORMATS = [
    { value: 'league', label: t('tournaments.formatLeague', 'League') },
    { value: 'knockout', label: t('tournaments.formatKnockout', 'Knockout') },
    { value: 'groups_knockout', label: t('tournaments.formatGroupsKnockout', 'Groups + Knockout') },
  ];
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  
  // Sport selection states
  const [showSportSelector, setShowSportSelector] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sport: 'calcio' as Sport,
    category: 'Open',
    format: 'league',
    game_format: '11v11',
    game_structure: '',
    custom_players_per_side: 11,
    location: '',
    start_date: '',
    start_time: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  // Tournament date/time picker states
  const [showTournamentDatePicker, setShowTournamentDatePicker] = useState(false);
  const [showTournamentTimePicker, setShowTournamentTimePicker] = useState(false);
  const [tournamentDate, setTournamentDate] = useState<Date | null>(null);
  const [tournamentTime, setTournamentTime] = useState<Date | null>(null);

  const loadTournaments = async () => {
    try {
      const response = await api.get('/api/tournaments');
      setTournaments(response.data);
      if (params.id) {
        const tournament = response.data.find((t: Tournament) => t.id === params.id);
        if (tournament) setSelectedTournament(tournament);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadTournaments(); }, [params.id]));

  const onRefresh = () => { setRefreshing(true); loadTournaments(); };

  const handleCreateTournament = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('errors.tournamentNameRequired', 'Tournament name is required'));
      return;
    }
    try {
      setFormLoading(true);
      const response = await api.post('/api/tournaments', formData);
      setTournaments([response.data, ...tournaments]);
      setShowCreateModal(false);
      setSelectedSport(null);
      setFormData({ name: '', description: '', sport: 'calcio' as Sport, category: 'Open', format: 'league', game_format: '11v11', game_structure: '', custom_players_per_side: 11, location: '', start_date: '', start_time: '' });
      setSelectedTournament(response.data);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('errors.createFailed', 'Creation failed'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTournament = async (tournament: Tournament) => {
    Alert.alert(t('tournaments.deleteTournament'), `${t('confirm.deleteTournament', 'Delete')} "${tournament.name}"??`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/tournaments/${tournament.id}`);
          setTournaments(tournaments.filter(t => t.id !== tournament.id));
          if (selectedTournament?.id === tournament.id) setSelectedTournament(null);
        } catch (error) { Alert.alert(t('common.error'), t('errors.deleteFailed', 'Delete failed')); }
      }}
    ]);
  };

  const handleUpdateStatus = async (tournament: Tournament, newStatus: string) => {
    try {
      await api.put(`/api/tournaments/${tournament.id}`, { status: newStatus });
      const updated = { ...tournament, status: newStatus };
      setTournaments(tournaments.map(t => t.id === tournament.id ? updated : t));
      if (selectedTournament?.id === tournament.id) setSelectedTournament(updated as Tournament);
    } catch (error) { Alert.alert(t('common.error'), t('errors.updateFailed', 'Update failed')); }
  };

  if (loading) return <Loading message={t('common.loading')} />;

  // Handle sport selection
  const handleSportSelect = (sport: Sport) => {
    setSelectedSport(sport);
    const sportConfig = getSportConfig(sport);
    const defaultFormat = sportConfig?.formats[0]?.value || '11v11';
    const defaultStructure = sportConfig?.structures?.[0]?.value || '';
    
    setFormData({
      ...formData,
      sport,
      game_format: defaultFormat,
      game_structure: defaultStructure,
    });
    setShowSportSelector(false);
    setShowCreateModal(true);
  };

  // Filter tournaments by sport
  const filteredTournaments = sportFilter === 'all' 
    ? tournaments 
    : tournaments.filter(t => t.sport === sportFilter);

  // Get unique sports from tournaments
  const sportsWithTournaments = [...new Set(tournaments.map(t => t.sport || 'calcio'))];

  if (showSportSelector) {
    return (
      <SportSelector
        onSelectSport={handleSportSelect}
        onBack={() => setShowSportSelector(false)}
      />
    );
  }

  if (selectedTournament) {
    return (
      <TournamentDetail
        tournament={selectedTournament}
        onBack={() => setSelectedTournament(null)}
        onDelete={() => handleDeleteTournament(selectedTournament)}
        onUpdateStatus={handleUpdateStatus}
        onRefresh={loadTournaments}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>I Miei Tornei</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {
          setTournamentDate(null);
          setTournamentTime(null);
          setShowSportSelector(true);
        }}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Sport Filter Pills - Fixed position, horizontal scroll only */}
      {tournaments.length > 0 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={['all', ...sportsWithTournaments]}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item: sport }) => {
              if (sport === 'all') {
                return (
                  <TouchableOpacity
                    style={[styles.filterPill, sportFilter === 'all' && styles.filterPillActive]}
                    onPress={() => setSportFilter('all')}
                  >
                    <Text style={[styles.filterPillText, sportFilter === 'all' && styles.filterPillTextActive]}>{t('home.allSports')}</Text>
                  </TouchableOpacity>
                );
              }
              const sportConfig = getSportConfig(sport as Sport);
              return (
                <TouchableOpacity
                  style={[styles.filterPill, sportFilter === sport && styles.filterPillActive]}
                  onPress={() => setSportFilter(sport as Sport)}
                >
                  <Text style={[styles.filterPillText, sportFilter === sport && styles.filterPillTextActive]}>
                    {sportConfig?.emoji} {sportConfig?.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredTournaments.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={sportFilter === 'all' ? t('tournaments.noTournaments', 'No tournaments') : t('tournaments.noTournamentsForSport', 'No tournaments for this sport')}
            description={sportFilter === 'all' ? t('home.createFirst') : t('tournaments.tryAnotherFilter', 'Try another filter or create a new tournament')}
            actionLabel={t('tournaments.createTournament')}
            onAction={() => {
              setTournamentDate(null);
              setTournamentTime(null);
              setShowSportSelector(true);
            }}
          />
        ) : (
          filteredTournaments.map((tournament) => {
            const sportConfig = getSportConfig(tournament.sport || 'calcio');
            return (
              <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentCard}
                onPress={() => setSelectedTournament(tournament)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.sportEmojiBadge}>{sportConfig?.emoji || '🏆'}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{tournament.name}</Text>
                    <Text style={styles.cardMeta}>{tournament.category} • {tournament.location || t('home.noLocation')}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, tournament.status === 'active' && styles.statusActive]}>
                    <Text style={[styles.statusText, tournament.status === 'active' && styles.statusTextActive]}>
                      {getStatusLabel(tournament.status)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#000" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowCreateModal(false); setSelectedSport(null); }}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCreateModal(false); setSelectedSport(null); }}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedSport ? `${getSportConfig(selectedSport)?.emoji} ${getSportConfig(selectedSport)?.name}` : t('tournaments.newTournament', 'New Tournament')}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Input label={t('tournaments.tournamentNameLabel', 'Tournament Name *')} placeholder={t('tournaments.tournamentNamePlaceholder', 'e.g. Spring Tournament 2025')} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />
            <Input label={t('tournaments.location')} placeholder={t('tournaments.locationPlaceholder', 'e.g. Milan, Field XYZ')} value={formData.location} onChangeText={(text) => setFormData({ ...formData, location: text })} />
            
            {/* Data Field */}
            <Text style={styles.inputLabel}>Data</Text>
            <TouchableOpacity 
              style={styles.newMatchInputWithIcon}
              onPress={() => setShowTournamentDatePicker(true)}
            >
              <Text style={tournamentDate ? styles.inputFieldText : styles.inputFieldPlaceholder}>
                {tournamentDate ? tournamentDate.toLocaleDateString('it-IT') : 'GG/MM/AAAA'}
              </Text>
              <Ionicons name="calendar-outline" size={22} color="#000" />
            </TouchableOpacity>

            {/* Tournament Date Picker - iOS Modal */}
            {showTournamentDatePicker && Platform.OS === 'ios' && (
              <Modal
                transparent
                animationType="fade"
                visible={showTournamentDatePicker}
                onRequestClose={() => setShowTournamentDatePicker(false)}
              >
                <TouchableOpacity 
                  style={styles.pickerModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowTournamentDatePicker(false)}
                >
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowTournamentDatePicker(false)}>
                        <Text style={styles.pickerCancelText}>Annulla</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Seleziona Data</Text>
                      <TouchableOpacity onPress={() => setShowTournamentDatePicker(false)}>
                        <Text style={styles.pickerConfirmText}>Conferma</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tournamentDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTournamentDate(selectedDate);
                          setFormData({ 
                            ...formData, 
                            start_date: selectedDate.toLocaleDateString('it-IT') 
                          });
                        }
                      }}
                      style={{ height: 200 }}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Tournament Date Picker - Android */}
            {showTournamentDatePicker && Platform.OS !== 'ios' && (
              <DateTimePicker
                value={tournamentDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowTournamentDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    setTournamentDate(selectedDate);
                    setFormData({ 
                      ...formData, 
                      start_date: selectedDate.toLocaleDateString('it-IT') 
                    });
                  }
                }}
              />
            )}
            
            {/* Formato Gioco - Dynamic based on sport */}
            {selectedSport && getSportConfig(selectedSport)?.formats && (
              <>
                <Text style={styles.inputLabel}>{t('home.format')}</Text>
                <View style={styles.gameFormatContainer}>
                  {getSportConfig(selectedSport)?.formats.map((gf) => (
                    <TouchableOpacity 
                      key={gf.value} 
                      style={[styles.gameFormatOption, formData.game_format === gf.value && styles.gameFormatSelected]} 
                      onPress={() => setFormData({ ...formData, game_format: gf.value })}
                    >
                      <Text style={[styles.gameFormatText, formData.game_format === gf.value && styles.gameFormatTextSelected]}>{gf.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            
            {/* Game Structure - if sport has structures */}
            {selectedSport && getSportConfig(selectedSport)?.structures && (
              <>
                <Text style={styles.inputLabel}>{t('tournaments.matchStructure', 'Match Structure')}</Text>
                <View style={styles.gameFormatContainer}>
                  {getSportConfig(selectedSport)?.structures?.map((gs) => (
                    <TouchableOpacity 
                      key={gs.value} 
                      style={[styles.gameFormatOption, formData.game_structure === gs.value && styles.gameFormatSelected]} 
                      onPress={() => setFormData({ ...formData, game_structure: gs.value })}
                    >
                      <Text style={[styles.gameFormatText, formData.game_structure === gs.value && styles.gameFormatTextSelected]}>{gs.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            
            {/* Custom players input */}
            {formData.game_format === 'custom' && (
              <View style={styles.customPlayersContainer}>
                <Text style={styles.customPlayersLabel}>Numero giocatori per squadra:</Text>
                <TextInput
                  style={styles.customPlayersInput}
                  value={String(formData.custom_players_per_side)}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 1;
                    setFormData({ ...formData, custom_players_per_side: Math.min(Math.max(num, 1), 20) });
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            )}

            <Text style={styles.inputLabel}>{t('home.category')}</Text>
            <View style={styles.chipContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.chip, formData.category === cat && styles.chipSelected]} onPress={() => setFormData({ ...formData, category: cat })}>
                  <Text style={[styles.chipText, formData.category === cat && styles.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Formato</Text>
            <View style={styles.formatContainer}>
              {FORMATS.map((format) => (
                <TouchableOpacity key={format.value} style={[styles.formatOption, formData.format === format.value && styles.formatSelected]} onPress={() => setFormData({ ...formData, format: format.value })}>
                  <Text style={[styles.formatText, formData.format === format.value && styles.formatTextSelected]}>{format.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 24 }}>
              <Button title="Crea Torneo" onPress={handleCreateTournament} loading={formLoading} fullWidth size="large" />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Tournament Detail Component
function TournamentDetail({ tournament, onBack, onDelete, onUpdateStatus, onRefresh }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newMatchData, setNewMatchData] = useState({ 
    home_team_id: '', 
    away_team_id: '', 
    round: '',
    date: '',
    time: '',
    venue_name: '',
    venue_address: ''
  });
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showAwayDropdown, setShowAwayDropdown] = useState(false);
  // Date/Time picker states
  const [showMatchDatePicker, setShowMatchDatePicker] = useState(false);
  const [showMatchTimePicker, setShowMatchTimePicker] = useState(false);
  const [matchDate, setMatchDate] = useState<Date | null>(null);
  const [matchTime, setMatchTime] = useState<Date | null>(null);
  // New round input state
  const [newRoundInput, setNewRoundInput] = useState('');
  const [customRounds, setCustomRounds] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [playerRatings, setPlayerRatings] = useState<Record<string, Record<string, number>>>({});
  // Teams & Players state
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<any>(null);
  const [newPlayerData, setNewPlayerData] = useState({
    name: '',
    number: '',
    role: '',
    photo: '',
    birthDate: ''
  });
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, any[]>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  // Match Statistics Modal state
  const [showMatchStatsModal, setShowMatchStatsModal] = useState(false);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<any>(null);
  const [matchStatsEvents, setMatchStatsEvents] = useState<any[]>([]);
  const [loadingMatchStats, setLoadingMatchStats] = useState(false);
  // Basketball Match Modal state
  const [showBasketballMatchModal, setShowBasketballMatchModal] = useState(false);
  const [selectedBasketballMatch, setSelectedBasketballMatch] = useState<any>(null);
  // Tennis Match Modal state
  const [showTennisMatchModal, setShowTennisMatchModal] = useState(false);
  const [selectedTennisMatch, setSelectedTennisMatch] = useState<any>(null);
  // Padel Match Modal state
  const [showPadelMatchModal, setShowPadelMatchModal] = useState(false);
  const [selectedPadelMatch, setSelectedPadelMatch] = useState<any>(null);
  // Volleyball Match Modal state
  const [showVolleyballMatchModal, setShowVolleyballMatchModal] = useState(false);
  const [selectedVolleyballMatch, setSelectedVolleyballMatch] = useState<any>(null);
  // Rugby Match Modal state
  const [showRugbyMatchModal, setShowRugbyMatchModal] = useState(false);
  const [selectedRugbyMatch, setSelectedRugbyMatch] = useState<any>(null);
  // Extra Modal state for match events
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);
  const [extraEvents, setExtraEvents] = useState<{
    home: { marcatore: string[]; assist: string[]; giallo: string[]; rosso: string[]; sostEsce: string[]; sostEntra: string[] };
    away: { marcatore: string[]; assist: string[]; giallo: string[]; rosso: string[]; sostEsce: string[]; sostEntra: string[] };
  }>({
    home: { marcatore: [], assist: [], giallo: [], rosso: [], sostEsce: [], sostEntra: [] },
    away: { marcatore: [], assist: [], giallo: [], rosso: [], sostEsce: [], sostEntra: [] }
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [savingEvents, setSavingEvents] = useState(false);
  const [extraEventsInitialized, setExtraEventsInitialized] = useState(false);
  
  // Auto-save extra events when they change (debounced)
  useEffect(() => {
    // Skip initial load and empty states
    if (!showExtraModal || !selectedMatch || !extraEventsInitialized) return;
    
    const timeoutId = setTimeout(() => {
      handleSaveExtraEvents();
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [extraEvents, showExtraModal, selectedMatch, extraEventsInitialized]);
  
  // Formation Modal state
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [selectedTeamForFormation, setSelectedTeamForFormation] = useState<any>(null);
  const [teamFormations, setTeamFormations] = useState<Record<string, Formation | null>>({});
  // News Management state
  const [tournamentNews, setTournamentNews] = useState<any[]>([]);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', photo: '' });
  const [savingNews, setSavingNews] = useState(false);
  
  // Highlights Management state
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [tournamentHighlights, setTournamentHighlights] = useState<any[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);

  useEffect(() => { loadData(); }, [tournament.id]);

  const loadData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        api.get(`/api/tournaments/${tournament.id}/teams`),
        api.get(`/api/tournaments/${tournament.id}/matches`)
      ]);
      setTeams(teamsRes.data);
      setMatches(matchesRes.data);
      
      // For Tennis/Padel, load players for all teams immediately
      if (tournament.sport === 'tennis' || tournament.sport === 'padel') {
        const playersData: Record<string, any[]> = {};
        const virtualFormations: Record<string, Formation | null> = {};
        
        await Promise.all(teamsRes.data.map(async (team: any) => {
          try {
            const playersRes = await api.get(`/api/teams/${team.id}/players`);
            const players = playersRes.data.map((p: any) => ({
              id: p.id,
              name: p.full_name,
              number: p.number,
              role: p.role,
              photo: p.photo,
              birthDate: p.birth_date,
            }));
            playersData[team.id] = players;
            
            // Auto-generate virtual formation for Tennis/Padel if players exist
            const isDoubles = tournament.game_format === 'doppio' || tournament.game_format === 'doubles';
            const requiredPlayers = isDoubles ? 2 : 1;
            if (players.length >= requiredPlayers) {
              virtualFormations[team.id] = {
                id: `virtual_formation_${team.id}`,
                team_id: team.id,
                module: isDoubles ? 'Doppio' : 'Singolo',
                starters: players.slice(0, requiredPlayers).map((p: any, idx: number) => ({
                  player_id: p.id,
                  player_name: p.name,
                  player_number: p.number,
                  position: 'player',
                  slot_index: idx,
                })),
                bench: [],
              };
            }
          } catch (e) {
            playersData[team.id] = [];
          }
        }));
        setTeamPlayers(playersData);
        setTeamFormations(virtualFormations);
      }
    } catch (error) {} finally { setLoading(false); }
  };

  // Load highlights for organizer view
  const loadHighlights = async () => {
    setHighlightsLoading(true);
    try {
      const response = await api.get(`/api/tournaments/${tournament.id}/highlights`);
      setTournamentHighlights(response.data || []);
    } catch (error) {
      console.error('Error loading highlights:', error);
    } finally {
      setHighlightsLoading(false);
    }
  };

  // Load highlights when tab becomes active
  useEffect(() => {
    if (activeTab === 'highlights') {
      loadHighlights();
    }
  }, [activeTab]);

  // Load player statistics from backend
  const loadPlayerStats = async (playerId: string) => {
    setLoadingPlayerStats(true);
    try {
      const response = await api.get(`/api/players/${playerId}/stats`);
      setPlayerStats(response.data);
    } catch (error) {
      console.error('Error loading player stats:', error);
      setPlayerStats(null);
    } finally {
      setLoadingPlayerStats(false);
    }
  };

  // Open player stats modal
  const handleOpenPlayerStats = (player: any) => {
    setSelectedPlayerForStats(player);
    setPlayerStats(null);
    setShowPlayerStatsModal(true);
    loadPlayerStats(player.id);
  };

  // Load match events from backend
  const loadMatchEvents = async (matchId: string, match?: any) => {
    try {
      const response = await api.get(`/api/matches/${matchId}/events`);
      const events = response.data || [];
      
      // Use the passed match or fall back to selectedMatch
      const currentMatch = match || selectedMatch;
      
      // Transform events to the format expected by the UI
      const transformedEvents = events.map((event: any) => {
        const isHomeTeam = currentMatch && event.team_id === currentMatch.home_team_id;
        return {
          team: isHomeTeam ? 'home' : 'away',
          type: event.event_type === 'goal' ? 'goal' : 
                event.event_type === 'assist' ? 'assist' :
                event.event_type === 'yellow_card' ? 'yellow' :
                event.event_type === 'red_card' ? 'red' :
                event.event_type === 'substitution_out' ? 'sub_out' :
                event.event_type === 'substitution_in' ? 'sub_in' : event.event_type,
          player: event.player_name || t('teams.player', 'Player'),
          playerId: event.player_id
        };
      });
      
      setMatchEvents(transformedEvents);
    } catch (error) {
      console.error('Error loading match events:', error);
      setMatchEvents([]);
    }
  };

  // Open match result modal and load events
  const handleOpenMatchResult = async (match: any) => {
    // Check if this is a basketball tournament
    if (tournament?.sport === 'basket') {
      // Load players for both teams
      try {
        const [homePlayersRes, awayPlayersRes] = await Promise.all([
          api.get(`/api/teams/${match.home_team_id}/players`),
          api.get(`/api/teams/${match.away_team_id}/players`)
        ]);
        setHomeTeamPlayers(homePlayersRes.data || []);
        setAwayTeamPlayers(awayPlayersRes.data || []);
      } catch (error) {
        console.error('Error loading players:', error);
      }
      setSelectedBasketballMatch(match);
      setShowBasketballMatchModal(true);
    } else if (tournament?.sport === 'tennis') {
      // Tennis - use tennis modal
      try {
        const [homePlayersRes, awayPlayersRes] = await Promise.all([
          api.get(`/api/teams/${match.home_team_id}/players`),
          api.get(`/api/teams/${match.away_team_id}/players`)
        ]);
        setHomeTeamPlayers(homePlayersRes.data || []);
        setAwayTeamPlayers(awayPlayersRes.data || []);
      } catch (error) {
        console.error('Error loading players:', error);
      }
      // Fetch fresh match data before opening modal
      try {
        const freshMatchRes = await api.get(`/api/matches/${match.id}`);
        setSelectedTennisMatch(freshMatchRes.data);
      } catch (error) {
        console.error('Error fetching fresh match:', error);
        setSelectedTennisMatch(match); // Fallback to passed match
      }
      setShowTennisMatchModal(true);
    } else if (tournament?.sport === 'padel') {
      // Padel - use padel modal
      try {
        const [homePlayersRes, awayPlayersRes] = await Promise.all([
          api.get(`/api/teams/${match.home_team_id}/players`),
          api.get(`/api/teams/${match.away_team_id}/players`)
        ]);
        setHomeTeamPlayers(homePlayersRes.data || []);
        setAwayTeamPlayers(awayPlayersRes.data || []);
      } catch (error) {
        console.error('Error loading players:', error);
      }
      // Fetch fresh match data before opening modal
      try {
        const freshMatchRes = await api.get(`/api/matches/${match.id}`);
        setSelectedPadelMatch(freshMatchRes.data);
      } catch (error) {
        console.error('Error fetching fresh match:', error);
        setSelectedPadelMatch(match); // Fallback to passed match
      }
      setShowPadelMatchModal(true);
    } else if (tournament?.sport === 'pallavolo') {
      // Volleyball - use volleyball modal
      try {
        const [homePlayersRes, awayPlayersRes] = await Promise.all([
          api.get(`/api/teams/${match.home_team_id}/players`),
          api.get(`/api/teams/${match.away_team_id}/players`)
        ]);
        setHomeTeamPlayers(homePlayersRes.data || []);
        setAwayTeamPlayers(awayPlayersRes.data || []);
      } catch (error) {
        console.error('Error loading players:', error);
      }
      // Fetch fresh match data before opening modal
      try {
        const freshMatchRes = await api.get(`/api/matches/${match.id}`);
        setSelectedVolleyballMatch(freshMatchRes.data);
      } catch (error) {
        console.error('Error fetching fresh match:', error);
        setSelectedVolleyballMatch(match);
      }
      setShowVolleyballMatchModal(true);
    } else if (tournament?.sport === 'rugby') {
      // Rugby - use rugby modal
      try {
        const [homePlayersRes, awayPlayersRes] = await Promise.all([
          api.get(`/api/teams/${match.home_team_id}/players`),
          api.get(`/api/teams/${match.away_team_id}/players`)
        ]);
        setHomeTeamPlayers(homePlayersRes.data || []);
        setAwayTeamPlayers(awayPlayersRes.data || []);
      } catch (error) {
        console.error('Error loading players:', error);
      }
      // Fetch fresh match data before opening modal
      try {
        const freshMatchRes = await api.get(`/api/matches/${match.id}`);
        setSelectedRugbyMatch(freshMatchRes.data);
      } catch (error) {
        console.error('Error fetching fresh match:', error);
        setSelectedRugbyMatch(match);
      }
      setShowRugbyMatchModal(true);
    } else {
      // Football - use existing modal
      setSelectedMatch(match);
      setMatchEvents([]);
      await loadMatchEvents(match.id, match);
    }
  };

  // Open match statistics modal
  const handleOpenMatchStats = async (match: any) => {
    setSelectedMatchForStats(match);
    setMatchStatsEvents([]);
    setLoadingMatchStats(true);
    setShowMatchStatsModal(true);
    
    try {
      const response = await api.get(`/api/matches/${match.id}/events`);
      const events = response.data || [];
      setMatchStatsEvents(events);
    } catch (error) {
      console.error('Error loading match stats:', error);
      setMatchStatsEvents([]);
    } finally {
      setLoadingMatchStats(false);
    }
  };

  // Memoize grouped matches to prevent re-computation on every render
  const groupedMatches = React.useMemo(() => {
    const matchesByRound = matches.reduce((acc: Record<string, any[]>, match: any) => {
      const round = match.round || 'Altro';
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    }, {});
    // Sort rounds in ascending order (Giornata 1, 2, 3...)
    return Object.entries(matchesByRound).sort((a, b) => {
      const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
      const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [matches]);

  // Get existing round names and next round number
  const existingRounds = React.useMemo(() => {
    const matchRounds = [...new Set(matches.map(m => m.round))].filter(Boolean);
    const allRounds = [...new Set([...matchRounds, ...customRounds])];
    return allRounds.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [matches, customRounds]);

  const nextRoundNumber = React.useMemo(() => {
    if (existingRounds.length === 0) return 1;
    const lastRound = existingRounds[existingRounds.length - 1];
    const num = parseInt(lastRound.replace(/\D/g, '')) || 0;
    return num + 1;
  }, [existingRounds]);

  // Add new round to list
  const handleAddNewRound = () => {
    const roundName = newRoundInput.trim() || `Giornata ${nextRoundNumber}`;
    if (!existingRounds.includes(roundName)) {
      setCustomRounds(prev => [...prev, roundName]);
      setNewMatchData({ ...newMatchData, round: roundName });
    } else {
      setNewMatchData({ ...newMatchData, round: roundName });
    }
    setNewRoundInput('');
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) { Alert.alert(t('common.error'), t('errors.nameRequired', 'Name required')); return; }
    try {
      const response = await api.post(`/api/tournaments/${tournament.id}/teams`, { name: newTeamName });
      setTeams([...teams, response.data]);
      setShowAddTeamModal(false);
      setNewTeamName('');
    } catch (error: any) { Alert.alert(t('common.error'), error.response?.data?.detail || t('errors.addFailed', 'Add failed')); }
  };

  const handleAddMatch = async () => {
    if (!newMatchData.home_team_id || !newMatchData.away_team_id) { Alert.alert(t('common.error'), t('errors.selectBothTeams', 'Select both teams')); return; }
    if (newMatchData.home_team_id === newMatchData.away_team_id) { Alert.alert(t('common.error'), t('errors.differentTeams', 'Different teams required')); return; }
    if (!newMatchData.round) { Alert.alert(t('common.error'), t('errors.selectRound', 'Select a round')); return; }
    try {
      const matchPayload = {
        home_team_id: newMatchData.home_team_id,
        away_team_id: newMatchData.away_team_id,
        round: newMatchData.round,
        match_date: matchDate ? matchDate.toISOString().split('T')[0] : undefined,
        match_time: matchTime ? matchTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : undefined,
        venue_name: newMatchData.venue_name || undefined,
        venue_address: newMatchData.venue_address || undefined,
      };
      const response = await api.post(`/api/tournaments/${tournament.id}/matches`, matchPayload);
      setMatches([...matches, response.data]);
      setShowAddMatchModal(false);
      setNewMatchData({ home_team_id: '', away_team_id: '', round: '', date: '', time: '', venue_name: '', venue_address: '' });
      setMatchDate(null);
      setMatchTime(null);
      setShowHomeDropdown(false);
      setShowAwayDropdown(false);
    } catch (error: any) { Alert.alert(t('common.error'), error.response?.data?.detail || t('errors.addFailed', 'Add failed')); }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try { await api.delete(`/api/teams/${teamId}`); setTeams(teams.filter(t => t.id !== teamId)); } catch (e) { Alert.alert(t('common.error')); }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try { await api.delete(`/api/matches/${matchId}`); setMatches(matches.filter(m => m.id !== matchId)); } catch (e) { Alert.alert(t('common.error')); }
  };

  const handleUpdateResult = async (match: any, homeGoals: number, awayGoals: number) => {
    try {
      await api.put(`/api/matches/${match.id}`, { home_goals: homeGoals, away_goals: awayGoals, status: 'completed' });
      setMatches(matches.map(m => m.id === match.id ? { ...m, home_goals: homeGoals, away_goals: awayGoals, status: 'completed' } : m));
    } catch (e) { Alert.alert(t('common.error')); }
  };

  // Auto-save function for live score updates (all sports)
  const autoSaveMatchScore = async (matchId: string, homeGoals: number, awayGoals: number) => {
    try {
      await api.put(`/api/matches/${matchId}`, { 
        home_goals: homeGoals, 
        away_goals: awayGoals, 
        status: 'in_progress' // Keep as in_progress for LIVE updates
      });
      // Update local state
      setMatches(matches.map(m => m.id === matchId ? { ...m, home_goals: homeGoals, away_goals: awayGoals, status: 'in_progress' } : m));
    } catch (e) { 
      console.error('Auto-save error:', e);
    }
  };

  // Debounced auto-save timeout ref
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const triggerAutoSaveScore = (matchId: string, homeGoals: number, awayGoals: number) => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    const timeout = setTimeout(() => {
      autoSaveMatchScore(matchId, homeGoals, awayGoals);
    }, 500); // 500ms debounce
    setAutoSaveTimeout(timeout);
  };

  // Player management functions
  const handleOpenAddPlayer = (team: any) => {
    setSelectedTeamForPlayer(team);
    setNewPlayerData({ name: '', number: '', role: '', photo: '', birthDate: '' });
    setSelectedDate(null);
    setShowAddPlayerModal(true);
  };

  // Image Picker function
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('errors.permissionDenied', 'Permission denied'), t('errors.galleryPermission', 'Gallery permission required'));
      return;
    }

    // Show action sheet to choose camera or gallery
    Alert.alert(
      t('common.selectPhoto', 'Select photo'),
      'Scegli da dove caricare la foto',
      [
        {
          text: t('common.camera', 'Camera'),
          onPress: async () => {
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus.status !== 'granted') {
              Alert.alert(t('errors.permissionDenied', 'Permission denied'), 'Serve il permesso per usare la fotocamera');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setNewPlayerData({ ...newPlayerData, photo: result.assets[0].uri });
            }
          }
        },
        {
          text: 'Galleria',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setNewPlayerData({ ...newPlayerData, photo: result.assets[0].uri });
            }
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  // Date Picker handlers
  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      setNewPlayerData({ ...newPlayerData, birthDate: formattedDate });
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleAddPlayer = async () => {
    if (!newPlayerData.name.trim()) { Alert.alert(t('common.error'), t('errors.nameRequired', 'Name required')); return; }
    if (!selectedTeamForPlayer) return;
    
    try {
      // Call backend API to create player
      const response = await api.post(`/api/teams/${selectedTeamForPlayer.id}/players`, {
        full_name: newPlayerData.name,
        number: newPlayerData.number ? parseInt(newPlayerData.number) : null,
        role: newPlayerData.role || null,
        photo: newPlayerData.photo || null,
        birth_date: newPlayerData.birthDate || null,
      });
      
      // Add to local state from API response
      const savedPlayer = response.data;
      setTeamPlayers(prev => ({
        ...prev,
        [selectedTeamForPlayer.id]: [...(prev[selectedTeamForPlayer.id] || []), {
          id: savedPlayer.id,
          name: savedPlayer.full_name,
          number: savedPlayer.number,
          role: savedPlayer.role,
          photo: savedPlayer.photo,
          birthDate: savedPlayer.birth_date,
        }]
      }));
      
      setShowAddPlayerModal(false);
      setNewPlayerData({ name: '', number: '', role: '', photo: '', birthDate: '' });
      Alert.alert(t('common.success'), t('success.playerAdded', 'Player added'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || 'Impossibile aggiungere giocatore');
    }
  };

  const handleDeleteTeamConfirm = (teamId: string, teamName: string) => {
    Alert.alert(
      t('teams.deleteTeam'),
      `Sei sicuro di voler eliminare ${teamName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDeleteTeam(teamId) }
      ]
    );
  };

  // Load players for Extra modal
  const loadPlayersForExtraModal = async (homeTeamId: string, awayTeamId: string) => {
    try {
      const [homeRes, awayRes] = await Promise.all([
        api.get(`/api/teams/${homeTeamId}/players`),
        api.get(`/api/teams/${awayTeamId}/players`)
      ]);
      const mapPlayers = (data: any[]) => data.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        number: p.number,
        role: p.role,
      }));
      setHomeTeamPlayers(mapPlayers(homeRes.data));
      setAwayTeamPlayers(mapPlayers(awayRes.data));
    } catch (error) {
      console.error('Error loading players for extra modal:', error);
    }
  };

  // Open Extra modal and load players + existing events
  const handleOpenExtraModal = async () => {
    if (selectedMatch) {
      await loadPlayersForExtraModal(selectedMatch.home_team_id, selectedMatch.away_team_id);
      
      // Load existing events for this match
      try {
        const eventsRes = await api.get(`/api/matches/${selectedMatch.id}/events`);
        const existingEvents = eventsRes.data || [];
        
        // Transform events into the extraEvents structure
        const newExtraEvents = {
          home: { marcatore: [] as string[], assist: [] as string[], giallo: [] as string[], rosso: [] as string[], sostEsce: [] as string[], sostEntra: [] as string[] },
          away: { marcatore: [] as string[], assist: [] as string[], giallo: [] as string[], rosso: [] as string[], sostEsce: [] as string[], sostEntra: [] as string[] }
        };
        
        existingEvents.forEach((event: any) => {
          const isHome = event.team_id === selectedMatch.home_team_id;
          const team = isHome ? 'home' : 'away';
          
          switch (event.event_type) {
            case 'goal':
              newExtraEvents[team].marcatore.push(event.player_id);
              break;
            case 'assist':
              newExtraEvents[team].assist.push(event.player_id);
              break;
            case 'yellow_card':
              newExtraEvents[team].giallo.push(event.player_id);
              break;
            case 'red_card':
              newExtraEvents[team].rosso.push(event.player_id);
              break;
            case 'substitution_out':
              newExtraEvents[team].sostEsce.push(event.player_id);
              break;
            case 'substitution_in':
              newExtraEvents[team].sostEntra.push(event.player_id);
              break;
          }
        });
        
        setExtraEvents(newExtraEvents);
        console.log('Loaded existing events:', newExtraEvents);
        // Mark as initialized after loading
        setTimeout(() => setExtraEventsInitialized(true), 100);
      } catch (error) {
        console.error('Error loading existing events:', error);
        // Reset to empty if loading fails
        setExtraEvents({
          home: { marcatore: [], assist: [], giallo: [], rosso: [], sostEsce: [], sostEntra: [] },
          away: { marcatore: [], assist: [], giallo: [], rosso: [], sostEsce: [], sostEntra: [] }
        });
        setTimeout(() => setExtraEventsInitialized(true), 100);
      }
      
      // Also load existing ratings
      setPlayerRatings({});
      
      setShowExtraModal(true);
    }
  };

  // Reset extraEventsInitialized when modal closes
  useEffect(() => {
    if (!showExtraModal) {
      setExtraEventsInitialized(false);
    }
  }, [showExtraModal]);

  // Save extra events to backend using batch endpoint
  const handleSaveExtraEvents = async () => {
    if (!selectedMatch) return;
    
    setSavingEvents(true);
    
    try {
      // Build events array for backend
      const events: any[] = [];
      
      // Home team events
      const homeTeam = teams.find(t => t.id === selectedMatch.home_team_id);
      extraEvents.home.marcatore.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.home_team_id, event_type: 'goal' });
      });
      extraEvents.home.assist.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.home_team_id, event_type: 'assist' });
      });
      extraEvents.home.giallo.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.home_team_id, event_type: 'yellow_card' });
      });
      extraEvents.home.rosso.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.home_team_id, event_type: 'red_card' });
      });
      extraEvents.home.sostEsce.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.home_team_id, event_type: 'substitution_out' });
      });
      extraEvents.home.sostEntra.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.home_team_id, event_type: 'substitution_in' });
      });
      
      // Away team events
      extraEvents.away.marcatore.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.away_team_id, event_type: 'goal' });
      });
      extraEvents.away.assist.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.away_team_id, event_type: 'assist' });
      });
      extraEvents.away.giallo.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.away_team_id, event_type: 'yellow_card' });
      });
      extraEvents.away.rosso.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.away_team_id, event_type: 'red_card' });
      });
      extraEvents.away.sostEsce.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.away_team_id, event_type: 'substitution_out' });
      });
      extraEvents.away.sostEntra.forEach(playerId => {
        events.push({ player_id: playerId, team_id: selectedMatch.away_team_id, event_type: 'substitution_in' });
      });
      
      // Calculate score from marcatori
      const homeGoals = extraEvents.home.marcatore.length;
      const awayGoals = extraEvents.away.marcatore.length;
      
      console.log('Saving events:', {
        events,
        eventsCount: events.length,
        homeGoals,
        awayGoals,
        extraEvents,
        playerRatings
      });
      
      // Send batch request to backend
      const response = await api.post(`/api/matches/${selectedMatch.id}/events/batch`, {
        events,
        ratings: playerRatings,
        home_goals: homeGoals,
        away_goals: awayGoals
      });
      
      console.log('Save response:', response.data);
      
      // Update local match state with new score
      const updatedMatch = {
        ...selectedMatch,
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: 'in_progress'
      };
      setSelectedMatch(updatedMatch);
      
      // Refresh matches list to show updated score (silently)
      const matchesRes = await api.get(`/api/tournaments/${tournament.id}/matches`);
      setMatches(matchesRes.data);
      
      // Don't show alert or close modal - this is auto-save
      console.log('Auto-save completed successfully');
      
    } catch (error: any) {
      console.error('Error saving events:', error);
      // Don't show alert for auto-save errors to avoid spam
    } finally {
      setSavingEvents(false);
    }
  };

  // Load players when expanding a team
  const loadTeamPlayers = async (teamId: string) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/players`);
      const players = response.data.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        number: p.number,
        role: p.role,
        photo: p.photo,
        birthDate: p.birth_date,
      }));
      setTeamPlayers(prev => ({ ...prev, [teamId]: players }));
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const toggleTeamExpand = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      // Load players from backend if not already loaded
      if (!teamPlayers[teamId]) {
        await loadTeamPlayers(teamId);
      }
    }
  };

  // Dynamic player roles based on sport
  const getPlayerRoles = () => {
    const sport = tournament?.sport || 'calcio';
    switch (sport) {
      case 'basket':
        return ['Playmaker', 'Guardia', 'Ala Piccola', 'Ala Grande', 'Centro'];
      case 'pallavolo':
        return ['Palleggiatore', 'Schiacciatore', 'Opposto', 'Libero', 'Centrale'];
      case 'rugby':
        return ['Pilone', 'Tallonatore', 'Flanker', 'Mediano', 'Ala', 'Centro', 'Estremo'];
      case 'baseball':
        return ['Lanciatore', 'Ricevitore', 'Prima Base', 'Seconda Base', 'Terza Base', 'Interbase', 'Esterno'];
      case 'tennis':
      case 'padel':
        return []; // Tennis e Padel non hanno ruoli specifici
      default:
        return ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
    }
  };

  const PLAYER_ROLES = getPlayerRoles();
  
  // Check if sport has roles (tennis/padel don't)
  const sportHasRoles = tournament ? (tournament.sport !== 'tennis' && tournament.sport !== 'padel') : true;

  // Tennis/Padel specific labels
  const isTennisSport = tournament?.sport === 'tennis' || tournament?.sport === 'padel';
  const isDoubles = tournament?.game_format === 'doppio' || tournament?.game_format === 'doubles';
  
  // Get appropriate labels based on sport
  const getTeamLabel = (plural = false) => {
    if (!isTennisSport) return plural ? t('teams.title') : t('teams.team', 'Team');
    if (isDoubles) return plural ? t('teams.doubles', 'Doubles') : t('teams.double', 'Double');
    return plural ? t('teams.players') : t('teams.player', 'Player');
  };
  
  // Get unique rounds from matches for Highlights upload
  const getRounds = () => {
    const roundsSet = new Set(matches.map(m => m.round || `${t('matches.round')} 1`));
    return Array.from(roundsSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  };
  
  // Get display name for a team (for Tennis, show player names instead of team name)
  const getTeamDisplayName = (team: any) => {
    if (!isTennisSport) return team.name;
    
    // For tennis/padel, try to show player names
    const players = teamPlayers[team.id] || [];
    if (players.length === 0) return team.name;
    
    if (isDoubles && players.length >= 2) {
      // Show both players for doubles
      return `${players[0]?.full_name || '?'} / ${players[1]?.full_name || '?'}`;
    }
    // Singles: show first player name
    return players[0]?.full_name || team.name;
  };

  const handleDeletePlayer = async (teamId: string, playerId: string) => {
    Alert.alert(
      t('teams.deletePlayer', 'Delete Player'),
      'Sei sicuro di voler eliminare questo giocatore?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/api/players/${playerId}`);
            setTeamPlayers(prev => ({
              ...prev,
              [teamId]: (prev[teamId] || []).filter(p => p.id !== playerId)
            }));
          } catch (error: any) {
            Alert.alert(t('common.error'), 'Impossibile eliminare giocatore');
          }
        }}
      ]
    );
  };

  const getTeamName = (teamId: string) => teams.find(team => team.id === teamId)?.name || t('teams.team', 'Team');

  const getStatusLabel = (status: string) => {
    switch (status) { case 'active': return t('matches.live'); case 'completed': return t('matches.finished'); default: return t('tournaments.draft'); }
  };

  // Load formation for a team
  const loadTeamFormation = async (teamId: string) => {
    try {
      const response = await api.get(`/api/teams/${teamId}/formation`);
      if (response.data) {
        setTeamFormations(prev => ({ ...prev, [teamId]: response.data }));
      }
    } catch (error) {
      console.log('No formation found for team', teamId);
    }
  };

  // Open Formation Modal
  const handleOpenFormation = async (team: any) => {
    // Load players if not already loaded
    if (!teamPlayers[team.id]) {
      await loadTeamPlayers(team.id);
    }
    // Load existing formation
    await loadTeamFormation(team.id);
    setSelectedTeamForFormation(team);
    setShowFormationModal(true);
  };

  // Handle formation save
  const handleFormationSave = (formation: Formation) => {
    setTeamFormations(prev => ({ ...prev, [formation.team_id]: formation }));
  };

  // ===== NEWS MANAGEMENT =====
  // Load news for tournament
  const loadNews = async () => {
    try {
      const response = await api.get(`/api/tournaments/${tournament.id}/news?published_only=false`);
      setTournamentNews(response.data || []);
    } catch (error) {
      console.error('Error loading news:', error);
    }
  };

  // Open news modal for create/edit
  const handleOpenNewsModal = (news?: any) => {
    if (news) {
      setEditingNews(news);
      setNewsForm({ title: news.title, content: news.content, photo: news.photo || '' });
    } else {
      setEditingNews(null);
      setNewsForm({ title: '', content: '', photo: '' });
    }
    setShowNewsModal(true);
  };

  // Pick photo for news
  const handlePickNewsPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setNewsForm(prev => ({ ...prev, photo: `data:image/jpeg;base64,${result.assets[0].base64}` }));
    }
  };

  // Save news (create or update)
  const handleSaveNews = async () => {
    if (!newsForm.title.trim()) {
      Alert.alert(t('common.error'), t('errors.titleRequired', 'Title is required'));
      return;
    }
    setSavingNews(true);
    try {
      if (editingNews) {
        // Update existing news
        await api.put(`/api/news/${editingNews.id}`, {
          title: newsForm.title,
          content: newsForm.content,
          photo: newsForm.photo || null,
          is_published: true
        });
        Alert.alert(t('common.success'), t('success.newsUpdated', 'News updated!'));
      } else {
        // Create new news
        await api.post(`/api/tournaments/${tournament.id}/news`, {
          title: newsForm.title,
          content: newsForm.content,
          photo: newsForm.photo || null,
          is_published: true
        });
        Alert.alert(t('common.success'), t('success.newsPublished', 'News published!'));
      }
      setShowNewsModal(false);
      loadNews();
    } catch (error) {
      console.error('Error saving news:', error);
      Alert.alert(t('common.error'), 'Impossibile salvare la news');
    } finally {
      setSavingNews(false);
    }
  };

  // Delete news
  const handleDeleteNews = (newsId: string, title: string) => {
    Alert.alert(
      'Elimina News',
      `Sei sicuro di voler eliminare "${title}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/news/${newsId}`);
              loadNews();
              Alert.alert(t('common.success'), t('success.newsDeleted', 'News deleted'));
            } catch (error) {
              Alert.alert(t('common.error'), 'Impossibile eliminare la news');
            }
          }
        }
      ]
    );
  };

  // Load news when tab changes to news
  useEffect(() => {
    if (activeTab === 'news') {
      loadNews();
    }
  }, [activeTab]);

  // Format date for display
  const formatMatchDateTime = (match: any) => {
    let result = '';
    if (match.match_date) {
      const date = new Date(match.match_date);
      result = date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    if (match.match_time) {
      result += result ? ` • ${match.match_time}` : match.match_time;
    }
    return result || '';
  };

  // Get sport-specific icon
  const getSportIcon = (): 'football' | 'basketball' | 'tennisball' | 'american-football' | 'baseball' | 'fitness' => {
    const sport = tournament?.sport || 'calcio';
    switch (sport) {
      case 'basket': return 'basketball';
      case 'tennis':
      case 'padel': return 'tennisball';
      case 'rugby': return 'american-football';
      default: return 'football';
    }
  };

  const sportIcon = getSportIcon();

  // Dynamic tab labels based on sport
  const tabs: { id: string; label: string; icon: string }[] = [
    { id: 'teams', label: getTeamLabel(true), icon: isTennisSport ? 'person' : 'people' },
    { id: 'matches', label: t('matches.title'), icon: sportIcon },
    { id: 'results', label: t('matches.results'), icon: 'create' },
    { id: 'news', label: t('home.featureNews', 'News'), icon: 'newspaper' },
    { id: 'highlights', label: t('highlights.title'), icon: 'film' },
    { id: 'settings', label: t('profile.settings'), icon: 'settings' }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.detailHeaderInfo}>
          <Text style={styles.detailTitle} numberOfLines={1}>{tournament.name}</Text>
          <Text style={styles.detailMeta}>{tournament.category}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/tournament/${tournament.slug}`)}>
          <Ionicons name="eye-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon} size={18} color={activeTab === tab.id ? '#FFF' : '#000'} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.detailContent} contentContainerStyle={styles.detailContentContainer} showsVerticalScrollIndicator={false}>
        {loading ? <Loading /> : (
          <>
            {activeTab === 'teams' && (
              <View>
                <TouchableOpacity style={styles.addTeamBtn} onPress={() => setShowAddTeamModal(true)}>
                  <Ionicons name="add" size={22} color="#FFF" />
                  <Text style={styles.addTeamBtnText}>{t('common.add', 'Add')} {getTeamLabel()}</Text>
                </TouchableOpacity>
                <View style={{ height: 16 }} />
                {teams.length === 0 ? <EmptyState icon="people-outline" title={t('tournaments.noTeams')} /> : (
                  teams.map((team) => (
                    <View key={team.id} style={styles.teamCardNew}>
                      {/* Team Row with all elements */}
                      <View style={styles.teamRowFull}>
                        {/* Left: Avatar + Name + Chevron */}
                        <TouchableOpacity style={styles.teamLeftSection} onPress={() => toggleTeamExpand(team.id)}>
                          <View style={styles.teamAvatarNew}>
                            <Text style={styles.teamAvatarText}>
                              {isTennisSport ? '🎾' : team.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.teamNameNew}>{getTeamDisplayName(team)}</Text>
                          <Ionicons name={expandedTeamId === team.id ? "chevron-down" : "chevron-forward"} size={20} color="#000" />
                        </TouchableOpacity>
                        {/* Right: Action Buttons */}
                        <View style={styles.teamActionBtns}>
                          {/* For Tennis singles, hide add player button after 1 player, for doubles after 2 */}
                          {(!isTennisSport || (teamPlayers[team.id]?.length || 0) < (isDoubles ? 2 : 1)) && (
                            <TouchableOpacity style={styles.teamActionBtn} onPress={() => handleOpenAddPlayer(team)}>
                              <Ionicons name="add" size={20} color="#FFF" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={styles.formationBtn} onPress={() => handleOpenFormation(team)}>
                            <Ionicons name="grid" size={18} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.teamActionBtn} onPress={() => handleDeleteTeamConfirm(team.id, team.name)}>
                            <Ionicons name="trash" size={18} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Formation Badge */}
                      {teamFormations[team.id] && (
                        <View style={styles.formationBadge}>
                          <Ionicons name="grid" size={14} color="#2D8A2E" />
                          <Text style={styles.formationBadgeText}>{teamFormations[team.id]?.module}</Text>
                        </View>
                      )}
                      {/* Players Accordion */}
                      {expandedTeamId === team.id && (
                        <View style={styles.playersAccordion}>
                          {(teamPlayers[team.id] || []).length === 0 ? (
                            <Text style={styles.noPlayersText}>{t('teams.noPlayers', 'No players')}</Text>
                          ) : (
                            (teamPlayers[team.id] || []).map((player) => (
                              <View key={player.id} style={styles.playerRow}>
                                {/* Player Avatar */}
                                {player.photo ? (
                                  <Image source={{ uri: player.photo }} style={styles.playerAvatar} />
                                ) : (
                                  <View style={styles.playerAvatarPlaceholder}>
                                    <Text style={styles.playerAvatarInitials}>
                                      {player.name ? player.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                    </Text>
                                  </View>
                                )}
                                {/* Player Info */}
                                <View style={styles.playerInfo}>
                                  <Text style={styles.playerNameBold}>{player.name}</Text>
                                  <Text style={styles.playerRoleText}>{player.role || '-'}</Text>
                                </View>
                                {/* Right Section: Stats + Delete + Number */}
                                <View style={styles.playerRightSection}>
                                  <TouchableOpacity 
                                    style={styles.playerStatsBtn}
                                    onPress={() => handleOpenPlayerStats(player)}
                                  >
                                    <Ionicons name="stats-chart" size={18} color="#666" />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={styles.playerDeleteBtn} 
                                    onPress={() => handleDeletePlayer(team.id, player.id)}
                                  >
                                    <Ionicons name="trash-outline" size={18} color="#666" />
                                  </TouchableOpacity>
                                  <View style={styles.playerNumberBox}>
                                    <Text style={styles.playerNumberLabel}>Nº</Text>
                                    <Text style={styles.playerNumberValue}>{player.number || '-'}</Text>
                                  </View>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'matches' && (
              <View>
                <Button title={t('matches.addMatch', 'Add Match')} onPress={() => {
                  setMatchDate(null);
                  setMatchTime(null);
                  setNewMatchData({ home_team_id: '', away_team_id: '', round: '', date: '', time: '', venue_name: '', venue_address: '' });
                  setShowAddMatchModal(true);
                }} icon="add" fullWidth disabled={teams.length < 2} />
                {teams.length < 2 && <Text style={styles.warningText}>{t('common.add', 'Add')} almeno 2 squadre</Text>}
                <View style={{ height: 16 }} />
                {matches.length === 0 ? <EmptyState icon={`${sportIcon}-outline` as any} title={t('matches.noMatchesScheduled')} /> : (
                  groupedMatches.map(([round, roundMatches]) => (
                    <View key={round} style={styles.matchDayGroup}>
                      <View style={styles.matchDayHeader}>
                        <Text style={styles.matchDayTitle}>{round}</Text>
                        <TouchableOpacity onPress={() => {
                          Alert.alert(t('matches.deleteRound', 'Delete Round'), t('matches.deleteRoundConfirm', `Delete all matches from ${round}?`), [
                            { text: t('common.no') },
                            { text: t('common.yes'), onPress: async () => {
                              for (const m of roundMatches) {
                                await handleDeleteMatch(m.id);
                              }
                            }}
                          ]);
                        }}>
                          <Ionicons name="trash" size={22} color="#000" />
                        </TouchableOpacity>
                      </View>
                      {roundMatches.map((match: any) => (
                        <View key={match.id} style={styles.matchPillCard}>
                          <View style={styles.matchPillMain}>
                            <Text style={styles.matchPillTeam}>{getTeamName(match.home_team_id)}</Text>
                            <Text style={styles.matchPillScore}>
                              {match.home_goals ?? 0} - {match.away_goals ?? 0}
                            </Text>
                            <Text style={styles.matchPillTeam}>{getTeamName(match.away_team_id)}</Text>
                          </View>
                          {formatMatchDateTime(match) ? (
                            <Text style={styles.matchPillDateTime}>{formatMatchDateTime(match)}</Text>
                          ) : null}
                          <TouchableOpacity 
                            style={styles.matchStatsBtn}
                            onPress={() => handleOpenMatchStats(match)}
                          >
                            <Ionicons name="stats-chart" size={16} color="#666" />
                            <Text style={styles.matchStatsBtnText}>{t('stats.title')}</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'results' && (
              <View>
                {(() => {
                  // Filter only matches that are NOT completed (in corso or pending)
                  const matchesInCorso = matches.filter(m => m.status !== 'completed');
                  
                  if (matchesInCorso.length === 0) {
                    return <EmptyState icon={`${sportIcon}-outline` as any} title={t('matches.noLiveMatches', 'No live matches')} />;
                  }
                  
                  return (
                    <>
                      <Text style={styles.resultsTitle}>{t('matches.selectMatch', 'Select match to manage')}</Text>
                      {matchesInCorso.map((match) => (
                        <TouchableOpacity 
                          key={match.id} 
                          style={styles.matchSelectCard}
                          onPress={() => handleOpenMatchResult(match)}
                        >
                          <View style={styles.matchSelectRow}>
                            <Text style={styles.matchSelectTeam}>{getTeamName(match.home_team_id)}</Text>
                            <View style={styles.matchSelectScoreBox}>
                              <Text style={styles.matchSelectScore}>{match.home_goals ?? 0}</Text>
                            </View>
                            <Text style={styles.matchSelectDash}>-</Text>
                            <View style={styles.matchSelectScoreBox}>
                              <Text style={styles.matchSelectScore}>{match.away_goals ?? 0}</Text>
                            </View>
                            <Text style={styles.matchSelectTeam}>{getTeamName(match.away_team_id)}</Text>
                          </View>
                          <View style={styles.matchSelectFooter}>
                            <View style={styles.matchSelectBadgeInCorso}>
                              <Text style={styles.matchSelectBadgeTextInCorso}>In corso</Text>
                            </View>
                            <View style={styles.matchEditIcon}>
                              <Ionicons name="create-outline" size={20} color="#000" />
                              <Ionicons name="chevron-forward" size={18} color="#000" />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  );
                })()}
              </View>
            )}

            {/* News Tab */}
            {activeTab === 'news' && (
              <View>
                {/* Add News Button */}
                <TouchableOpacity 
                  style={styles.addNewsButton} 
                  onPress={() => handleOpenNewsModal()}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.addNewsButtonText}>{t('news.newNews', 'New News')}</Text>
                </TouchableOpacity>

                {/* News List */}
                {tournamentNews.length === 0 ? (
                  <EmptyState icon="newspaper-outline" title={t('tournaments.noNews', 'No news')} />
                ) : (
                  tournamentNews.map((news) => (
                    <View key={news.id} style={styles.newsCard}>
                      {news.photo && (
                        <Image source={{ uri: news.photo }} style={styles.newsCardImage} />
                      )}
                      <View style={styles.newsCardContent}>
                        <Text style={styles.newsCardTitle}>{news.title}</Text>
                        {news.content && (
                          <Text style={styles.newsCardDescription} numberOfLines={3}>{news.content}</Text>
                        )}
                        <Text style={styles.newsCardDate}>
                          {news.published_at ? new Date(news.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Non pubblicata'}
                        </Text>
                      </View>
                      <View style={styles.newsCardActions}>
                        <TouchableOpacity 
                          style={styles.newsEditBtn}
                          onPress={() => handleOpenNewsModal(news)}
                        >
                          <Ionicons name="pencil" size={18} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.newsDeleteBtn}
                          onPress={() => handleDeleteNews(news.id, news.title)}
                        >
                          <Ionicons name="trash" size={18} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Highlights Tab */}
            {activeTab === 'highlights' && (
              <View style={styles.highlightsTabContent}>
                <TouchableOpacity 
                  style={styles.addNewsButton} 
                  onPress={() => setShowHighlightsModal(true)}
                >
                  <Ionicons name="film" size={20} color="#FFF" />
                  <Text style={styles.addNewsButtonText}>{t('highlights.upload', 'Upload Highlights')}</Text>
                </TouchableOpacity>
                
                {highlightsLoading ? (
                  <View style={styles.highlightsLoadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.highlightsLoadingText}>{t('common.loading')}</Text>
                  </View>
                ) : tournamentHighlights.length === 0 ? (
                  <View style={styles.highlightsInfoCard}>
                    <Ionicons name="information-circle" size={24} color="#666" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.highlightsInfoTitle}>{t('highlights.noHighlights')}</Text>
                      <Text style={styles.highlightsInfoText}>
                        {t('highlights.uploadInfo', 'Upload photos and videos of matches. Content will only be accessible by entering the code you can share with anyone.')}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.highlightsList}>
                    {tournamentHighlights.map((roundData: any) => (
                      <View key={roundData.round} style={styles.highlightsRoundSection}>
                        <View style={styles.highlightsRoundHeader}>
                          <Text style={styles.highlightsRoundTitle}>{roundData.round}</Text>
                          <Text style={styles.highlightsRoundStats}>
                            {roundData.photo_count} foto · {roundData.video_count} video
                          </Text>
                        </View>
                        
                        {roundData.highlights.filter((h: any) => h.file_type === 'photo').length > 0 ? (
                          <View style={styles.highlightsPhotosGrid}>
                            {roundData.highlights
                              .filter((h: any) => h.file_type === 'photo')
                              .map((photo: any) => (
                                <View key={photo.id} style={styles.highlightsPhotoThumbnail}>
                                  <Image
                                    source={{ uri: `${api.defaults.baseURL}${photo.file_url}` }}
                                    style={styles.highlightsPhotoImage}
                                    resizeMode="cover"
                                  />
                                </View>
                              ))}
                          </View>
                        ) : null}
                        
                        {roundData.highlights.filter((h: any) => h.file_type === 'video').length > 0 ? (
                          <View style={styles.highlightsVideosList}>
                            {roundData.highlights
                              .filter((h: any) => h.file_type === 'video')
                              .map((video: any) => (
                                <View key={video.id} style={styles.highlightsVideoItem}>
                                  <View style={styles.highlightsVideoThumbnail}>
                                    <Ionicons name="play-circle" size={28} color="#FFF" />
                                  </View>
                                  <Text style={styles.highlightsVideoName} numberOfLines={1}>{video.file_name}</Text>
                                </View>
                              ))}
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'settings' && (
              <View>
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsLabel}>Stato Torneo</Text>
                  <View style={styles.statusOptions}>
                    {['draft', 'active', 'completed'].map((status) => (
                      <TouchableOpacity key={status} style={[styles.statusOption, tournament.status === status && styles.statusOptionActive]} onPress={() => onUpdateStatus(tournament, status)}>
                        <Text style={[styles.statusOptionText, tournament.status === status && styles.statusOptionTextActive]}>{getStatusLabel(status)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.settingsCard}>
                  <Text style={styles.settingsLabel}>Link Pubblico</Text>
                  <View style={styles.linkContainer}>
                    <Text style={styles.linkText}>/tournament/{tournament.slug}</Text>
                    <TouchableOpacity onPress={() => router.push(`/tournament/${tournament.slug}`)}>
                      <Ionicons name="open-outline" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Button title={t('tournaments.deleteTournament')} onPress={onDelete} variant="outline" icon="trash-outline" fullWidth />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Team Modal - Redesigned */}
      <Modal visible={showAddTeamModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTeamModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddTeamModal(false)}><Text style={styles.modalCancel}>{t('common.cancel')}</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isTennisSport 
                ? (isDoubles ? t('teams.newDouble', 'New Double') : t('teams.addPlayer'))
                : t('teams.addTeam')
              }
            </Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContentSimple}>
            <Text style={styles.inputLabelSimple}>
              {isTennisSport 
                ? (isDoubles ? t('teams.doubleName', 'Double Name') : t('teams.playerName'))
                : t('teams.teamName')
              }
            </Text>
            <View style={styles.inputBoxSimple}>
              <TextInput
                style={styles.inputTextSimple}
                placeholder={isTennisSport 
                  ? (isDoubles ? 'es. Sinner/Berrettini' : 'es. Jannik Sinner')
                  : 'es. SSC Napoli'
                }
                placeholderTextColor="#999"
                value={newTeamName}
                onChangeText={setNewTeamName}
              />
            </View>
            <TouchableOpacity style={styles.addBtnBlack} onPress={handleAddTeam}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnBlackText}>{t('common.add')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Player Modal - Full Screen */}
      <Modal visible={showAddPlayerModal} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowAddPlayerModal(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddPlayerModal(false)}>
              <View style={styles.backBtnRound}><Ionicons name="arrow-back" size={24} color="#000" /></View>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalTitle}>{tournament.name}</Text>
              <Text style={styles.modalSubtitle}>{t('teams.addPlayer')}</Text>
            </View>
          </View>
          <ScrollView style={styles.playerFormContent} showsVerticalScrollIndicator={false}>
            {/* Team Selector (closed dropdown showing selected team) */}
            {selectedTeamForPlayer && (
              <View style={styles.teamSelectorClosed}>
                <View style={styles.teamSelectorAvatar}>
                  <Text style={styles.teamSelectorAvatarText}>{selectedTeamForPlayer.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.teamSelectorName}>{selectedTeamForPlayer.name}</Text>
                <Ionicons name="chevron-down" size={20} color="#000" />
              </View>
            )}

            {/* Nome giocatore */}
            <Text style={styles.playerFormLabel}>{t('teams.playerName')}</Text>
            <View style={styles.playerFormInputBox}>
              <TextInput
                style={styles.playerFormInput}
                placeholder={t('teams.playerNamePlaceholder', 'e.g. John Smith')}
                placeholderTextColor="#999"
                value={newPlayerData.name}
                onChangeText={(text) => setNewPlayerData({ ...newPlayerData, name: text })}
              />
            </View>

            {/* Numero + Ruolo side by side (Ruolo nascosto per Tennis/Padel) */}
            <View style={styles.playerFormRow}>
              <View style={sportHasRoles ? styles.playerFormColSmall : { flex: 1 }}>
                <Text style={styles.playerFormLabel}>{t('teams.playerNumber')}</Text>
                <View style={styles.playerFormInputBox}>
                  <TextInput
                    style={styles.playerFormInput}
                    placeholder="10"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={2}
                    value={newPlayerData.number}
                    onChangeText={(text) => setNewPlayerData({ ...newPlayerData, number: text })}
                  />
                </View>
              </View>
              {sportHasRoles && (
                <View style={styles.playerFormColLarge}>
                  <Text style={styles.playerFormLabel}>{t('teams.position')}</Text>
                  <TouchableOpacity 
                    style={styles.playerFormDropdown}
                    onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  >
                    <Text style={newPlayerData.role ? styles.playerFormDropdownText : styles.playerFormDropdownPlaceholder}>
                      {newPlayerData.role || t('teams.selectRole', 'Select role')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#000" />
                  </TouchableOpacity>
                  {showRoleDropdown && (
                    <View style={styles.roleDropdownList}>
                      {PLAYER_ROLES.map((role) => (
                        <TouchableOpacity 
                          key={role} 
                          style={styles.roleDropdownItem}
                          onPress={() => { setNewPlayerData({ ...newPlayerData, role }); setShowRoleDropdown(false); }}
                        >
                          <Text style={styles.roleDropdownText}>{role}</Text>
                          {newPlayerData.role === role && <Ionicons name="checkmark" size={18} color="#000" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Foto */}
            <Text style={styles.playerFormLabel}>{t('common.photo', 'Photo')}</Text>
            <TouchableOpacity style={styles.playerFormPhotoBox} onPress={pickImage}>
              {newPlayerData.photo ? (
                <Image source={{ uri: newPlayerData.photo }} style={styles.playerPhotoPreview} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={24} color="#999" />
                  <Text style={styles.playerFormPhotoText}>{t('common.selectPhoto', 'Upload image')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Data di nascita */}
            <Text style={styles.playerFormLabel}>Data di nascita</Text>
            <TouchableOpacity style={styles.playerFormInputWithIcon} onPress={openDatePicker}>
              <Text style={newPlayerData.birthDate ? styles.playerFormInput : styles.playerFormPlaceholder}>
                {newPlayerData.birthDate || 'GG/MM/AAAA'}
              </Text>
              <Ionicons name="calendar-outline" size={22} color="#000" />
            </TouchableOpacity>

            {/* Date Picker Modal for iOS or inline for Android */}
            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showDatePicker}>
                  <View style={styles.datePickerModal}>
                    <View style={styles.datePickerContainer}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerCancel}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.datePickerDone}>Fine</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={selectedDate || new Date(2000, 0, 1)}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        minimumDate={new Date(1950, 0, 1)}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={selectedDate || new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1950, 0, 1)}
                />
              )
            )}

            {/* Aggiungi Button */}
            <TouchableOpacity style={[styles.addBtnBlack, { marginTop: 32, marginBottom: 40 }]} onPress={handleAddPlayer}>
              <Text style={styles.addBtnBlackText}>{t('common.add')}</Text>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Player Stats Modal */}
      <Modal visible={showPlayerStatsModal} animationType="fade" transparent onRequestClose={() => setShowPlayerStatsModal(false)}>
        <TouchableOpacity 
          style={styles.statsModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowPlayerStatsModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.statsModalContent}>
            {/* Close Button */}
            <TouchableOpacity style={styles.statsModalClose} onPress={() => setShowPlayerStatsModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            
            {selectedPlayerForStats && (
              <>
                {/* Player Header */}
                <View style={styles.statsModalHeader}>
                  {selectedPlayerForStats.photo ? (
                    <Image source={{ uri: selectedPlayerForStats.photo }} style={styles.statsModalAvatar} />
                  ) : (
                    <View style={styles.statsModalAvatarPlaceholder}>
                      <Text style={styles.statsModalAvatarText}>
                        {selectedPlayerForStats.name ? selectedPlayerForStats.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.statsModalPlayerInfo}>
                    <Text style={styles.statsModalPlayerName}>{selectedPlayerForStats.name}</Text>
                    <Text style={styles.statsModalPlayerRole}>{selectedPlayerForStats.role || 'Non specificato'}</Text>
                  </View>
                </View>

                {/* Loading indicator */}
                {loadingPlayerStats && (
                  <View style={styles.statsLoading}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.statsLoadingText}>Caricamento statistiche...</Text>
                  </View>
                )}

                {/* Stats Grid - Sport-specific */}
                {!loadingPlayerStats && (
                  <View style={styles.statsGrid}>
                    {tournament?.sport === 'basket' ? (
                      /* Basketball Stats */
                      <>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🏀</Text>
                          <Text style={styles.statValue}>{playerStats?.points || 0}</Text>
                          <Text style={styles.statLabel}>Punti</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🅰️</Text>
                          <Text style={styles.statValue}>{playerStats?.assists || 0}</Text>
                          <Text style={styles.statLabel}>Assist</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>📊</Text>
                          <Text style={styles.statValue}>{playerStats?.rebounds || 0}</Text>
                          <Text style={styles.statLabel}>Rimbalzi</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🤚</Text>
                          <Text style={styles.statValue}>{playerStats?.steals || 0}</Text>
                          <Text style={styles.statLabel}>Palle rubate</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🚫</Text>
                          <Text style={styles.statValue}>{playerStats?.blocks || 0}</Text>
                          <Text style={styles.statLabel}>Stoppate</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>👟</Text>
                          <Text style={styles.statValue}>{playerStats?.appearances || 0}</Text>
                          <Text style={styles.statLabel}>Presenze</Text>
                        </View>
                      </>
                    ) : tournament?.sport === 'pallavolo' ? (
                      /* Volleyball Stats */
                      <>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🏐</Text>
                          <Text style={styles.statValue}>{playerStats?.points || 0}</Text>
                          <Text style={styles.statLabel}>Punti</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🎯</Text>
                          <Text style={styles.statValue}>{playerStats?.aces || 0}</Text>
                          <Text style={styles.statLabel}>Ace</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🧱</Text>
                          <Text style={styles.statValue}>{playerStats?.blocks || 0}</Text>
                          <Text style={styles.statLabel}>Muri</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>💥</Text>
                          <Text style={styles.statValue}>{playerStats?.kills || 0}</Text>
                          <Text style={styles.statLabel}>Attacchi</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🛡️</Text>
                          <Text style={styles.statValue}>{playerStats?.digs || 0}</Text>
                          <Text style={styles.statLabel}>Difese</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>👟</Text>
                          <Text style={styles.statValue}>{playerStats?.appearances || 0}</Text>
                          <Text style={styles.statLabel}>Presenze</Text>
                        </View>
                      </>
                    ) : tournament?.sport === 'tennis' || tournament?.sport === 'padel' ? (
                      /* Tennis/Padel Stats */
                      <>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🎾</Text>
                          <Text style={styles.statValue}>{playerStats?.matches_won || 0}</Text>
                          <Text style={styles.statLabel}>Vittorie</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>❌</Text>
                          <Text style={styles.statValue}>{playerStats?.matches_lost || 0}</Text>
                          <Text style={styles.statLabel}>Sconfitte</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🎯</Text>
                          <Text style={styles.statValue}>{playerStats?.aces || 0}</Text>
                          <Text style={styles.statLabel}>Ace</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>💔</Text>
                          <Text style={styles.statValue}>{playerStats?.double_faults || 0}</Text>
                          <Text style={styles.statLabel}>Doppi falli</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>📊</Text>
                          <Text style={styles.statValue}>{playerStats?.sets_won || 0}</Text>
                          <Text style={styles.statLabel}>Set vinti</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🎮</Text>
                          <Text style={styles.statValue}>{playerStats?.games_won || 0}</Text>
                          <Text style={styles.statLabel}>Game vinti</Text>
                        </View>
                      </>
                    ) : tournament?.sport === 'rugby' ? (
                      /* Rugby Stats */
                      <>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🏉</Text>
                          <Text style={styles.statValue}>{playerStats?.tries || 0}</Text>
                          <Text style={styles.statLabel}>Mete</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>⚽</Text>
                          <Text style={styles.statValue}>{playerStats?.conversions || 0}</Text>
                          <Text style={styles.statLabel}>Trasformaz.</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🎯</Text>
                          <Text style={styles.statValue}>{playerStats?.penalties || 0}</Text>
                          <Text style={styles.statLabel}>Punizioni</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>💫</Text>
                          <Text style={styles.statValue}>{playerStats?.drop_goals || 0}</Text>
                          <Text style={styles.statLabel}>Drop</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🤝</Text>
                          <Text style={styles.statValue}>{playerStats?.tackles || 0}</Text>
                          <Text style={styles.statLabel}>Placcaggi</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🟨</Text>
                          <Text style={styles.statValue}>{playerStats?.yellow_cards || 0}</Text>
                          <Text style={styles.statLabel}>Gialli</Text>
                        </View>
                      </>
                    ) : (
                      /* Soccer Stats (default) */
                      <>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>⚽</Text>
                          <Text style={styles.statValue}>{playerStats?.goals || 0}</Text>
                          <Text style={styles.statLabel}>Gol</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🅰️</Text>
                          <Text style={styles.statValue}>{playerStats?.assists || 0}</Text>
                          <Text style={styles.statLabel}>Assist</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🟨</Text>
                          <Text style={styles.statValue}>{playerStats?.yellow_cards || 0}</Text>
                          <Text style={styles.statLabel}>Gialli</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>🟥</Text>
                          <Text style={styles.statValue}>{playerStats?.red_cards || 0}</Text>
                          <Text style={styles.statLabel}>Rossi</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>👟</Text>
                          <Text style={styles.statValue}>{playerStats?.appearances || 0}</Text>
                          <Text style={styles.statLabel}>Presenze</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statIcon}>⏱️</Text>
                          <Text style={styles.statValue}>{playerStats?.minutes_played || 0}</Text>
                          <Text style={styles.statLabel}>Minuti</Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Average Rating */}
                {!loadingPlayerStats && playerStats?.ratings_count > 0 && (
                  <View style={styles.averageRatingSection}>
                    <Text style={styles.averageRatingLabel}>⭐ Media Voto</Text>
                    <Text style={styles.averageRatingValue}>{playerStats.average_rating}</Text>
                    <Text style={styles.averageRatingSubtext}>({playerStats.ratings_count} {playerStats.ratings_count === 1 ? 'voto' : 'voti'})</Text>
                  </View>
                )}

                {/* Additional Stats for specific roles */}
                {selectedPlayerForStats.role === 'Portiere' && (
                  <View style={styles.additionalStats}>
                    <View style={styles.additionalStatRow}>
                      <Text style={styles.additionalStatLabel}>🧤 Parate</Text>
                      <Text style={styles.additionalStatValue}>{selectedPlayerForStats.stats?.saves || 0}</Text>
                    </View>
                    <View style={styles.additionalStatRow}>
                      <Text style={styles.additionalStatLabel}>🚫 Clean Sheet</Text>
                      <Text style={styles.additionalStatValue}>{selectedPlayerForStats.stats?.cleanSheets || 0}</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Match Statistics Modal */}
      <Modal visible={showMatchStatsModal} animationType="fade" transparent onRequestClose={() => setShowMatchStatsModal(false)}>
        <TouchableOpacity 
          style={styles.statsModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMatchStatsModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.matchStatsModalContent}>
            {selectedMatchForStats && (
              <>
                {/* Header */}
                <View style={styles.matchStatsHeader}>
                  <Text style={styles.matchStatsTitle}>📊 Statistiche Partita</Text>
                  <TouchableOpacity onPress={() => setShowMatchStatsModal(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                {/* Result */}
                <View style={styles.matchStatsResultBox}>
                  <Text style={styles.matchStatsTeamName}>{getTeamName(selectedMatchForStats.home_team_id)}</Text>
                  <View style={styles.matchStatsScoreBox}>
                    <Text style={styles.matchStatsScore}>
                      {selectedMatchForStats.home_goals ?? 0} - {selectedMatchForStats.away_goals ?? 0}
                    </Text>
                  </View>
                  <Text style={styles.matchStatsTeamName}>{getTeamName(selectedMatchForStats.away_team_id)}</Text>
                </View>

                {/* Loading */}
                {loadingMatchStats && (
                  <View style={styles.statsLoading}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.statsLoadingText}>Caricamento statistiche...</Text>
                  </View>
                )}

                {/* Events */}
                {!loadingMatchStats && (
                  <ScrollView style={styles.matchStatsEventsScroll} showsVerticalScrollIndicator={false}>
                    {matchStatsEvents.length === 0 ? (
                      <View style={styles.noMatchStatsContainer}>
                        <Ionicons name="document-outline" size={48} color="#CCC" />
                        <Text style={styles.noMatchStatsText}>Nessuna statistica disponibile</Text>
                      </View>
                    ) : (
                      <>
                        {/* Goals */}
                        {matchStatsEvents.filter(e => e.event_type === 'goal').length > 0 && (
                          <View style={styles.matchStatsSection}>
                            <Text style={styles.matchStatsSectionTitle}>⚽ Marcatori</Text>
                            {matchStatsEvents.filter(e => e.event_type === 'goal').map((event, idx) => (
                              <View key={idx} style={styles.matchStatsEventRow}>
                                <Text style={styles.matchStatsEventPlayer}>{event.player_name}</Text>
                                <Text style={styles.matchStatsEventTeam}>
                                  ({event.team_id === selectedMatchForStats.home_team_id ? getTeamName(selectedMatchForStats.home_team_id) : getTeamName(selectedMatchForStats.away_team_id)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Assists */}
                        {matchStatsEvents.filter(e => e.event_type === 'assist').length > 0 && (
                          <View style={styles.matchStatsSection}>
                            <Text style={styles.matchStatsSectionTitle}>🅰️ Assist</Text>
                            {matchStatsEvents.filter(e => e.event_type === 'assist').map((event, idx) => (
                              <View key={idx} style={styles.matchStatsEventRow}>
                                <Text style={styles.matchStatsEventPlayer}>{event.player_name}</Text>
                                <Text style={styles.matchStatsEventTeam}>
                                  ({event.team_id === selectedMatchForStats.home_team_id ? getTeamName(selectedMatchForStats.home_team_id) : getTeamName(selectedMatchForStats.away_team_id)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Yellow Cards */}
                        {matchStatsEvents.filter(e => e.event_type === 'yellow_card').length > 0 && (
                          <View style={styles.matchStatsSection}>
                            <Text style={styles.matchStatsSectionTitle}>🟨 Cartellini Gialli</Text>
                            {matchStatsEvents.filter(e => e.event_type === 'yellow_card').map((event, idx) => (
                              <View key={idx} style={styles.matchStatsEventRow}>
                                <Text style={styles.matchStatsEventPlayer}>{event.player_name}</Text>
                                <Text style={styles.matchStatsEventTeam}>
                                  ({event.team_id === selectedMatchForStats.home_team_id ? getTeamName(selectedMatchForStats.home_team_id) : getTeamName(selectedMatchForStats.away_team_id)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Red Cards */}
                        {matchStatsEvents.filter(e => e.event_type === 'red_card').length > 0 && (
                          <View style={styles.matchStatsSection}>
                            <Text style={styles.matchStatsSectionTitle}>🟥 Cartellini Rossi</Text>
                            {matchStatsEvents.filter(e => e.event_type === 'red_card').map((event, idx) => (
                              <View key={idx} style={styles.matchStatsEventRow}>
                                <Text style={styles.matchStatsEventPlayer}>{event.player_name}</Text>
                                <Text style={styles.matchStatsEventTeam}>
                                  ({event.team_id === selectedMatchForStats.home_team_id ? getTeamName(selectedMatchForStats.home_team_id) : getTeamName(selectedMatchForStats.away_team_id)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Substitutions */}
                        {(matchStatsEvents.filter(e => e.event_type === 'substitution_out' || e.event_type === 'substitution_in').length > 0) && (
                          <View style={styles.matchStatsSection}>
                            <Text style={styles.matchStatsSectionTitle}>🔄 Sostituzioni</Text>
                            {matchStatsEvents.filter(e => e.event_type === 'substitution_out').map((event, idx) => (
                              <View key={idx} style={styles.matchStatsEventRow}>
                                <Text style={styles.matchStatsEventPlayer}>🔻 {event.player_name} (esce)</Text>
                                <Text style={styles.matchStatsEventTeam}>
                                  ({event.team_id === selectedMatchForStats.home_team_id ? getTeamName(selectedMatchForStats.home_team_id) : getTeamName(selectedMatchForStats.away_team_id)})
                                </Text>
                              </View>
                            ))}
                            {matchStatsEvents.filter(e => e.event_type === 'substitution_in').map((event, idx) => (
                              <View key={idx} style={styles.matchStatsEventRow}>
                                <Text style={styles.matchStatsEventPlayer}>🔺 {event.player_name} (entra)</Text>
                                <Text style={styles.matchStatsEventTeam}>
                                  ({event.team_id === selectedMatchForStats.home_team_id ? getTeamName(selectedMatchForStats.home_team_id) : getTeamName(selectedMatchForStats.away_team_id)})
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Match Modal - Redesigned */}
      <Modal visible={showAddMatchModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddMatchModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddMatchModal(false)}><Text style={styles.modalCancel}>Annulla</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Nuova Partita</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.newMatchContent} showsVerticalScrollIndicator={false}>
            {/* Squadra/Giocatore Casa */}
            <Text style={styles.newMatchLabel}>{isTennisSport ? (isDoubles ? t('teams.homeDouble', 'Home Double') : t('teams.homePlayer', 'Home Player')) : t('matches.homeTeam')}</Text>
            <TouchableOpacity 
              style={styles.newMatchDropdown} 
              onPress={() => { setShowHomeDropdown(!showHomeDropdown); setShowAwayDropdown(false); }}
            >
              <Text style={newMatchData.home_team_id ? styles.newMatchDropdownText : styles.newMatchDropdownPlaceholder}>
                {newMatchData.home_team_id ? teams.find(t => t.id === newMatchData.home_team_id)?.name : (isTennisSport ? (isDoubles ? t('teams.selectDouble', 'Select pair') : t('teams.selectPlayer', 'Select player')) : t('teams.selectTeam', 'Select team'))}
              </Text>
              <Ionicons name="chevron-down" size={22} color="#000" />
            </TouchableOpacity>
            {showHomeDropdown && (
              <View style={styles.dropdownList}>
                {teams.map((team) => (
                  <TouchableOpacity 
                    key={team.id} 
                    style={styles.dropdownItem}
                    onPress={() => { setNewMatchData({ ...newMatchData, home_team_id: team.id }); setShowHomeDropdown(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{team.name}</Text>
                    {newMatchData.home_team_id === team.id && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Squadra/Giocatore Trasferta */}
            <Text style={styles.newMatchLabel}>{isTennisSport ? (isDoubles ? t('teams.awayDouble', 'Away Double') : t('teams.awayPlayer', 'Away Player')) : t('matches.awayTeam')}</Text>
            <TouchableOpacity 
              style={styles.newMatchDropdown}
              onPress={() => { setShowAwayDropdown(!showAwayDropdown); setShowHomeDropdown(false); }}
            >
              <Text style={newMatchData.away_team_id ? styles.newMatchDropdownText : styles.newMatchDropdownPlaceholder}>
                {newMatchData.away_team_id ? teams.find(t => t.id === newMatchData.away_team_id)?.name : (isTennisSport ? (isDoubles ? t('teams.selectDouble', 'Select pair') : t('teams.selectPlayer', 'Select player')) : t('teams.selectTeam', 'Select team'))}
              </Text>
              <Ionicons name="chevron-down" size={22} color="#000" />
            </TouchableOpacity>
            {showAwayDropdown && (
              <View style={styles.dropdownList}>
                {teams.filter(t => t.id !== newMatchData.home_team_id).map((team) => (
                  <TouchableOpacity 
                    key={team.id} 
                    style={styles.dropdownItem}
                    onPress={() => { setNewMatchData({ ...newMatchData, away_team_id: team.id }); setShowAwayDropdown(false); }}
                  >
                    <Text style={styles.dropdownItemText}>{team.name}</Text>
                    {newMatchData.away_team_id === team.id && <Ionicons name="checkmark" size={20} color="#000" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Giornata */}
            <Text style={styles.newMatchLabel}>Giornata</Text>
            <View style={styles.giornataContainer}>
              {existingRounds.map((round) => (
                <TouchableOpacity 
                  key={round} 
                  style={styles.giornataRow}
                  onPress={() => setNewMatchData({ ...newMatchData, round })}
                >
                  <Text style={styles.giornataText}>{round}</Text>
                  {newMatchData.round === round ? (
                    <Ionicons name="checkmark" size={22} color="#000" />
                  ) : (
                    <Ionicons name="checkmark" size={22} color="#666" />
                  )}
                </TouchableOpacity>
              ))}
              {/* New Giornata Row */}
              <View style={styles.newGiornataRow}>
                <TextInput
                  style={styles.newGiornataInput}
                  placeholder={`Giornata ${nextRoundNumber}`}
                  placeholderTextColor="#999"
                  value={newRoundInput}
                  onChangeText={setNewRoundInput}
                />
                <TouchableOpacity 
                  style={styles.newGiornataAddBtn}
                  onPress={handleAddNewRound}
                >
                  <Ionicons name="add" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Data e Orario - Side by Side */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeCol}>
                <Text style={styles.newMatchLabel}>Data</Text>
                <TouchableOpacity 
                  style={styles.newMatchInputWithIcon}
                  onPress={() => setShowMatchDatePicker(true)}
                >
                  <Text style={matchDate ? styles.inputFieldText : styles.inputFieldPlaceholder}>
                    {matchDate ? matchDate.toLocaleDateString('it-IT') : 'GG/MM/AAAA'}
                  </Text>
                  <Ionicons name="calendar-outline" size={22} color="#000" />
                </TouchableOpacity>
              </View>
              <View style={styles.dateTimeCol}>
                <Text style={styles.newMatchLabel}>Orario</Text>
                <TouchableOpacity 
                  style={styles.newMatchInputWithIcon}
                  onPress={() => setShowMatchTimePicker(true)}
                >
                  <Text style={matchTime ? styles.inputFieldText : styles.inputFieldPlaceholder}>
                    {matchTime ? matchTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'HH:MM'}
                  </Text>
                  <Ionicons name="time-outline" size={22} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Picker - Wrapped in Modal for better control */}
            {showMatchDatePicker && Platform.OS === 'ios' && (
              <Modal
                transparent
                animationType="fade"
                visible={showMatchDatePicker}
                onRequestClose={() => setShowMatchDatePicker(false)}
              >
                <TouchableOpacity 
                  style={styles.pickerModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowMatchDatePicker(false)}
                >
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowMatchDatePicker(false)}>
                        <Text style={styles.pickerCancelText}>Annulla</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Seleziona Data</Text>
                      <TouchableOpacity onPress={() => setShowMatchDatePicker(false)}>
                        <Text style={styles.pickerConfirmText}>Conferma</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={matchDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setMatchDate(selectedDate);
                          setNewMatchData({ 
                            ...newMatchData, 
                            date: selectedDate.toLocaleDateString('it-IT') 
                          });
                        }
                      }}
                      style={{ height: 200 }}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Date Picker - Android (auto-closes) */}
            {showMatchDatePicker && Platform.OS !== 'ios' && (
              <DateTimePicker
                value={matchDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowMatchDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    setMatchDate(selectedDate);
                    setNewMatchData({ 
                      ...newMatchData, 
                      date: selectedDate.toLocaleDateString('it-IT') 
                    });
                  }
                }}
              />
            )}

            {/* Time Picker - Wrapped in Modal for better control */}
            {showMatchTimePicker && Platform.OS === 'ios' && (
              <Modal
                transparent
                animationType="fade"
                visible={showMatchTimePicker}
                onRequestClose={() => setShowMatchTimePicker(false)}
              >
                <TouchableOpacity 
                  style={styles.pickerModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowMatchTimePicker(false)}
                >
                  <View style={styles.pickerModalContent}>
                    <View style={styles.pickerModalHeader}>
                      <TouchableOpacity onPress={() => setShowMatchTimePicker(false)}>
                        <Text style={styles.pickerCancelText}>Annulla</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Seleziona Orario</Text>
                      <TouchableOpacity onPress={() => setShowMatchTimePicker(false)}>
                        <Text style={styles.pickerConfirmText}>Conferma</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={matchTime || new Date()}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={(event, selectedTime) => {
                        if (selectedTime) {
                          setMatchTime(selectedTime);
                          setNewMatchData({ 
                            ...newMatchData, 
                            time: selectedTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) 
                          });
                        }
                      }}
                      style={{ height: 200 }}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Time Picker - Android (auto-closes) */}
            {showMatchTimePicker && Platform.OS !== 'ios' && (
              <DateTimePicker
                value={matchTime || new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setShowMatchTimePicker(false);
                  if (event.type === 'set' && selectedTime) {
                    setMatchTime(selectedTime);
                    setNewMatchData({ 
                      ...newMatchData, 
                      time: selectedTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) 
                    });
                  }
                }}
              />
            )}

            {/* Luogo */}
            <Text style={styles.newMatchLabel}>{t('matches.venue', 'Venue')}</Text>
            <View style={styles.newMatchInputWithIcon}>
              <TextInput
                style={styles.inputFieldText}
                placeholder={t('matches.venueName', 'Name')}
                placeholderTextColor="#999"
                value={newMatchData.venue_name}
                onChangeText={(text) => setNewMatchData({ ...newMatchData, venue_name: text })}
              />
              <Ionicons name={`${sportIcon}-outline` as any} size={22} color="#000" />
            </View>
            <View style={[styles.newMatchInputWithIcon, { marginTop: 12 }]}>
              <TextInput
                style={styles.inputFieldText}
                placeholder={t('matches.venueAddress', 'Address')}
                placeholderTextColor="#999"
                value={newMatchData.venue_address}
                onChangeText={(text) => setNewMatchData({ ...newMatchData, venue_address: text })}
              />
              <Ionicons name="location-outline" size={22} color="#000" />
            </View>

            {/* Crea Button */}
            <View style={{ marginTop: 32, marginBottom: 40 }}>
              <Button title="Crea Partita" onPress={handleAddMatch} fullWidth size="large" />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Match Result Modal - Full Screen */}
      <Modal visible={!!selectedMatch} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedMatch(null)}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedMatch(null)}>
              <View style={styles.backBtnRound}><Ionicons name="arrow-back" size={24} color="#000" /></View>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalTitle}>{tournament.name}</Text>
              <Text style={styles.modalSubtitle}>{tournament.category} - {tournament.status === 'active' ? t('matches.live') : t('tournaments.draft')}</Text>
            </View>
            <TouchableOpacity style={styles.eyeBtn}>
              <Ionicons name="eye" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultModalContent} showsVerticalScrollIndicator={false}>
            {selectedMatch && (
              <>
                {/* Score Input Card */}
                <View style={styles.scoreCard}>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreTeamName}>{getTeamName(selectedMatch.home_team_id)}</Text>
                    <TextInput
                      style={styles.scoreInputBox}
                      keyboardType="numeric"
                      value={String(selectedMatch.home_goals ?? 0)}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        const newMatch = { ...selectedMatch, home_goals: val };
                        setSelectedMatch(newMatch);
                        // Auto-save for LIVE updates
                        triggerAutoSaveScore(selectedMatch.id, val, selectedMatch.away_goals ?? 0);
                      }}
                      maxLength={2}
                    />
                    <Text style={styles.scoreDash}>-</Text>
                    <TextInput
                      style={styles.scoreInputBox}
                      keyboardType="numeric"
                      value={String(selectedMatch.away_goals ?? 0)}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        const newMatch = { ...selectedMatch, away_goals: val };
                        setSelectedMatch(newMatch);
                        // Auto-save for LIVE updates
                        triggerAutoSaveScore(selectedMatch.id, selectedMatch.home_goals ?? 0, val);
                      }}
                      maxLength={2}
                    />
                    <Text style={styles.scoreTeamName}>{getTeamName(selectedMatch.away_team_id)}</Text>
                  </View>

                  {/* Statistiche Section */}
                  <View style={styles.statsSection}>
                    <View style={styles.statsHeader}>
                      <Text style={styles.statsHeaderText}>{t('stats.title')}</Text>
                    </View>
                    
                    {/* Show message if no events */}
                    {matchEvents.length === 0 && (
                      <View style={styles.noEventsContainer}>
                        <Text style={styles.noEventsMessage}>Nessun evento ancora registrato</Text>
                      </View>
                    )}
                    
                    {matchEvents.length > 0 && (
                      <View style={styles.statsContent}>
                        {/* Home Team Events */}
                        <View style={styles.statsColumn}>
                          {matchEvents.filter(e => e.team === 'home').map((event, idx) => (
                            <View key={idx} style={styles.statsRow}>
                              <Text style={styles.statsPlayerName} numberOfLines={1}>{event.player}</Text>
                              {event.type === 'goal' && <Text style={styles.statsIcon}>⚽</Text>}
                              {event.type === 'assist' && <Text style={styles.statsIcon}>🅰️</Text>}
                              {event.type === 'yellow' && <View style={styles.yellowCard} />}
                              {event.type === 'red' && <View style={styles.redCard} />}
                              {event.type === 'sub_out' && <Text style={styles.statsIcon}>🔻</Text>}
                              {event.type === 'sub_in' && <Text style={styles.statsIcon}>🔺</Text>}
                            </View>
                          ))}
                          {matchEvents.filter(e => e.team === 'home').length === 0 && (
                            <Text style={styles.noEventsText}>-</Text>
                          )}
                        </View>
                        <View style={styles.statsVerticalLine} />
                        {/* Away Team Events */}
                        <View style={styles.statsColumn}>
                          {matchEvents.filter(e => e.team === 'away').map((event, idx) => (
                            <View key={idx} style={styles.statsRowReverse}>
                              {event.type === 'goal' && <Text style={styles.statsIcon}>⚽</Text>}
                              {event.type === 'assist' && <Text style={styles.statsIcon}>🅰️</Text>}
                              {event.type === 'yellow' && <View style={styles.yellowCard} />}
                              {event.type === 'red' && <View style={styles.redCard} />}
                              {event.type === 'sub_out' && <Text style={styles.statsIcon}>🔻</Text>}
                              {event.type === 'sub_in' && <Text style={styles.statsIcon}>🔺</Text>}
                              <Text style={styles.statsPlayerName} numberOfLines={1}>{event.player}</Text>
                            </View>
                          ))}
                          {matchEvents.filter(e => e.team === 'away').length === 0 && (
                            <Text style={styles.noEventsText}>-</Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Bottom Buttons */}
                <View style={styles.resultButtonsRow}>
                  {/* Auto-save indicator */}
                  <View style={styles.autoSaveIndicator}>
                    <Ionicons name="cloud-done" size={16} color="#10B981" />
                    <Text style={styles.autoSaveText}>Salvataggio automatico</Text>
                  </View>
                </View>
                <View style={styles.resultButtonsRow}>
                  <TouchableOpacity 
                    style={styles.finePartitaBtn}
                    onPress={async () => {
                      try {
                        await handleUpdateResult(selectedMatch, selectedMatch.home_goals ?? 0, selectedMatch.away_goals ?? 0);
                        setSelectedMatch(null);
                        Alert.alert(t('common.success'), t('success.matchCompleted', 'Match completed'));
                      } catch (e) {
                        Alert.alert(t('common.error'), 'Impossibile salvare');
                      }
                    }}
                  >
                    <Ionicons name="checkmark" size={22} color="#FFF" />
                    <Text style={styles.finePartitaBtnText}>Fine partita</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.extraBtn}
                    onPress={handleOpenExtraModal}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.extraBtnText}>Extra</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Extra Modal */}
        <Modal visible={showExtraModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {
          if (selectedMatch) loadMatchEvents(selectedMatch.id, selectedMatch);
          setShowExtraModal(false);
        }}>
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <ScrollView style={styles.extraModalContent} showsVerticalScrollIndicator={false}>
              {/* Extra Header with Close Button */}
              <View style={styles.extraHeaderBox}>
                <View style={{ width: 40 }} />
                <Text style={styles.extraHeaderText}>Extra</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (selectedMatch) loadMatchEvents(selectedMatch.id, selectedMatch);
                    setShowExtraModal(false);
                  }} 
                  style={{ width: 40, alignItems: 'flex-end' }}
                >
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              {selectedMatch && (
                <>
                  {/* Real-time Score Display */}
                  <View style={styles.liveScoreCard}>
                    <Text style={styles.liveScoreTeam}>{getTeamName(selectedMatch.home_team_id)}</Text>
                    <View style={styles.liveScoreCenter}>
                      <Text style={styles.liveScoreNumber}>{extraEvents.home.marcatore.length}</Text>
                      <Text style={styles.liveScoreDash}>-</Text>
                      <Text style={styles.liveScoreNumber}>{extraEvents.away.marcatore.length}</Text>
                    </View>
                    <Text style={styles.liveScoreTeam}>{getTeamName(selectedMatch.away_team_id)}</Text>
                  </View>

                  {/* Two Columns for Events */}
                  <View style={styles.extraColumnsContainer}>
                    {/* Home Team Column */}
                    <View style={styles.extraColumn}>
                      <View style={styles.extraColumnHeader}>
                        <Text style={styles.extraColumnHeaderText}>{getTeamName(selectedMatch.home_team_id)}</Text>
                      </View>
                      <EventDropdown 
                        icon="football" 
                        label="Marcatore" 
                        players={homeTeamPlayers}
                        selectedIds={extraEvents.home.marcatore}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, marcatore: [...prev.home.marcatore, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, marcatore: prev.home.marcatore.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="ellipse" 
                        label="Assist"
                        players={homeTeamPlayers}
                        selectedIds={extraEvents.home.assist}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, assist: [...prev.home.assist, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, assist: prev.home.assist.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="square" 
                        iconColor="#FFD700" 
                        label="Cart. Giallo"
                        players={homeTeamPlayers}
                        selectedIds={extraEvents.home.giallo}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, giallo: [...prev.home.giallo, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, giallo: prev.home.giallo.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="square" 
                        iconColor="#FF0000" 
                        label="Cart. Rosso"
                        players={homeTeamPlayers}
                        selectedIds={extraEvents.home.rosso}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, rosso: [...prev.home.rosso, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, rosso: prev.home.rosso.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="arrow-back" 
                        label="Sost. esce"
                        players={homeTeamPlayers}
                        selectedIds={extraEvents.home.sostEsce}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, sostEsce: [...prev.home.sostEsce, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, sostEsce: prev.home.sostEsce.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="arrow-forward" 
                        label="Sost. entra"
                        players={homeTeamPlayers}
                        selectedIds={extraEvents.home.sostEntra}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, sostEntra: [...prev.home.sostEntra, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          home: { ...prev.home, sostEntra: prev.home.sostEntra.filter((_, i) => i !== index) }
                        }))}
                      />
                    </View>

                    {/* Away Team Column */}
                    <View style={styles.extraColumn}>
                      <View style={styles.extraColumnHeader}>
                        <Text style={styles.extraColumnHeaderText}>{getTeamName(selectedMatch.away_team_id)}</Text>
                      </View>
                      <EventDropdown 
                        icon="football" 
                        label="Marcatore"
                        players={awayTeamPlayers}
                        selectedIds={extraEvents.away.marcatore}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, marcatore: [...prev.away.marcatore, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, marcatore: prev.away.marcatore.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="ellipse" 
                        label="Assist"
                        players={awayTeamPlayers}
                        selectedIds={extraEvents.away.assist}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, assist: [...prev.away.assist, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, assist: prev.away.assist.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="square" 
                        iconColor="#FFD700" 
                        label="Cart. Giallo"
                        players={awayTeamPlayers}
                        selectedIds={extraEvents.away.giallo}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, giallo: [...prev.away.giallo, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, giallo: prev.away.giallo.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="square" 
                        iconColor="#FF0000" 
                        label="Cart. Rosso"
                        players={awayTeamPlayers}
                        selectedIds={extraEvents.away.rosso}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, rosso: [...prev.away.rosso, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, rosso: prev.away.rosso.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="arrow-back" 
                        label="Sost. esce"
                        players={awayTeamPlayers}
                        selectedIds={extraEvents.away.sostEsce}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, sostEsce: [...prev.away.sostEsce, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, sostEsce: prev.away.sostEsce.filter((_, i) => i !== index) }
                        }))}
                      />
                      <EventDropdown 
                        icon="arrow-forward" 
                        label="Sost. entra"
                        players={awayTeamPlayers}
                        selectedIds={extraEvents.away.sostEntra}
                        onAdd={(id) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, sostEntra: [...prev.away.sostEntra, id] }
                        }))}
                        onRemoveAt={(index) => setExtraEvents(prev => ({
                          ...prev, 
                          away: { ...prev.away, sostEntra: prev.away.sostEntra.filter((_, i) => i !== index) }
                        }))}
                      />
                    </View>
                  </View>

                  {/* Voti Section */}
                  <View style={styles.votiSection}>
                    <View style={styles.votiHeader}>
                      <Ionicons name="checkbox-outline" size={20} color="#FFF" />
                      <Text style={styles.votiHeaderText}>Voti</Text>
                    </View>

                    {/* Home Team Ratings */}
                    <TeamRatingsAccordion 
                      teamName={getTeamName(selectedMatch.home_team_id)} 
                      teamLetter={getTeamName(selectedMatch.home_team_id).charAt(0)}
                      players={homeTeamPlayers}
                      ratings={playerRatings}
                      onRatingChange={(playerId, rating) => setPlayerRatings(prev => ({...prev, [playerId]: rating}))}
                    />

                    {/* Away Team Ratings */}
                    <TeamRatingsAccordion 
                      teamName={getTeamName(selectedMatch.away_team_id)} 
                      teamLetter={getTeamName(selectedMatch.away_team_id).charAt(0)}
                      players={awayTeamPlayers}
                      ratings={playerRatings}
                      onRatingChange={(playerId, rating) => setPlayerRatings(prev => ({...prev, [playerId]: rating}))}
                    />
                  </View>

                  {/* Auto-save indicator only - no button needed */}
                  <View style={styles.extraFooterButtons}>
                    <View style={[styles.autoSaveIndicator, { flex: 1, justifyContent: 'center', paddingVertical: 16 }]}>
                      <Ionicons name="cloud-done" size={20} color="#10B981" />
                      <Text style={[styles.autoSaveText, { fontSize: 14 }]}>Salvataggio automatico attivo</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </Modal>

      {/* Formation Modal */}
      {selectedTeamForFormation && (
        <FormationModal
          visible={showFormationModal}
          onClose={() => {
            setShowFormationModal(false);
            setSelectedTeamForFormation(null);
          }}
          teamId={selectedTeamForFormation.id}
          teamName={selectedTeamForFormation.name}
          gameFormat={tournament.game_format || '11v11'}
          sport={tournament.sport || 'calcio'}
          players={(teamPlayers[selectedTeamForFormation.id] || []).map((p: any) => {
            // Map roles based on sport
            const isBasketball = tournament.sport === 'basket';
            let mappedRole = p.role;
            
            if (isBasketball) {
              // Basketball role mapping
              const basketballRoleMap: Record<string, string> = {
                'Playmaker': 'playmaker',
                'Guardia': 'guardia',
                'Ala Piccola': 'ala_piccola',
                'Ala piccola': 'ala_piccola',
                'Ala Grande': 'ala_grande',
                'Ala grande': 'ala_grande',
                'Centro': 'centro',
              };
              mappedRole = basketballRoleMap[p.role] || p.role?.toLowerCase().replace(' ', '_') || 'playmaker';
            } else {
              // Soccer role mapping
              const soccerRoleMap: Record<string, string> = {
                'Portiere': 'goalkeeper',
                'Difensore': 'defender',
                'Centrocampista': 'midfielder',
                'Attaccante': 'forward',
              };
              mappedRole = soccerRoleMap[p.role] || p.role;
            }
            
            return {
              id: p.id,
              team_id: selectedTeamForFormation.id,
              full_name: p.name,
              number: p.number,
              role: mappedRole,
              photo: p.photo,
            };
          })}
          existingFormation={teamFormations[selectedTeamForFormation.id] || null}
          onSave={handleFormationSave}
        />
      )}

      {/* News Modal */}
      <Modal
        visible={showNewsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewsModal(false)}
      >
        <SafeAreaView style={styles.newsModalContainer}>
          <View style={styles.newsModalHeader}>
            <TouchableOpacity onPress={() => setShowNewsModal(false)}>
              <Text style={styles.newsModalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.newsModalTitle}>{editingNews ? 'Modifica News' : 'Nuova News'}</Text>
            <TouchableOpacity onPress={handleSaveNews} disabled={savingNews}>
              {savingNews ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.newsModalSave}>Pubblica</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.newsModalContent} showsVerticalScrollIndicator={false}>
            {/* Photo Upload */}
            <TouchableOpacity style={styles.newsPhotoUpload} onPress={handlePickNewsPhoto}>
              {newsForm.photo ? (
                <Image source={{ uri: newsForm.photo }} style={styles.newsPhotoPreview} />
              ) : (
                <View style={styles.newsPhotoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#999" />
                  <Text style={styles.newsPhotoText}>{t('common.add', 'Add')} foto (opzionale)</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Title Input */}
            <Text style={styles.newsInputLabel}>📝 Titolo *</Text>
            <TextInput
              style={styles.newsInput}
              placeholder={t('tournaments.newsTitle', 'Enter news title...')}
              value={newsForm.title}
              onChangeText={(text) => setNewsForm(prev => ({ ...prev, title: text }))}
              placeholderTextColor="#999"
            />

            {/* Description Input */}
            <Text style={styles.newsInputLabel}>📄 Descrizione</Text>
            <TextInput
              style={[styles.newsInput, styles.newsTextArea]}
              placeholder={t('tournaments.newsDescription', 'Enter news description...')}
              value={newsForm.content}
              onChangeText={(text) => setNewsForm(prev => ({ ...prev, content: text }))}
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Basketball Match Modal */}
      <BasketballMatchModal
        visible={showBasketballMatchModal}
        onClose={() => {
          // Reload matches to get the latest data after auto-save
          loadData();
          setShowBasketballMatchModal(false);
          setSelectedBasketballMatch(null);
        }}
        match={selectedBasketballMatch}
        homeTeam={teams.find(t => t.id === selectedBasketballMatch?.home_team_id)}
        awayTeam={teams.find(t => t.id === selectedBasketballMatch?.away_team_id)}
        homePlayers={homeTeamPlayers}
        awayPlayers={awayTeamPlayers}
        tournamentName={tournament?.name || ''}
        gameStructure={tournament?.game_structure || '4_quarters'}
        onSave={(updatedMatch) => {
          setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
          loadData(); // Also reload on explicit save
          setShowBasketballMatchModal(false);
          setSelectedBasketballMatch(null);
        }}
      />

      {/* Tennis Match Modal */}
      <TennisMatchModal
        visible={showTennisMatchModal}
        onClose={() => {
          // Reload matches to get the latest data after auto-save
          loadData();
          setShowTennisMatchModal(false);
          setSelectedTennisMatch(null);
        }}
        match={selectedTennisMatch}
        homeTeam={teams.find(t => t.id === selectedTennisMatch?.home_team_id)}
        awayTeam={teams.find(t => t.id === selectedTennisMatch?.away_team_id)}
        homePlayers={homeTeamPlayers}
        awayPlayers={awayTeamPlayers}
        tournamentName={tournament?.name || ''}
        gameStructure={tournament?.game_structure || '3_sets'}
        onSave={(updatedMatch) => {
          setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
          setShowTennisMatchModal(false);
          setSelectedTennisMatch(null);
        }}
      />

      {/* Padel Match Modal */}
      <PadelMatchModal
        visible={showPadelMatchModal}
        onClose={() => {
          // Reload matches to get the latest data after auto-save
          loadData();
          setShowPadelMatchModal(false);
          setSelectedPadelMatch(null);
        }}
        match={selectedPadelMatch}
        homeTeam={teams.find(t => t.id === selectedPadelMatch?.home_team_id)}
        awayTeam={teams.find(t => t.id === selectedPadelMatch?.away_team_id)}
        homePlayers={homeTeamPlayers}
        awayPlayers={awayTeamPlayers}
        tournamentName={tournament?.name || ''}
        gameFormat={tournament?.game_format === 'singolo' ? 'singolo' : 'doppio'}
        onSave={(updatedMatch) => {
          setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
          setShowPadelMatchModal(false);
          setSelectedPadelMatch(null);
        }}
      />

      {/* Volleyball Match Modal */}
      <VolleyballMatchModal
        visible={showVolleyballMatchModal}
        onClose={() => {
          loadData();
          setShowVolleyballMatchModal(false);
          setSelectedVolleyballMatch(null);
        }}
        match={selectedVolleyballMatch}
        homeTeam={teams.find(t => t.id === selectedVolleyballMatch?.home_team_id)}
        awayTeam={teams.find(t => t.id === selectedVolleyballMatch?.away_team_id)}
        homePlayers={homeTeamPlayers}
        awayPlayers={awayTeamPlayers}
        tournamentName={tournament?.name || ''}
        onSave={(updatedMatch) => {
          setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
          loadData();
          setShowVolleyballMatchModal(false);
          setSelectedVolleyballMatch(null);
        }}
      />

      {/* Rugby Match Modal */}
      <RugbyMatchModal
        visible={showRugbyMatchModal}
        onClose={() => {
          loadData();
          setShowRugbyMatchModal(false);
          setSelectedRugbyMatch(null);
        }}
        match={selectedRugbyMatch}
        homePlayers={homeTeamPlayers}
        awayPlayers={awayTeamPlayers}
        homeTeamName={teams.find(t => t.id === selectedRugbyMatch?.home_team_id)?.name || t('matches.homeTeam', 'Home')}
        awayTeamName={teams.find(t => t.id === selectedRugbyMatch?.away_team_id)?.name || t('matches.awayTeam', 'Away')}
        gameFormat={tournament?.game_format || '15v15'}
        onSave={(updatedMatch) => {
          // Only update local state, don't close modal
          // Modal will be closed by onClose when user clicks X or "Fine Partita"
          setMatches(matches.map(m => m.id === selectedRugbyMatch?.id ? { ...m, ...updatedMatch } : m));
          loadData();
        }}
      />

      {/* Highlights Upload Modal */}
      <HighlightsUploadModal
        visible={showHighlightsModal}
        onClose={() => {
          setShowHighlightsModal(false);
          loadHighlights(); // Reload highlights after closing modal
        }}
        tournamentId={tournament?.id || ''}
        rounds={getRounds()}
      />
    </SafeAreaView>
  );
}

// Helper Component: Event Dropdown with Multi-Select (allows duplicates)
function EventDropdown({ 
  icon, 
  iconColor = '#000', 
  label, 
  players = [],
  selectedIds = [],
  onAdd,
  onRemoveAt
}: { 
  icon: string; 
  iconColor?: string; 
  label: string;
  players?: any[];
  selectedIds?: string[];
  onAdd?: (playerId: string) => void;
  onRemoveAt?: (index: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get player info for each selected ID (allows duplicates)
  const selectedEntries = selectedIds.map((id, index) => {
    const player = players.find(p => p.id === id);
    return { index, playerId: id, player };
  }).filter(e => e.player);
  
  const handleAddPlayer = (playerId: string) => {
    if (onAdd) {
      onAdd(playerId);
    }
  };

  const handleRemoveEntry = (index: number) => {
    if (onRemoveAt) {
      onRemoveAt(index);
    }
  };
  
  return (
    <View style={styles.multiDropdownContainer}>
      {/* Dropdown Header */}
      <TouchableOpacity style={styles.eventDropdown} onPress={() => setIsOpen(!isOpen)}>
        {icon === 'square' ? (
          <View style={[styles.cardIcon2, { backgroundColor: iconColor }]} />
        ) : (
          <Ionicons name={icon as any} size={16} color={iconColor} />
        )}
        <Text style={styles.eventDropdownLabel}>
          {label} {selectedIds.length > 0 && `(${selectedIds.length})`}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#000" />
      </TouchableOpacity>

      {/* Selected Players Tags (shows all entries including duplicates) */}
      {selectedEntries.length > 0 && (
        <View style={styles.selectedTagsContainer}>
          {selectedEntries.map((entry) => (
            <View key={`${entry.playerId}-${entry.index}`} style={styles.selectedTag}>
              <Text style={styles.selectedTagText} numberOfLines={1}>
                {entry.player.number ? `#${entry.player.number} ` : ''}{entry.player.name}
              </Text>
              <TouchableOpacity 
                style={styles.selectedTagRemove}
                onPress={() => handleRemoveEntry(entry.index)}
              >
                <Ionicons name="close" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Dropdown List - always allows adding (no toggle) */}
      {isOpen && players.length > 0 && (
        <View style={styles.eventDropdownList}>
          <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
            {players.map((player) => {
              const count = selectedIds.filter(id => id === player.id).length;
              return (
                <TouchableOpacity 
                  key={player.id} 
                  style={styles.eventDropdownItem}
                  onPress={() => handleAddPlayer(player.id)}
                >
                  <Text style={styles.eventDropdownItemText}>
                    {player.number ? `#${player.number} ` : ''}{player.name}
                  </Text>
                  {count > 0 && (
                    <View style={styles.selectedCountBadge}>
                      <Text style={styles.selectedCountText}>{count}</Text>
                    </View>
                  )}
                  <Ionicons name="add-circle-outline" size={18} color="#4CAF50" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      {isOpen && players.length === 0 && (
        <View style={styles.eventDropdownList}>
          <Text style={styles.eventDropdownItemTextEmpty}>Nessun giocatore</Text>
        </View>
      )}
    </View>
  );
}

// Helper Component: Team Ratings Accordion
function TeamRatingsAccordion({ 
  teamName, 
  teamLetter, 
  players = [],
  ratings = {},
  onRatingChange
}: { 
  teamName: string; 
  teamLetter: string; 
  players?: any[];
  ratings?: Record<string, number>;
  onRatingChange?: (playerId: string, rating: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');

  const handleRatingChange = (playerId: string, rating: number) => {
    if (onRatingChange) {
      onRatingChange(playerId, rating);
    }
  };

  const openRatingPicker = (playerId: string, playerName: string) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName);
    setShowRatingPicker(true);
  };

  const selectRating = (rating: number) => {
    if (selectedPlayerId) {
      handleRatingChange(selectedPlayerId, rating);
    }
    setShowRatingPicker(false);
    setSelectedPlayerId(null);
  };

  // Available ratings from 1 to 10 with half points
  const availableRatings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

  return (
    <View style={styles.teamAccordion}>
      <TouchableOpacity style={styles.teamAccordionHeader} onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.teamLetterBadge}>
          <Text style={styles.teamLetterText}>{teamLetter}</Text>
        </View>
        <Text style={styles.teamAccordionName}>{teamName}</Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#000" />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.playersList}>
          {players.length === 0 ? (
            <View style={styles.noPlayersRatingRow}>
              <Text style={styles.noPlayersRatingText}>Nessun giocatore in rosa</Text>
            </View>
          ) : (
            players.map((player) => {
              const hasRating = ratings[player.id] !== undefined;
              return (
                <View key={player.id} style={styles.playerRatingRow}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerRole}>{player.role || '-'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.votoBtn, hasRating && styles.votoBtnEdit]}
                    onPress={() => openRatingPicker(player.id, player.name)}
                  >
                    <Ionicons name={hasRating ? "pencil" : "add"} size={14} color="#FFF" />
                    <Text style={styles.votoBtnText}>{hasRating ? t('common.edit') : 'Voto'}</Text>
                  </TouchableOpacity>
                  <Ionicons 
                    name={hasRating ? "checkbox" : "checkbox-outline"} 
                    size={20} 
                    color={hasRating ? "#4CAF50" : "#CCC"} 
                    style={{ marginHorizontal: 8 }} 
                  />
                  {/* Only show rating if assigned */}
                  {hasRating ? (
                    <Text style={styles.ratingNumber}>{ratings[player.id]}</Text>
                  ) : (
                    <View style={styles.ratingPlaceholder} />
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Rating Picker Modal */}
      <Modal 
        visible={showRatingPicker} 
        animationType="fade" 
        transparent 
        onRequestClose={() => setShowRatingPicker(false)}
      >
        <TouchableOpacity 
          style={styles.ratingPickerOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRatingPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.ratingPickerContainer}>
            {/* Header */}
            <View style={styles.ratingPickerHeader}>
              <Text style={styles.ratingPickerTitle}>Assegna Voto</Text>
              <TouchableOpacity onPress={() => setShowRatingPicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {/* Player Name */}
            <Text style={styles.ratingPickerPlayerName}>{selectedPlayerName}</Text>
            
            {/* Rating Grid */}
            <View style={styles.ratingGrid}>
              {availableRatings.map((rating) => {
                const isSelected = selectedPlayerId && ratings[selectedPlayerId] === rating;
                return (
                  <TouchableOpacity 
                    key={rating} 
                    style={[styles.ratingGridItem, isSelected && styles.ratingGridItemSelected]}
                    onPress={() => selectRating(rating)}
                  >
                    <Text style={[styles.ratingGridText, isSelected && styles.ratingGridTextSelected]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick select common ratings */}
            <View style={styles.quickRatings}>
              <Text style={styles.quickRatingsLabel}>Voti rapidi:</Text>
              <View style={styles.quickRatingsRow}>
                {[5, 5.5, 6, 6.5, 7, 7.5, 8].map((r) => (
                  <TouchableOpacity 
                    key={r} 
                    style={styles.quickRatingBtn}
                    onPress={() => selectRating(r)}
                  >
                    <Text style={styles.quickRatingText}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ResultInput({ match, homeTeam, awayTeam, onSave }: any) {
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const hg = parseInt(homeGoals); const ag = parseInt(awayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) { Alert.alert(t('common.error'), 'Risultati validi'); return; }
    setLoading(true); await onSave(match, hg, ag); setLoading(false);
  };

  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultRound}>{match.round}</Text>
      <View style={styles.resultTeams}>
        <View style={styles.resultTeam}>
          <Text style={styles.resultTeamName}>{homeTeam}</Text>
          <TextInput style={styles.goalInput} keyboardType="numeric" value={homeGoals} onChangeText={setHomeGoals} placeholder="0" maxLength={2} />
        </View>
        <Text style={styles.resultDash}>-</Text>
        <View style={styles.resultTeam}>
          <TextInput style={styles.goalInput} keyboardType="numeric" value={awayGoals} onChangeText={setAwayGoals} placeholder="0" maxLength={2} />
          <Text style={styles.resultTeamName}>{awayTeam}</Text>
        </View>
      </View>
      <Button title={t('common.save')} onPress={handleSave} loading={loading} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: '#000' },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  addButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  // Sport Filter Pills
  filterContainer: { 
    height: 60, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE',
    justifyContent: 'center',
  },
  filterContent: { 
    paddingHorizontal: 16, 
    gap: 10, 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 0,
  },
  filterPill: { 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    borderRadius: 25, 
    borderWidth: 2, 
    borderColor: '#000', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    minHeight: 44,
  },
  filterPillActive: { backgroundColor: '#000' },
  filterPillText: { fontSize: 14, fontWeight: '600', color: '#000', textAlign: 'center' },
  filterPillTextActive: { color: '#FFF' },
  sportEmojiBadge: { fontSize: 24 },
  scrollContent: { padding: 16, paddingBottom: 140 },
  tournamentCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 2 },
  cardMeta: { fontSize: 14, color: '#666' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
  statusBadge: { borderWidth: 1, borderColor: '#000', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  statusActive: { backgroundColor: '#000' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#000' },
  statusTextActive: { color: '#FFF' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: '#000' },
  modalCancel: { fontSize: 16, color: '#000', fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 8, marginTop: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: '#000' },
  chipSelected: { backgroundColor: '#000' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#000' },
  chipTextSelected: { color: '#FFF' },
  formatContainer: { marginBottom: 16 },
  formatOption: { padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#000', marginBottom: 8 },
  formatSelected: { backgroundColor: '#000' },
  formatText: { fontSize: 16, color: '#000', fontWeight: '600' },
  formatTextSelected: { color: '#FFF' },
  // Game Format Styles
  gameFormatContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  gameFormatOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 2, borderColor: '#000' },
  gameFormatSelected: { backgroundColor: '#000' },
  gameFormatEmoji: { fontSize: 16, marginRight: 6 },
  gameFormatText: { fontSize: 13, fontWeight: '600', color: '#000' },
  gameFormatTextSelected: { color: '#FFF' },
  customPlayersContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 12, borderRadius: 12, marginBottom: 16 },
  customPlayersLabel: { fontSize: 14, color: '#000', flex: 1 },
  customPlayersInput: { width: 60, height: 40, borderWidth: 2, borderColor: '#000', borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '700', backgroundColor: '#FFF' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: '#000' },
  backBtn: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailHeaderInfo: { flex: 1 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  detailMeta: { fontSize: 13, color: '#666' },
  tabsContainer: { backgroundColor: '#FFF', paddingVertical: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4, borderRadius: 20, borderWidth: 2, borderColor: '#000' },
  tabActive: { backgroundColor: '#000' },
  tabText: { fontSize: 14, color: '#000', marginLeft: 6, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  detailContent: { flex: 1, padding: 16 },
  detailContentContainer: { paddingBottom: 140 },
  teamCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#000', padding: 14, borderRadius: 12, marginBottom: 8 },
  teamInfo: { flexDirection: 'row', alignItems: 'center' },
  teamIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  teamInitial: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  teamName: { fontSize: 16, fontWeight: '600', color: '#000' },
  matchDayGroup: { marginBottom: 32 },
  matchDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  matchDayTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  matchPillCard: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 },
  matchPillTeam: { fontSize: 14, color: '#000', flex: 1, textAlign: 'center' },
  matchPillScore: { fontSize: 16, fontWeight: '700', color: '#000', marginHorizontal: 12, backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  matchPillMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  matchPillDateTime: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 6 },
  matchStatsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0F0F0', borderRadius: 8, marginTop: 10 },
  matchStatsBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
  warningText: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 8 },
  resultsTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 16 },
  resultCard: { borderWidth: 2, borderColor: '#000', padding: 16, borderRadius: 12, marginBottom: 12 },
  resultRound: { fontSize: 12, color: '#666', marginBottom: 12, fontWeight: '600' },
  resultTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  resultTeam: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  resultTeamName: { fontSize: 14, fontWeight: '600', color: '#000', flex: 1 },
  resultDash: { fontSize: 20, fontWeight: '700', color: '#000', paddingHorizontal: 8 },
  goalInput: { width: 50, height: 50, borderWidth: 2, borderColor: '#000', borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#000', marginHorizontal: 8 },
  settingsCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, padding: 16, marginBottom: 16 },
  settingsLabel: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 12 },
  statusOptions: { flexDirection: 'row', gap: 8 },
  statusOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#000', alignItems: 'center' },
  statusOptionActive: { backgroundColor: '#000' },
  statusOptionText: { fontSize: 13, fontWeight: '600', color: '#000' },
  statusOptionTextActive: { color: '#FFF' },
  linkContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8 },
  linkText: { fontSize: 14, color: '#000', flex: 1 },
  teamSelector: { marginBottom: 16 },
  teamSelectorItem: { padding: 14, borderRadius: 10, borderWidth: 2, borderColor: '#000', marginBottom: 8 },
  teamSelectorItemActive: { backgroundColor: '#000' },
  teamSelectorText: { fontSize: 15, color: '#000', fontWeight: '600' },
  teamSelectorTextActive: { color: '#FFF' },
  // New Match Modal Styles
  newMatchContent: { flex: 1, padding: 24 },
  newMatchLabel: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 10, marginTop: 20 },
  newMatchDropdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderWidth: 1.5, 
    borderColor: '#000', 
    borderRadius: 28, 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: '#FFF'
  },
  newMatchDropdownText: { fontSize: 16, color: '#000' },
  newMatchDropdownPlaceholder: { fontSize: 16, color: '#999' },
  dropdownList: { 
    borderWidth: 1.5, 
    borderColor: '#000', 
    borderRadius: 16, 
    marginTop: 8, 
    backgroundColor: '#FFF',
    overflow: 'hidden'
  },
  dropdownItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  dropdownItemText: { fontSize: 16, color: '#000' },
  giornataContainer: { 
    borderWidth: 1.5, 
    borderColor: '#000', 
    borderRadius: 20, 
    padding: 16,
    backgroundColor: '#FFF'
  },
  giornataRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 8
  },
  giornataText: { fontSize: 16, color: '#000' },
  newGiornataRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#000', 
    borderRadius: 28, 
    marginTop: 12,
    overflow: 'hidden'
  },
  newGiornataInput: { 
    flex: 1, 
    fontSize: 16, 
    color: '#000', 
    paddingHorizontal: 20, 
    paddingVertical: 14
  },
  newGiornataAddBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderLeftWidth: 1.5, 
    borderLeftColor: '#000'
  },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateTimeCol: { flex: 1 },
  newMatchInputWithIcon: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#000', 
    borderRadius: 28, 
    paddingHorizontal: 20, 
    paddingVertical: 14,
    backgroundColor: '#FFF'
  },
  inputFieldText: { flex: 1, fontSize: 16, color: '#000' },
  inputFieldPlaceholder: { flex: 1, fontSize: 16, color: '#999' },
  // Date/Time Picker Modal styles
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  pickerCancelText: { fontSize: 16, color: '#666' },
  pickerConfirmText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  // Match Selection Styles
  matchSelectCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, padding: 16, marginBottom: 12 },
  matchSelectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  matchSelectTeam: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center' },
  matchSelectScoreBox: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  matchSelectScore: { fontSize: 20, fontWeight: '700', color: '#000' },
  matchSelectDash: { fontSize: 20, fontWeight: '700', color: '#000', marginHorizontal: 8 },
  matchSelectBadge: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F0F0F0' },
  matchSelectBadgeText: { fontSize: 12, color: '#666' },
  matchSelectFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  matchSelectBadgeInCorso: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50' },
  matchSelectBadgeTextInCorso: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  matchEditIcon: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  // Result Modal Styles
  backBtnRound: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666' },
  eyeBtn: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resultModalContent: { flex: 1, padding: 16 },
  scoreCard: { borderWidth: 2, borderColor: '#000', borderRadius: 20, padding: 20, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  scoreTeamName: { fontSize: 18, fontWeight: '700', color: '#000', flex: 1, textAlign: 'center' },
  scoreInputBox: { width: 56, height: 56, borderWidth: 2, borderColor: '#000', borderRadius: 16, textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#000' },
  scoreDash: { fontSize: 24, fontWeight: '700', color: '#000', marginHorizontal: 8 },
  // Stats Section
  statsSection: { borderWidth: 2, borderColor: '#000', borderRadius: 16, overflow: 'hidden' },
  statsHeader: { backgroundColor: '#000', paddingVertical: 12, alignItems: 'center' },
  statsHeaderText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  statsContent: { flexDirection: 'row', padding: 16 },
  statsColumn: { flex: 1 },
  statsVerticalLine: { width: 1, backgroundColor: '#CCC', marginHorizontal: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statsPlayerName: { fontSize: 14, fontWeight: '600', color: '#000', flex: 1 },
  statsIcon: { fontSize: 14 },
  yellowCard: { width: 12, height: 16, backgroundColor: '#FFD700', borderRadius: 2, marginRight: 4 },
  redCard: { width: 12, height: 16, backgroundColor: '#FF0000', borderRadius: 2 },
  subEvent: { flexDirection: 'row', alignItems: 'center' },
  subPlayerOut: { fontSize: 12, color: '#666', marginLeft: 4 },
  noEventsText: { fontSize: 14, color: '#999', textAlign: 'center' },
  noEventsContainer: { padding: 20, alignItems: 'center' },
  noEventsMessage: { fontSize: 14, color: '#999', fontStyle: 'italic', textAlign: 'center' },
  statsRowReverse: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, justifyContent: 'flex-start', gap: 6 },
  // Result Buttons
  resultButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  finePartitaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', paddingVertical: 16, borderRadius: 16, gap: 8 },
  finePartitaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  extraBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, gap: 4 },
  extraBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  // Extra Modal Styles
  extraModalContent: { flex: 1, padding: 16 },
  extraHeaderBox: { borderWidth: 2, borderColor: '#000', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  extraHeaderText: { fontSize: 16, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center' },
  extraColumnsContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  extraColumn: { flex: 1 },
  extraColumnHeader: { backgroundColor: '#000', paddingVertical: 10, alignItems: 'center', borderRadius: 12, marginBottom: 8 },
  extraColumnHeaderText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  eventDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#000', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8 },
  cardIcon2: { width: 12, height: 16, borderRadius: 2, marginRight: 6 },
  eventDropdownLabel: { flex: 1, fontSize: 12, color: '#000', marginLeft: 6 },
  eventDropdownLabelSelected: { fontWeight: '600' },
  eventDropdownList: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#000', borderRadius: 12, marginTop: -6, marginBottom: 12, maxHeight: 160 },
  eventDropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  eventDropdownItemSelected: { backgroundColor: '#F0FFF0' },
  eventDropdownItemText: { fontSize: 12, color: '#000' },
  eventDropdownItemTextSelected: { fontWeight: '600' },
  eventDropdownItemTextEmpty: { fontSize: 12, color: '#999', paddingHorizontal: 12, paddingVertical: 10 },
  // Multi-select styles
  multiDropdownContainer: { marginBottom: 8 },
  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 8 },
  selectedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 20, paddingLeft: 10, paddingRight: 4, paddingVertical: 4, maxWidth: '100%' },
  selectedTagText: { fontSize: 11, color: '#FFF', marginRight: 4, flexShrink: 1 },
  selectedTagRemove: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  selectedCountBadge: { backgroundColor: '#4CAF50', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginRight: 6 },
  selectedCountText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  dropdownScrollView: { maxHeight: 150 },
  // Live Score styles
  liveScoreCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, marginBottom: 16 },
  liveScoreTeam: { flex: 1, fontSize: 12, fontWeight: '600', color: '#000', textAlign: 'center' },
  liveScoreCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveScoreNumber: { fontSize: 28, fontWeight: '700', color: '#000', minWidth: 36, textAlign: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  liveScoreDash: { fontSize: 24, fontWeight: '700', color: '#000' },
  salvaBtn: { backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 8, marginBottom: 20 },
  salvaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  // Voti Section
  votiSection: { marginBottom: 16 },
  votiHeader: { backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8, marginBottom: 12 },
  votiHeaderText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  teamAccordion: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  teamAccordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  teamLetterBadge: { width: 32, height: 32, backgroundColor: '#000', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  teamLetterText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  teamAccordionName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#000' },
  playersList: { borderTopWidth: 1, borderTopColor: '#EEE' },
  playerRatingRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  noPlayersRatingRow: { padding: 16, alignItems: 'center' },
  noPlayersRatingText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: '700', color: '#000' },
  playerRole: { fontSize: 12, color: '#666' },
  votoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  votoBtnEdit: { backgroundColor: '#555' },
  votoBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  ratingNumber: { fontSize: 16, fontWeight: '700', color: '#000', minWidth: 32, textAlign: 'right' },
  ratingPlaceholder: { minWidth: 32 },
  // Rating Picker Modal Styles
  ratingPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  ratingPickerContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340 },
  ratingPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ratingPickerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  ratingPickerPlayerName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 16, textAlign: 'center' },
  ratingGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  ratingGridItem: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  ratingGridItemSelected: { borderColor: '#000', backgroundColor: '#000' },
  ratingGridText: { fontSize: 14, fontWeight: '600', color: '#000' },
  ratingGridTextSelected: { color: '#FFF' },
  quickRatings: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 16 },
  quickRatingsLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
  quickRatingsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  quickRatingBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 10, alignItems: 'center' },
  quickRatingText: { fontSize: 14, fontWeight: '600', color: '#000' },
  // New Teams Screen Styles
  addTeamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', paddingVertical: 16, borderRadius: 16, gap: 8 },
  addTeamBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  teamCardNew: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  teamRowFull: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  teamLeftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  teamAvatarNew: { width: 44, height: 44, backgroundColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  teamAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  teamNameNew: { flex: 1, fontSize: 18, fontWeight: '600', color: '#000' },
  teamActionBtns: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  teamActionBtn: { width: 44, height: 44, backgroundColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formationBtn: { width: 44, height: 44, backgroundColor: '#2D8A2E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  formationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E8F5E9', borderTopWidth: 1, borderTopColor: '#C8E6C9' },
  formationBadgeText: { fontSize: 13, color: '#2D8A2E', fontWeight: '600' },
  playersAccordion: { borderTopWidth: 2, borderTopColor: '#000', padding: 12 },
  noPlayersText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  playerNameBold: { fontSize: 15, fontWeight: '700', color: '#000' },
  playerRoleText: { fontSize: 13, color: '#666' },
  playerRightSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerDeleteBtn: { padding: 4 },
  playerNumberBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  playerNumberLabel: { fontSize: 13, color: '#666' },
  playerNumberValue: { fontSize: 16, fontWeight: '700', color: '#000', minWidth: 24, textAlign: 'right' },
  // New Team Modal Styles
  modalContentSimple: { padding: 24 },
  inputLabelSimple: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 10 },
  inputBoxSimple: { borderWidth: 2, borderColor: '#000', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  inputTextSimple: { fontSize: 16, color: '#000' },
  addBtnBlack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', paddingVertical: 16, borderRadius: 16, gap: 8 },
  addBtnBlackText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  // Add Player Modal Styles
  playerFormContent: { flex: 1, padding: 24 },
  teamSelectorClosed: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#000', borderRadius: 16, padding: 14, marginBottom: 24 },
  teamSelectorAvatar: { width: 36, height: 36, backgroundColor: '#000', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  teamSelectorAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  teamSelectorName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#000' },
  playerFormLabel: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 10, marginTop: 16 },
  playerFormInputBox: { borderWidth: 2, borderColor: '#000', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  playerFormInput: { fontSize: 16, color: '#000' },
  playerFormRow: { flexDirection: 'row', gap: 12 },
  playerFormColSmall: { flex: 1 },
  playerFormColLarge: { flex: 2 },
  playerFormDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#000', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  playerFormDropdownText: { fontSize: 16, color: '#000' },
  playerFormDropdownPlaceholder: { fontSize: 16, color: '#999' },
  roleDropdownList: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginTop: 8, backgroundColor: '#FFF', overflow: 'hidden' },
  roleDropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  roleDropdownText: { fontSize: 16, color: '#000' },
  playerFormPhotoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000', borderRadius: 16, paddingVertical: 20, gap: 8, borderStyle: 'dashed', minHeight: 100 },
  playerFormPhotoText: { fontSize: 16, color: '#999' },
  playerPhotoPreview: { width: 80, height: 80, borderRadius: 12 },
  playerFormPlaceholder: { fontSize: 16, color: '#999', flex: 1 },
  playerFormInputWithIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#000', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  // Date Picker Styles
  datePickerModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  datePickerContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  datePickerCancel: { fontSize: 16, color: '#666' },
  datePickerDone: { fontSize: 16, fontWeight: '700', color: '#000' },
  // Player Avatar Styles
  playerAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  playerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  playerAvatarInitials: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  playerStatsBtn: { padding: 4 },
  // Stats Modal Styles
  statsModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  // Match Statistics Modal styles
  matchStatsModalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: '85%' },
  matchStatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  matchStatsTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  matchStatsResultBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, marginBottom: 20 },
  matchStatsTeamName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#000', textAlign: 'center' },
  matchStatsScoreBox: { paddingHorizontal: 16 },
  matchStatsScore: { fontSize: 24, fontWeight: '700', color: '#000' },
  matchStatsEventsScroll: { maxHeight: 350 },
  noMatchStatsContainer: { alignItems: 'center', paddingVertical: 40 },
  noMatchStatsText: { fontSize: 14, color: '#999', marginTop: 12, fontStyle: 'italic' },
  matchStatsSection: { marginBottom: 20 },
  matchStatsSectionTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  matchStatsEventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  matchStatsEventPlayer: { fontSize: 14, color: '#000', flex: 1 },
  matchStatsEventTeam: { fontSize: 12, color: '#666' },
  statsModalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 },
  statsModalClose: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  statsModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingRight: 30 },
  statsModalAvatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16 },
  statsModalAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  statsModalAvatarText: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  statsModalPlayerInfo: { flex: 1 },
  statsModalPlayerName: { fontSize: 20, fontWeight: '700', color: '#000' },
  statsModalPlayerRole: { fontSize: 14, color: '#666', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem: { width: '30%', alignItems: 'center', marginBottom: 20 },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#000' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  additionalStats: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 16, marginTop: 8 },
  additionalStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  additionalStatLabel: { fontSize: 14, color: '#000' },
  additionalStatValue: { fontSize: 16, fontWeight: '700', color: '#000' },
  // Stats loading and average rating
  statsLoading: { alignItems: 'center', paddingVertical: 20 },
  statsLoadingText: { fontSize: 14, color: '#666', marginTop: 8 },
  averageRatingSection: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 16, marginTop: 8, alignItems: 'center' },
  averageRatingLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  averageRatingValue: { fontSize: 32, fontWeight: '700', color: '#FFD700' },
  averageRatingSubtext: { fontSize: 12, color: '#999', marginTop: 4 },
  // News Management Styles
  addNewsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 16 },
  addNewsButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  newsCard: { borderWidth: 2, borderColor: '#000', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  newsCardImage: { width: '100%', height: 160, backgroundColor: '#F0F0F0' },
  newsCardContent: { padding: 16 },
  newsCardTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 6 },
  newsCardDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  newsCardDate: { fontSize: 12, color: '#999', marginTop: 8 },
  newsCardActions: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#EEE', gap: 8 },
  newsEditBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#F5F5F5', borderRadius: 8 },
  newsDeleteBtn: { width: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#EF4444', borderRadius: 8 },
  // News Modal Styles
  newsModalContainer: { flex: 1, backgroundColor: '#FFF' },
  newsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  newsModalCancel: { fontSize: 16, color: '#666' },
  newsModalTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  newsModalSave: { fontSize: 16, fontWeight: '600', color: '#000' },
  newsModalContent: { flex: 1, padding: 16 },
  newsPhotoUpload: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#CCC', borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  newsPhotoPreview: { width: '100%', height: 200 },
  newsPhotoPlaceholder: { height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9F9' },
  newsPhotoText: { fontSize: 14, color: '#999', marginTop: 8 },
  newsInputLabel: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8 },
  newsInput: { borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  newsTextArea: { height: 150, textAlignVertical: 'top' },
  // Auto-save indicator styles
  autoSaveIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  autoSaveText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  extraFooterButtons: { marginBottom: 40, gap: 12 },
  // Highlights tab styles
  highlightsTabContent: { paddingTop: 8 },
  highlightsInfoCard: { flexDirection: 'row', backgroundColor: '#F8F8F8', borderRadius: 12, padding: 16, marginTop: 16 },
  highlightsInfoTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  highlightsInfoText: { fontSize: 13, color: '#666', lineHeight: 18 },
  highlightsLoadingContainer: { alignItems: 'center', paddingVertical: 40 },
  highlightsLoadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  highlightsList: { marginTop: 16 },
  highlightsRoundSection: { marginBottom: 20, backgroundColor: '#F8F8F8', borderRadius: 12, padding: 16 },
  highlightsRoundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  highlightsRoundTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  highlightsRoundStats: { fontSize: 12, color: '#666' },
  highlightsPhotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  highlightsPhotoThumbnail: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E5E5E5' },
  highlightsPhotoImage: { width: '100%', height: '100%' },
  highlightsVideosList: { gap: 8 },
  highlightsVideoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, padding: 10, gap: 10 },
  highlightsVideoThumbnail: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  highlightsVideoName: { flex: 1, fontSize: 13, color: '#333' },
});
