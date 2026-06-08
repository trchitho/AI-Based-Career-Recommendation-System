import { Link } from 'react-router-dom';
import { useAppSettings } from '../../contexts/AppSettingsContext';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string | null;
  className?: string;
}

const AppLogo = ({ linkTo = '/home', className = '' }: AppLogoProps) => {
  const app = useAppSettings();

  // Logo Text chuẩn từ HomePage
  const LogoContent = () => (
    <div className={`flex items-center select-none group ${className}`}>
      {/* Nếu có logo ảnh từ admin settings thì ưu tiên hiển thị, nếu không thì dùng text logo chuẩn */}
      {app.logo_url ? (
        <img src={app.logo_url} alt="Logo" className="h-8 w-auto object-contain mr-2" />
      ) : null}

      <span className="text-[20px] font-[800] tracking-[-0.03em] text-[#0f172a] dark:text-[#f8fafc] sm:text-[24px] sm:tracking-[-0.04em]">
        Career<span className="text-[#4f46e5]">Verse</span>
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
