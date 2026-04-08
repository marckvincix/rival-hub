import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { TermsModal } from './TermsModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - 64) / 3;

interface HighlightsUploadModalProps {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  rounds: string[];
}

interface RoundsWithContent {
  [key: string]: {
    photo_count: number;
    video_count: number;
  };
}

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

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 10;
const MAX_PHOTO_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;
const MAX_VIDEO_DURATION = 30;

export function HighlightsUploadModal({
  visible,
  onClose,
  tournamentId,
  rounds,
}: HighlightsUploadModalProps) {
  const { t } = useTranslation();
  const [selectedRound, setSelectedRound] = useState('');
  const [showRoundDropdown, setShowRoundDropdown] = useState(false);
  const [roundsWithContent, setRoundsWithContent] = useState<RoundsWithContent>({});
  const [highlightsCode, setHighlightsCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCodeSection, setShowCodeSection] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [highlights, setHighlights] = useState<RoundSummary[]>([]);
  
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Highlight | null>(null);
  
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Highlight | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<Video>(null);
  
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, tournamentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const codeRes = await api.get(`/api/tournaments/${tournamentId}/highlights-code`);
      setHighlightsCode(codeRes.data.code || '');

      const roundsRes = await api.get(`/api/tournaments/${tournamentId}/highlights/rounds-with-content`);
      setRoundsWithContent(roundsRes.data || {});
      
      const highlightsRes = await api.get(`/api/tournaments/${tournamentId}/highlights`);
      setHighlights(highlightsRes.data || []);
    } catch (error) {
      console.error('Error loading highlights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    Alert.alert(
      t('highlights.regenerateCode'),
      'Rigenerando il codice, chi aveva il vecchio codice non potrà più accedere. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rigenera',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post(`/api/tournaments/${tournamentId}/highlights-code/regenerate`);
              setHighlightsCode(res.data.code);
              Alert.alert(t('common.success'), 'Codice rigenerato con successo');
            } catch (error) {
              Alert.alert(t('common.error'), 'Impossibile rigenerare il codice');
            }
          },
        },
      ]
    );
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(highlightsCode);
    Alert.alert('Copiato!', 'Codice copiato negli appunti');
  };

  const selectRound = (round: string) => {
    const content = roundsWithContent[round];
    if (content && (content.photo_count > 0 || content.video_count > 0)) {
      Alert.alert(
        'Attenzione',
        'Hai già caricato contenuti per questa giornata. Vuoi aggiungerne altri?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Continua', onPress: () => setSelectedRound(round) },
        ]
      );
    } else {
      setSelectedRound(round);
    }
    setShowRoundDropdown(false);
  };

  const checkLimits = (type: 'photo' | 'video'): boolean => {
    const content = roundsWithContent[selectedRound];
    if (!content) return true;

    if (type === 'photo' && content.photo_count >= MAX_PHOTOS) {
      Alert.alert('Limite raggiunto', `Hai già caricato ${MAX_PHOTOS} foto per questa giornata`);
      return false;
    }
    if (type === 'video' && content.video_count >= MAX_VIDEOS) {
      Alert.alert('Limite raggiunto', `Hai già caricato ${MAX_VIDEOS} video per questa giornata`);
      return false;
    }
    return true;
  };

  const handlePickPhoto = async () => {
    if (!selectedRound) {
      Alert.alert(t('common.error'), t('highlights.selectRoundFirst'));
      return;
    }
    if (!termsAccepted) {
      Alert.alert(t('common.error'), t('highlights.termsRequired'));
      return;
    }
    if (!checkLimits('photo')) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - (roundsWithContent[selectedRound]?.photo_count || 0),
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        await uploadFile(asset, 'photo');
      }
    }
  };

  const handlePickVideo = async () => {
    if (!selectedRound) {
      Alert.alert(t('common.error'), t('highlights.selectRoundFirst'));
      return;
    }
    if (!termsAccepted) {
      Alert.alert(t('common.error'), t('highlights.termsRequired'));
      return;
    }
    if (!checkLimits('video')) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });

    if (!result.canceled && result.assets.length > 0) {
      await uploadFile(result.assets[0], 'video');
    }
  };

  const uploadFile = async (
    asset: ImagePicker.ImagePickerAsset,
    fileType: 'photo' | 'video',
    compress: boolean = false
  ) => {
    setUploading(true);
    setUploadProgress(compress ? t('highlights.compressionInProgress') : t('highlights.uploadInProgress'));

    try {
      const fileSizeMB = (asset.fileSize || 0) / (1024 * 1024);
      const maxSize = fileType === 'photo' ? MAX_PHOTO_SIZE_MB : MAX_VIDEO_SIZE_MB;

      if (fileSizeMB > maxSize && !compress) {
        setUploading(false);
        Alert.alert(
          t('highlights.fileTooLarge'),
          `Il file supera ${maxSize}MB. Vuoi comprimerlo?`,
          [
            { text: 'Scegli altro', style: 'cancel' },
            { text: 'Comprimi', onPress: () => uploadFile(asset, fileType, true) },
          ]
        );
        return;
      }

      const formData = new FormData();
      formData.append('round', selectedRound);
      formData.append('file_type', fileType);
      formData.append('compress', compress ? 'true' : 'false');
      formData.append('terms_accepted', 'true');

      const filename = asset.fileName || `${fileType}_${Date.now()}.${fileType === 'photo' ? 'jpg' : 'mp4'}`;
      
      formData.append('file', {
        uri: asset.uri,
        type: fileType === 'photo' ? 'image/jpeg' : 'video/mp4',
        name: filename,
      } as any);

      if (compress) {
        setUploadProgress('Compressione in corso... 50%');
        await new Promise(resolve => setTimeout(resolve, 500));
        setUploadProgress('Compressione completata! Caricamento...');
      }

      const response = await api.post(
        `/api/tournaments/${tournamentId}/highlights`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.needs_compression) {
        setUploading(false);
        Alert.alert(
          t('highlights.fileTooLarge'),
          `Il file supera ${response.data.max_size_mb}MB. Vuoi comprimerlo?`,
          [
            { text: 'Scegli altro', style: 'cancel' },
            { text: 'Comprimi', onPress: () => uploadFile(asset, fileType, true) },
          ]
        );
        return;
      }

      Alert.alert(t('common.success'), 'Contenuto caricato con successo!');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || t('highlights.uploadError');
      Alert.alert(t('common.error'), message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const getRoundLabel = (round: string) => {
    const content = roundsWithContent[round];
    if (content && (content.photo_count > 0 || content.video_count > 0)) {
      return `${round} ✅`;
    }
    return round;
  };

  const getCurrentCounts = () => {
    const content = roundsWithContent[selectedRound];
    return {
      photos: content?.photo_count || 0,
      videos: content?.video_count || 0,
    };
  };
  
  const getFileUrl = (highlight: Highlight) => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}${highlight.file_url}`;
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

  const formatDuration = (seconds: number | undefined | null): string => {
    if (seconds == null || seconds <= 0) return '';
    return `${Math.floor(seconds)}s`;
  };

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const counts = getCurrentCounts();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestisci Highlights</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.codeSection}
            onPress={() => setShowCodeSection(!showCodeSection)}
          >
            <View style={styles.codeSectionHeader}>
              <Ionicons name="key" size={20} color="#000" />
              <Text style={styles.codeSectionTitle}>Codice Accesso Highlights</Text>
              <Ionicons
                name={showCodeSection ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </View>
          </TouchableOpacity>

          {showCodeSection && (
            <View style={styles.codeContent}>
              <Text style={styles.codeLabel}>Codice attuale:</Text>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeText}>{highlightsCode}</Text>
              </View>
              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
                  <Ionicons name="copy" size={18} color="#FFF" />
                  <Text style={styles.codeButtonText}>Copia codice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.codeButton, styles.codeButtonOutline]}
                  onPress={handleRegenerateCode}
                >
                  <Ionicons name="refresh" size={18} color="#000" />
                  <Text style={styles.codeButtonTextOutline}>Rigenera</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeHint}>
                Condividi questo codice con chi vuoi dare accesso agli Highlights
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Carica Nuovi Contenuti</Text>
            
            <Text style={styles.inputLabel}>Seleziona Giornata</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowRoundDropdown(!showRoundDropdown)}
            >
              <Text style={selectedRound ? styles.dropdownText : styles.dropdownPlaceholder}>
                {selectedRound ? getRoundLabel(selectedRound) : 'Seleziona una giornata'}
              </Text>
              <Ionicons
                name={showRoundDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showRoundDropdown && (
              <View style={styles.dropdownList}>
                {rounds.map((round) => (
                  <TouchableOpacity
                    key={round}
                    style={[
                      styles.dropdownItem,
                      selectedRound === round && styles.dropdownItemSelected,
                    ]}
                    onPress={() => selectRound(round)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedRound === round && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {getRoundLabel(round)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {selectedRound ? (
            <View style={styles.countsRow}>
              <View style={styles.countItem}>
                <Ionicons name="image" size={16} color="#666" />
                <Text style={styles.countText}>{counts.photos}/{MAX_PHOTOS} foto</Text>
              </View>
              <View style={styles.countItem}>
                <Ionicons name="videocam" size={16} color="#666" />
                <Text style={styles.countText}>{counts.videos}/{MAX_VIDEOS} video</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                (!selectedRound || counts.photos >= MAX_PHOTOS) && styles.uploadButtonDisabled,
              ]}
              onPress={handlePickPhoto}
              disabled={!selectedRound || counts.photos >= MAX_PHOTOS || uploading}
            >
              <Ionicons name="image" size={24} color={counts.photos >= MAX_PHOTOS ? '#999' : '#000'} />
              <View style={styles.uploadButtonContent}>
                <Text style={[styles.uploadButtonTitle, counts.photos >= MAX_PHOTOS && styles.uploadButtonTitleDisabled]}>
                  {counts.photos >= MAX_PHOTOS ? 'Limite foto raggiunto' : t('highlights.uploadPhoto')}
                </Text>
                <Text style={styles.uploadButtonSubtitle}>JPG, PNG · Max 10MB</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                (!selectedRound || counts.videos >= MAX_VIDEOS) && styles.uploadButtonDisabled,
              ]}
              onPress={handlePickVideo}
              disabled={!selectedRound || counts.videos >= MAX_VIDEOS || uploading}
            >
              <Ionicons name="videocam" size={24} color={counts.videos >= MAX_VIDEOS ? '#999' : '#000'} />
              <View style={styles.uploadButtonContent}>
                <Text style={[styles.uploadButtonTitle, counts.videos >= MAX_VIDEOS && styles.uploadButtonTitleDisabled]}>
                  {counts.videos >= MAX_VIDEOS ? 'Limite video raggiunto' : t('highlights.uploadVideo')}
                </Text>
                <Text style={styles.uploadButtonSubtitle}>MP4, MOV · Max 30 sec · Max 100MB</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.termsRow}>
            <TouchableOpacity
              style={styles.checkboxTouchable}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              Caricando questi contenuti accetto i{' '}
              <Text style={styles.termsLinkClickable} onPress={() => setShowTermsModal(true)}>
                Termini e Condizioni
              </Text>{' '}
              di Rival Hub.
            </Text>
          </View>

          {uploading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          ) : null}
          
          {highlights.length > 0 ? (
            <View style={styles.existingSection}>
              <Text style={styles.sectionTitle}>Contenuti Caricati</Text>
              
              {highlights.map((roundData) => (
                <View key={roundData.round} style={styles.roundSection}>
                  <View style={styles.roundHeader}>
                    <Text style={styles.roundTitle}>{roundData.round}</Text>
                    <Text style={styles.roundStats}>
                      {roundData.photo_count} foto · {roundData.video_count} video
                    </Text>
                  </View>

                  {roundData.highlights.filter(h => h.file_type === 'photo').length > 0 ? (
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
                  ) : null}

                  {roundData.highlights.filter(h => h.file_type === 'video').length > 0 ? (
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
                              <Ionicons name="play-circle" size={32} color="#FFF" />
                            </View>
                            <View style={styles.videoInfo}>
                              <Text style={styles.videoName} numberOfLines={1}>{video.file_name}</Text>
                              {formatDuration(video.duration_seconds) ? (
                                <Text style={styles.videoDuration}>{formatDuration(video.duration_seconds)}</Text>
                              ) : null}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                          </TouchableOpacity>
                        ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
        
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.finishButton} onPress={onClose}>
            <Text style={styles.finishButtonText}>Fine caricamento</Text>
          </TouchableOpacity>
        </View>
        
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
            {selectedImage ? (
              <Image
                source={{ uri: getFileUrl(selectedImage) }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
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
            
            {videoLoading ? (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.videoLoadingText}>Caricamento video...</Text>
              </View>
            ) : null}
            
            {videoError ? (
              <View style={styles.videoErrorOverlay}>
                <Ionicons name="alert-circle" size={48} color="#FFF" />
                <Text style={styles.videoErrorText}>Errore durante il caricamento del video</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => {
                  setVideoLoading(true);
                  setVideoError(false);
                }}>
                  <Text style={styles.retryButtonText}>Riprova</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            
            {selectedVideo ? (
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
            ) : null}
          </View>
        </Modal>

        {/* Terms and Conditions Modal */}
        <TermsModal
          visible={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      </SafeAreaView>
    </Modal>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  codeSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  codeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeSectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  codeContent: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: -8,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  codeDisplay: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#000',
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  codeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  codeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  codeButtonOutline: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  codeButtonTextOutline: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  codeHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
  },
  dropdownText: {
    fontSize: 15,
    color: '#000',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    fontSize: 13,
    color: '#666',
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonContent: {
    flex: 1,
  },
  uploadButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  uploadButtonTitleDisabled: {
    color: '#999',
  },
  uploadButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#000',
    textDecorationLine: 'underline',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
  },
  existingSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  roundSection: {
    marginBottom: 20,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundTitle: {
    fontSize: 15,
    fontWeight: '600',
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
    width: 50,
    height: 50,
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
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  finishButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
  checkboxTouchable: {
    padding: 4,
  },
  termsLinkClickable: {
    color: '#000',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
