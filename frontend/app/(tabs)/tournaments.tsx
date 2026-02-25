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
import { Button, Card, EmptyState, Loading, Input } from '../../src/components';
import api from '../../src/utils/api';
import { Tournament } from '../../src/types';
import { getStatusLabel, getCategoryLabel, getFormatLabel } from '../../src/utils/helpers';

const CATEGORIES = ['U10', 'U12', 'U14', 'U16', 'U18', 'Open'];
const FORMATS = [
  { value: 'league', label: 'Campionato' },
  { value: 'knockout', label: 'Eliminazione diretta' },
  { value: 'groups_knockout', label: 'Gironi + Eliminazione' },
  { value: 'mixed', label: 'Misto' }
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
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Open',
    format: 'league',
    location: '',
    start_date: '',
    end_date: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const loadTournaments = async () => {
    try {
      const response = await api.get('/api/tournaments');
      setTournaments(response.data);
      
      // Check if we need to select a tournament from params
      if (params.id) {
        const tournament = response.data.find((t: Tournament) => t.id === params.id);
        if (tournament) {
          setSelectedTournament(tournament);
        }
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTournaments();
    }, [params.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTournaments();
  };

  const handleCreateTournament = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Errore', 'Il nome del torneo è richiesto');
      return;
    }

    // Check plan limits
    if (user?.plan === 'free' && tournaments.length >= 1) {
      Alert.alert(
        'Limite Raggiunto',
        'Il piano Free consente solo 1 torneo. Passa a Pro per creare più tornei.',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    try {
      setFormLoading(true);
      const response = await api.post('/api/tournaments', formData);
      setTournaments([response.data, ...tournaments]);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        category: 'Open',
        format: 'league',
        location: '',
        start_date: '',
        end_date: ''
      });
      setSelectedTournament(response.data);
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTournament = async (tournament: Tournament) => {
    Alert.alert(
      'Elimina Torneo',
      `Sei sicuro di voler eliminare "${tournament.name}"? Questa azione è irreversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/tournaments/${tournament.id}`);
              setTournaments(tournaments.filter(t => t.id !== tournament.id));
              if (selectedTournament?.id === tournament.id) {
                setSelectedTournament(null);
              }
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare il torneo');
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (tournament: Tournament, newStatus: string) => {
    try {
      await api.put(`/api/tournaments/${tournament.id}`, { status: newStatus });
      const updated = { ...tournament, status: newStatus };
      setTournaments(tournaments.map(t => t.id === tournament.id ? updated : t));
      if (selectedTournament?.id === tournament.id) {
        setSelectedTournament(updated as Tournament);
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aggiornare lo stato');
    }
  };

  if (loading) {
    return <Loading message="Caricamento tornei..." />;
  }

  // Tournament detail view
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>I Miei Tornei</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {tournaments.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="Nessun torneo"
            description="Crea il tuo primo torneo per iniziare a gestire squadre e partite"
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
                  <Ionicons name="trophy" size={28} color="#1E40AF" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{tournament.name}</Text>
                  <Text style={styles.cardMeta}>
                    {getCategoryLabel(tournament.category)} • {getFormatLabel(tournament.format)}
                  </Text>
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
              </View>
              
              {tournament.location && (
                <View style={styles.cardLocation}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.locationText}>{tournament.location}</Text>
                </View>
              )}
              
              <View style={styles.cardFooter}>
                <TouchableOpacity 
                  style={styles.cardAction}
                  onPress={() => router.push(`/tournament/${tournament.slug}`)}
                >
                  <Ionicons name="eye-outline" size={18} color="#1E40AF" />
                  <Text style={styles.cardActionText}>Vedi Pubblico</Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Tournament Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nuovo Torneo</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Input
              label="Nome Torneo *"
              placeholder="es. Torneo Primavera 2025"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Input
              label="Descrizione"
              placeholder="Descrizione opzionale"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, formData.category === cat && styles.chipSelected]}
                  onPress={() => setFormData({ ...formData, category: cat })}
                >
                  <Text style={[styles.chipText, formData.category === cat && styles.chipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Formato</Text>
            <View style={styles.formatContainer}>
              {FORMATS.map((format) => (
                <TouchableOpacity
                  key={format.value}
                  style={[styles.formatOption, formData.format === format.value && styles.formatSelected]}
                  onPress={() => setFormData({ ...formData, format: format.value })}
                >
                  <Text style={[styles.formatText, formData.format === format.value && styles.formatTextSelected]}>
                    {format.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Luogo"
              placeholder="es. Milano, Campo Sportivo XYZ"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />

            <View style={styles.buttonContainer}>
              <Button
                title="Crea Torneo"
                onPress={handleCreateTournament}
                loading={formLoading}
                fullWidth
                size="large"
                icon="checkmark-circle-outline"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Tournament Detail Component
interface TournamentDetailProps {
  tournament: Tournament;
  onBack: () => void;
  onDelete: () => void;
  onUpdateStatus: (tournament: Tournament, status: string) => void;
  onRefresh: () => void;
}

function TournamentDetail({ tournament, onBack, onDelete, onUpdateStatus, onRefresh }: TournamentDetailProps) {
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
    round: 'Giornata 1',
    match_date: '',
    match_time: '',
    venue: ''
  });

  useEffect(() => {
    loadTournamentData();
  }, [tournament.id]);

  const loadTournamentData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        api.get(`/api/tournaments/${tournament.id}/teams`),
        api.get(`/api/tournaments/${tournament.id}/matches`)
      ]);
      setTeams(teamsRes.data);
      setMatches(matchesRes.data);
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Errore', 'Il nome della squadra è richiesto');
      return;
    }
    try {
      const response = await api.post(`/api/tournaments/${tournament.id}/teams`, {
        name: newTeamName
      });
      setTeams([...teams, response.data]);
      setShowAddTeamModal(false);
      setNewTeamName('');
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile aggiungere la squadra');
    }
  };

  const handleAddMatch = async () => {
    if (!newMatchData.home_team_id || !newMatchData.away_team_id) {
      Alert.alert('Errore', 'Seleziona entrambe le squadre');
      return;
    }
    if (newMatchData.home_team_id === newMatchData.away_team_id) {
      Alert.alert('Errore', 'Le squadre devono essere diverse');
      return;
    }
    try {
      const response = await api.post(`/api/tournaments/${tournament.id}/matches`, newMatchData);
      setMatches([...matches, response.data]);
      setShowAddMatchModal(false);
      setNewMatchData({
        home_team_id: '',
        away_team_id: '',
        round: 'Giornata 1',
        match_date: '',
        match_time: '',
        venue: ''
      });
    } catch (error: any) {
      Alert.alert('Errore', error.response?.data?.detail || 'Impossibile aggiungere la partita');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await api.delete(`/api/teams/${teamId}`);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (error) {
      Alert.alert('Errore', 'Impossibile eliminare la squadra');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      await api.delete(`/api/matches/${matchId}`);
      setMatches(matches.filter(m => m.id !== matchId));
    } catch (error) {
      Alert.alert('Errore', 'Impossibile eliminare la partita');
    }
  };

  const handleUpdateResult = async (match: any, homeGoals: number, awayGoals: number) => {
    try {
      await api.put(`/api/matches/${match.id}`, {
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: 'completed'
      });
      setMatches(matches.map(m => 
        m.id === match.id 
          ? { ...m, home_goals: homeGoals, away_goals: awayGoals, status: 'completed' }
          : m
      ));
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aggiornare il risultato');
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Squadra';
  };

  const tabs = [
    { id: 'teams', label: 'Squadre', icon: 'people' as const },
    { id: 'matches', label: 'Partite', icon: 'football' as const },
    { id: 'results', label: 'Risultati', icon: 'create' as const },
    { id: 'settings', label: 'Impostazioni', icon: 'settings' as const }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.detailHeaderInfo}>
          <Text style={styles.detailTitle} numberOfLines={1}>{tournament.name}</Text>
          <Text style={styles.detailMeta}>{getCategoryLabel(tournament.category)}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/tournament/${tournament.slug}`)}>
          <Ionicons name="eye-outline" size={24} color="#1E40AF" />
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
      <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Loading />
        ) : (
          <>
            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <View>
                <Button
                  title="Aggiungi Squadra"
                  onPress={() => setShowAddTeamModal(true)}
                  icon="add-circle-outline"
                  fullWidth
                />
                <View style={{ height: 16 }} />
                {teams.length === 0 ? (
                  <EmptyState
                    icon="people-outline"
                    title="Nessuna squadra"
                    description="Aggiungi le squadre partecipanti"
                  />
                ) : (
                  teams.map((team) => (
                    <View key={team.id} style={styles.teamCard}>
                      <View style={styles.teamInfo}>
                        <View style={styles.teamIcon}>
                          <Text style={styles.teamInitial}>{team.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.teamName}>{team.name}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Elimina Squadra', 'Sei sicuro?', [
                            { text: 'Annulla', style: 'cancel' },
                            { text: 'Elimina', style: 'destructive', onPress: () => handleDeleteTeam(team.id) }
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <View>
                <Button
                  title="Aggiungi Partita"
                  onPress={() => setShowAddMatchModal(true)}
                  icon="add-circle-outline"
                  fullWidth
                  disabled={teams.length < 2}
                />
                {teams.length < 2 && (
                  <Text style={styles.warningText}>Aggiungi almeno 2 squadre per creare partite</Text>
                )}
                <View style={{ height: 16 }} />
                {matches.length === 0 ? (
                  <EmptyState
                    icon="football-outline"
                    title="Nessuna partita"
                    description="Crea il calendario delle partite"
                  />
                ) : (
                  matches.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                      <Text style={styles.matchRound}>{match.round}</Text>
                      <View style={styles.matchTeams}>
                        <Text style={styles.matchTeamName}>{getTeamName(match.home_team_id)}</Text>
                        <View style={styles.matchScore}>
                          {match.status === 'completed' ? (
                            <Text style={styles.scoreText}>{match.home_goals} - {match.away_goals}</Text>
                          ) : (
                            <Text style={styles.vsText}>vs</Text>
                          )}
                        </View>
                        <Text style={styles.matchTeamName}>{getTeamName(match.away_team_id)}</Text>
                      </View>
                      {match.match_date && (
                        <Text style={styles.matchDate}>{match.match_date} {match.match_time}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.deleteMatchBtn}
                        onPress={() => {
                          Alert.alert('Elimina Partita', 'Sei sicuro?', [
                            { text: 'Annulla', style: 'cancel' },
                            { text: 'Elimina', style: 'destructive', onPress: () => handleDeleteMatch(match.id) }
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <View>
                <Text style={styles.resultsTitle}>Inserisci Risultati</Text>
                {matches.filter(m => m.status !== 'completed').length === 0 ? (
                  <EmptyState
                    icon="checkmark-circle-outline"
                    title="Tutti i risultati inseriti"
                    description="Non ci sono partite in attesa"
                  />
                ) : (
                  matches.filter(m => m.status !== 'completed').map((match) => (
                    <ResultInput
                      key={match.id}
                      match={match}
                      homeTeam={getTeamName(match.home_team_id)}
                      awayTeam={getTeamName(match.away_team_id)}
                      onSave={handleUpdateResult}
                    />
                  ))
                )}
              </View>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <View>
                <Card title="Stato Torneo">
                  <View style={styles.statusOptions}>
                    {['draft', 'active', 'completed'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusOption, tournament.status === status && styles.statusOptionActive]}
                        onPress={() => onUpdateStatus(tournament, status)}
                      >
                        <Text style={[styles.statusOptionText, tournament.status === status && styles.statusOptionTextActive]}>
                          {getStatusLabel(status)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                <Card title="Link Pubblico">
                  <View style={styles.linkContainer}>
                    <Text style={styles.linkText} numberOfLines={1}>
                      /tournament/{tournament.slug}
                    </Text>
                    <TouchableOpacity onPress={() => router.push(`/tournament/${tournament.slug}`)}>
                      <Ionicons name="open-outline" size={20} color="#1E40AF" />
                    </TouchableOpacity>
                  </View>
                </Card>

                <Button
                  title="Elimina Torneo"
                  onPress={onDelete}
                  variant="danger"
                  icon="trash-outline"
                  fullWidth
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Team Modal */}
      <Modal
        visible={showAddTeamModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddTeamModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddTeamModal(false)}>
              <Text style={styles.modalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nuova Squadra</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <Input
              label="Nome Squadra"
              placeholder="es. FC Juventus"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <Button title="Aggiungi" onPress={handleAddTeam} fullWidth size="large" />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Match Modal */}
      <Modal
        visible={showAddMatchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddMatchModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddMatchModal(false)}>
              <Text style={styles.modalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nuova Partita</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Squadra Casa</Text>
            <View style={styles.teamSelector}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamSelectorItem, newMatchData.home_team_id === team.id && styles.teamSelectorItemActive]}
                  onPress={() => setNewMatchData({ ...newMatchData, home_team_id: team.id })}
                >
                  <Text style={[styles.teamSelectorText, newMatchData.home_team_id === team.id && styles.teamSelectorTextActive]}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Squadra Trasferta</Text>
            <View style={styles.teamSelector}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamSelectorItem, newMatchData.away_team_id === team.id && styles.teamSelectorItemActive]}
                  onPress={() => setNewMatchData({ ...newMatchData, away_team_id: team.id })}
                >
                  <Text style={[styles.teamSelectorText, newMatchData.away_team_id === team.id && styles.teamSelectorTextActive]}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Giornata/Round"
              placeholder="es. Giornata 1, Semifinale"
              value={newMatchData.round}
              onChangeText={(text) => setNewMatchData({ ...newMatchData, round: text })}
            />

            <Input
              label="Data (opzionale)"
              placeholder="es. 2025-03-15"
              value={newMatchData.match_date}
              onChangeText={(text) => setNewMatchData({ ...newMatchData, match_date: text })}
            />

            <Input
              label="Ora (opzionale)"
              placeholder="es. 15:00"
              value={newMatchData.match_time}
              onChangeText={(text) => setNewMatchData({ ...newMatchData, match_time: text })}
            />

            <Button title="Crea Partita" onPress={handleAddMatch} fullWidth size="large" />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Result Input Component
function ResultInput({ match, homeTeam, awayTeam, onSave }: any) {
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const hg = parseInt(homeGoals);
    const ag = parseInt(awayGoals);
    
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      Alert.alert('Errore', 'Inserisci risultati validi');
      return;
    }
    
    setLoading(true);
    await onSave(match, hg, ag);
    setLoading(false);
  };

  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultRound}>{match.round}</Text>
      <View style={styles.resultTeams}>
        <View style={styles.resultTeam}>
          <Text style={styles.resultTeamName}>{homeTeam}</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={homeGoals}
            onChangeText={setHomeGoals}
            placeholder="0"
            maxLength={2}
          />
        </View>
        <Text style={styles.resultDash}>-</Text>
        <View style={styles.resultTeam}>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={awayGoals}
            onChangeText={setAwayGoals}
            placeholder="0"
            maxLength={2}
          />
          <Text style={styles.resultTeamName}>{awayTeam}</Text>
        </View>
      </View>
      <Button title="Salva" onPress={handleSave} loading={loading} size="small" />
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 14,
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
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#1E40AF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  chipContainer: {
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#1E40AF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  formatContainer: {
    marginBottom: 16,
  },
  formatOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  formatSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  formatText: {
    fontSize: 16,
    color: '#6B7280',
  },
  formatTextSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 24,
  },
  // Detail styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    marginRight: 12,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailMeta: {
    fontSize: 13,
    color: '#6B7280',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  matchRound: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  matchScore: {
    paddingHorizontal: 16,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E40AF',
  },
  vsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  matchDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  deleteMatchBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#D97706',
    textAlign: 'center',
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultRound: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  resultTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  resultDash: {
    fontSize: 20,
    fontWeight: '700',
    color: '#9CA3AF',
    paddingHorizontal: 8,
  },
  goalInput: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 8,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#1E40AF',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#1E40AF',
    flex: 1,
  },
  teamSelector: {
    marginBottom: 16,
  },
  teamSelectorItem: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  teamSelectorItemActive: {
    backgroundColor: '#1E40AF',
  },
  teamSelectorText: {
    fontSize: 15,
    color: '#374151',
  },
  teamSelectorTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
