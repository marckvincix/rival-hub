import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [highlights, setHighlights] = useState<RoundSummary[]>([]);
  const [checkedStorage, setCheckedStorage] = useState(false);
  
  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Highlight | null>(null);
  
  // Video player state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Highlight | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<Video>(null);

  // Storage key specific to each tournament
  const STORAGE_KEY = `highlights_unlocked_${tournamentId}`;

  // Check if already unlocked on mount
  useEffect(() => {
    checkStoredUnlock();
  }, [tournamentId]);

  const checkStoredUnlock = async () => {
    try {
      // Organizer always has access
      if (isOrganizer) {
        setIsUnlocked(true);
        loadHighlights();
        setCheckedStorage(true);
        return;
      }
      
      // Check if user has previously unlocked this tournament's highlights
      const unlocked = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (unlocked === 'true') {
        // User has previously unlocked - grant direct access
        setIsUnlocked(true);
        loadHighlights();
      } else {
        // User hasn't unlocked - show modal
        setLoading(false);
        setShowCodeModal(true);
      }
      setCheckedStorage(true);
    } catch (error) {
      console.error('Error checking stored unlock:', error);
      setLoading(false);
      setShowCodeModal(true);
      setCheckedStorage(true);
    }
  };

  const loadHighlights = async (accessCode?: string) => {
    try {
      setLoading(true);
      // Get stored code if not provided
      let codeToUse = accessCode;
      if (!codeToUse && !isOrganizer) {
        const isUnlockedStored = await AsyncStorage.getItem(STORAGE_KEY);
        const storedCode = await AsyncStorage.getItem(`highlights_code_${tournamentId}`);
        console.log('loadHighlights - isUnlockedStored:', isUnlockedStored, 'storedCode:', storedCode);
        codeToUse = isUnlockedStored === 'true' ? storedCode || undefined : undefined;
      }
      
      // Build URL with code if needed
      const url = codeToUse 
        ? `/api/tournaments/${tournamentId}/highlights?code=${codeToUse}`
        : `/api/tournaments/${tournamentId}/highlights`;
      
      console.log('loadHighlights - calling URL:', url);
      const response = await api.get(url);
      console.log('loadHighlights - response:', response.data?.length || 0, 'highlights');
      setHighlights(response.data || []);
    } catch (error: any) {
      console.error('loadHighlights Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        // Access revoked - clear unlock status and show modal
        setIsUnlocked(false);
        setShowCodeModal(true);
        await AsyncStorage.removeItem(STORAGE_KEY);
        await AsyncStorage.removeItem(`highlights_code_${tournamentId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setCodeError(t('highlights.enterCode'));
      return;
    }

    setVerifying(true);
    setCodeError('');

    try {
      await api.post(`/api/tournaments/${tournamentId}/highlights/verify-code`, {
        code: code.trim().toUpperCase()
      });
      
      // Store both unlock status AND the code itself for future API calls
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
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
    setVideoLoading(true);
    setVideoError(false);
    setShowVideoPlayer(true);
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
    setVideoLoading(true);
    setVideoError(false);
  };

  const getFileUrl = (highlight: Highlight) => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}${highlight.file_url}`;
  };

  const handleVideoPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setVideoLoading(false);
      setVideoError(false);
    }
  };

  const handleVideoError = (error: string) => {
    console.error('Video error:', error);
    setVideoLoading(false);
    setVideoError(true);
  };

  // Wait until we've checked storage before rendering
  if (!checkedStorage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

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
                    <View style={styles.videoThumbnailBox}>
                      <Ionicons name="play-circle" size={40} color="#FFF" />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoName} numberOfLines={1}>
                        {video.file_name}
                      </Text>
                      {video.duration_seconds != null && video.duration_seconds > 0 ? (
                        <Text style={styles.videoDuration}>
                          {Math.floor(video.duration_seconds)}s
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>
      ))}

      <Modal
        visible={showLightbox}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLightbox(false)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.closeButtonOverlay}
            onPress={() => setShowLightbox(false)}
          >
            <View style={styles.closeButtonCircle}>
              <Ionicons name="close" size={24} color="#FFF" />
            </View>
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

      <Modal
        visible={showVideoPlayer}
        animationType="fade"
        transparent
        onRequestClose={closeVideoPlayer}
      >
        <View style={styles.videoPlayerContainer}>
          <TouchableOpacity
            style={styles.closeButtonOverlay}
            onPress={closeVideoPlayer}
          >
            <View style={styles.closeButtonCircle}>
              <Ionicons name="close" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          {videoLoading && (
            <View style={styles.videoLoadingOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.videoLoadingText}>Caricamento video...</Text>
            </View>
          )}
          
          {videoError && (
            <View style={styles.videoErrorOverlay}>
              <Ionicons name="alert-circle" size={48} color="#FFF" />
              <Text style={styles.videoErrorText}>Errore durante il caricamento del video</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                setVideoLoading(true);
                setVideoError(false);
                // Force reload
                if (videoRef.current) {
                  videoRef.current.playAsync();
                }
              }}>
                <Text style={styles.retryButtonText}>Riprova</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {selectedVideo && (
            <Video
              ref={videoRef}
              source={{ uri: getFileUrl(selectedVideo) }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
              onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
              onError={(e) => handleVideoError(e)}
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
  videoThumbnailBox: {
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
  closeButtonOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
  },
  videoLoadingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  videoLoadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 14,
  },
  videoErrorOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    padding: 20,
  },
  videoErrorText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },
});
