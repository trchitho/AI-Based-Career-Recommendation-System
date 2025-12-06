import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Crown } from 'lucide-react';

interface UpgradeButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  variant = 'primary',
  size = 'md',
  text = 'Nâng cấp Premium',
  className = '',
}) => {
  const navigate = useNavigate();

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl',
    secondary: 'bg-yellow-500 text-gray-900 hover:bg-yellow-600 shadow-md hover:shadow-lg',
    outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50',
  };

  return (
    <button
      onClick={() => navigate('/pricing')}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-lg font-semibold transition-all
        flex items-center justify-center
        ${className}
      `}
    >
      {variant === 'secondary' ? (
        <Crown size={20} className="mr-2" />
      ) : (
        <Zap size={20} className="mr-2" />
      )}
      {text}
    </button>
  );
};
