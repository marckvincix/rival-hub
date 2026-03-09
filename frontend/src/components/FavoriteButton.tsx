import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { favoritesApi } from '../utils/favoritesApi';

interface FavoriteButtonProps {
  type: 'tournament' | 'team';
  referenceId: string;
  size?: number;
  color?: string;
  activeColor?: string;
  isAuthenticated: boolean;
  onToggle?: (isFavorite: boolean) => void;
  style?: any;
}

export function FavoriteButton({
  type,
  referenceId,
  size = 24,
  color = '#666',
  activeColor = '#FFD700',
  isAuthenticated,
  onToggle,
  style,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      checkFavorite();
    } else {
      setChecking(false);
    }
  }, [referenceId, isAuthenticated]);

  const checkFavorite = async () => {
    try {
      const result = await favoritesApi.checkFavorite(type, referenceId);
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.log('Error checking favorite:', error);
    } finally {
      setChecking(false);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        await favoritesApi.removeFavorite(type, referenceId);
        setIsFavorite(false);
        onToggle?.(false);
      } else {
        await favoritesApi.addFavorite(type, referenceId);
        setIsFavorite(true);
        onToggle?.(true);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (checking) {
    return (
      <TouchableOpacity style={[styles.button, style]} disabled>
        <ActivityIndicator size="small" color={color} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={toggleFavorite}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={activeColor} />
      ) : (
        <Ionicons
          name={isFavorite ? 'star' : 'star-outline'}
          size={size}
          color={isFavorite ? activeColor : color}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
