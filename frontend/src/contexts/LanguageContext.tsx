import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import i18n, { 
  initializeLanguage, 
  changeLanguage as changeLanguageUtil, 
  isLanguageSelected,
  LANGUAGES 
} from '../i18n';

interface LanguageContextType {
  currentLanguage: string;
  isRTL: boolean;
  isLanguageReady: boolean;
  needsLanguageSelection: boolean;
  changeLanguage: (code: string) => Promise<void>;
  completeLanguageSelection: () => void;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const [isLanguageReady, setIsLanguageReady] = useState<boolean>(false);
  const [needsLanguageSelection, setNeedsLanguageSelection] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        const wasSelected = await initializeLanguage();
        
        console.log('[LanguageContext] Language initialized:', {
          wasSelected,
          currentLanguage: i18n.language,
        });
        
        if (wasSelected) {
          setCurrentLanguage(i18n.language);
          const lang = LANGUAGES.find(l => l.code === i18n.language);
          setIsRTL(lang?.rtl || false);
          setNeedsLanguageSelection(false);
        } else {
          setNeedsLanguageSelection(true);
        }
      } catch (error) {
        console.error('Error initializing language:', error);
        setNeedsLanguageSelection(true);
      } finally {
        setIsLanguageReady(true);
      }
    };

    init();
  }, []);

  const handleChangeLanguage = async (code: string) => {
    try {
      await changeLanguageUtil(code);
      setCurrentLanguage(code);
      const lang = LANGUAGES.find(l => l.code === code);
      setIsRTL(lang?.rtl || false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const completeLanguageSelection = () => {
    setNeedsLanguageSelection(false);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        isRTL,
        isLanguageReady,
        needsLanguageSelection,
        changeLanguage: handleChangeLanguage,
        completeLanguageSelection,
        languages: LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
