
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Language = 'en' | 'vi';
type Translations = Record<string, any>;

interface LanguageContextType {
  language: Language;
  switchLanguage: () => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
        const storedLang = localStorage.getItem('language');
        if (storedLang === 'en' || storedLang === 'vi') {
            return storedLang;
        }
    }
    return 'en'; // Default to English
  });
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async (lang: Language) => {
      setIsLoading(true);
      try {
        const response = await fetch(`./locales/${lang}.json`);
        if (!response.ok) {
          throw new Error(`Could not load ${lang} translations`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error(error);
        setTranslations({}); // Clear translations on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations(language);
  }, [language]);

  const switchLanguage = () => {
    const newLang = language === 'en' ? 'vi' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    if (isLoading) return '...';
    
    const keys = key.split('.');
    let result: any = translations;
    for (const k of keys) {
        result = result ? result[k] : undefined;
        if (result === undefined) {
            return key; // Key not found, return key itself
        }
    }

    if (typeof result === 'string') {
      if (options) {
        Object.keys(options).forEach(optKey => {
          result = result.replace(new RegExp(`\\{${optKey}\\}`, 'g'), String(options[optKey]));
        });
      }
      return result;
    }
    
    return key; // Fallback if the resolved value is not a string
  }, [translations, isLoading]);


  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
