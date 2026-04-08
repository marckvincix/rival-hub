import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';

// Import all locale files
import en from './locales/en.json';
import it from './locales/it.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';

export const LANGUAGE_STORAGE_KEY = '@rival_hub_language';
export const LANGUAGE_SELECTED_KEY = '@rival_hub_language_selected';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
];

const resources = {
  en: { translation: en },
  it: { translation: it },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
  pt: { translation: pt },
  ar: { translation: ar },
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    react: {
      useSuspense: false,
    },
  });

// Helper function to check if language was already selected
export const isLanguageSelected = async (): Promise<boolean> => {
  try {
    const selected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
    return selected === 'true';
  } catch (error) {
    console.error('Error checking language selection:', error);
    return false;
  }
};

// Helper function to get stored language
export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('Error getting stored language:', error);
    return null;
  }
};

// Helper function to save language
export const saveLanguage = async (languageCode: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'true');
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Helper function to change language with RTL support
export const changeLanguage = async (languageCode: string): Promise<void> => {
  const language = LANGUAGES.find(l => l.code === languageCode);
  
  if (!language) {
    console.error('Language not found:', languageCode);
    return;
  }

  // Change i18n language
  await i18n.changeLanguage(languageCode);
  
  // Save to storage
  await saveLanguage(languageCode);
  
  // Handle RTL
  const isRTL = language.rtl;
  
  if (Platform.OS !== 'web') {
    // Check if RTL state needs to change
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      
      // For native apps, RTL changes require an app restart
      // The user will need to restart the app for full RTL support
      console.log('RTL change applied. App restart may be required for full effect.');
    }
  }
};

// Initialize language from storage
export const initializeLanguage = async (): Promise<boolean> => {
  try {
    const isSelected = await isLanguageSelected();
    
    if (isSelected) {
      const storedLanguage = await getStoredLanguage();
      if (storedLanguage) {
        await i18n.changeLanguage(storedLanguage);
        
        // Apply RTL if needed
        const language = LANGUAGES.find(l => l.code === storedLanguage);
        if (language && Platform.OS !== 'web') {
          I18nManager.allowRTL(language.rtl);
          I18nManager.forceRTL(language.rtl);
        }
      }
      return true; // Language was already selected
    }
    
    return false; // Language not yet selected - show selection screen
  } catch (error) {
    console.error('Error initializing language:', error);
    return false;
  }
};

export default i18n;
