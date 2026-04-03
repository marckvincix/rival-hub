import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';

interface Player {
  id: string;
  full_name: string;
  number?: number;
  role?: string;
}

interface SetScore {
  setNumber: number;
  homeScore: number;
  awayScore: number;
  completed: boolean;
  winner?: 'home' | 'away';
}

interface PlayerStats {
  points: number;
  aces: number;
  blocks: number;
  serviceErrors: number;
  attackWins: number;
  perfectReceptions: number;
}

interface VolleyballMatchModalProps {
  visible: boolean;
  onClose: () => void;
  match: any;
  homeTeam: any;
  awayTeam: any;
  homePlayers: Player[];
  awayPlayers: Player[];
  tournamentName: string;
  onSave: (updatedMatch: any) => void;
}

export function VolleyballMatchModal({
  visible,
  onClose,
  match,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  tournamentName,
  onSave,
}: VolleyballMatchModalProps) {
  const [currentSet, setCurrentSet] = useState(0);
  const [setScores, setSetScores] = useState<SetScore[]>([
    { setNumber: 1, homeScore: 0, awayScore: 0, completed: false },
    { setNumber: 2, homeScore: 0, awayScore: 0, completed: false },
    { setNumber: 3, homeScore: 0, awayScore: 0, completed: false },
    { setNumber: 4, homeScore: 0, awayScore: 0, completed: false },
    { setNumber: 5, homeScore: 0, awayScore: 0, completed: false },
  ]);
  const [homeStats, setHomeStats] = useState<Record<string, PlayerStats>>({});
  const [awayStats, setAwayStats] = useState<Record<string, PlayerStats>>({});
  const [saving, setSaving] = useState(false);
  const [autoSaveInitialized, setAutoSaveInitialized] = useState(false);
  const [lastAction, setLastAction] = useState<any>(null);

  // Calculate sets won
  const homeSetsWon = setScores.filter(s => s.completed && s.winner === 'home').length;
  const awaySetsWon = setScores.filter(s => s.completed && s.winner === 'away').length;

  // Current set score
  const currentSetData = setScores[currentSet];
  const isSet5 = currentSet === 4;
  const targetScore = isSet5 ? 15 : 25;

  // Initialize stats for players
  useEffect(() => {
    if (visible && match) {
      // Load existing data
      if (match.volleyball_sets) {
        setSetScores(match.volleyball_sets);
        // Find current active set
        const activeSet = match.volleyball_sets.findIndex((s: SetScore) => !s.completed);
        setCurrentSet(activeSet >= 0 ? activeSet : match.volleyball_sets.length - 1);
      }
      if (match.home_stats) setHomeStats(match.home_stats);
      if (match.away_stats) setAwayStats(match.away_stats);
      
      // Initialize player stats if empty
      const initHomeStats: Record<string, PlayerStats> = {};
      const initAwayStats: Record<string, PlayerStats> = {};
      
      homePlayers.forEach(p => {
        if (!homeStats[p.id]) {
          initHomeStats[p.id] = { points: 0, aces: 0, blocks: 0, serviceErrors: 0, attackWins: 0, perfectReceptions: 0 };
        }
      });
      awayPlayers.forEach(p => {
        if (!awayStats[p.id]) {
          initAwayStats[p.id] = { points: 0, aces: 0, blocks: 0, serviceErrors: 0, attackWins: 0, perfectReceptions: 0 };
        }
      });
      
      if (Object.keys(initHomeStats).length > 0) setHomeStats(prev => ({ ...prev, ...initHomeStats }));
      if (Object.keys(initAwayStats).length > 0) setAwayStats(prev => ({ ...prev, ...initAwayStats }));
      
      setTimeout(() => setAutoSaveInitialized(true), 100);
    } else {
      setAutoSaveInitialized(false);
    }
  }, [visible, match?.id]);

  // Auto-save effect
  useEffect(() => {
    if (!visible || !match?.id || !autoSaveInitialized) return;
    
    const timeoutId = setTimeout(() => {
      triggerAutoSave();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [setScores, homeStats, awayStats, autoSaveInitialized]);

  const triggerAutoSave = async () => {
    if (!match?.id || saving) return;
    
    try {
      setSaving(true);
      const matchData = {
        volleyball_sets: setScores,
        home_stats: homeStats,
        away_stats: awayStats,
        home_goals: homeSetsWon,
        away_goals: awaySetsWon,
        status: 'in_progress',
      };
      
      await api.put(`/api/matches/${match.id}`, matchData);
      console.log('Volleyball auto-save completed');
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add point to team
  const addPoint = (team: 'home' | 'away') => {
    const newSetScores = [...setScores];
    const set = newSetScores[currentSet];
    
    // Save for undo
    setLastAction({ type: 'point', team, set: currentSet, prevScore: { ...set } });
    
    if (team === 'home') {
      set.homeScore++;
    } else {
      set.awayScore++;
    }
    
    // Check if set is won
    const homeScore = set.homeScore;
    const awayScore = set.awayScore;
    
    if ((homeScore >= targetScore || awayScore >= targetScore) && Math.abs(homeScore - awayScore) >= 2) {
      set.completed = true;
      set.winner = homeScore > awayScore ? 'home' : 'away';
      
      // Move to next set if not match over
      const newHomeSets = newSetScores.filter(s => s.completed && s.winner === 'home').length;
      const newAwaySets = newSetScores.filter(s => s.completed && s.winner === 'away').length;
      
      if (newHomeSets < 3 && newAwaySets < 3 && currentSet < 4) {
        setCurrentSet(currentSet + 1);
      }
    }
    
    setSetScores(newSetScores);
  };

  // Remove point from team
  const removePoint = (team: 'home' | 'away') => {
    const newSetScores = [...setScores];
    const set = newSetScores[currentSet];
    
    if (team === 'home' && set.homeScore > 0) {
      set.homeScore--;
      set.completed = false;
      set.winner = undefined;
    } else if (team === 'away' && set.awayScore > 0) {
      set.awayScore--;
      set.completed = false;
      set.winner = undefined;
    }
    
    setSetScores(newSetScores);
  };

  // Undo last action
  const undoLastAction = () => {
    if (!lastAction) return;
    
    if (lastAction.type === 'point') {
      const newSetScores = [...setScores];
      newSetScores[lastAction.set] = lastAction.prevScore;
      setSetScores(newSetScores);
      setCurrentSet(lastAction.set);
      setLastAction(null);
    }
  };

  // Update player stat
  const updatePlayerStat = (playerId: string, stat: keyof PlayerStats, isHome: boolean, delta: number) => {
    if (isHome) {
      setHomeStats(prev => ({
        ...prev,
        [playerId]: {
          ...prev[playerId],
          [stat]: Math.max(0, (prev[playerId]?.[stat] || 0) + delta),
        },
      }));
    } else {
      setAwayStats(prev => ({
        ...prev,
        [playerId]: {
          ...prev[playerId],
          [stat]: Math.max(0, (prev[playerId]?.[stat] || 0) + delta),
        },
      }));
    }
  };

  // Handle close match
  const handleCloseMatch = () => {
    Alert.alert(
      'Fine Partita',
      'Vuoi terminare la partita?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const matchData = {
                volleyball_sets: setScores,
                home_stats: homeStats,
                away_stats: awayStats,
                home_goals: homeSetsWon,
                away_goals: awaySetsWon,
                status: 'completed',
              };
              
              await api.put(`/api/matches/${match.id}`, matchData);
              onSave({ ...match, ...matchData });
              onClose();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile chiudere la partita');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.tournamentName}>{tournamentName}</Text>
            <Text style={styles.matchRound}>{match?.round}</Text>
          </View>
          <View style={styles.autoSaveIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.autoSaveText}>Auto-save</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Score Header */}
          <View style={styles.scoreHeader}>
            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={1}>{homeTeam?.name}</Text>
              <Text style={styles.setsWon}>{homeSetsWon}</Text>
            </View>
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.setIndicator}>Set {currentSet + 1}</Text>
            </View>
            <View style={styles.teamScore}>
              <Text style={styles.teamName} numberOfLines={1}>{awayTeam?.name}</Text>
              <Text style={styles.setsWon}>{awaySetsWon}</Text>
            </View>
          </View>

          {/* Set Tabs */}
          <View style={styles.setTabs}>
            {setScores.map((set, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.setTab,
                  currentSet === idx && styles.setTabActive,
                  set.completed && styles.setTabCompleted,
                ]}
                onPress={() => setCurrentSet(idx)}
              >
                <Text style={[
                  styles.setTabText,
                  currentSet === idx && styles.setTabTextActive,
                ]}>
                  Set {idx + 1}
                </Text>
                {set.completed && (
                  <Text style={styles.setTabScore}>
                    {set.homeScore}-{set.awayScore}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Current Set Score */}
          <View style={styles.currentSetScore}>
            <View style={styles.scoreBox}>
              <TouchableOpacity style={styles.scoreBtn} onPress={() => removePoint('home')}>
                <Ionicons name="remove" size={24} color="#EF4444" />
              </TouchableOpacity>
              <Text style={[styles.scoreValue, currentSetData?.winner === 'home' && styles.scoreWinner]}>
                {currentSetData?.homeScore || 0}
              </Text>
              <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnAdd]} onPress={() => addPoint('home')}>
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scoreSeparator}>
              <Text style={styles.scoreSeparatorText}>:</Text>
              {isSet5 && <Text style={styles.set5Label}>15 pt</Text>}
            </View>
            
            <View style={styles.scoreBox}>
              <TouchableOpacity style={styles.scoreBtn} onPress={() => removePoint('away')}>
                <Ionicons name="remove" size={24} color="#EF4444" />
              </TouchableOpacity>
              <Text style={[styles.scoreValue, currentSetData?.winner === 'away' && styles.scoreWinner]}>
                {currentSetData?.awayScore || 0}
              </Text>
              <TouchableOpacity style={[styles.scoreBtn, styles.scoreBtnAdd]} onPress={() => addPoint('away')}>
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Undo Button */}
          {lastAction && (
            <TouchableOpacity style={styles.undoButton} onPress={undoLastAction}>
              <Ionicons name="arrow-undo" size={18} color="#666" />
              <Text style={styles.undoText}>Annulla ultimo</Text>
            </TouchableOpacity>
          )}

          {/* Player Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>📊 Statistiche Giocatori</Text>
            
            {/* Home Team Stats */}
            <View style={styles.teamStatsContainer}>
              <Text style={styles.teamStatsTitle}>{homeTeam?.name}</Text>
              {homePlayers.slice(0, 6).map(player => (
                <View key={player.id} style={styles.playerStatRow}>
                  <Text style={styles.playerStatName} numberOfLines={1}>
                    {player.number ? `#${player.number} ` : ''}{player.full_name}
                  </Text>
                  <View style={styles.playerStatButtons}>
                    <StatButton
                      label="Pt"
                      value={homeStats[player.id]?.points || 0}
                      onIncrement={() => updatePlayerStat(player.id, 'points', true, 1)}
                      onDecrement={() => updatePlayerStat(player.id, 'points', true, -1)}
                    />
                    <StatButton
                      label="Ace"
                      value={homeStats[player.id]?.aces || 0}
                      onIncrement={() => updatePlayerStat(player.id, 'aces', true, 1)}
                      onDecrement={() => updatePlayerStat(player.id, 'aces', true, -1)}
                    />
                    <StatButton
                      label="Muro"
                      value={homeStats[player.id]?.blocks || 0}
                      onIncrement={() => updatePlayerStat(player.id, 'blocks', true, 1)}
                      onDecrement={() => updatePlayerStat(player.id, 'blocks', true, -1)}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Away Team Stats */}
            <View style={styles.teamStatsContainer}>
              <Text style={styles.teamStatsTitle}>{awayTeam?.name}</Text>
              {awayPlayers.slice(0, 6).map(player => (
                <View key={player.id} style={styles.playerStatRow}>
                  <Text style={styles.playerStatName} numberOfLines={1}>
                    {player.number ? `#${player.number} ` : ''}{player.full_name}
                  </Text>
                  <View style={styles.playerStatButtons}>
                    <StatButton
                      label="Pt"
                      value={awayStats[player.id]?.points || 0}
                      onIncrement={() => updatePlayerStat(player.id, 'points', false, 1)}
                      onDecrement={() => updatePlayerStat(player.id, 'points', false, -1)}
                    />
                    <StatButton
                      label="Ace"
                      value={awayStats[player.id]?.aces || 0}
                      onIncrement={() => updatePlayerStat(player.id, 'aces', false, 1)}
                      onDecrement={() => updatePlayerStat(player.id, 'aces', false, -1)}
                    />
                    <StatButton
                      label="Muro"
                      value={awayStats[player.id]?.blocks || 0}
                      onIncrement={() => updatePlayerStat(player.id, 'blocks', false, 1)}
                      onDecrement={() => updatePlayerStat(player.id, 'blocks', false, -1)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* End Match Button */}
          <TouchableOpacity style={styles.endMatchButton} onPress={handleCloseMatch}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.endMatchText}>Fine Partita</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Stat Button Component
function StatButton({ label, value, onIncrement, onDecrement }: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={statBtnStyles.container}>
      <Text style={statBtnStyles.label}>{label}</Text>
      <View style={statBtnStyles.row}>
        <TouchableOpacity style={statBtnStyles.btn} onPress={onDecrement}>
          <Text style={statBtnStyles.btnText}>-</Text>
        </TouchableOpacity>
        <Text style={statBtnStyles.value}>{value}</Text>
        <TouchableOpacity style={[statBtnStyles.btn, statBtnStyles.btnAdd]} onPress={onIncrement}>
          <Text style={[statBtnStyles.btnText, statBtnStyles.btnTextAdd]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const statBtnStyles = StyleSheet.create({
  container: { alignItems: 'center', marginHorizontal: 4 },
  label: { fontSize: 10, color: '#666', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  btnAdd: { backgroundColor: '#000' },
  btnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  btnTextAdd: { color: '#FFF' },
  value: { fontSize: 14, fontWeight: '600', minWidth: 24, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  closeButton: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  tournamentName: { fontSize: 16, fontWeight: '600', color: '#000' },
  matchRound: { fontSize: 12, color: '#666' },
  autoSaveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoSaveText: { color: '#10B981', fontSize: 11, fontWeight: '500' },
  content: { flex: 1 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#F5F5F5' },
  teamScore: { flex: 1, alignItems: 'center' },
  teamName: { fontSize: 14, fontWeight: '600', color: '#000', textAlign: 'center' },
  setsWon: { fontSize: 48, fontWeight: '700', color: '#000' },
  vsContainer: { paddingHorizontal: 16, alignItems: 'center' },
  vsText: { fontSize: 14, fontWeight: '600', color: '#666' },
  setIndicator: { fontSize: 12, color: '#E8813A', fontWeight: '600', marginTop: 4 },
  setTabs: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  setTab: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#F0F0F0', alignItems: 'center' },
  setTabActive: { backgroundColor: '#E8813A' },
  setTabCompleted: { backgroundColor: '#10B981' },
  setTabText: { fontSize: 11, fontWeight: '600', color: '#666' },
  setTabTextActive: { color: '#FFF' },
  setTabScore: { fontSize: 10, color: '#FFF', marginTop: 2 },
  currentSetScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  scoreBtnAdd: { backgroundColor: '#000' },
  scoreValue: { fontSize: 56, fontWeight: '700', color: '#000', minWidth: 80, textAlign: 'center' },
  scoreWinner: { color: '#10B981' },
  scoreSeparator: { paddingHorizontal: 16, alignItems: 'center' },
  scoreSeparatorText: { fontSize: 48, fontWeight: '700', color: '#999' },
  set5Label: { fontSize: 10, color: '#E8813A', fontWeight: '600', marginTop: 4 },
  undoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  undoText: { fontSize: 13, color: '#666' },
  statsSection: { padding: 16 },
  statsSectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 12 },
  teamStatsContainer: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, marginBottom: 12 },
  teamStatsTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8 },
  playerStatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  playerStatName: { flex: 1, fontSize: 13, color: '#000' },
  playerStatButtons: { flexDirection: 'row', gap: 8 },
  endMatchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, gap: 8 },
  endMatchText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default VolleyballMatchModal;
