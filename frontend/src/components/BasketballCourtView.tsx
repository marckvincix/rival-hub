import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Circle, Line, Path, Ellipse } from 'react-native-svg';
import { FormationPlayer } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COURT_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const COURT_HEIGHT = COURT_WIDTH * 1.6;

interface BasketballCourtViewProps {
  module: string; // e.g., "1-2-2", "2-1-2", "1-3-1"
  starters: FormationPlayer[];
  gameFormat: string; // "5v5" or "3v3"
  homeTeam?: boolean;
}

// Basketball position configs for different formats
const BASKETBALL_MODULES_CONFIG: Record<string, Record<string, { playmaker: number; guardia: number; ala_piccola: number; ala_grande: number; centro: number }>> = {
  '5v5': {
    '1-2-2': { playmaker: 1, guardia: 2, ala_piccola: 1, ala_grande: 1, centro: 0 },
    '2-1-2': { playmaker: 2, guardia: 1, ala_piccola: 1, ala_grande: 1, centro: 0 },
    '1-3-1': { playmaker: 1, guardia: 1, ala_piccola: 1, ala_grande: 1, centro: 1 },
    '2-2-1': { playmaker: 2, guardia: 1, ala_piccola: 1, ala_grande: 0, centro: 1 },
    '1-2-1-1': { playmaker: 1, guardia: 2, ala_piccola: 0, ala_grande: 1, centro: 1 },
  },
  '3v3': {
    '1-2': { playmaker: 1, guardia: 1, ala_piccola: 1, ala_grande: 0, centro: 0 },
    '2-1': { playmaker: 1, guardia: 1, ala_piccola: 0, ala_grande: 0, centro: 1 },
    '1-1-1': { playmaker: 1, guardia: 1, ala_piccola: 0, ala_grande: 0, centro: 1 },
  },
};

// Default modules per format
const DEFAULT_MODULES: Record<string, string> = {
  '5v5': '1-2-2',
  '3v3': '1-2',
};

// Position Y coordinates for basketball (bottom to top)
const BASKETBALL_POSITION_Y: Record<string, number> = {
  playmaker: 0.85,
  guardia: 0.65,
  ala_piccola: 0.45,
  ala_grande: 0.45,
  centro: 0.25,
};

// Get X positions for players in a row
const getXPositions = (count: number): number[] => {
  if (count === 1) return [0.5];
  if (count === 2) return [0.3, 0.7];
  if (count === 3) return [0.2, 0.5, 0.8];
  return Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
};

// Get player initials
const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Basketball role to position mapping
const roleToPosition: Record<string, string> = {
  'playmaker': 'playmaker',
  'guardia': 'guardia',
  'ala_piccola': 'ala_piccola',
  'ala piccola': 'ala_piccola',
  'ala_grande': 'ala_grande',
  'ala grande': 'ala_grande',
  'centro': 'centro',
};

export function BasketballCourtView({ module, starters, gameFormat, homeTeam = true }: BasketballCourtViewProps) {
  // Group players by position
  const playersByPosition: Record<string, FormationPlayer[]> = {
    playmaker: [],
    guardia: [],
    ala_piccola: [],
    ala_grande: [],
    centro: [],
  };

  starters.forEach(player => {
    const position = roleToPosition[player.position.toLowerCase()] || player.position;
    if (playersByPosition[position]) {
      playersByPosition[position].push(player);
    }
  });

  // Get available modules for this format
  const availableModules = BASKETBALL_MODULES_CONFIG[gameFormat] || BASKETBALL_MODULES_CONFIG['5v5'];
  const defaultModule = DEFAULT_MODULES[gameFormat] || '1-2-2';
  const moduleConfig = availableModules[module] || availableModules[defaultModule];

  // Calculate player positions
  const getPlayerPositions = () => {
    const positions: { x: number; y: number; player: FormationPlayer }[] = [];
    
    const positionOrder = ['playmaker', 'guardia', 'ala_piccola', 'ala_grande', 'centro'];
    
    positionOrder.forEach(position => {
      const players = playersByPosition[position];
      if (players.length > 0) {
        const xPositions = getXPositions(players.length);
        const yBase = BASKETBALL_POSITION_Y[position];
        
        players.forEach((player, index) => {
          // Adjust positions for ala_piccola and ala_grande to be side by side
          let y = yBase;
          let x = xPositions[index];
          
          if (position === 'ala_piccola' && playersByPosition['ala_grande'].length > 0) {
            x = 0.3;
          } else if (position === 'ala_grande' && playersByPosition['ala_piccola'].length > 0) {
            x = 0.7;
          }
          
          positions.push({ x, y, player });
        });
      }
    });
    
    return positions;
  };

  const playerPositions = getPlayerPositions();

  return (
    <View style={styles.container}>
      <Svg width={COURT_WIDTH} height={COURT_HEIGHT} viewBox="0 0 100 160">
        {/* Court background - Basketball orange/brown color */}
        <Rect x="0" y="0" width="100" height="160" fill="#CD853F" />
        
        {/* Court outline */}
        <Rect x="2" y="2" width="96" height="156" fill="none" stroke="#3D2914" strokeWidth="1.5" />
        
        {/* Center court line */}
        <Line x1="2" y1="80" x2="98" y2="80" stroke="#3D2914" strokeWidth="1.5" />
        
        {/* Center circle */}
        <Circle cx="50" cy="80" r="12" fill="none" stroke="#3D2914" strokeWidth="1.5" />
        <Circle cx="50" cy="80" r="2" fill="#3D2914" />
        
        {/* Top half court */}
        {/* Three-point arc */}
        <Path
          d="M 11 2 L 11 30 A 40 40 0 0 0 89 30 L 89 2"
          fill="none"
          stroke="#3D2914"
          strokeWidth="1.5"
        />
        
        {/* Key/Paint area (top) */}
        <Rect x="30" y="2" width="40" height="38" fill="none" stroke="#3D2914" strokeWidth="1.5" />
        
        {/* Free throw circle (top) */}
        <Circle cx="50" cy="40" r="12" fill="none" stroke="#3D2914" strokeWidth="1.5" strokeDasharray="4,4" />
        <Circle cx="50" cy="40" r="12" fill="none" stroke="#3D2914" strokeWidth="1.5" strokeDasharray="0,4,4,0" />
        
        {/* Restricted area arc (top) */}
        <Path
          d="M 38 2 A 12 12 0 0 0 62 2"
          fill="none"
          stroke="#3D2914"
          strokeWidth="1.5"
        />
        
        {/* Backboard (top) */}
        <Line x1="42" y1="5" x2="58" y2="5" stroke="#3D2914" strokeWidth="2" />
        
        {/* Rim (top) */}
        <Circle cx="50" cy="8" r="3" fill="none" stroke="#3D2914" strokeWidth="1.5" />
        
        {/* Bottom half court (mirror) */}
        {/* Three-point arc */}
        <Path
          d="M 11 158 L 11 128 A 40 40 0 0 1 89 128 L 89 158"
          fill="none"
          stroke="#3D2914"
          strokeWidth="1.5"
        />
        
        {/* Key/Paint area (bottom) */}
        <Rect x="30" y="120" width="40" height="38" fill="none" stroke="#3D2914" strokeWidth="1.5" />
        
        {/* Free throw circle (bottom) */}
        <Circle cx="50" cy="120" r="12" fill="none" stroke="#3D2914" strokeWidth="1.5" strokeDasharray="4,4" />
        
        {/* Restricted area arc (bottom) */}
        <Path
          d="M 38 158 A 12 12 0 0 1 62 158"
          fill="none"
          stroke="#3D2914"
          strokeWidth="1.5"
        />
        
        {/* Backboard (bottom) */}
        <Line x1="42" y1="155" x2="58" y2="155" stroke="#3D2914" strokeWidth="2" />
        
        {/* Rim (bottom) */}
        <Circle cx="50" cy="152" r="3" fill="none" stroke="#3D2914" strokeWidth="1.5" />
      </Svg>
      
      {/* Player markers */}
      {playerPositions.map((pos, index) => (
        <View
          key={`player-${index}`}
          style={[
            styles.playerMarker,
            {
              left: pos.x * COURT_WIDTH - 20,
              top: pos.y * COURT_HEIGHT - 20,
            },
          ]}
        >
          <View style={styles.playerCircle}>
            {pos.player.photo ? (
              <View style={styles.playerPhotoContainer}>
                <Text style={styles.playerInitials}>{getInitials(pos.player.full_name)}</Text>
              </View>
            ) : (
              <Text style={styles.playerInitials}>{getInitials(pos.player.full_name)}</Text>
            )}
          </View>
          <Text style={styles.playerNumber}>#{pos.player.number || '?'}</Text>
        </View>
      ))}
      
      {/* Empty state */}
      {playerPositions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nessun giocatore in formazione</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: COURT_WIDTH,
    height: COURT_HEIGHT,
    alignSelf: 'center',
    position: 'relative',
  },
  playerMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  playerPhotoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  playerInitials: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playerNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    backgroundColor: '#000',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    overflow: 'hidden',
  },
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default BasketballCourtView;
