import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  position?: string;
}

interface VolleyballCourtViewProps {
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
  module?: string;
}

export function VolleyballCourtView({ 
  homePlayers, 
  awayPlayers,
  homeTeamName,
  awayTeamName,
  module = '4-2'
}: VolleyballCourtViewProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const screenWidth = Dimensions.get('window').width;
  const courtWidth = Math.min(screenWidth - 48, 320);
  const courtHeight = courtWidth * 1.4;

  // Position players in 6 zones (3 attack + 3 defense per team)
  const getPlayerPositions = (players: Player[], isHome: boolean) => {
    const positions = [];
    const zoneWidth = courtWidth / 3;
    const zoneHeight = courtHeight / 4;
    
    // Home team (bottom half) or Away team (top half)
    const baseY = isHome ? courtHeight / 2 : 0;
    
    // Zone positions for volleyball (Zone 1-6)
    // Zone 4, 3, 2 (front row - attack)
    // Zone 5, 6, 1 (back row - defense)
    const zones = isHome ? [
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 1.5 }, // Zone 1 (back right)
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 0.5 }, // Zone 2 (front right)
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 0.5 }, // Zone 3 (front center)
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 0.5 }, // Zone 4 (front left)
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 1.5 }, // Zone 5 (back left)
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 1.5 }, // Zone 6 (back center)
    ] : [
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 0.5 }, // Zone 1 mirrored
      { x: zoneWidth * 0.5, y: baseY + zoneHeight * 1.5 }, // Zone 2 mirrored
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 1.5 }, // Zone 3 mirrored
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 1.5 }, // Zone 4 mirrored
      { x: zoneWidth * 2.5, y: baseY + zoneHeight * 0.5 }, // Zone 5 mirrored
      { x: zoneWidth * 1.5, y: baseY + zoneHeight * 0.5 }, // Zone 6 mirrored
    ];

    for (let i = 0; i < Math.min(players.length, 6); i++) {
      positions.push({
        player: players[i],
        x: zones[i].x,
        y: zones[i].y,
      });
    }
    
    return positions;
  };

  const homePositions = getPlayerPositions(homePlayers, true);
  const awayPositions = getPlayerPositions(awayPlayers, false);

  return (
    <View style={styles.container}>
      {/* Away team label */}
      {awayTeamName && (
        <View style={styles.teamLabel}>
          <Text style={styles.teamLabelText}>{awayTeamName}</Text>
        </View>
      )}

      {/* Court Container */}
      <View style={[styles.courtContainer, { width: courtWidth, height: courtHeight }]}>
        {/* Green background */}
        <View style={styles.greenBackground} />
        
        {/* Orange court */}
        <View style={styles.orangeCourt}>
          {/* Horizontal lines dividing the court */}
          <View style={[styles.courtLine, { top: '25%' }]} />
          <View style={[styles.courtLine, { top: '50%' }]} />
          <View style={[styles.courtLine, { top: '75%' }]} />
        </View>
        
        {/* Net (center line) */}
        <View style={styles.netLine} />
        
        {/* Attack lines (3m) - dashed */}
        <View style={[styles.attackLine, styles.attackLineTop]} />
        <View style={[styles.attackLine, styles.attackLineBottom]} />
        
        {/* Away players (top half) */}
        {awayPositions.map((pos, idx) => (
          <View
            key={`away-${idx}`}
            style={[
              styles.playerBadge,
              styles.awayPlayerBadge,
              { left: pos.x - 22, top: pos.y - 22 }
            ]}
          >
            <Text style={styles.playerInitials}>{getInitials(pos.player?.full_name)}</Text>
            {pos.player?.number && (
              <View style={styles.playerNumberBadge}>
                <Text style={styles.playerNumberText}>{pos.player.number}</Text>
              </View>
            )}
          </View>
        ))}
        
        {/* Home players (bottom half) */}
        {homePositions.map((pos, idx) => (
          <View
            key={`home-${idx}`}
            style={[
              styles.playerBadge,
              styles.homePlayerBadge,
              { left: pos.x - 22, top: pos.y - 22 }
            ]}
          >
            <Text style={styles.playerInitials}>{getInitials(pos.player?.full_name)}</Text>
            {pos.player?.number && (
              <View style={styles.playerNumberBadge}>
                <Text style={styles.playerNumberText}>{pos.player.number}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Home team label */}
      <View style={styles.teamLabel}>
        <Text style={styles.teamLabelText}>{homeTeamName || 'Casa'}</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#000' }]} />
          <Text style={styles.legendText}>Casa</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#555' }]} />
          <Text style={styles.legendText}>Ospite</Text>
        </View>
      </View>

      {/* Module indicator */}
      <View style={styles.moduleBadge}>
        <Text style={styles.moduleText}>🏐 Modulo {module}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  courtContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  greenBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#228B22', // Forest green
  },
  orangeCourt: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    backgroundColor: '#E8813A', // Orange
    borderWidth: 3,
    borderColor: '#FFF',
  },
  courtLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFF',
  },
  netLine: {
    position: 'absolute',
    top: '50%',
    left: '5%',
    right: '5%',
    height: 4,
    backgroundColor: '#FFF',
    marginTop: -2,
  },
  attackLine: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  attackLineTop: {
    top: '35%',
  },
  attackLineBottom: {
    top: '65%',
  },
  teamLabel: {
    paddingVertical: 8,
  },
  teamLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  playerBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  homePlayerBadge: {
    backgroundColor: '#000',
  },
  awayPlayerBadge: {
    backgroundColor: '#555',
  },
  playerInitials: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  playerNumberBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  moduleBadge: {
    marginTop: 12,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moduleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

export default VolleyballCourtView;
