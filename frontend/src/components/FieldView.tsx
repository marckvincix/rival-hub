import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { FormationPlayer } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FIELD_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const FIELD_HEIGHT = FIELD_WIDTH * 1.5;

interface FieldViewProps {
  module: string;
  starters: FormationPlayer[];
  gameFormat: string;
}

// Module configurations for different game formats
const MODULES_CONFIG: Record<string, Record<string, { goalkeeper: number; defender: number; midfielder: number; forward: number }>> = {
  '11v11': {
    '4-3-3': { goalkeeper: 1, defender: 4, midfielder: 3, forward: 3 },
    '4-4-2': { goalkeeper: 1, defender: 4, midfielder: 4, forward: 2 },
    '4-2-3-1': { goalkeeper: 1, defender: 4, midfielder: 5, forward: 1 },
    '3-5-2': { goalkeeper: 1, defender: 3, midfielder: 5, forward: 2 },
    '3-4-3': { goalkeeper: 1, defender: 3, midfielder: 4, forward: 3 },
    '5-3-2': { goalkeeper: 1, defender: 5, midfielder: 3, forward: 2 },
    '4-1-4-1': { goalkeeper: 1, defender: 4, midfielder: 5, forward: 1 },
  },
  '8v8': {
    '1-3-3': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 3 },
    '1-2-4': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 4 },
    '1-4-2': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 2 },
    '1-3-2-1': { goalkeeper: 1, defender: 1, midfielder: 5, forward: 1 },
    '1-2-2-2': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 2 },
  },
  '7v7': {
    '1-3-2': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 2 },
    '1-2-3': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 3 },
    '1-2-2-1': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 1 },
    '1-3-1-1': { goalkeeper: 1, defender: 1, midfielder: 4, forward: 1 },
  },
  '6v6': {
    '1-2-2': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 2 },
    '1-1-3': { goalkeeper: 1, defender: 1, midfielder: 1, forward: 3 },
    '1-2-1-1': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 1 },
    '1-3-1': { goalkeeper: 1, defender: 1, midfielder: 3, forward: 1 },
  },
  '5v5': {
    '1-2-1': { goalkeeper: 1, defender: 1, midfielder: 2, forward: 1 },
    '1-1-2': { goalkeeper: 1, defender: 1, midfielder: 1, forward: 2 },
    '2-2': { goalkeeper: 1, defender: 2, midfielder: 0, forward: 2 },
  },
};

// Position Y coordinates (from bottom to top: goalkeeper -> forward)
const POSITION_Y = {
  goalkeeper: 0.88,
  defender: 0.68,
  midfielder: 0.42,
  forward: 0.18,
};

// Get X positions for players in a row
const getXPositions = (count: number): number[] => {
  if (count === 1) return [0.5];
  if (count === 2) return [0.3, 0.7];
  if (count === 3) return [0.2, 0.5, 0.8];
  if (count === 4) return [0.15, 0.38, 0.62, 0.85];
  if (count === 5) return [0.1, 0.3, 0.5, 0.7, 0.9];
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

export function FieldView({ module, starters, gameFormat }: FieldViewProps) {
  // Group players by position
  const playersByPosition: Record<string, FormationPlayer[]> = {
    goalkeeper: [],
    defender: [],
    midfielder: [],
    forward: [],
  };

  starters.forEach(player => {
    if (playersByPosition[player.position]) {
      playersByPosition[player.position].push(player);
    }
  });

  // Render a single player avatar
  const renderPlayer = (player: FormationPlayer, x: number, y: number) => {
    const left = x * FIELD_WIDTH - 22;
    const top = y * FIELD_HEIGHT - 22;

    return (
      <View key={player.player_id} style={[styles.playerContainer, { left, top }]}>
        {player.player_number !== undefined && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{player.player_number}</Text>
          </View>
        )}
        <View style={styles.avatar}>
          {player.player_photo ? (
            <Image source={{ uri: player.player_photo }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(player.player_name)}</Text>
          )}
        </View>
        <Text style={styles.playerName} numberOfLines={1}>
          {player.player_name?.split(' ')[0] || ''}
        </Text>
      </View>
    );
  };

  // Render all players for a position row
  const renderPositionRow = (position: string) => {
    const players = playersByPosition[position];
    if (players.length === 0) return null;

    const xPositions = getXPositions(players.length);
    const y = POSITION_Y[position as keyof typeof POSITION_Y];

    return players.map((player, index) => 
      renderPlayer(player, xPositions[index], y)
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.field, { width: FIELD_WIDTH, height: FIELD_HEIGHT }]}>
        {/* Field lines */}
        <View style={styles.fieldBorder} />
        
        {/* Center line */}
        <View style={[styles.centerLine, { top: FIELD_HEIGHT / 2 - 1 }]} />
        
        {/* Center circle */}
        <View style={[styles.centerCircle, { 
          top: FIELD_HEIGHT / 2 - 40,
          left: FIELD_WIDTH / 2 - 40 
        }]} />
        
        {/* Top penalty area */}
        <View style={[styles.penaltyArea, { top: 0 }]} />
        <View style={[styles.goalArea, { top: 0 }]} />
        
        {/* Bottom penalty area */}
        <View style={[styles.penaltyArea, { bottom: 0 }]} />
        <View style={[styles.goalArea, { bottom: 0 }]} />

        {/* Players */}
        {renderPositionRow('goalkeeper')}
        {renderPositionRow('defender')}
        {renderPositionRow('midfielder')}
        {renderPositionRow('forward')}

        {/* Module label */}
        <View style={styles.moduleLabel}>
          <Text style={styles.moduleLabelText}>{module}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  field: {
    backgroundColor: '#2D8A2E',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  fieldBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
  },
  centerLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  centerCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  penaltyArea: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: '18%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopWidth: 0,
  },
  goalArea: {
    position: 'absolute',
    left: '35%',
    right: '35%',
    height: '8%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopWidth: 0,
  },
  playerContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 44,
  },
  numberBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#FFD700',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  numberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  playerName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  moduleLabel: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  moduleLabelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FieldView;
