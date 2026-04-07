import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import api from '../utils/api';

interface HighlightsUploadModalProps {
  visible: boolean;
  onClose: () => void;
  tournamentId: string;
  rounds: string[];  // Available rounds (Giornata 1, Giornata 2, etc.)
}

interface RoundsWithContent {
  [key: string]: {
    photo_count: number;
    video_count: number;
  };
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
  const [selectedRound, setSelectedRound] = useState('');
  const [showRoundDropdown, setShowRoundDropdown] = useState(false);
  const [roundsWithContent, setRoundsWithContent] = useState<RoundsWithContent>({});
  const [highlightsCode, setHighlightsCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCodeSection, setShowCodeSection] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, tournamentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load highlights code
      const codeRes = await api.get(`/api/tournaments/${tournamentId}/highlights-code`);
      setHighlightsCode(codeRes.data.code || '');

      // Load rounds with content
      const roundsRes = await api.get(`/api/tournaments/${tournamentId}/highlights/rounds-with-content`);
      setRoundsWithContent(roundsRes.data || {});
    } catch (error) {
      console.error('Error loading highlights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    Alert.alert(
      'Rigenera Codice',
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
              Alert.alert('Successo', 'Codice rigenerato con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile rigenerare il codice');
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
      Alert.alert('Errore', 'Seleziona prima una giornata');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Errore', 'Devi accettare i Termini e Condizioni');
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
      Alert.alert('Errore', 'Seleziona prima una giornata');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Errore', 'Devi accettare i Termini e Condizioni');
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
    setUploadProgress(compress ? 'Compressione in corso...' : 'Caricamento in corso...');

    try {
      // Check file size
      const fileSizeMB = (asset.fileSize || 0) / (1024 * 1024);
      const maxSize = fileType === 'photo' ? MAX_PHOTO_SIZE_MB : MAX_VIDEO_SIZE_MB;

      if (fileSizeMB > maxSize && !compress) {
        setUploading(false);
        Alert.alert(
          'File troppo grande',
          `Il file supera ${maxSize}MB. Vuoi comprimerlo?`,
          [
            { text: 'Scegli altro', style: 'cancel' },
            {
              text: 'Comprimi',
              onPress: () => uploadFile(asset, fileType, true),
            },
          ]
        );
        return;
      }

      // Prepare form data
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
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.needs_compression) {
        setUploading(false);
        Alert.alert(
          'File troppo grande',
          `Il file supera ${response.data.max_size_mb}MB. Vuoi comprimerlo?`,
          [
            { text: 'Scegli altro', style: 'cancel' },
            {
              text: 'Comprimi',
              onPress: () => uploadFile(asset, fileType, true),
            },
          ]
        );
        return;
      }

      Alert.alert('Successo', 'Contenuto caricato con successo!');
      loadData(); // Refresh counts
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Errore durante il caricamento';
      Alert.alert('Errore', message);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carica Highlights</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Code Section */}
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

          {/* Round Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seleziona Giornata</Text>
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

          {/* Current Counts */}
          {selectedRound && (
            <View style={styles.countsRow}>
              <View style={styles.countItem}>
                <Ionicons name="image" size={16} color="#666" />
                <Text style={styles.countText}>
                  {counts.photos}/{MAX_PHOTOS} foto
                </Text>
              </View>
              <View style={styles.countItem}>
                <Ionicons name="videocam" size={16} color="#666" />
                <Text style={styles.countText}>
                  {counts.videos}/{MAX_VIDEOS} video
                </Text>
              </View>
            </View>
          )}

          {/* Upload Buttons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Carica Contenuti</Text>

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
                  {counts.photos >= MAX_PHOTOS ? 'Limite foto raggiunto' : 'Carica Foto'}
                </Text>
                <Text style={styles.uploadButtonSubtitle}>JPG, PNG • Max 10MB</Text>
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
                  {counts.videos >= MAX_VIDEOS ? 'Limite video raggiunto' : 'Carica Video'}
                </Text>
                <Text style={styles.uploadButtonSubtitle}>MP4, MOV • Max 30 sec • Max 100MB</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={styles.termsText}>
              Caricando questi contenuti accetto i{' '}
              <Text style={styles.termsLink}>Termini e Condizioni</Text> di Rival Hub.
            </Text>
          </TouchableOpacity>

          {/* Upload Progress */}
          {uploading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
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
    marginBottom: 20,
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
    marginTop: 8,
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
    marginTop: 16,
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
  },
});
