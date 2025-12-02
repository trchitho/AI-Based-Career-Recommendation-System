import { Link } from 'react-router-dom';
import { useAppSettings } from '../../contexts/AppSettingsContext';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string | null;
  className?: string;
}

const AppLogo = ({ size = 'md', showText = true, linkTo = '/home', className = '' }: AppLogoProps) => {
  const app = useAppSettings();

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
    md: {
      container: 'w-10 h-10',
      icon: 'w-6 h-6',
      text: 'text-lg',
    },
    lg: {
      container: 'w-16 h-16',
      icon: 'w-10 h-10',
      text: 'text-2xl',
    },
  };

  const config = sizeConfig[size];

  const LogoContent = () => (
    <>
      {/* Logo Icon */}
      {app.logo_url ? (
        <div className={`${config.container} rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center`}>
          <img
            src={app.logo_url}
            alt={app.app_title || 'Logo'}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className={`${config.container} bg-[#4A7C59] dark:bg-green-600 rounded-xl flex items-center justify-center shadow-md`}>
          <svg className={`${config.icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}

      {/* App Title */}
      {showText && (
        <span className={`${config.text} font-semibold text-gray-900 dark:text-white`}>
          {app.app_title || 'CareerBridge AI'}
        </span>
      )}
    </>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className={`flex items-center space-x-2 ${className}`}>
        <LogoContent />
      </Link>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <LogoContent />
    </div>
  );
};

export default AppLogo;
