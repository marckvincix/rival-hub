import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useTranslation } from '../i18n';

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
  homeGames: number;
  awayGames: number;
  tiebreak: boolean;
  tiebreakHome?: number;
  tiebreakAway?: number;
  completed: boolean;
}

interface PlayerStats {
  aces: number;
  doubleFaults: number;
  winners: number;
  unforcedErrors: number;
  breakPointsConverted: number;
  breakPointsSaved: number;
}

// Tennis point progression: 0 -> 15 -> 30 -> 40 -> Game (or Deuce)
const POINTS = ['0', '15', '30', '40'];

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
  const { t } = useTranslation();
  const maxSets = gameStructure === '5_sets' ? 5 : 3;
  const setsToWin = gameStructure === '5_sets' ? 3 : 2;
  
  const [activeSetTab, setActiveSetTab] = useState(0);
  const [setScores, setSetScores] = useState<SetScore[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Current game points (within the active game)
  const [homePoints, setHomePoints] = useState(0); // 0=0, 1=15, 2=30, 3=40
  const [awayPoints, setAwayPoints] = useState(0);
  const [isDeuce, setIsDeuce] = useState(false);
  const [advantage, setAdvantage] = useState<'home' | 'away' | null>(null);
  
  // Player statistics
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
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-save function - saves without user clicking "Salva"
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
      
      // Find current set
      const currentSetIndex = currentSetScores.findIndex(s => !s.completed);
      const currentSet = currentSetIndex >= 0 ? currentSetScores[currentSetIndex] : null;
      
      const matchData = {
        tennis_sets: currentSetScores,
        currentGame: { 
          homePoints: currentHomePoints, 
          awayPoints: currentAwayPoints, 
          isDeuce: currentIsDeuce, 
          advantage: currentAdvantage,
          // Include current game scores for LIVE display
          currentSetIndex: currentSetIndex >= 0 ? currentSetIndex : currentSetScores.length - 1,
          homeGamesInSet: currentSet?.homeGames || 0,
          awayGamesInSet: currentSet?.awayGames || 0,
        },
        home_stats: homeStats,
        away_stats: awayStats,
        home_goals: homeSetsWon,
        away_goals: awaySetsWon,
        // Always set to in_progress when auto-saving (user is actively updating)
        status: 'in_progress',
      };
      
      await api.put(`/api/matches/${match.id}`, matchData);
      // Don't show alert for auto-save
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  // Debounced auto-save - saves after 500ms of no changes
  const triggerAutoSave = (newSetScores?: SetScore[], newHomePoints?: number, newAwayPoints?: number, newIsDeuce?: boolean, newAdvantage?: 'home' | 'away' | null) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      autoSave(newSetScores, newHomePoints, newAwayPoints, newIsDeuce, newAdvantage);
    }, 300); // 300ms debounce
    setAutoSaveTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    };
  }, [autoSaveTimeout]);

  // Initialize set scores
  useEffect(() => {
    if (visible && match) {
      const existingScores = match.tennis_sets || [];
      const initialScores: SetScore[] = [];
      
      for (let i = 0; i < maxSets; i++) {
        if (existingScores[i]) {
          initialScores.push({
            homeGames: existingScores[i].homeGames || existingScores[i].home || 0,
            awayGames: existingScores[i].awayGames || existingScores[i].away || 0,
            tiebreak: existingScores[i].tiebreak || false,
            tiebreakHome: existingScores[i].tiebreakHome,
            tiebreakAway: existingScores[i].tiebreakAway,
            completed: existingScores[i].completed || false,
          });
        } else {
          initialScores.push({ homeGames: 0, awayGames: 0, tiebreak: false, completed: false });
        }
      }
      
      setSetScores(initialScores);
      
      // Load current game points
      if (match.currentGame) {
        setHomePoints(match.currentGame.homePoints || 0);
        setAwayPoints(match.currentGame.awayPoints || 0);
        setIsDeuce(match.currentGame.isDeuce || false);
        setAdvantage(match.currentGame.advantage || null);
      } else {
        setHomePoints(0);
        setAwayPoints(0);
        setIsDeuce(false);
        setAdvantage(null);
      }
      
      if (match.home_stats) setHomeStats(match.home_stats);
      if (match.away_stats) setAwayStats(match.away_stats);
      
      // Find the first incomplete set
      const firstIncomplete = initialScores.findIndex(s => !s.completed);
      if (firstIncomplete >= 0) setActiveSetTab(firstIncomplete);
    }
  }, [visible, match, maxSets]);

  // Calculate total sets won
  const calculateSetsWon = () => {
    let homeSets = 0;
    let awaySets = 0;
    
    setScores.forEach((set) => {
      if (set.completed) {
        if (set.homeGames > set.awayGames) homeSets++;
        else if (set.awayGames > set.homeGames) awaySets++;
      }
    });
    
    return { homeSets, awaySets };
  };

  const { homeSets, awaySets } = calculateSetsWon();

  // Get display text for current point
  const getPointDisplay = (points: number, isOther40: boolean) => {
    if (isDeuce) {
      if (advantage === 'home' && points === 3) return 'AD';
      if (advantage === 'away' && points === 3) return 'AD';
      return '40';
    }
    return POINTS[points] || '0';
  };

  // Handle point scored
  const addPoint = (team: 'home' | 'away') => {
    const currentSet = setScores[activeSetTab];
    if (!currentSet || currentSet.completed) return;

    // Check if in tiebreak mode
    if (currentSet.tiebreak) {
      // Tiebreak scoring
      setSetScores(prev => {
        const newScores = [...prev];
        if (team === 'home') {
          newScores[activeSetTab] = {
            ...newScores[activeSetTab],
            tiebreakHome: (newScores[activeSetTab].tiebreakHome || 0) + 1
          };
        } else {
          newScores[activeSetTab] = {
            ...newScores[activeSetTab],
            tiebreakAway: (newScores[activeSetTab].tiebreakAway || 0) + 1
          };
        }
        
        // Check if tiebreak is won (7+ points with 2 point lead)
        const tbHome = newScores[activeSetTab].tiebreakHome || 0;
        const tbAway = newScores[activeSetTab].tiebreakAway || 0;
        if ((tbHome >= 7 || tbAway >= 7) && Math.abs(tbHome - tbAway) >= 2) {
          // Set completed
          if (tbHome > tbAway) {
            newScores[activeSetTab].homeGames = 7;
            newScores[activeSetTab].awayGames = 6;
          } else {
            newScores[activeSetTab].homeGames = 6;
            newScores[activeSetTab].awayGames = 7;
          }
          newScores[activeSetTab].completed = true;
        }
        
        return newScores;
      });
      return;
    }

    // Regular game scoring
    if (isDeuce) {
      if (advantage === team) {
        // Team with advantage wins the game
        winGame(team);
      } else if (advantage === null) {
        // Set advantage
        setAdvantage(team);
        // Trigger auto-save with new advantage
        setTimeout(() => triggerAutoSave(undefined, homePoints, awayPoints, true, team), 50);
      } else {
        // Other team had advantage, back to deuce
        setAdvantage(null);
        // Trigger auto-save with no advantage
        setTimeout(() => triggerAutoSave(undefined, homePoints, awayPoints, true, null), 50);
      }
    } else {
      // Normal point progression
      if (team === 'home') {
        if (homePoints === 3 && awayPoints === 3) {
          // 40-40 -> Deuce
          setIsDeuce(true);
          setAdvantage('home');
          setTimeout(() => triggerAutoSave(undefined, 3, 3, true, 'home'), 50);
        } else if (homePoints === 3 && awayPoints < 3) {
          // Win the game
          winGame('home');
        } else {
          const newHomePoints = homePoints + 1;
          setHomePoints(newHomePoints);
          // Check for deuce
          if (newHomePoints === 3 && awayPoints === 3) {
            setIsDeuce(true);
            setTimeout(() => triggerAutoSave(undefined, newHomePoints, awayPoints, true, null), 50);
          } else {
            // Trigger auto-save with new points
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
            // Trigger auto-save with new points
            setTimeout(() => triggerAutoSave(undefined, homePoints, newAwayPoints, isDeuce, advantage), 50);
          }
        }
      }
    }

    // Log event
    setEventsHistory(prev => [...prev, { type: 'point', team, timestamp: new Date().toISOString() }]);
  };

  // Win a game
  const winGame = (team: 'home' | 'away') => {
    // Reset points
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
      
      // Check if set is won
      const homeG = currentSet.homeGames;
      const awayG = currentSet.awayGames;
      
      // Regular set win: 6 games with 2 game lead, or 7-5
      if ((homeG >= 6 || awayG >= 6) && Math.abs(homeG - awayG) >= 2) {
        currentSet.completed = true;
      }
      // Tiebreak at 6-6
      else if (homeG === 6 && awayG === 6) {
        currentSet.tiebreak = true;
        currentSet.tiebreakHome = 0;
        currentSet.tiebreakAway = 0;
      }
      
      newScores[activeSetTab] = currentSet;
      
      // Trigger auto-save with new scores
      setTimeout(() => triggerAutoSave(newScores, 0, 0, false, null), 50);
      
      return newScores;
    });
  };

  // Update player stats
  const updateStat = (team: 'home' | 'away', stat: keyof PlayerStats, delta: number) => {
    if (team === 'home') {
      setHomeStats(prev => {
        const newStats = { ...prev, [stat]: Math.max(0, prev[stat] + delta) };
        // Auto-save stats
        setTimeout(() => triggerAutoSave(), 100);
        return newStats;
      });
    } else {
      setAwayStats(prev => {
        const newStats = { ...prev, [stat]: Math.max(0, prev[stat] + delta) };
        // Auto-save stats
        setTimeout(() => triggerAutoSave(), 100);
        return newStats;
      });
    }
    setEventsHistory(prev => [...prev, { type: 'stat', team, stat, delta, timestamp: new Date().toISOString() }]);
  };

  // Undo last action
  const undoLast = () => {
    if (eventsHistory.length === 0) return;
    
    const lastEvent = eventsHistory[eventsHistory.length - 1];
    
    if (lastEvent.type === 'stat') {
      if (lastEvent.team === 'home') {
        setHomeStats(prev => ({
          ...prev,
          [lastEvent.stat]: Math.max(0, prev[lastEvent.stat as keyof PlayerStats] - lastEvent.delta),
        }));
      } else {
        setAwayStats(prev => ({
          ...prev,
          [lastEvent.stat as keyof PlayerStats]: Math.max(0, prev[lastEvent.stat as keyof PlayerStats] - lastEvent.delta),
        }));
      }
    }
    
    setEventsHistory(prev => prev.slice(0, -1));
  };

  // Save match
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const matchData = {
        tennis_sets: setScores,
        currentGame: { homePoints, awayPoints, isDeuce, advantage },
        home_stats: homeStats,
        away_stats: awayStats,
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
      'Sei sicuro di voler chiudere questa partita?',
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
                currentGame: null,  // Clear current game on completion
                home_stats: homeStats,
                away_stats: awayStats,
                home_goals: homeSets,
                away_goals: awaySets,
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

  // Render stat row with CORRECT layout: [-] [value] [+] | Label | [-] [value] [+]
  const renderStatRow = (label: string, stat: keyof PlayerStats, homeValue: number, awayValue: number) => (
    <View style={styles.statRow} key={stat}>
      {/* Home side: [-] [value] [+] - centered in flex container */}
      <View style={styles.statSide}>
        <TouchableOpacity style={styles.statButton} onPress={() => updateStat('home', stat, -1)}>
          <Ionicons name="remove-circle" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.statValue}>{homeValue}</Text>
        <TouchableOpacity style={styles.statButton} onPress={() => updateStat('home', stat, 1)}>
          <Ionicons name="add-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {/* Label in center */}
      <Text style={styles.statLabel}>{label}</Text>
      
      {/* Away side: [-] [value] [+] - centered in flex container */}
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

  // Get current point display
  const getCurrentPointDisplay = () => {
    if (isDeuce) {
      if (advantage === 'home') return 'AD - 40';
      if (advantage === 'away') return '40 - AD';
      return 'Deuce';
    }
    return `${POINTS[homePoints]} - ${POINTS[awayPoints]}`;
  };

  const currentSet = setScores[activeSetTab];

  if (!match) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Tennis Match</Text>
            <Text style={styles.headerSubtitle}>{tournamentName}</Text>
          </View>
          <TouchableOpacity onPress={undoLast} style={styles.undoButton} disabled={eventsHistory.length === 0}>
            <Ionicons name="arrow-undo" size={24} color={eventsHistory.length === 0 ? '#CCC' : '#000'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Score Header */}
          <View style={styles.scoreHeader}>
            <View style={styles.teamSection}>
              <Text style={styles.teamName} numberOfLines={1}>{homeTeam?.name || 'Giocatore 1'}</Text>
            </View>
            <View style={styles.totalScore}>
              <Text style={styles.totalScoreText}>{homeSets} - {awaySets}</Text>
              <Text style={styles.setsLabel}>SET</Text>
            </View>
            <View style={styles.teamSection}>
              <Text style={styles.teamName} numberOfLines={1}>{awayTeam?.name || 'Giocatore 2'}</Text>
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
                <Text style={[styles.setTabText, activeSetTab === i && styles.setTabTextActive]}>
                  Set {i + 1}
                </Text>
                {setScores[i] && (
                  <Text style={styles.setTabScore}>
                    {setScores[i].homeGames}-{setScores[i].awayGames}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Current Game Score */}
          {currentSet && !currentSet.completed && !currentSet.tiebreak && (
            <View style={styles.currentGameSection}>
              <Text style={styles.sectionTitle}>Punteggio Game Corrente</Text>
              <View style={styles.currentGameDisplay}>
                <Text style={styles.currentGameText}>{getCurrentPointDisplay()}</Text>
              </View>
              <View style={styles.pointButtonsRow}>
                <TouchableOpacity style={styles.pointButton} onPress={() => addPoint('home')}>
                  <Text style={styles.pointButtonText}>+ Punto {homeTeam?.name || 'G1'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pointButton} onPress={() => addPoint('away')}>
                  <Text style={styles.pointButtonText}>+ Punto {awayTeam?.name || 'G2'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tiebreak Section */}
          {currentSet && currentSet.tiebreak && !currentSet.completed && (
            <View style={styles.tiebreakSection}>
              <Text style={styles.sectionTitle}>Tie-Break</Text>
              <View style={styles.tiebreakScore}>
                <Text style={styles.tiebreakScoreText}>
                  {currentSet.tiebreakHome || 0} - {currentSet.tiebreakAway || 0}
                </Text>
              </View>
              <View style={styles.pointButtonsRow}>
                <TouchableOpacity style={styles.pointButton} onPress={() => addPoint('home')}>
                  <Text style={styles.pointButtonText}>+ {homeTeam?.name || 'G1'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pointButton} onPress={() => addPoint('away')}>
                  <Text style={styles.pointButtonText}>+ {awayTeam?.name || 'G2'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Games in Active Set */}
          <View style={styles.setScoreSection}>
            <Text style={styles.sectionTitle}>Set {activeSetTab + 1} - Games</Text>
            <View style={styles.gameScoreRow}>
              <View style={styles.gameScoreBox}>
                <Text style={styles.gameScoreValue}>{currentSet?.homeGames || 0}</Text>
              </View>
              <Text style={styles.gameScoreDivider}>-</Text>
              <View style={styles.gameScoreBox}>
                <Text style={styles.gameScoreValue}>{currentSet?.awayGames || 0}</Text>
              </View>
            </View>
            {currentSet?.completed && (
              <Text style={styles.setCompletedText}>{t('tennis.setCompleted', 'Set Completed')}</Text>
            )}
          </View>

          {/* Statistics Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>{t('stats.playerStats', 'Player Stats')}</Text>
            
            <View style={styles.statsHeader}>
              <Text style={styles.statsTeamLabel}>{homeTeam?.name || 'G1'}</Text>
              <Text style={styles.statsMiddleLabel}>{t('stats.stat', 'Stat')}</Text>
              <Text style={styles.statsTeamLabel}>{awayTeam?.name || 'G2'}</Text>
            </View>

            {renderStatRow(t('tennis.ace', 'Ace'), 'aces', homeStats.aces, awayStats.aces)}
            {renderStatRow(t('tennis.doubleFaultsShort', 'DF'), 'doubleFaults', homeStats.doubleFaults, awayStats.doubleFaults)}
            {renderStatRow('Winners', 'winners', homeStats.winners, awayStats.winners)}
            {renderStatRow(t('tennis.unforcedErrorsShort', 'UE'), 'unforcedErrors', homeStats.unforcedErrors, awayStats.unforcedErrors)}
            {renderStatRow(t('tennis.breakPointsConvertedShort', 'BP Conv.'), 'breakPointsConverted', homeStats.breakPointsConverted, awayStats.breakPointsConverted)}
            {renderStatRow(t('tennis.breakPointsSavedShort', 'BP Saved'), 'breakPointsSaved', homeStats.breakPointsSaved, awayStats.breakPointsSaved)}
          </View>
        </ScrollView>

        {/* Footer Actions - Only "Chiudi Match" button, auto-save handles real-time updates */}
        <View style={styles.footer}>
          <View style={styles.autoSaveIndicator}>
            <Ionicons name="cloud-done" size={16} color="#10B981" />
            <Text style={styles.autoSaveText}>{t('tennis.autoSave', 'Auto-save')}</Text>
          </View>
          
          <TouchableOpacity style={styles.closeMatchButton} onPress={handleCloseMatch} disabled={saving}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.closeMatchButtonText}>{t('tennis.endMatch', 'End Match')}</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  closeButton: { padding: 4 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  headerSubtitle: { fontSize: 12, color: '#666' },
  undoButton: { padding: 4 },
  content: { flex: 1 },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#F8F8F8',
  },
  teamSection: { flex: 1, alignItems: 'center' },
  teamName: { fontSize: 14, fontWeight: '600', color: '#000', textAlign: 'center' },
  totalScore: { alignItems: 'center', paddingHorizontal: 20 },
  totalScoreText: { fontSize: 36, fontWeight: '700', color: '#000' },
  setsLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  setTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  setTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  setTabActive: { borderBottomColor: '#000' },
  setTabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  setTabTextActive: { color: '#000' },
  setTabScore: { fontSize: 11, color: '#666', marginTop: 2 },
  currentGameSection: { padding: 16, backgroundColor: '#F0F0F0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  currentGameDisplay: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000',
  },
  currentGameText: { fontSize: 32, fontWeight: '700', color: '#000' },
  pointButtonsRow: { flexDirection: 'row', gap: 12 },
  pointButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pointButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  tiebreakSection: { padding: 16, backgroundColor: '#FFF5E6' },
  tiebreakScore: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  tiebreakScoreText: { fontSize: 32, fontWeight: '700', color: '#FF9500' },
  setScoreSection: { padding: 16 },
  gameScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  gameScoreBox: {
    width: 70,
    height: 70,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameScoreValue: { fontSize: 32, fontWeight: '700', color: '#000' },
  gameScoreDivider: { fontSize: 28, fontWeight: '700', color: '#000' },
  setCompletedText: { fontSize: 14, color: '#10B981', fontWeight: '600', textAlign: 'center', marginTop: 12 },
  statsSection: { padding: 16, borderTopWidth: 8, borderTopColor: '#F0F0F0' },
  statsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statsTeamLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#666', textAlign: 'center' },
  statsMiddleLabel: { width: 80, fontSize: 12, fontWeight: '600', color: '#666', textAlign: 'center' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
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

export default TennisMatchModal;
