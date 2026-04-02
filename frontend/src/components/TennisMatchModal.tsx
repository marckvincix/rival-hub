import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface Player {
  id: string;
  name: string;
  number?: number;
  photo?: string;
}

interface TennisMatchModalProps {
  visible: boolean;
  onClose: () => void;
  match: any;
  homeTeam: any;
  awayTeam: any;
  homePlayers: Player[];
  awayPlayers: Player[];
  tournamentName: string;
  gameStructure: '3_sets' | '5_sets';
  onSave: (updatedMatch: any) => void;
}

interface SetScore {
  home: number;
  away: number;
  tiebreak: boolean;
  tiebreakHome?: number;
  tiebreakAway?: number;
}

interface PlayerStats {
  aces: number;
  doubleFaults: number;
  winners: number;
  unforcedErrors: number;
  breakPointsConverted: number;
  breakPointsSaved: number;
}

export function TennisMatchModal({
  visible,
  onClose,
  match,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  tournamentName,
  gameStructure,
  onSave,
}: TennisMatchModalProps) {
  const maxSets = gameStructure === '5_sets' ? 5 : 3;
  const setsToWin = gameStructure === '5_sets' ? 3 : 2;
  
  const [activeSetTab, setActiveSetTab] = useState(0);
  const [setScores, setSetScores] = useState<SetScore[]>([]);
  const [superTiebreak, setSuperTiebreak] = useState(false);
  const [saving, setSaving] = useState(false);
  const [homeStats, setHomeStats] = useState<PlayerStats>({
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    breakPointsConverted: 0,
    breakPointsSaved: 0,
  });
  const [awayStats, setAwayStats] = useState<PlayerStats>({
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    breakPointsConverted: 0,
    breakPointsSaved: 0,
  });
  const [eventsHistory, setEventsHistory] = useState<any[]>([]);

  // Initialize set scores
  useEffect(() => {
    if (visible && match) {
      // Try to load existing scores from match data
      const existingScores = match.tennis_sets || [];
      const initialScores: SetScore[] = [];
      
      for (let i = 0; i < maxSets; i++) {
        if (existingScores[i]) {
          initialScores.push(existingScores[i]);
        } else {
          initialScores.push({ home: 0, away: 0, tiebreak: false });
        }
      }
      
      setSetScores(initialScores);
      
      // Load existing stats
      if (match.home_stats) setHomeStats(match.home_stats);
      if (match.away_stats) setAwayStats(match.away_stats);
      if (match.super_tiebreak) setSuperTiebreak(match.super_tiebreak);
    }
  }, [visible, match, maxSets]);

  // Calculate total sets won
  const calculateSetsWon = () => {
    let homeSets = 0;
    let awaySets = 0;
    
    setScores.forEach((set) => {
      if (set.home > set.away) homeSets++;
      else if (set.away > set.home) awaySets++;
    });
    
    return { homeSets, awaySets };
  };

  const { homeSets, awaySets } = calculateSetsWon();

  // Update set score
  const updateSetScore = (setIndex: number, team: 'home' | 'away', delta: number) => {
    setSetScores((prev) => {
      const newScores = [...prev];
      const currentValue = newScores[setIndex][team];
      const newValue = Math.max(0, currentValue + delta);
      newScores[setIndex] = { ...newScores[setIndex], [team]: newValue };
      
      // Auto-detect tiebreak (6-6)
      if (newScores[setIndex].home === 6 && newScores[setIndex].away === 6) {
        newScores[setIndex].tiebreak = true;
      }
      
      return newScores;
    });
  };

  // Toggle tiebreak for a set
  const toggleTiebreak = (setIndex: number) => {
    setSetScores((prev) => {
      const newScores = [...prev];
      newScores[setIndex] = { 
        ...newScores[setIndex], 
        tiebreak: !newScores[setIndex].tiebreak 
      };
      return newScores;
    });
  };

  // Update tiebreak score
  const updateTiebreakScore = (setIndex: number, team: 'home' | 'away', value: string) => {
    const numValue = parseInt(value) || 0;
    setSetScores((prev) => {
      const newScores = [...prev];
      if (team === 'home') {
        newScores[setIndex] = { ...newScores[setIndex], tiebreakHome: numValue };
      } else {
        newScores[setIndex] = { ...newScores[setIndex], tiebreakAway: numValue };
      }
      return newScores;
    });
  };

  // Update player stats
  const updateStat = (team: 'home' | 'away', stat: keyof PlayerStats, delta: number) => {
    if (team === 'home') {
      setHomeStats((prev) => ({
        ...prev,
        [stat]: Math.max(0, prev[stat] + delta),
      }));
    } else {
      setAwayStats((prev) => ({
        ...prev,
        [stat]: Math.max(0, prev[stat] + delta),
      }));
    }
    
    // Add to events history
    setEventsHistory((prev) => [
      ...prev,
      { team, stat, delta, timestamp: new Date().toISOString() },
    ]);
  };

  // Undo last action
  const undoLast = () => {
    if (eventsHistory.length === 0) return;
    
    const lastEvent = eventsHistory[eventsHistory.length - 1];
    
    // Reverse the stat change
    if (lastEvent.team === 'home') {
      setHomeStats((prev) => ({
        ...prev,
        [lastEvent.stat]: Math.max(0, prev[lastEvent.stat as keyof PlayerStats] - lastEvent.delta),
      }));
    } else {
      setAwayStats((prev) => ({
        ...prev,
        [lastEvent.stat as keyof PlayerStats]: Math.max(0, prev[lastEvent.stat as keyof PlayerStats] - lastEvent.delta),
      }));
    }
    
    setEventsHistory((prev) => prev.slice(0, -1));
  };

  // Save match
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const matchData = {
        tennis_sets: setScores,
        home_stats: homeStats,
        away_stats: awayStats,
        super_tiebreak: superTiebreak,
        home_goals: homeSets,
        away_goals: awaySets,
      };
      
      await api.put(`/api/matches/${match.id}`, matchData);
      
      onSave({ ...match, ...matchData });
      Alert.alert('Salvato', 'Punteggio aggiornato con successo');
    } catch (error) {
      console.error('Error saving match:', error);
      Alert.alert('Errore', 'Impossibile salvare il punteggio');
    } finally {
      setSaving(false);
    }
  };

  // Close match
  const handleCloseMatch = () => {
    Alert.alert(
      'Chiudi Partita',
      'Sei sicuro di voler chiudere questa partita? Il risultato sarà definitivo.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              
              const matchData = {
                tennis_sets: setScores,
                home_stats: homeStats,
                away_stats: awayStats,
                super_tiebreak: superTiebreak,
                home_goals: homeSets,
                away_goals: awaySets,
                status: 'completed',
              };
              
              await api.put(`/api/matches/${match.id}`, matchData);
              
              onSave({ ...match, ...matchData });
              onClose();
            } catch (error) {
              console.error('Error closing match:', error);
              Alert.alert('Errore', 'Impossibile chiudere la partita');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const renderStatRow = (
    label: string,
    stat: keyof PlayerStats,
    homeValue: number,
    awayValue: number
  ) => (
    <View style={styles.statRow} key={stat}>
      <TouchableOpacity
        style={styles.statButton}
        onPress={() => updateStat('home', stat, 1)}
      >
        <Ionicons name="add-circle" size={24} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.statButtonMinus}
        onPress={() => updateStat('home', stat, -1)}
      >
        <Ionicons name="remove-circle" size={20} color="#999" />
      </TouchableOpacity>
      <Text style={styles.statValue}>{homeValue}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{awayValue}</Text>
      <TouchableOpacity
        style={styles.statButtonMinus}
        onPress={() => updateStat('away', stat, -1)}
      >
        <Ionicons name="remove-circle" size={20} color="#999" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.statButton}
        onPress={() => updateStat('away', stat, 1)}
      >
        <Ionicons name="add-circle" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );

  if (!match) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tennis Match</Text>
            <Text style={styles.headerSubtitle}>{tournamentName}</Text>
          </View>
          <TouchableOpacity
            onPress={undoLast}
            style={styles.undoButton}
            disabled={eventsHistory.length === 0}
          >
            <Ionicons
              name="arrow-undo"
              size={24}
              color={eventsHistory.length === 0 ? '#CCC' : '#000'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Score Header */}
          <View style={styles.scoreHeader}>
            <View style={styles.teamSection}>
              <Text style={styles.teamName} numberOfLines={1}>
                {homeTeam?.name || 'Casa'}
              </Text>
            </View>
            <View style={styles.totalScore}>
              <Text style={styles.totalScoreText}>
                {homeSets} - {awaySets}
              </Text>
              <Text style={styles.setsLabel}>SET</Text>
            </View>
            <View style={styles.teamSection}>
              <Text style={styles.teamName} numberOfLines={1}>
                {awayTeam?.name || 'Ospite'}
              </Text>
            </View>
          </View>

          {/* Set Tabs */}
          <View style={styles.setTabs}>
            {Array.from({ length: maxSets }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.setTab, activeSetTab === i && styles.setTabActive]}
                onPress={() => setActiveSetTab(i)}
              >
                <Text
                  style={[
                    styles.setTabText,
                    activeSetTab === i && styles.setTabTextActive,
                  ]}
                >
                  Set {i + 1}
                </Text>
                {setScores[i] && (setScores[i].home > 0 || setScores[i].away > 0) && (
                  <Text style={styles.setTabScore}>
                    {setScores[i].home}-{setScores[i].away}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Set Score */}
          {setScores[activeSetTab] && (
            <View style={styles.setScoreSection}>
              <Text style={styles.sectionTitle}>Set {activeSetTab + 1} - Games</Text>
              
              <View style={styles.gameScoreRow}>
                {/* Home Score */}
                <View style={styles.gameScoreColumn}>
                  <TouchableOpacity
                    style={styles.gameButton}
                    onPress={() => updateSetScore(activeSetTab, 'home', -1)}
                  >
                    <Ionicons name="remove" size={24} color="#000" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.gameScoreInput}
                    value={String(setScores[activeSetTab].home)}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      setSetScores((prev) => {
                        const newScores = [...prev];
                        newScores[activeSetTab] = { ...newScores[activeSetTab], home: num };
                        return newScores;
                      });
                    }}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={styles.gameButton}
                    onPress={() => updateSetScore(activeSetTab, 'home', 1)}
                  >
                    <Ionicons name="add" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.gameScoreDivider}>-</Text>

                {/* Away Score */}
                <View style={styles.gameScoreColumn}>
                  <TouchableOpacity
                    style={styles.gameButton}
                    onPress={() => updateSetScore(activeSetTab, 'away', -1)}
                  >
                    <Ionicons name="remove" size={24} color="#000" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.gameScoreInput}
                    value={String(setScores[activeSetTab].away)}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      setSetScores((prev) => {
                        const newScores = [...prev];
                        newScores[activeSetTab] = { ...newScores[activeSetTab], away: num };
                        return newScores;
                      });
                    }}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={styles.gameButton}
                    onPress={() => updateSetScore(activeSetTab, 'away', 1)}
                  >
                    <Ionicons name="add" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tiebreak Toggle */}
              <View style={styles.tiebreakRow}>
                <Text style={styles.tiebreakLabel}>Tie-break</Text>
                <Switch
                  value={setScores[activeSetTab].tiebreak}
                  onValueChange={() => toggleTiebreak(activeSetTab)}
                  trackColor={{ false: '#DDD', true: '#000' }}
                  thumbColor="#FFF"
                />
              </View>

              {/* Tiebreak Score */}
              {setScores[activeSetTab].tiebreak && (
                <View style={styles.tiebreakScoreRow}>
                  <TextInput
                    style={styles.tiebreakInput}
                    value={String(setScores[activeSetTab].tiebreakHome || 0)}
                    onChangeText={(text) => updateTiebreakScore(activeSetTab, 'home', text)}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                  <Text style={styles.tiebreakDivider}>TB</Text>
                  <TextInput
                    style={styles.tiebreakInput}
                    value={String(setScores[activeSetTab].tiebreakAway || 0)}
                    onChangeText={(text) => updateTiebreakScore(activeSetTab, 'away', text)}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              )}
            </View>
          )}

          {/* Super Tiebreak Toggle (for deciding set) */}
          {activeSetTab === maxSets - 1 && (
            <View style={styles.superTiebreakRow}>
              <Text style={styles.superTiebreakLabel}>Super Tie-break (Set Decisivo)</Text>
              <Switch
                value={superTiebreak}
                onValueChange={setSuperTiebreak}
                trackColor={{ false: '#DDD', true: '#000' }}
                thumbColor="#FFF"
              />
            </View>
          )}

          {/* Statistics Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Statistiche Giocatori</Text>
            
            <View style={styles.statsHeader}>
              <Text style={styles.statsTeamLabel}>{homeTeam?.name || 'Casa'}</Text>
              <Text style={styles.statsMiddleLabel}>Statistica</Text>
              <Text style={styles.statsTeamLabel}>{awayTeam?.name || 'Ospite'}</Text>
            </View>

            {renderStatRow('Ace', 'aces', homeStats.aces, awayStats.aces)}
            {renderStatRow('Doppi Falli', 'doubleFaults', homeStats.doubleFaults, awayStats.doubleFaults)}
            {renderStatRow('Winners', 'winners', homeStats.winners, awayStats.winners)}
            {renderStatRow('Errori NF', 'unforcedErrors', homeStats.unforcedErrors, awayStats.unforcedErrors)}
            {renderStatRow('BP Conv.', 'breakPointsConverted', homeStats.breakPointsConverted, awayStats.breakPointsConverted)}
            {renderStatRow('BP Salvati', 'breakPointsSaved', homeStats.breakPointsSaved, awayStats.breakPointsSaved)}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Salva</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.closeMatchButton}
            onPress={handleCloseMatch}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={20} color="#000" />
            <Text style={styles.closeMatchButtonText}>Chiudi Match</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  undoButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#F8F8F8',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  totalScore: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  totalScoreText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
  },
  setsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  setTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  setTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  setTabActive: {
    borderBottomColor: '#000',
  },
  setTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  setTabTextActive: {
    color: '#000',
  },
  setTabScore: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  setScoreSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  gameScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  gameScoreColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameScoreInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  gameScoreDivider: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  tiebreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginTop: 16,
  },
  tiebreakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  tiebreakScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  tiebreakInput: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  tiebreakDivider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  superTiebreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  superTiebreakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  statsSection: {
    padding: 16,
    borderTopWidth: 8,
    borderTopColor: '#F0F0F0',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTeamLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  statsMiddleLabel: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statButton: {
    padding: 4,
  },
  statButtonMinus: {
    padding: 4,
  },
  statValue: {
    width: 30,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeMatchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeMatchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TennisMatchModal;
