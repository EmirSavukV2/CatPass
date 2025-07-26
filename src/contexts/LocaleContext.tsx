'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: string;
}

export function LocaleProvider({ children, initialLocale = 'tr' }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    // Redirect to new locale
    const path = window.location.pathname;
    const segments = path.split('/');
    
    // Remove current locale if it exists
    if (segments[1] === 'en' || segments[1] === 'tr') {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    
    window.location.href = segments.join('/');
  };

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'tr')) {
      setLocaleState(savedLocale);
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}
