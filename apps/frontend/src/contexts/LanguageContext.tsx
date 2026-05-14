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
    const [language, setLanguageState] = useState<Language>('vi');

    // Product language is locked to Vietnamese. Any legacy EN toggle is forced back.
    useEffect(() => {
        const forceVietnamese = () => {
            setLanguageState('vi');
            localStorage.setItem('i18nextLng', 'vi');
            if (!i18n.language?.startsWith('vi')) {
                i18n.changeLanguage('vi');
            }
        };

        forceVietnamese();

        i18n.on('languageChanged', forceVietnamese);

        return () => {
            i18n.off('languageChanged', forceVietnamese);
        };
    }, [i18n]);

    const setLanguage = () => {
        setLanguageState('vi');
        i18n.changeLanguage('vi');
        localStorage.setItem('i18nextLng', 'vi');
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
