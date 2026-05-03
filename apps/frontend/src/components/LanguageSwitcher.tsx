import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const isVi = i18n.language === 'vi' || i18n.language?.startsWith('vi');

  const toggleLanguage = () => {
    const newLang = isVi ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      title={isVi ? 'Switch to English' : 'Chuyển sang tiếng Việt'}
      className="
        flex items-center gap-1.5
        px-2.5 py-1.5
        rounded-lg
        text-sm font-semibold
        border border-gray-200 dark:border-gray-700
        text-gray-700 dark:text-gray-200
        hover:bg-gray-100 dark:hover:bg-gray-700
        hover:border-indigo-400 dark:hover:border-indigo-600
        hover:text-indigo-900 dark:hover:text-indigo-400
        transition-all duration-150
        select-none
      "
    >
      {/* Flag emoji */}
      <span className="text-base leading-none">
        {isVi ? '🇻🇳' : '🇬🇧'}
      </span>
      {/* Current language label */}
      <span className="hidden sm:inline tracking-wide uppercase text-xs">
        {isVi ? 'VI' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
