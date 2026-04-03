import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
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

interface PadelMatchModalProps {
  visible: boolean;
  onClose: () => void;
  match: any;
  homeTeam: any;
  awayTeam: any;
  homePlayers: Player[];
  awayPlayers: Player[];
  tournamentName: string;
  gameFormat: 'singolo' | 'doppio';
  onSave: (updatedMatch: any) => void;
}

interface SetScore {
  setNumber: number;
  homeGames: number;
  awayGames: number;
  tiebreak: boolean;
  tiebreakHome: number;
  tiebreakAway: number;
  superTiebreak: boolean;
  completed: boolean;
}

interface PlayerStats {
  winners: number;
  unforcedErrors: number;
  smashWinners: number;
  aces: number;
  doubleFaults: number;
}

// Padel point progression: 0 -> 15 -> 30 -> 40 -> Game (or Deuce)
const POINTS = ['0', '15', '30', '40'];

export function PadelMatchModal({
  visible,
  onClose,
  match,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  tournamentName,
  gameFormat,
  onSave,
}: PadelMatchModalProps) {
  const maxSets = 3;
  const setsToWin = 2;
  
  // Initialize state
  const [activeSetTab, setActiveSetTab] = useState(0);
  const [setScores, setSetScores] = useState<SetScore[]>([
    { setNumber: 1, homeGames: 0, awayGames: 0, tiebreak: false, tiebreakHome: 0, tiebreakAway: 0, superTiebreak: false, completed: false },
    { setNumber: 2, homeGames: 0, awayGames: 0, tiebreak: false, tiebreakHome: 0, tiebreakAway: 0, superTiebreak: false, completed: false },
    { setNumber: 3, homeGames: 0, awayGames: 0, tiebreak: false, tiebreakHome: 0, tiebreakAway: 0, superTiebreak: true, completed: false },
  ]);
  
  // Current game points
  const [homePoints, setHomePoints] = useState(0);
  const [awayPoints, setAwayPoints] = useState(0);
  const [isDeuce, setIsDeuce] = useState(false);
  const [advantage, setAdvantage] = useState<'home' | 'away' | null>(null);
  
  // Player stats - for Padel: Winners, Unforced Errors, Smash Winners, Aces, Double Faults
  const emptyStats: PlayerStats = { winners: 0, unforcedErrors: 0, smashWinners: 0, aces: 0, doubleFaults: 0 };
  const [homeStats, setHomeStats] = useState<PlayerStats>({ ...emptyStats });
  const [awayStats, setAwayStats] = useState<PlayerStats>({ ...emptyStats });
  
  const [saving, setSaving] = useState(false);
  const [eventsHistory, setEventsHistory] = useState<any[]>([]);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [superTiebreakEnabled, setSuperTiebreakEnabled] = useState(true);

  // Auto-save function
  const autoSave = async (newSetScores?: SetScore[], newHomePoints?: number, newAwayPoints?: number, newIsDeuce?: boolean, newAdvantage?: 'home' | 'away' | null) => {
    try {
      const currentSetScores = newSetScores || setScores;
      const currentHomePoints = newHomePoints !== undefined ? newHomePoints : homePoints;
      const currentAwayPoints = newAwayPoints !== undefined ? newAwayPoints : awayPoints;
      const currentIsDeuce = newIsDeuce !== undefined ? newIsDeuce : isDeuce;
      const currentAdvantage = newAdvantage !== undefined ? newAdvantage : advantage;
      
      // Calculate sets won
      let homeSetsWon = 0;
      let awaySetsWon = 0;
      currentSetScores.forEach(set => {
        if (set.completed) {
          if (set.homeGames > set.awayGames) homeSetsWon++;
          else if (set.awayGames > set.homeGames) awaySetsWon++;
        }
      });
      
      const currentSetIndex = currentSetScores.findIndex(s => !s.completed);
      const currentSet = currentSetIndex >= 0 ? currentSetScores[currentSetIndex] : null;
      
      const matchData = {
        tennis_sets: currentSetScores,
        currentGame: { 
          homePoints: currentHomePoints, 
          awayPoints: currentAwayPoints, 
          isDeuce: currentIsDeuce, 
          advantage: currentAdvantage,
          currentSetIndex: currentSetIndex >= 0 ? currentSetIndex : currentSetScores.length - 1,
          homeGamesInSet: currentSet?.homeGames || 0,
          awayGamesInSet: currentSet?.awayGames || 0,
        },
        home_stats: homeStats,
        away_stats: awayStats,
        home_goals: homeSetsWon,
        away_goals: awaySetsWon,
        status: 'in_progress',
      };
      
      await api.put(`/api/matches/${match.id}`, matchData);
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const triggerAutoSave = (newSetScores?: SetScore[], newHomePoints?: number, newAwayPoints?: number, newIsDeuce?: boolean, newAdvantage?: 'home' | 'away' | null) => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    const timeout = setTimeout(() => {
      autoSave(newSetScores, newHomePoints, newAwayPoints, newIsDeuce, newAdvantage);
    }, 300);
    setAutoSaveTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    };
  }, [autoSaveTimeout]);

  // Initialize from match data
  useEffect(() => {
    if (match?.tennis_sets) {
      setSetScores(match.tennis_sets);
    }
    if (match?.currentGame) {
      setHomePoints(match.currentGame.homePoints || 0);
      setAwayPoints(match.currentGame.awayPoints || 0);
      setIsDeuce(match.currentGame.isDeuce || false);
      setAdvantage(match.currentGame.advantage || null);
    }
    if (match?.home_stats) setHomeStats(match.home_stats);
    if (match?.away_stats) setAwayStats(match.away_stats);
  }, [match]);

  // Get point display
  const getPointDisplay = (points: number, team: 'home' | 'away') => {
    const currentSet = setScores[activeSetTab];
    
    // Handle tiebreak or super tiebreak
    if (currentSet?.tiebreak || currentSet?.superTiebreak) {
      return points.toString();
    }
    
    if (isDeuce) {
      if (advantage === team) return 'AD';
      return '40';
    }
    return POINTS[points] || '0';
  };

  // Add point to a team
  const addPoint = (team: 'home' | 'away') => {
    const currentSet = setScores[activeSetTab];
    
    // Tiebreak or Super Tiebreak scoring
    if (currentSet?.tiebreak || currentSet?.superTiebreak) {
      const maxPoints = currentSet.superTiebreak ? 10 : 7;
      
      setSetScores(prev => {
        const newScores = [...prev];
        const set = { ...newScores[activeSetTab] };
        
        if (team === 'home') {
          set.tiebreakHome = (set.tiebreakHome || 0) + 1;
        } else {
          set.tiebreakAway = (set.tiebreakAway || 0) + 1;
        }
        
        // Check if tiebreak is won
        const homeTB = set.tiebreakHome || 0;
        const awayTB = set.tiebreakAway || 0;
        if ((homeTB >= maxPoints || awayTB >= maxPoints) && Math.abs(homeTB - awayTB) >= 2) {
          set.completed = true;
          if (homeTB > awayTB) set.homeGames += 1;
          else set.awayGames += 1;
        }
        
        newScores[activeSetTab] = set;
        setTimeout(() => triggerAutoSave(newScores), 50);
        return newScores;
      });
      return;
    }
    
    // Regular game scoring
    if (isDeuce) {
      if (advantage === team) {
        winGame(team);
      } else if (advantage === null) {
        setAdvantage(team);
        setTimeout(() => triggerAutoSave(undefined, homePoints, awayPoints, true, team), 50);
      } else {
        setAdvantage(null);
        setTimeout(() => triggerAutoSave(undefined, homePoints, awayPoints, true, null), 50);
      }
    } else {
      if (team === 'home') {
        if (homePoints === 3 && awayPoints === 3) {
          setIsDeuce(true);
          setAdvantage('home');
          setTimeout(() => triggerAutoSave(undefined, 3, 3, true, 'home'), 50);
        } else if (homePoints === 3 && awayPoints < 3) {
          winGame('home');
        } else {
          const newHomePoints = homePoints + 1;
          setHomePoints(newHomePoints);
          if (newHomePoints === 3 && awayPoints === 3) {
            setIsDeuce(true);
            setTimeout(() => triggerAutoSave(undefined, newHomePoints, awayPoints, true, null), 50);
          } else {
            setTimeout(() => triggerAutoSave(undefined, newHomePoints, awayPoints, isDeuce, advantage), 50);
          }
        }
      } else {
        if (awayPoints === 3 && homePoints === 3) {
          setIsDeuce(true);
          setAdvantage('away');
          setTimeout(() => triggerAutoSave(undefined, 3, 3, true, 'away'), 50);
        } else if (awayPoints === 3 && homePoints < 3) {
          winGame('away');
        } else {
          const newAwayPoints = awayPoints + 1;
          setAwayPoints(newAwayPoints);
          if (newAwayPoints === 3 && homePoints === 3) {
            setIsDeuce(true);
            setTimeout(() => triggerAutoSave(undefined, homePoints, newAwayPoints, true, null), 50);
          } else {
            setTimeout(() => triggerAutoSave(undefined, homePoints, newAwayPoints, isDeuce, advantage), 50);
          }
        }
      }
    }
    
    setEventsHistory(prev => [...prev, { type: 'point', team, timestamp: new Date().toISOString() }]);
  };

  // Win a game
  const winGame = (team: 'home' | 'away') => {
    setHomePoints(0);
    setAwayPoints(0);
    setIsDeuce(false);
    setAdvantage(null);

    setSetScores(prev => {
      const newScores = [...prev];
      const currentSet = { ...newScores[activeSetTab] };
      
      if (team === 'home') {
        currentSet.homeGames += 1;
      } else {
        currentSet.awayGames += 1;
      }
      
      const homeG = currentSet.homeGames;
      const awayG = currentSet.awayGames;
      
      // Regular set win: 6 games with 2 game lead
      if ((homeG >= 6 || awayG >= 6) && Math.abs(homeG - awayG) >= 2) {
        currentSet.completed = true;
      }
      // Tiebreak at 6-6 (except for super tiebreak in 3rd set)
      else if (homeG === 6 && awayG === 6 && !currentSet.superTiebreak) {
        currentSet.tiebreak = true;
        currentSet.tiebreakHome = 0;
        currentSet.tiebreakAway = 0;
      }
      
      newScores[activeSetTab] = currentSet;
      setTimeout(() => triggerAutoSave(newScores, 0, 0, false, null), 50);
      return newScores;
    });
  };

  // Update player stats
  const updateStat = (team: 'home' | 'away', stat: keyof PlayerStats, delta: number) => {
    if (team === 'home') {
      setHomeStats(prev => {
        const newStats = { ...prev, [stat]: Math.max(0, prev[stat] + delta) };
        setTimeout(() => triggerAutoSave(), 100);
        return newStats;
      });
    } else {
      setAwayStats(prev => {
        const newStats = { ...prev, [stat]: Math.max(0, prev[stat] + delta) };
        setTimeout(() => triggerAutoSave(), 100);
        return newStats;
      });
    }
  };

  // Undo last action
  const undoLast = () => {
    if (eventsHistory.length === 0) return;
    
    const lastEvent = eventsHistory[eventsHistory.length - 1];
    if (lastEvent.type === 'point') {
      // Simple undo - reset points to 0
      if (homePoints > 0 || awayPoints > 0) {
        if (lastEvent.team === 'home' && homePoints > 0) {
          setHomePoints(prev => Math.max(0, prev - 1));
        } else if (lastEvent.team === 'away' && awayPoints > 0) {
          setAwayPoints(prev => Math.max(0, prev - 1));
        }
      }
    }
    setEventsHistory(prev => prev.slice(0, -1));
    setTimeout(() => triggerAutoSave(), 50);
  };

  // Close match
  const handleCloseMatch = async () => {
    Alert.alert(
      'Chiudi Partita',
      'Sei sicuro di voler chiudere questa partita? La partita verrà marcata come completata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              let homeSetsWon = 0;
              let awaySetsWon = 0;
              setScores.forEach(set => {
                if (set.completed) {
                  if (set.homeGames > set.awayGames) homeSetsWon++;
                  else awaySetsWon++;
                }
              });
              
              const matchData = {
                tennis_sets: setScores,
                currentGame: null,  // Clear current game on completion
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
              Alert.alert('Errore', 'Impossibile salvare la partita');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // Calculate sets won
  const homeSetsWon = setScores.filter(s => s.completed && s.homeGames > s.awayGames).length;
  const awaySetsWon = setScores.filter(s => s.completed && s.awayGames > s.homeGames).length;

  // Render stat row
  const renderStatRow = (label: string, stat: keyof PlayerStats, homeValue: number, awayValue: number) => (
    <View style={styles.statRow} key={stat}>
      <View style={styles.statSide}>
        <TouchableOpacity style={styles.statButton} onPress={() => updateStat('home', stat, -1)}>
          <Ionicons name="remove-circle" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.statValue}>{homeValue}</Text>
        <TouchableOpacity style={styles.statButton} onPress={() => updateStat('home', stat, 1)}>
          <Ionicons name="add-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statSide}>
        <TouchableOpacity style={styles.statButton} onPress={() => updateStat('away', stat, -1)}>
          <Ionicons name="remove-circle" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.statValue}>{awayValue}</Text>
        <TouchableOpacity style={styles.statButton} onPress={() => updateStat('away', stat, 1)}>
          <Ionicons name="add-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🎾 Match Padel</Text>
            <Text style={styles.headerSubtitle}>{tournamentName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Teams & Score Header */}
          <View style={styles.teamsHeader}>
            <View style={styles.teamCol}>
              <Text style={styles.teamName} numberOfLines={1}>{homeTeam?.name || 'Casa'}</Text>
            </View>
            <View style={styles.scoreCol}>
              <Text style={styles.setsScore}>{homeSetsWon} - {awaySetsWon}</Text>
              <Text style={styles.setsLabel}>SET</Text>
            </View>
            <View style={styles.teamCol}>
              <Text style={styles.teamName} numberOfLines={1}>{awayTeam?.name || 'Ospite'}</Text>
            </View>
          </View>

          {/* Set Tabs */}
          <View style={styles.setTabs}>
            {setScores.map((set, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.setTab,
                  activeSetTab === idx && styles.setTabActive,
                  set.completed && styles.setTabCompleted,
                ]}
                onPress={() => setActiveSetTab(idx)}
                disabled={idx > 0 && !setScores[idx - 1].completed && !setScores[idx].homeGames && !setScores[idx].awayGames}
              >
                <Text style={[
                  styles.setTabText,
                  activeSetTab === idx && styles.setTabTextActive,
                ]}>
                  Set {idx + 1}
                </Text>
                <Text style={[
                  styles.setTabScore,
                  activeSetTab === idx && styles.setTabScoreActive,
                ]}>
                  {set.homeGames} - {set.awayGames}
                </Text>
                {set.superTiebreak && idx === 2 && (
                  <Text style={styles.superTiebreakBadge}>ST</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Current Game Score */}
          <View style={styles.gameScoreCard}>
            <Text style={styles.gameScoreTitle}>
              {setScores[activeSetTab]?.tiebreak ? 'Tie-Break' : 
               setScores[activeSetTab]?.superTiebreak && setScores[activeSetTab]?.homeGames === 0 && setScores[activeSetTab]?.awayGames === 0 ? 'Super Tie-Break (10 pt)' : 
               'Game in Corso'}
            </Text>
            <View style={styles.gameScoreRow}>
              {/* Home Team */}
              <View style={styles.gameSide}>
                <TouchableOpacity 
                  style={styles.pointButton}
                  onPress={() => addPoint('home')}
                >
                  <Ionicons name="add-circle" size={48} color="#000" />
                </TouchableOpacity>
                <Text style={styles.pointsDisplay}>{getPointDisplay(homePoints, 'home')}</Text>
              </View>
              
              <Text style={styles.pointsDivider}>-</Text>
              
              {/* Away Team */}
              <View style={styles.gameSide}>
                <Text style={styles.pointsDisplay}>{getPointDisplay(awayPoints, 'away')}</Text>
                <TouchableOpacity 
                  style={styles.pointButton}
                  onPress={() => addPoint('away')}
                >
                  <Ionicons name="add-circle" size={48} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Undo Button */}
            <TouchableOpacity style={styles.undoButton} onPress={undoLast}>
              <Ionicons name="arrow-undo" size={18} color="#666" />
              <Text style={styles.undoText}>Annulla ultimo</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Statistiche {gameFormat === 'doppio' ? 'Coppia' : 'Giocatore'}</Text>
            {renderStatRow('Winners', 'winners', homeStats.winners, awayStats.winners)}
            {renderStatRow('Errori NF', 'unforcedErrors', homeStats.unforcedErrors, awayStats.unforcedErrors)}
            {renderStatRow('Smash', 'smashWinners', homeStats.smashWinners, awayStats.smashWinners)}
            {renderStatRow('Ace', 'aces', homeStats.aces, awayStats.aces)}
            {renderStatRow('Doppi F.', 'doubleFaults', homeStats.doubleFaults, awayStats.doubleFaults)}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.autoSaveIndicator}>
            <Ionicons name="cloud-done" size={16} color="#10B981" />
            <Text style={styles.autoSaveText}>Salvataggio automatico</Text>
          </View>
          
          <TouchableOpacity style={styles.closeMatchButton} onPress={handleCloseMatch} disabled={saving}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.closeMatchButtonText}>Fine Partita</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: { padding: 8 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  content: { flex: 1, padding: 16 },
  
  // Teams Header
  teamsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 16,
  },
  teamCol: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  teamName: { fontSize: 14, fontWeight: '600', color: '#000', textAlign: 'center' },
  scoreCol: { alignItems: 'center', paddingHorizontal: 16 },
  setsScore: { fontSize: 32, fontWeight: '700', color: '#000' },
  setsLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  
  // Set Tabs
  setTabs: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  setTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    position: 'relative',
  },
  setTabActive: { backgroundColor: '#000' },
  setTabCompleted: { backgroundColor: '#E8E8E8' },
  setTabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  setTabTextActive: { color: '#FFF' },
  setTabScore: { fontSize: 16, fontWeight: '700', color: '#000', marginTop: 4 },
  setTabScoreActive: { color: '#FFF' },
  superTiebreakBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 8,
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  
  // Game Score
  gameScoreCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  gameScoreTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 16 },
  gameScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pointButton: { padding: 4 },
  pointsDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    minWidth: 60,
    textAlign: 'center',
  },
  pointsDivider: { fontSize: 32, fontWeight: '300', color: '#666', marginHorizontal: 16 },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
  },
  undoText: { fontSize: 13, color: '#666' },
  
  // Stats Section
  statsSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 16, textAlign: 'center' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statButton: { padding: 4 },
  statValue: { minWidth: 24, fontSize: 16, fontWeight: '700', color: '#000', textAlign: 'center' },
  statLabel: { width: 90, fontSize: 12, color: '#000', textAlign: 'center', fontWeight: '600' },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  autoSaveText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  closeMatchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeMatchButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default PadelMatchModal;
