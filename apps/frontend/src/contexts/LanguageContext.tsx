import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'vi';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    isVietnamese: boolean;
    isEnglish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
    const { i18n } = useTranslation();
    const [language, setLanguageState] = useState<Language>('en'); // Default to English

    // Sync with i18next language changes
    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            const newLang = lng.startsWith('vi') ? 'vi' : 'en';
            setLanguageState(newLang);
        };

        // Set initial language from i18next
        handleLanguageChange(i18n.language);

        // Listen for i18next language changes
        i18n.on('languageChanged', handleLanguageChange);

        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    // Save language to localStorage when changed and sync with i18next
    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        i18n.changeLanguage(lang);
        localStorage.setItem('i18nextLng', lang);
    };

    const value: LanguageContextType = {
        language,
        setLanguage,
        isVietnamese: language === 'vi',
        isEnglish: language === 'en',
    };

    return (
        <LanguageContext.Provider value={value}>
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

// Language labels for UI
export const getLanguageLabel = (lang: Language): string => {
    switch (lang) {
        case 'en':
            return 'English';
        case 'vi':
            return 'Tiếng Việt';
        default:
            return 'English';
    }
};

// Language flags for UI
export const getLanguageFlag = (lang: Language): string => {
    switch (lang) {
        case 'en':
            return '🇺🇸';
        case 'vi':
            return '🇻🇳';
        default:
            return '🇺🇸';
    }
};