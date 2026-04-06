import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FieldView } from './FieldView';
import { BasketballCourtView } from './BasketballCourtView';
import { TennisCourtView } from './TennisCourtView';
import { PadelCourtView } from './PadelCourtView';
import { VolleyballCourtView } from './VolleyballCourtView';
import { FormationPlayer, Player, Formation } from '../types';
import api from '../utils/api';

// Game format configurations for SOCCER
const GAME_FORMATS_MODULES: Record<string, string[]> = {
  '11v11': ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '4-1-4-1'],
  '8v8': ['1-3-3', '1-2-4', '1-4-2', '1-3-2-1', '1-2-2-2'],
  '7v7': ['1-3-2', '1-2-3', '1-2-2-1', '1-3-1-1'],
  '6v6': ['1-2-2', '1-1-3', '1-2-1-1', '1-3-1'],
  '5v5': ['1-2-1', '1-1-2', '2-2'],
  'custom': ['Personalizzato'],
};

// Game format configurations for BASKETBALL
const BASKETBALL_MODULES: Record<string, string[]> = {
  '5v5': ['1-2-2', '2-1-2', '1-3-1', '2-2-1', '1-2-1-1'],
  '3v3': ['1-2', '2-1', '1-1-1'],
  'custom': ['Personalizzato'],
};

// Game format configurations for VOLLEYBALL (6 players)
const VOLLEYBALL_MODULES: Record<string, string[]> = {
  '6v6': ['5-1', '6-2', '4-2'],
  'custom': ['Personalizzato'],
};

// Module position breakdown for SOCCER
const MODULE_POSITIONS: Record<string, { goalkeeper: number; defender: number; midfielder: number; forward: number }> = {
  // 11v11
  '4-3-3': { goalkeeper: 1, defender: 4, midfielder: 3, forward: 3 },
  '4-4-2': { goalkeeper: 1, defender: 4, midfielder: 4, forward: 2 },
  '4-2-3-1': { goalkeeper: 1, defender: 4, midfielder: 5, forward: 1 },
  '3-5-2': { goalkeeper: 1, defender: 3, midfielder: 5, forward: 2 },
  '3-4-3': { goalkeeper: 1, defender: 3, midfielder: 4, forward: 3 },
  '5-3-2': { goalkeeper: 1, defender: 5, midfielder: 3, forward: 2 },
  '4-1-4-1': { goalkeeper: 1, defender: 4, midfielder: 5, forward: 1 },
  // 8v8
  '1-3-3': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 3 },
  '1-2-4': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 4 },
  '1-4-2': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 2 },
  '1-3-2-1': { goalkeeper: 1, defender: 1, midfielder: 5, forward: 1 },
  '1-2-2-2': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 2 },
  // 7v7
  '1-3-2': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 2 },
  '1-2-3': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 3 },
  '1-2-2-1': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 1 },
  '1-3-1-1': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 1 },
  // 6v6
  '1-2-2': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 2 },
  '1-1-3': { goalkeeper: 1, defender: 1, midfielder: 1, forward: 3 },
  '1-2-1-1': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 1 },
  '1-3-1': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 1 },
  // 5v5
  '1-2-1': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 1 },
  '1-1-2': { goalkeeper: 1, defender: 1, midfielder: 1, forward: 2 },
  '2-2': { goalkeeper: 1, defender: 2, midfielder: 0, forward: 2 },
};

// Module position breakdown for BASKETBALL
const BASKETBALL_MODULE_POSITIONS: Record<string, { playmaker: number; guardia: number; ala_piccola: number; ala_grande: number; centro: number }> = {
  // 5v5
  '1-2-2': { playmaker: 1, guardia: 2, ala_piccola: 1, ala_grande: 1, centro: 0 },
  '2-1-2': { playmaker: 2, guardia: 1, ala_piccola: 1, ala_grande: 1, centro: 0 },
  '1-3-1': { playmaker: 1, guardia: 1, ala_piccola: 1, ala_grande: 1, centro: 1 },
  '2-2-1': { playmaker: 2, guardia: 1, ala_piccola: 1, ala_grande: 0, centro: 1 },
  '1-2-1-1': { playmaker: 1, guardia: 2, ala_piccola: 0, ala_grande: 1, centro: 1 },
  // 3v3
  '1-2': { playmaker: 1, guardia: 1, ala_piccola: 1, ala_grande: 0, centro: 0 },
  '2-1': { playmaker: 1, guardia: 1, ala_piccola: 0, ala_grande: 0, centro: 1 },
  '1-1-1': { playmaker: 1, guardia: 1, ala_piccola: 0, ala_grande: 0, centro: 1 },
};

// Module position breakdown for VOLLEYBALL (6 players)
// Ruoli: Palleggiatore (Setter), Opposto (Opposite), Schiacciatore (Outside Hitter), Centrale (Middle Blocker), Libero
const VOLLEYBALL_MODULE_POSITIONS: Record<string, { palleggiatore: number; opposto: number; schiacciatore: number; centrale: number; libero: number }> = {
  // 5-1: 1 palleggiatore + 2 centrali + 2 schiacciatori + 1 opposto (libero fuori)
  '5-1': { palleggiatore: 1, opposto: 1, schiacciatore: 2, centrale: 2, libero: 0 },
  // 6-2: 2 palleggiatori/opposti + 2 schiacciatori + 2 centrali
  '6-2': { palleggiatore: 2, opposto: 0, schiacciatore: 2, centrale: 2, libero: 0 },
  // 4-2: 2 palleggiatori + 2 schiacciatori + 2 centrali  
  '4-2': { palleggiatore: 2, opposto: 0, schiacciatore: 2, centrale: 2, libero: 0 },
};

interface FormationModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  gameFormat: string;
  players: Player[];
  existingFormation?: Formation | null;
  onSave: (formation: Formation) => void;
  sport?: string; // 'calcio' | 'basket' | 'padel' | 'tennis' etc.
}

// Soccer position types
type SoccerPositionType = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
// Basketball position types
type BasketballPositionType = 'playmaker' | 'guardia' | 'ala_piccola' | 'ala_grande' | 'centro';
// Volleyball position types
type VolleyballPositionType = 'palleggiatore' | 'opposto' | 'schiacciatore' | 'centrale' | 'libero';

const POSITION_LABELS: Record<SoccerPositionType, string> = {
  goalkeeper: '🧤 Portiere',
  defender: '🛡️ Difensori',
  midfielder: '⚙️ Centrocampisti',
  forward: '⚡ Attaccanti',
};

const BASKETBALL_POSITION_LABELS: Record<BasketballPositionType, string> = {
  playmaker: '🎯 Playmaker',
  guardia: '🏀 Guardia',
  ala_piccola: '🦅 Ala Piccola',
  ala_grande: '💪 Ala Grande',
  centro: '🗼 Centro',
};

const VOLLEYBALL_POSITION_LABELS: Record<VolleyballPositionType, string> = {
  palleggiatore: '🎯 Palleggiatore',
  opposto: '💪 Opposto',
  schiacciatore: '⚡ Schiacciatore',
  centrale: '🏐 Centrale',
  libero: '🛡️ Libero',
};

export function FormationModal({
  visible,
  onClose,
  teamId,
  teamName,
  gameFormat,
  players,
  existingFormation,
  onSave,
  sport = 'calcio',
}: FormationModalProps) {
  const isBasketball = sport === 'basket';
  const isTennis = sport === 'tennis';
  const isPadel = sport === 'padel';
  const isVolleyball = sport === 'pallavolo';
  const isRacketSport = isTennis || isPadel;
  
  const [viewMode, setViewMode] = useState<'list' | 'field'>('list');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [starters, setStarters] = useState<FormationPlayer[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  // Tennis/Padel configuration - no modules, just players
  const TENNIS_FORMATS: Record<string, { slots: number; labels: string[] }> = {
    'singolo': { slots: 1, labels: ['Giocatore'] },
    'singles': { slots: 1, labels: ['Giocatore'] },
    'doppio': { slots: 2, labels: ['Giocatore 1', 'Giocatore 2'] },
    'doubles': { slots: 2, labels: ['Giocatore 1', 'Giocatore 2'] },
  };
  
  const PADEL_FORMATS: Record<string, { slots: number; labels: string[] }> = {
    'doppio': { slots: 2, labels: ['Giocatore 1', 'Giocatore 2'] },
    'doubles': { slots: 2, labels: ['Giocatore 1', 'Giocatore 2'] },
    'singolo': { slots: 1, labels: ['Giocatore'] },
    'singles': { slots: 1, labels: ['Giocatore'] },
  };

  // Get available modules for the game format (depends on sport)
  const availableModules = isBasketball
    ? (BASKETBALL_MODULES[gameFormat] || BASKETBALL_MODULES['5v5'])
    : isVolleyball
    ? (VOLLEYBALL_MODULES[gameFormat] || VOLLEYBALL_MODULES['6v6'])
    : isRacketSport
    ? [] // Tennis/Padel don't have tactical modules
    : (GAME_FORMATS_MODULES[gameFormat] || GAME_FORMATS_MODULES['11v11']);

  // Initialize from existing formation
  useEffect(() => {
    if (existingFormation) {
      setSelectedModule(existingFormation.module);
      setStarters(existingFormation.starters);
      setBench(existingFormation.bench.map(b => typeof b === 'string' ? b : b.player_id));
    } else if (availableModules.length > 0 && !selectedModule) {
      setSelectedModule(availableModules[0]);
    } else if (isRacketSport && !selectedModule) {
      // For tennis/padel, set a default "module" based on game format
      setSelectedModule(gameFormat === 'singles' ? 'singles' : 'doubles');
    }
  }, [existingFormation, visible]);

  // Initialize starters when module changes
  useEffect(() => {
    if (isRacketSport) {
      // Tennis/Padel: Simple player slots without positions
      const newStarters: FormationPlayer[] = [];
      const format = isTennis ? TENNIS_FORMATS[gameFormat] : PADEL_FORMATS[gameFormat];
      const slotCount = format?.slots || (gameFormat === 'singles' ? 1 : 2);
      
      for (let i = 0; i < slotCount; i++) {
        const existingPlayer = starters.find(s => s.slot_index === i);
        newStarters.push(
          existingPlayer || {
            player_id: '',
            position: 'player', // Tennis/Padel don't have specific positions
            slot_index: i,
          }
        );
      }
      setStarters(newStarters);
    } else if (selectedModule) {
      const newStarters: FormationPlayer[] = [];
      
      if (isBasketball && BASKETBALL_MODULE_POSITIONS[selectedModule]) {
        // Basketball positions
        const positions = BASKETBALL_MODULE_POSITIONS[selectedModule];
        (['playmaker', 'guardia', 'ala_piccola', 'ala_grande', 'centro'] as BasketballPositionType[]).forEach(position => {
          const count = positions[position];
          for (let i = 0; i < count; i++) {
            const existingPlayer = starters.find(
              s => s.position === position && s.slot_index === i
            );
            newStarters.push(
              existingPlayer || {
                player_id: '',
                position,
                slot_index: i,
              }
            );
          }
        });
      } else if (isVolleyball && VOLLEYBALL_MODULE_POSITIONS[selectedModule]) {
        // Volleyball positions
        const positions = VOLLEYBALL_MODULE_POSITIONS[selectedModule];
        (['palleggiatore', 'opposto', 'schiacciatore', 'centrale', 'libero'] as VolleyballPositionType[]).forEach(position => {
          const count = positions[position];
          for (let i = 0; i < count; i++) {
            const existingPlayer = starters.find(
              s => s.position === position && s.slot_index === i
            );
            newStarters.push(
              existingPlayer || {
                player_id: '',
                position,
                slot_index: i,
              }
            );
          }
        });
      } else if (MODULE_POSITIONS[selectedModule]) {
        // Soccer positions
        const positions = MODULE_POSITIONS[selectedModule];
        (['goalkeeper', 'defender', 'midfielder', 'forward'] as SoccerPositionType[]).forEach(position => {
          const count = positions[position];
          for (let i = 0; i < count; i++) {
            const existingPlayer = starters.find(
              s => s.position === position && s.slot_index === i
            );
            newStarters.push(
              existingPlayer || {
                player_id: '',
                position,
                slot_index: i,
              }
            );
          }
        });
      }

      setStarters(newStarters);
    }
  }, [selectedModule, isBasketball, isVolleyball, isRacketSport, gameFormat]);

  // Get assigned player IDs
  const getAssignedPlayerIds = (): string[] => {
    return starters.filter(s => s.player_id).map(s => s.player_id);
  };

  // Get available players for a dropdown (exclude already assigned)
  const getAvailablePlayers = (currentSlot: FormationPlayer): Player[] => {
    const assignedIds = getAssignedPlayerIds();
    return players.filter(
      p => !assignedIds.includes(p.id) || p.id === currentSlot.player_id
    );
  };

  // Handle player selection for a slot
  const handlePlayerSelect = (position: string, slotIndex: number, playerId: string) => {
    setStarters(prev =>
      prev.map(s =>
        s.position === position && s.slot_index === slotIndex
          ? {
              ...s,
              player_id: playerId,
              player_name: players.find(p => p.id === playerId)?.full_name,
              player_number: players.find(p => p.id === playerId)?.number,
              player_photo: players.find(p => p.id === playerId)?.photo,
              player_role: players.find(p => p.id === playerId)?.role,
            }
          : s
      )
    );
    setShowDropdown(null);
  };

  // Handle save
  const handleSave = async () => {
    // Validate all positions are filled
    const emptySlots = starters.filter(s => !s.player_id);
    if (emptySlots.length > 0) {
      Alert.alert('Attenzione', 'Compila tutti i ruoli prima di salvare');
      return;
    }

    // Calculate bench players (those not in starters)
    const assignedIds = starters.filter(s => s.player_id).map(s => s.player_id);
    const benchPlayerIds = players.filter(p => !assignedIds.includes(p.id)).map(p => p.id);

    setSaving(true);
    try {
      const response = await api.post(`/api/teams/${teamId}/formation`, {
        module: selectedModule,
        starters: starters.map(s => ({
          player_id: s.player_id,
          position: s.position,
          slot_index: s.slot_index,
        })),
        bench: benchPlayerIds,
      });
      onSave(response.data);
      Alert.alert('Successo', 'Formazione salvata!');
      onClose();
    } catch (error) {
      console.error('Error saving formation:', error);
      Alert.alert('Errore', 'Impossibile salvare la formazione');
    } finally {
      setSaving(false);
    }
  };

  // Get bench players (not in starters)
  const benchPlayers = players.filter(
    p => !getAssignedPlayerIds().includes(p.id)
  );

  // Render position section with dropdowns
  const renderPositionSection = (position: string) => {
    const slots = starters.filter(s => s.position === position);
    if (slots.length === 0) return null;

    // Get the label based on sport
    const label = isBasketball 
      ? BASKETBALL_POSITION_LABELS[position as BasketballPositionType] || position
      : isVolleyball
      ? VOLLEYBALL_POSITION_LABELS[position as VolleyballPositionType] || position
      : POSITION_LABELS[position as SoccerPositionType] || position;

    // Get role abbreviation based on sport
    const getRoleAbbrev = (role: string) => {
      if (isBasketball) {
        const basketRoles: Record<string, string> = {
          'playmaker': 'PM',
          'guardia': 'G',
          'ala_piccola': 'AP',
          'ala piccola': 'AP',
          'ala_grande': 'AG',
          'ala grande': 'AG',
          'centro': 'C',
        };
        return basketRoles[role?.toLowerCase()] || role?.substring(0, 2).toUpperCase() || '?';
      } else if (isVolleyball) {
        const volleyRoles: Record<string, string> = {
          'palleggiatore': 'P',
          'opposto': 'O',
          'schiacciatore': 'S',
          'centrale': 'C',
          'libero': 'L',
        };
        return volleyRoles[role?.toLowerCase()] || role?.substring(0, 2).toUpperCase() || '?';
      } else {
        const soccerRoles: Record<string, string> = {
          'goalkeeper': 'P',
          'defender': 'D',
          'midfielder': 'C',
          'forward': 'A',
        };
        return soccerRoles[role?.toLowerCase()] || role?.substring(0, 2).toUpperCase() || '?';
      }
    };

    return (
      <View style={styles.positionSection} key={position}>
        <Text style={styles.positionTitle}>{label}</Text>
        {slots.map((slot, idx) => {
          const dropdownKey = `${position}-${idx}`;
          const selectedPlayer = players.find(p => p.id === slot.player_id);
          const availablePlayers = getAvailablePlayers(slot);

          return (
            <View key={dropdownKey} style={styles.slotContainer}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowDropdown(showDropdown === dropdownKey ? null : dropdownKey)}
              >
                <Text style={selectedPlayer ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedPlayer
                    ? `${selectedPlayer.number || ''} ${selectedPlayer.full_name}`
                    : `Seleziona giocatore...`}
                </Text>
                <Ionicons
                  name={showDropdown === dropdownKey ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              {showDropdown === dropdownKey && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handlePlayerSelect(position, idx, '')}
                  >
                    <Text style={styles.dropdownItemPlaceholder}>— Nessuno —</Text>
                  </TouchableOpacity>
                  {availablePlayers.map(player => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.dropdownItem,
                        player.id === slot.player_id && styles.dropdownItemSelected,
                      ]}
                      onPress={() => handlePlayerSelect(position, idx, player.id)}
                    >
                      <Text style={styles.dropdownItemNumber}>
                        {player.number || '-'}
                      </Text>
                      <Text style={styles.dropdownItemName}>{player.full_name}</Text>
                      <Text style={styles.dropdownItemRole}>
                        {getRoleAbbrev(player.role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Annulla</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Formazione</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveText}>Salva</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Team name */}
        <Text style={styles.teamName}>{teamName}</Text>

        {/* View toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={18} color={viewMode === 'list' ? '#FFF' : '#000'} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'field' && styles.toggleButtonActive]}
            onPress={() => setViewMode('field')}
          >
            <Ionicons 
              name={isRacketSport ? 'tennisball' : (isBasketball ? 'basketball' : (isVolleyball ? 'tennisball-outline' : 'football'))} 
              size={18} 
              color={viewMode === 'field' ? '#FFF' : '#000'} 
            />
            <Text style={[styles.toggleText, viewMode === 'field' && styles.toggleTextActive]}>Campo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Module selector - Hide for Tennis/Padel */}
          {!isRacketSport && (
            <>
              <Text style={styles.sectionLabel}>Modulo Tattico</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moduleScroll}>
                {availableModules.map(module => (
                  <TouchableOpacity
                    key={module}
                    style={[styles.moduleChip, selectedModule === module && styles.moduleChipSelected]}
                    onPress={() => setSelectedModule(module)}
                  >
                    <Text style={[styles.moduleChipText, selectedModule === module && styles.moduleChipTextSelected]}>
                      {module}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {viewMode === 'field' ? (
            /* Field View - Show appropriate court based on sport */
            isTennis ? (
              <TennisCourtView
                format={(gameFormat === 'singles' || gameFormat === 'singolo') ? 'singles' : 'doubles'}
                homePlayers={starters.filter(s => s.player_id).map(s => ({
                  player_id: s.player_id,
                  full_name: players.find(p => p.id === s.player_id)?.full_name,
                  number: players.find(p => p.id === s.player_id)?.number,
                  photo: players.find(p => p.id === s.player_id)?.photo,
                  position: s.position,
                }))}
                awayPlayers={[]}
                homeTeamName={teamName}
              />
            ) : isPadel ? (
              <PadelCourtView
                format={(gameFormat === 'singles' || gameFormat === 'singolo') ? 'singles' : 'doubles'}
                homePlayers={starters.filter(s => s.player_id).map(s => ({
                  player_id: s.player_id,
                  full_name: players.find(p => p.id === s.player_id)?.full_name,
                  number: players.find(p => p.id === s.player_id)?.number,
                  photo: players.find(p => p.id === s.player_id)?.photo,
                  position: s.position,
                }))}
                awayPlayers={[]}
                homeTeamName={teamName}
              />
            ) : isBasketball ? (
              <BasketballCourtView
                module={selectedModule}
                starters={starters.filter(s => s.player_id).map(s => ({
                  ...s,
                  full_name: players.find(p => p.id === s.player_id)?.full_name,
                  number: players.find(p => p.id === s.player_id)?.number,
                  photo: players.find(p => p.id === s.player_id)?.photo,
                }))}
                gameFormat={gameFormat}
              />
            ) : isVolleyball ? (
              <VolleyballCourtView
                module={selectedModule}
                homePlayers={starters.filter(s => s.player_id).map(s => ({
                  player_id: s.player_id,
                  full_name: players.find(p => p.id === s.player_id)?.full_name,
                  number: players.find(p => p.id === s.player_id)?.number,
                  position: s.position,
                }))}
                awayPlayers={[]}
                homeTeamName={teamName}
              />
            ) : (
              <FieldView
                module={selectedModule}
                starters={starters.filter(s => s.player_id)}
                gameFormat={gameFormat}
              />
            )
          ) : (
            /* List View */
            <View style={styles.listView}>
              {isRacketSport ? (
                /* Tennis/Padel: Simple player list without positions */
                <View style={styles.tennisPlayerList}>
                  <Text style={styles.positionTitle}>
                    🎾 {gameFormat === 'singles' || gameFormat === 'singolo' ? 'Singolo' : (isTennis ? 'Doppio' : 'Coppia')}
                  </Text>
                  {starters.map((slot, idx) => {
                    const dropdownKey = `player-${idx}`;
                    const selectedPlayer = players.find(p => p.id === slot.player_id);
                    const availablePlayers = getAvailablePlayers(slot);
                    const format = isTennis ? TENNIS_FORMATS[gameFormat] : PADEL_FORMATS[gameFormat];
                    const label = format?.labels?.[idx] || `Giocatore ${idx + 1}`;

                    return (
                      <View key={dropdownKey} style={styles.slotContainer}>
                        <Text style={styles.tennisSlotLabel}>{label}</Text>
                        <TouchableOpacity
                          style={styles.dropdown}
                          onPress={() => setShowDropdown(showDropdown === dropdownKey ? null : dropdownKey)}
                        >
                          <Text style={selectedPlayer ? styles.dropdownText : styles.dropdownPlaceholder}>
                            {selectedPlayer
                              ? `${selectedPlayer.number || ''} ${selectedPlayer.full_name}`
                              : `Seleziona giocatore...`}
                          </Text>
                          <Ionicons
                            name={showDropdown === dropdownKey ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color="#666"
                          />
                        </TouchableOpacity>

                        {showDropdown === dropdownKey && (
                          <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => { handlePlayerSelect('player', idx, ''); setShowDropdown(null); }}
                            >
                              <Text style={styles.dropdownItemPlaceholder}>— Nessuno —</Text>
                            </TouchableOpacity>
                            {availablePlayers.map(player => (
                              <TouchableOpacity
                                key={player.id}
                                style={[
                                  styles.dropdownItem,
                                  player.id === slot.player_id && styles.dropdownItemSelected,
                                ]}
                                onPress={() => { handlePlayerSelect('player', idx, player.id); setShowDropdown(null); }}
                              >
                                <Text style={styles.dropdownItemNumber}>
                                  {player.number || '-'}
                                </Text>
                                <Text style={styles.dropdownItemName}>{player.full_name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : isBasketball ? (
                <>
                  {renderPositionSection('playmaker')}
                  {renderPositionSection('guardia')}
                  {renderPositionSection('ala_piccola')}
                  {renderPositionSection('ala_grande')}
                  {renderPositionSection('centro')}
                </>
              ) : isVolleyball ? (
                <>
                  {renderPositionSection('palleggiatore')}
                  {renderPositionSection('opposto')}
                  {renderPositionSection('schiacciatore')}
                  {renderPositionSection('centrale')}
                  {renderPositionSection('libero')}
                </>
              ) : (
                <>
                  {renderPositionSection('goalkeeper')}
                  {renderPositionSection('defender')}
                  {renderPositionSection('midfielder')}
                  {renderPositionSection('forward')}
                </>
              )}
            </View>
          )}

          {/* Bench section */}
          <View style={styles.benchSection}>
            <Text style={styles.benchTitle}>🔁 Panchina ({benchPlayers.length})</Text>
            {benchPlayers.length === 0 ? (
              <Text style={styles.benchEmpty}>Nessun giocatore in panchina</Text>
            ) : (
              <View style={styles.benchList}>
                {benchPlayers.map(player => (
                  <View key={player.id} style={styles.benchPlayer}>
                    <Text style={styles.benchPlayerNumber}>{player.number || '-'}</Text>
                    <Text style={styles.benchPlayerName}>{player.full_name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  teamName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9F9F9',
  },
  viewToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#000',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  moduleScroll: {
    marginBottom: 16,
  },
  moduleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    marginRight: 8,
  },
  moduleChipSelected: {
    backgroundColor: '#000',
  },
  moduleChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  moduleChipTextSelected: {
    color: '#FFF',
  },
  listView: {
    marginTop: 8,
  },
  positionSection: {
    marginBottom: 20,
  },
  positionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  slotContainer: {
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F0F0',
  },
  dropdownItemPlaceholder: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  dropdownItemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    width: 30,
  },
  dropdownItemName: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  dropdownItemRole: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  benchSection: {
    marginTop: 24,
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  benchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  benchEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  benchList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benchPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  benchPlayerNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginRight: 6,
  },
  benchPlayerName: {
    fontSize: 13,
    color: '#000',
  },
  // Tennis/Padel specific styles
  tennisPlayerList: {
    marginTop: 8,
  },
  tennisSlotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
});

export default FormationModal;
