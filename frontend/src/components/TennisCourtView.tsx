import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, G } from 'react-native-svg';

interface Player {
  player_id?: string;
  full_name?: string;
  number?: number;
  photo?: string;
  position?: string;
}

interface TennisCourtViewProps {
  format: 'singles' | 'doubles';
  homePlayers: Player[];
  awayPlayers: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
}

export function TennisCourtView({ 
  format, 
  homePlayers, 
  awayPlayers,
  homeTeamName,
  awayTeamName 
}: TennisCourtViewProps) {
  const courtColor = '#4A7C59'; // Green tennis court
  const lineColor = '#FFFFFF';
  const lineWidth = 2;

  // Court dimensions (proportional)
  const courtWidth = 300;
  const courtHeight = 400;
  const margin = 10;
  
  // Singles court boundaries
  const singlesWidth = courtWidth - 40; // Narrower for singles
  const doublesWidth = courtWidth - 20; // Full width for doubles
  const activeWidth = format === 'singles' ? singlesWidth : doublesWidth;
  const sideOffset = (courtWidth - activeWidth) / 2;
  
  // Service box dimensions
  const serviceBoxHeight = (courtHeight - 20) / 4;
  const serviceBoxWidth = activeWidth / 2;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderPlayer = (player: Player | undefined, x: number, y: number, isHome: boolean) => {
    if (!player) return null;
    
    return (
      <G key={`${player.player_id}-${x}-${y}`}>
        <Circle
          cx={x}
          cy={y}
          r={20}
          fill={isHome ? '#000' : '#666'}
          stroke={lineColor}
          strokeWidth={2}
        />
        <Svg x={x - 15} y={y - 8} width={30} height={20}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: '#FFF',
              textAlign: 'center',
            }}
          >
            {getInitials(player.full_name)}
          </Text>
        </Svg>
      </G>
    );
  };

  // Position players based on format
  const getPlayerPositions = () => {
    const positions: { player: Player | undefined; x: number; y: number; isHome: boolean }[] = [];
    
    if (format === 'singles') {
      // 1 player per side
      if (homePlayers[0]) {
        positions.push({ player: homePlayers[0], x: courtWidth / 2, y: courtHeight - 60, isHome: true });
      }
      if (awayPlayers[0]) {
        positions.push({ player: awayPlayers[0], x: courtWidth / 2, y: 60, isHome: false });
      }
    } else {
      // Doubles: 2 players per side
      if (homePlayers[0]) {
        positions.push({ player: homePlayers[0], x: courtWidth / 3, y: courtHeight - 60, isHome: true });
      }
      if (homePlayers[1]) {
        positions.push({ player: homePlayers[1], x: (courtWidth / 3) * 2, y: courtHeight - 60, isHome: true });
      }
      if (awayPlayers[0]) {
        positions.push({ player: awayPlayers[0], x: courtWidth / 3, y: 60, isHome: false });
      }
      if (awayPlayers[1]) {
        positions.push({ player: awayPlayers[1], x: (courtWidth / 3) * 2, y: 60, isHome: false });
      }
    }
    
    return positions;
  };

  return (
    <View style={styles.container}>
      {/* Away team label */}
      <View style={styles.teamLabel}>
        <Text style={styles.teamLabelText}>{awayTeamName || 'Avversario'}</Text>
      </View>

      <Svg width={courtWidth} height={courtHeight} style={styles.court}>
        {/* Court background */}
        <Rect
          x={0}
          y={0}
          width={courtWidth}
          height={courtHeight}
          fill={courtColor}
        />

        {/* Outer boundary */}
        <Rect
          x={margin}
          y={margin}
          width={courtWidth - margin * 2}
          height={courtHeight - margin * 2}
          fill="none"
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Doubles sidelines (corridors) */}
        {format === 'doubles' && (
          <>
            {/* Left corridor */}
            <Line
              x1={sideOffset + 10}
              y1={margin}
              x2={sideOffset + 10}
              y2={courtHeight - margin}
              stroke={lineColor}
              strokeWidth={lineWidth}
              strokeOpacity={0.5}
            />
            {/* Right corridor */}
            <Line
              x1={courtWidth - sideOffset - 10}
              y1={margin}
              x2={courtWidth - sideOffset - 10}
              y2={courtHeight - margin}
              stroke={lineColor}
              strokeWidth={lineWidth}
              strokeOpacity={0.5}
            />
          </>
        )}

        {/* Singles sidelines */}
        <Line
          x1={sideOffset}
          y1={margin}
          x2={sideOffset}
          y2={courtHeight - margin}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Line
          x1={courtWidth - sideOffset}
          y1={margin}
          x2={courtWidth - sideOffset}
          y2={courtHeight - margin}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Net (center horizontal line) */}
        <Line
          x1={margin}
          y1={courtHeight / 2}
          x2={courtWidth - margin}
          y2={courtHeight / 2}
          stroke={lineColor}
          strokeWidth={lineWidth + 1}
        />

        {/* Service lines - Top half */}
        <Line
          x1={sideOffset}
          y1={margin + serviceBoxHeight}
          x2={courtWidth - sideOffset}
          y2={margin + serviceBoxHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Service lines - Bottom half */}
        <Line
          x1={sideOffset}
          y1={courtHeight - margin - serviceBoxHeight}
          x2={courtWidth - sideOffset}
          y2={courtHeight - margin - serviceBoxHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Center service line - Top */}
        <Line
          x1={courtWidth / 2}
          y1={margin + serviceBoxHeight}
          x2={courtWidth / 2}
          y2={courtHeight / 2}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Center service line - Bottom */}
        <Line
          x1={courtWidth / 2}
          y1={courtHeight / 2}
          x2={courtWidth / 2}
          y2={courtHeight - margin - serviceBoxHeight}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Center mark - Top */}
        <Line
          x1={courtWidth / 2}
          y1={margin}
          x2={courtWidth / 2}
          y2={margin + 10}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Center mark - Bottom */}
        <Line
          x1={courtWidth / 2}
          y1={courtHeight - margin - 10}
          x2={courtWidth / 2}
          y2={courtHeight - margin}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />

        {/* Players */}
        {getPlayerPositions().map((pos) => (
          <G key={`player-${pos.x}-${pos.y}`}>
            <Circle
              cx={pos.x}
              cy={pos.y}
              r={22}
              fill={pos.isHome ? '#000' : '#555'}
              stroke={lineColor}
              strokeWidth={2}
            />
          </G>
        ))}
      </Svg>

      {/* Player names overlay */}
      <View style={styles.playersOverlay}>
        {/* Away players */}
        <View style={styles.awayPlayersRow}>
          {awayPlayers.slice(0, format === 'singles' ? 1 : 2).map((player, idx) => (
            <View key={idx} style={styles.playerBadge}>
              <Text style={styles.playerInitials}>{getInitials(player?.full_name)}</Text>
            </View>
          ))}
        </View>
        
        {/* Home players */}
        <View style={styles.homePlayersRow}>
          {homePlayers.slice(0, format === 'singles' ? 1 : 2).map((player, idx) => (
            <View key={idx} style={[styles.playerBadge, styles.playerBadgeHome]}>
              <Text style={styles.playerInitials}>{getInitials(player?.full_name)}</Text>
            </View>
          ))}
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  court: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  teamLabel: {
    paddingVertical: 8,
  },
  teamLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  playersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 60,
    pointerEvents: 'none',
  },
  awayPlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 40,
  },
  homePlayersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 40,
  },
  playerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  playerBadgeHome: {
    backgroundColor: '#000',
  },
  playerInitials: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
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
});

export default TennisCourtView;
