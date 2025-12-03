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

  // Logo Text chuẩn từ HomePage
  const LogoContent = () => (
    <div className={`flex items-center gap-0.5 select-none group ${className}`}>
      {/* Nếu có logo ảnh từ admin settings thì ưu tiên hiển thị, nếu không thì dùng text logo chuẩn */}
      {app.logo_url ? (
        <img src={app.logo_url} alt="Logo" className="h-8 w-auto object-contain mr-2" />
      ) : null}

      <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
        career<span className="text-green-600 dark:text-green-500">bridge</span><span className="text-green-600 dark:text-green-500 text-3xl leading-none">.</span>
      </span>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-block">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
};

export default AppLogo;