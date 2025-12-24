import { useSubscription } from '../../hooks/useSubscription';

interface ProfileAvatarProps {
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ProfileAvatar = ({ name = '', email = '', size = 'lg' }: ProfileAvatarProps) => {
  const { isPremium, planName } = useSubscription();

  // Get initials from name or email
  const getInitials = () => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Size configurations
  const sizeConfig = {
    sm: { container: 'w-12 h-12', text: 'text-sm', ring: 'ring-2', badge: 'w-4 h-4 text-xs' },
    md: { container: 'w-16 h-16', text: 'text-lg', ring: 'ring-3', badge: 'w-5 h-5 text-xs' },
    lg: { container: 'w-24 h-24', text: 'text-2xl', ring: 'ring-4', badge: 'w-6 h-6 text-sm' },
    xl: { container: 'w-32 h-32', text: 'text-3xl', ring: 'ring-4', badge: 'w-8 h-8 text-base' }
  };

  const config = sizeConfig[size];

  // Premium styling
  const getPremiumStyling = () => {
    const plan = planName?.toLowerCase() || '';
    
    if (plan.includes('pro')) {
      return {
        gradient: 'from-purple-500 via-pink-500 to-purple-600',
        ringColor: 'ring-purple-500/50',
        badgeColor: 'from-purple-500 to-pink-500',
        icon: '👑',
        glow: 'shadow-purple-500/25'
      };
    }
    
    if (plan.includes('premium')) {
      return {
        gradient: 'from-green-500 via-emerald-500 to-green-600',
        ringColor: 'ring-green-500/50',
        badgeColor: 'from-green-500 to-emerald-500',
        icon: '⭐',
        glow: 'shadow-green-500/25'
      };
    }
    
    if (plan.includes('basic') || plan.includes('cơ bản')) {
      return {
        gradient: 'from-blue-500 via-cyan-500 to-blue-600',
        ringColor: 'ring-blue-500/50',
        badgeColor: 'from-blue-500 to-cyan-500',
        icon: '✨',
        glow: 'shadow-blue-500/25'
      };
    }
    
    return {
      gradient: 'from-gray-400 to-gray-500',
      ringColor: 'ring-gray-300',
      badgeColor: 'from-gray-400 to-gray-500',
      icon: '',
      glow: ''
    };
  };

  const premiumStyle = getPremiumStyling();

  return (
    <div className="relative inline-block">
      {/* Avatar container */}
      <div className={`relative ${config.container} ${isPremium ? config.ring : ''} ${premiumStyle.ringColor}`}>
        {/* Premium glow effect */}
        {isPremium && (
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${premiumStyle.gradient} opacity-20 blur-lg ${premiumStyle.glow} animate-pulse`}></div>
        )}
        
        {/* Main avatar */}
        <div className={`relative ${config.container} rounded-full bg-gradient-to-br ${isPremium ? premiumStyle.gradient : 'from-gray-400 to-gray-600'} flex items-center justify-center text-white font-bold ${config.text} shadow-lg overflow-hidden`}>
          {/* Background pattern for premium users */}
          {isPremium && (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
            </div>
          )}
          
          {/* Initials */}
          <span className="relative z-10">{getInitials()}</span>
        </div>

        {/* Premium badge */}
        {isPremium && premiumStyle.icon && (
          <div className={`absolute -bottom-1 -right-1 ${config.badge} bg-gradient-to-r ${premiumStyle.badgeColor} rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white dark:border-gray-800`}>
            <span>{premiumStyle.icon}</span>
          </div>
        )}

        {/* Online indicator */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm">
          <div className="w-full h-full bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
      </div>

      {/* Premium sparkle animation */}
      {isPremium && size === 'xl' && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-2 right-0 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-2 left-2 w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        </>
      )}
    </div>
  );
};

export default ProfileAvatar;