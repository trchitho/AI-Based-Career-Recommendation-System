import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    const [language, setLanguageState] = useState<Language>('en'); // Default to English

    // Load language from localStorage on mount
    useEffect(() => {
        const savedLanguage = localStorage.getItem('careerbridge_language') as Language;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'vi')) {
            setLanguageState(savedLanguage);
        }
    }, []);

    // Save language to localStorage when changed
    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('careerbridge_language', lang);
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