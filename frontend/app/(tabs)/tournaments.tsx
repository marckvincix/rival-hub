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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button, EmptyState, Loading, Input } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament } from '../../src/types';

const CATEGORIES = ['U10', 'U12', 'U14', 'U16', 'U18', 'Open'];
const FORMATS = [
  { value: 'league', label: 'Campionato' },
  { value: 'knockout', label: 'Eliminazione' },
  { value: 'groups_knockout', label: 'Gironi + Elim.' },
];

export default function TournamentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Open',
    format: 'league',
    location: '',
  });
  const [formLoading, setFormLoading] = useState(false);

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
      Alert.alert('Errore', 'Il nome del torneo è richiesto');
      return;
    }
    if (user?.plan === 'free' && tournaments.length >= 1) {
      Alert.alert('Limite Raggiunto', 'Piano Free: solo 1 torneo. Passa a Pro!', [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') }
      ]);
      return;
    }
    try {
      setFormLoading(true);
      const response = await api.post('/api/tournaments', formData);
      setTournaments([response.data, ...tournaments]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', category: 'Open', format: 'league', location: '' });
      setSelectedTournament(response.data);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTournament = async (tournament: Tournament) => {
    Alert.alert('Elimina Torneo', `Eliminare "${tournament.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/tournaments/${tournament.id}`);
          setTournaments(tournaments.filter(t => t.id !== tournament.id));
          if (selectedTournament?.id === tournament.id) setSelectedTournament(null);
        } catch (error) { Alert.alert('Errore', 'Impossibile eliminare'); }
      }}
    ]);
  };

  const handleUpdateStatus = async (tournament: Tournament, newStatus: string) => {
    try {
      await api.put(`/api/tournaments/${tournament.id}`, { status: newStatus });
      const updated = { ...tournament, status: newStatus };
      setTournaments(tournaments.map(t => t.id === tournament.id ? updated : t));
      if (selectedTournament?.id === tournament.id) setSelectedTournament(updated as Tournament);
    } catch (error) { Alert.alert('Errore', 'Impossibile aggiornare'); }
  };

  const getStatusLabel = (status: string) => {
    switch (status) { case 'active': return 'In corso'; case 'completed': return 'Completato'; default: return 'Bozza'; }
  };

  if (loading) return <Loading message="Caricamento..." />;

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
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {tournaments.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="Nessun torneo"
            description="Crea il tuo primo torneo"
            actionLabel="Crea Torneo"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          tournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              style={styles.tournamentCard}
              onPress={() => setSelectedTournament(tournament)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="trophy" size={24} color="#000" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{tournament.name}</Text>
                  <Text style={styles.cardMeta}>{tournament.category} • {tournament.location || 'Nessun luogo'}</Text>
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
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nuovo Torneo</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Input label="Nome Torneo *" placeholder="es. Torneo Primavera 2025" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />
            <Input label="Luogo" placeholder="es. Milano, Campo XYZ" value={formData.location} onChangeText={(text) => setFormData({ ...formData, location: text })} />
            
            <Text style={styles.inputLabel}>Categoria</Text>
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

  useEffect(() => { loadData(); }, [tournament.id]);

  const loadData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        api.get(`/api/tournaments/${tournament.id}/teams`),
        api.get(`/api/tournaments/${tournament.id}/matches`)
      ]);
      setTeams(teamsRes.data);
      setMatches(matchesRes.data);
    } catch (error) {} finally { setLoading(false); }
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
    const rounds = [...new Set(matches.map(m => m.round))].filter(Boolean);
    return rounds.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [matches]);

  const nextRoundNumber = React.useMemo(() => {
    if (existingRounds.length === 0) return 1;
    const lastRound = existingRounds[existingRounds.length - 1];
    const num = parseInt(lastRound.replace(/\D/g, '')) || 0;
    return num + 1;
  }, [existingRounds]);

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) { Alert.alert('Errore', 'Nome richiesto'); return; }
    try {
      const response = await api.post(`/api/tournaments/${tournament.id}/teams`, { name: newTeamName });
      setTeams([...teams, response.data]);
      setShowAddTeamModal(false);
      setNewTeamName('');
    } catch (error: any) { Alert.alert('Errore', error.response?.data?.detail || 'Impossibile aggiungere'); }
  };

  const handleAddMatch = async () => {
    if (!newMatchData.home_team_id || !newMatchData.away_team_id) { Alert.alert('Errore', 'Seleziona entrambe le squadre'); return; }
    if (newMatchData.home_team_id === newMatchData.away_team_id) { Alert.alert('Errore', 'Squadre diverse'); return; }
    if (!newMatchData.round) { Alert.alert('Errore', 'Seleziona una giornata'); return; }
    try {
      const matchPayload = {
        home_team_id: newMatchData.home_team_id,
        away_team_id: newMatchData.away_team_id,
        round: newMatchData.round,
        date: newMatchData.date || undefined,
        time: newMatchData.time || undefined,
        venue_name: newMatchData.venue_name || undefined,
        venue_address: newMatchData.venue_address || undefined,
      };
      const response = await api.post(`/api/tournaments/${tournament.id}/matches`, matchPayload);
      setMatches([...matches, response.data]);
      setShowAddMatchModal(false);
      setNewMatchData({ home_team_id: '', away_team_id: '', round: '', date: '', time: '', venue_name: '', venue_address: '' });
      setShowHomeDropdown(false);
      setShowAwayDropdown(false);
    } catch (error: any) { Alert.alert('Errore', error.response?.data?.detail || 'Impossibile aggiungere'); }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try { await api.delete(`/api/teams/${teamId}`); setTeams(teams.filter(t => t.id !== teamId)); } catch (e) { Alert.alert('Errore'); }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try { await api.delete(`/api/matches/${matchId}`); setMatches(matches.filter(m => m.id !== matchId)); } catch (e) { Alert.alert('Errore'); }
  };

  const handleUpdateResult = async (match: any, homeGoals: number, awayGoals: number) => {
    try {
      await api.put(`/api/matches/${match.id}`, { home_goals: homeGoals, away_goals: awayGoals, status: 'completed' });
      setMatches(matches.map(m => m.id === match.id ? { ...m, home_goals: homeGoals, away_goals: awayGoals, status: 'completed' } : m));
    } catch (e) { Alert.alert('Errore'); }
  };

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Squadra';

  const getStatusLabel = (status: string) => {
    switch (status) { case 'active': return 'In corso'; case 'completed': return 'Completato'; default: return 'Bozza'; }
  };

  const tabs = [
    { id: 'teams', label: 'Squadre', icon: 'people' as const },
    { id: 'matches', label: 'Partite', icon: 'football' as const },
    { id: 'results', label: 'Risultati', icon: 'create' as const },
    { id: 'settings', label: 'Impostazioni', icon: 'settings' as const }
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

      <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
        {loading ? <Loading /> : (
          <>
            {activeTab === 'teams' && (
              <View>
                <Button title="Aggiungi Squadra" onPress={() => setShowAddTeamModal(true)} icon="add" fullWidth />
                <View style={{ height: 16 }} />
                {teams.length === 0 ? <EmptyState icon="people-outline" title="Nessuna squadra" /> : (
                  teams.map((team) => (
                    <View key={team.id} style={styles.teamCard}>
                      <View style={styles.teamInfo}>
                        <View style={styles.teamIcon}><Text style={styles.teamInitial}>{team.name.charAt(0)}</Text></View>
                        <Text style={styles.teamName}>{team.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => Alert.alert('Elimina?', '', [{ text: 'No' }, { text: 'Sì', onPress: () => handleDeleteTeam(team.id) }])}>
                        <Ionicons name="trash-outline" size={20} color="#000" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'matches' && (
              <View>
                <Button title="Aggiungi Partita" onPress={() => setShowAddMatchModal(true)} icon="add" fullWidth disabled={teams.length < 2} />
                {teams.length < 2 && <Text style={styles.warningText}>Aggiungi almeno 2 squadre</Text>}
                <View style={{ height: 16 }} />
                {matches.length === 0 ? <EmptyState icon="football-outline" title="Nessuna partita" /> : (
                  groupedMatches.map(([round, roundMatches]) => (
                    <View key={round} style={styles.matchDayGroup}>
                      <View style={styles.matchDayHeader}>
                        <Text style={styles.matchDayTitle}>{round}</Text>
                        <TouchableOpacity onPress={() => {
                          Alert.alert('Elimina Giornata', `Eliminare tutte le partite di ${round}?`, [
                            { text: 'No' },
                            { text: 'Sì', onPress: async () => {
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
                          <Text style={styles.matchPillTeam}>{getTeamName(match.home_team_id)}</Text>
                          <Text style={styles.matchPillScore}>
                            {match.status === 'completed' ? `${match.home_goals} - ${match.away_goals}` : '0 - 0'}
                          </Text>
                          <Text style={styles.matchPillTeam}>{getTeamName(match.away_team_id)}</Text>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'results' && (
              <View>
                <Text style={styles.resultsTitle}>Inserisci Risultati</Text>
                {matches.filter(m => m.status !== 'completed').length === 0 ? <EmptyState icon="checkmark-circle-outline" title="Tutti inseriti" /> : (
                  matches.filter(m => m.status !== 'completed').map((match) => (
                    <ResultInput key={match.id} match={match} homeTeam={getTeamName(match.home_team_id)} awayTeam={getTeamName(match.away_team_id)} onSave={handleUpdateResult} />
                  ))
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
                <Button title="Elimina Torneo" onPress={onDelete} variant="outline" icon="trash-outline" fullWidth />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Team Modal */}
      <Modal visible={showAddTeamModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTeamModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddTeamModal(false)}><Text style={styles.modalCancel}>Annulla</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Nuova Squadra</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <Input label="Nome Squadra" placeholder="es. FC Juventus" value={newTeamName} onChangeText={setNewTeamName} />
            <Button title="Aggiungi" onPress={handleAddTeam} fullWidth size="large" />
          </View>
        </SafeAreaView>
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
            {/* Squadra Casa */}
            <Text style={styles.newMatchLabel}>Squadra Casa</Text>
            <TouchableOpacity 
              style={styles.newMatchDropdown} 
              onPress={() => { setShowHomeDropdown(!showHomeDropdown); setShowAwayDropdown(false); }}
            >
              <Text style={newMatchData.home_team_id ? styles.newMatchDropdownText : styles.newMatchDropdownPlaceholder}>
                {newMatchData.home_team_id ? teams.find(t => t.id === newMatchData.home_team_id)?.name : 'Seleziona la squadra'}
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

            {/* Squadra Trasferta */}
            <Text style={styles.newMatchLabel}>Squadra Trasferta</Text>
            <TouchableOpacity 
              style={styles.newMatchDropdown}
              onPress={() => { setShowAwayDropdown(!showAwayDropdown); setShowHomeDropdown(false); }}
            >
              <Text style={newMatchData.away_team_id ? styles.newMatchDropdownText : styles.newMatchDropdownPlaceholder}>
                {newMatchData.away_team_id ? teams.find(t => t.id === newMatchData.away_team_id)?.name : 'Seleziona la squadra'}
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
                  value={newMatchData.round && !existingRounds.includes(newMatchData.round) ? newMatchData.round : ''}
                  onChangeText={(text) => setNewMatchData({ ...newMatchData, round: text })}
                />
                <TouchableOpacity 
                  style={styles.newGiornataAddBtn}
                  onPress={() => setNewMatchData({ ...newMatchData, round: `Giornata ${nextRoundNumber}` })}
                >
                  <Ionicons name="add" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Data e Orario - Side by Side */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeCol}>
                <Text style={styles.newMatchLabel}>Data</Text>
                <View style={styles.newMatchInputWithIcon}>
                  <TextInput
                    style={styles.inputFieldText}
                    placeholder="GG/MM/AAAA"
                    placeholderTextColor="#999"
                    value={newMatchData.date}
                    onChangeText={(text) => setNewMatchData({ ...newMatchData, date: text })}
                  />
                  <Ionicons name="calendar-outline" size={22} color="#000" />
                </View>
              </View>
              <View style={styles.dateTimeCol}>
                <Text style={styles.newMatchLabel}>Orario</Text>
                <View style={styles.newMatchInputWithIcon}>
                  <TextInput
                    style={styles.inputFieldText}
                    placeholder="00-00"
                    placeholderTextColor="#999"
                    value={newMatchData.time}
                    onChangeText={(text) => setNewMatchData({ ...newMatchData, time: text })}
                  />
                  <Ionicons name="time-outline" size={22} color="#000" />
                </View>
              </View>
            </View>

            {/* Luogo */}
            <Text style={styles.newMatchLabel}>Luogo</Text>
            <View style={styles.newMatchInputWithIcon}>
              <TextInput
                style={styles.inputFieldText}
                placeholder="Nome"
                placeholderTextColor="#999"
                value={newMatchData.venue_name}
                onChangeText={(text) => setNewMatchData({ ...newMatchData, venue_name: text })}
              />
              <Ionicons name="football-outline" size={22} color="#000" />
            </View>
            <View style={[styles.newMatchInputWithIcon, { marginTop: 12 }]}>
              <TextInput
                style={styles.inputFieldText}
                placeholder="Indirizzo"
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
    </SafeAreaView>
  );
}

function ResultInput({ match, homeTeam, awayTeam, onSave }: any) {
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const hg = parseInt(homeGoals); const ag = parseInt(awayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) { Alert.alert('Errore', 'Risultati validi'); return; }
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
      <Button title="Salva" onPress={handleSave} loading={loading} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: '#000' },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  addButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100 },
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
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: '#000' },
  backBtn: { width: 48, height: 48, borderWidth: 2, borderColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailHeaderInfo: { flex: 1 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  detailMeta: { fontSize: 13, color: '#666' },
  tabsContainer: { backgroundColor: '#FFF', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: '#000' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4, borderRadius: 20, borderWidth: 2, borderColor: '#000' },
  tabActive: { backgroundColor: '#000' },
  tabText: { fontSize: 14, color: '#000', marginLeft: 6, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  detailContent: { flex: 1, padding: 16 },
  teamCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#000', padding: 14, borderRadius: 12, marginBottom: 8 },
  teamInfo: { flexDirection: 'row', alignItems: 'center' },
  teamIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  teamInitial: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  teamName: { fontSize: 16, fontWeight: '600', color: '#000' },
  matchDayGroup: { marginBottom: 32 },
  matchDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  matchDayTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  matchPillCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 8 },
  matchPillTeam: { fontSize: 15, color: '#000' },
  matchPillScore: { fontSize: 15, fontWeight: '700', color: '#000', marginHorizontal: 8 },
  warningText: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 8 },
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
});
