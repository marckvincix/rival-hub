import React, { useState, useEffect, useCallback } from 'react';
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

  const checkFavorite = useCallback(async () => {
    if (!isAuthenticated || !referenceId) {
      setChecking(false);
      return;
    }
    
    try {
      console.log(`Checking favorite: ${type}/${referenceId}`);
      const result = await favoritesApi.checkFavorite(type, referenceId);
      console.log(`Check result:`, result);
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.log('Error checking favorite:', error);
      setIsFavorite(false);
    } finally {
      setChecking(false);
    }
  }, [type, referenceId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && referenceId) {
      checkFavorite();
    } else {
      setChecking(false);
      setIsFavorite(false);
    }
  }, [referenceId, isAuthenticated, checkFavorite]);

  const toggleFavorite = async () => {
    if (!isAuthenticated || loading) {
      console.log('Toggle blocked: not authenticated or loading');
      return;
    }

    const previousState = isFavorite;
    
    // OPTIMISTIC UPDATE - cambia subito lo stato visivo
    setIsFavorite(!previousState);
    setLoading(true);
    
    console.log(`Toggling favorite: ${type}/${referenceId} from ${previousState} to ${!previousState}`);

    try {
      if (previousState) {
        // Era nei preferiti, rimuovi
        await favoritesApi.removeFavorite(type, referenceId);
        console.log('Removed from favorites successfully');
      } else {
        // Non era nei preferiti, aggiungi
        await favoritesApi.addFavorite(type, referenceId);
        console.log('Added to favorites successfully');
      }
      onToggle?.(!previousState);
    } catch (error: any) {
      // Se fallisce, ripristina lo stato precedente
      console.log('Error toggling favorite:', error);
      console.log('Error details:', error.response?.data);
      setIsFavorite(previousState);
    } finally {
      setLoading(false);
    }
  };

  // Non mostrare nulla se non autenticato
  if (!isAuthenticated) {
    return null;
  }

  // Mostra loading durante il check iniziale
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
      activeOpacity={0.6}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? activeColor : color}
      />
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
