import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  I18nManager,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

export const LanguageSelectionScreen: React.FC = () => {
  const { languages, changeLanguage, completeLanguageSelection } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
  };

  const handleContinue = async () => {
    if (!selectedLanguage) return;
    
    setIsLoading(true);
    try {
      await changeLanguage(selectedLanguage);
      completeLanguageSelection();
    } catch (error) {
      console.error('Error setting language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>Rival Hub</Text>
          <Text style={styles.title}>Choose Your Language</Text>
          <Text style={styles.subtitle}>Seleziona la tua lingua preferita</Text>
        </View>

        <ScrollView 
          style={styles.languageList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.languageListContent}
        >
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageButton,
                selectedLanguage === language.code && styles.languageButtonSelected,
              ]}
              onPress={() => handleSelectLanguage(language.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{language.flag}</Text>
              <Text
                style={[
                  styles.languageName,
                  selectedLanguage === language.code && styles.languageNameSelected,
                  language.rtl && styles.rtlText,
                ]}
              >
                {language.nativeName}
              </Text>
              {selectedLanguage === language.code && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedLanguage && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedLanguage || isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? '...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  languageList: {
    flex: 1,
  },
  languageListContent: {
    paddingBottom: 20,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#000',
  },
  flag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  languageNameSelected: {
    color: '#000',
  },
  rtlText: {
    textAlign: 'right',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 24,
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#CCC',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
