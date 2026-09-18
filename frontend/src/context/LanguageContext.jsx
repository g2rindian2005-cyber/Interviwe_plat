import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', voiceLocale: 'en-IN' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳', voiceLocale: 'hi-IN' },
  { code: 'mr', label: 'मराठी', flag: '🚩', voiceLocale: 'mr-IN' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('devopsai_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('devopsai_lang', language);
  }, [language]);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, current, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
