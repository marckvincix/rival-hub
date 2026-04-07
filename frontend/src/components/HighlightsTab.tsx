import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import api from '../utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 48) / 3;

interface Highlight {
  id: string;
  tournament_id: string;
  round: string;
  file_type: 'photo' | 'video';
  file_url: string;
  file_name: string;
  file_size: number;
  duration_seconds?: number;
  created_at: string;
}

interface RoundSummary {
  round: string;
  photo_count: number;
  video_count: number;
  highlights: Highlight[];
}

interface HighlightsTabProps {
  tournamentId: string;
  isOrganizer: boolean;
}

export function HighlightsTab({ tournamentId, isOrganizer }: HighlightsTabProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [highlights, setHighlights] = useState<RoundSummary[]>([]);
  
  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Highlight | null>(null);
  
  // Video player state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Highlight | null>(null);

  // Check if code is stored locally
  useEffect(() => {
    checkStoredCode();
  }, [tournamentId]);

  const checkStoredCode = async () => {
    try {
      const storedCode = await AsyncStorage.getItem(`highlights_code_${tournamentId}`);
      if (storedCode || isOrganizer) {
        setIsUnlocked(true);
        loadHighlights(storedCode || undefined);
      } else {
        setLoading(false);
        setShowCodeModal(true);
      }
    } catch (error) {
      setLoading(false);
      setShowCodeModal(true);
    }
  };

  const loadHighlights = async (accessCode?: string) => {
    try {
      setLoading(true);
      const params = accessCode ? `?code=${accessCode}` : '';
      const response = await api.get(`/api/tournaments/${tournamentId}/highlights${params}`);
      setHighlights(response.data || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setIsUnlocked(false);
        setShowCodeModal(true);
        await AsyncStorage.removeItem(`highlights_code_${tournamentId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setCodeError('Inserisci il codice');
      return;
    }

    setVerifying(true);
    setCodeError('');

    try {
      await api.post(`/api/tournaments/${tournamentId}/highlights/verify-code`, {
        code: code.trim().toUpperCase()
      });
      
      // Store code locally
      await AsyncStorage.setItem(`highlights_code_${tournamentId}`, code.trim().toUpperCase());
      
      setIsUnlocked(true);
      setShowCodeModal(false);
      loadHighlights(code.trim().toUpperCase());
    } catch (error: any) {
      setCodeError(error.response?.data?.detail || 'Codice non valido. Riprova.');
    } finally {
      setVerifying(false);
    }
  };

  const openPhoto = (highlight: Highlight) => {
    setSelectedImage(highlight);
    setShowLightbox(true);
  };

  const openVideo = (highlight: Highlight) => {
    setSelectedVideo(highlight);
    setShowVideoPlayer(true);
  };

  const getFileUrl = (highlight: Highlight) => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}${highlight.file_url}`;
  };

  // Locked view - show code input modal
  if (!isUnlocked && !isOrganizer) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color="#CCC" />
          <Text style={styles.lockedTitle}>Contenuto Protetto</Text>
          <Text style={styles.lockedDescription}>
            Inserisci il codice per accedere agli Highlights
          </Text>
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={() => setShowCodeModal(true)}
          >
            <Ionicons name="key" size={20} color="#FFF" />
            <Text style={styles.unlockButtonText}>Inserisci Codice</Text>
          </TouchableOpacity>
        </View>

        {/* Code Input Modal */}
        <Modal
          visible={showCodeModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowCodeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Accesso Highlights</Text>
              <Text style={styles.modalDescription}>
                Inserisci il codice fornito dall'organizzatore
              </Text>
              
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  setCodeError('');
                }}
                placeholder="Es. XK9F2A"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
              />
              
              {codeError ? (
                <Text style={styles.errorText}>{codeError}</Text>
              ) : null}
              
              <TouchableOpacity
                style={[styles.accessButton, verifying && styles.accessButtonDisabled]}
                onPress={handleVerifyCode}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.accessButtonText}>Accedi</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCodeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  if (highlights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>Nessun Highlight</Text>
        <Text style={styles.emptyDescription}>
          Non ci sono ancora foto o video per questo torneo
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {highlights.map((roundData) => (
        <View key={roundData.round} style={styles.roundSection}>
          <View style={styles.roundHeader}>
            <Text style={styles.roundTitle}>{roundData.round}</Text>
            <Text style={styles.roundStats}>
              {roundData.photo_count} foto · {roundData.video_count} video
            </Text>
          </View>

          {/* Photos Grid */}
          {roundData.highlights.filter(h => h.file_type === 'photo').length > 0 && (
            <View style={styles.photosGrid}>
              {roundData.highlights
                .filter(h => h.file_type === 'photo')
                .map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.photoThumbnail}
                    onPress={() => openPhoto(photo)}
                  >
                    <Image
                      source={{ uri: getFileUrl(photo) }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Videos List */}
          {roundData.highlights.filter(h => h.file_type === 'video').length > 0 && (
            <View style={styles.videosList}>
              {roundData.highlights
                .filter(h => h.file_type === 'video')
                .map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoItem}
                    onPress={() => openVideo(video)}
                  >
                    <View style={styles.videoThumbnail}>
                      <Ionicons name="play-circle" size={40} color="#FFF" />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoName} numberOfLines={1}>
                        {video.file_name}
                      </Text>
                      {video.duration_seconds && (
                        <Text style={styles.videoDuration}>
                          {Math.floor(video.duration_seconds)}s
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>
      ))}

      {/* Image Lightbox */}
      <Modal
        visible={showLightbox}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLightbox(false)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setShowLightbox(false)}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image
              source={{ uri: getFileUrl(selectedImage) }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoPlayer}
        animationType="fade"
        transparent
        onRequestClose={() => setShowVideoPlayer(false)}
      >
        <View style={styles.videoPlayerContainer}>
          <TouchableOpacity
            style={styles.videoPlayerClose}
            onPress={() => setShowVideoPlayer(false)}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          
          {selectedVideo && (
            <Video
              source={{ uri: getFileUrl(selectedVideo) }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  lockedDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  unlockButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#000',
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  accessButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  accessButtonDisabled: {
    backgroundColor: '#999',
  },
  accessButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  roundSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  roundStats: {
    fontSize: 12,
    color: '#666',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  photoThumbnail: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  videosList: {
    gap: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  videoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  videoDuration: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
});
