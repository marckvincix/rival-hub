import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { languages, currentLanguage, changeLanguage } = useLanguage();
  const [isChanging, setIsChanging] = useState(false);

  const handleSelectLanguage = async (code: string) => {
    if (code === currentLanguage) {
      onClose();
      return;
    }
    
    setIsChanging(true);
    try {
      await changeLanguage(code);
      onClose();
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.changeLanguage')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                currentLanguage === language.code && styles.languageItemSelected,
              ]}
              onPress={() => handleSelectLanguage(language.code)}
              disabled={isChanging}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{language.flag}</Text>
              <View style={styles.languageInfo}>
                <Text
                  style={[
                    styles.languageName,
                    currentLanguage === language.code && styles.languageNameSelected,
                  ]}
                >
                  {language.nativeName}
                </Text>
                <Text style={styles.languageEnglishName}>{language.name}</Text>
              </View>
              {currentLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={24} color="#000" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#000',
  },
  flag: {
    fontSize: 24,
    marginRight: 14,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  languageNameSelected: {
    color: '#000',
  },
  languageEnglishName: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
});
