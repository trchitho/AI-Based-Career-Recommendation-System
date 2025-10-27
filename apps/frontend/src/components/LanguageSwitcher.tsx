import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={i18n.language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
    >
      <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {i18n.language === 'en' ? 'VI' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
