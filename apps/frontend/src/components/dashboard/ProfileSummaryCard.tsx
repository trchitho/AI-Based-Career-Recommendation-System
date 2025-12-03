import React from 'react';
import { UserProfileSummary } from '../../types/dashboard';
import { useTranslation } from 'react-i18next';

interface ProfileSummaryCardProps {
  profile: UserProfileSummary;
}

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ profile }) => {
  const { t } = useTranslation();

  // Handle both snake_case and camelCase to be safe
  const firstName = (profile as any).first_name || (profile as any).firstName;
  const lastName = (profile as any).last_name || (profile as any).lastName;

  const displayName = firstName && lastName
    ? `${firstName} ${lastName}`
    : firstName || profile.email;

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="relative h-full flex flex-col justify-center overflow-hidden p-10 bg-white dark:bg-gray-800">

      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 h-full w-1/2 bg-[#F0FDF4] dark:bg-green-900/10 rounded-l-full transform translate-x-1/3 scale-125 pointer-events-none opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-8 w-full">

        {/* Avatar Square */}
        <div className="w-24 h-24 bg-[#5D8468] rounded-[24px] flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-green-900/10 shrink-0 border-4 border-white dark:border-gray-700">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1.5 tracking-tight">
            {displayName}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-5 text-base">
            {profile.email}
          </p>

          <div className="inline-flex items-center justify-center sm:justify-start gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500">
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span>{t('dashboard.profileSummary.memberSince')} {memberSince}</span>
          </div>
        </div>

        {/* Edit Profile Button (Optional) */}
        <div className="absolute top-0 right-0 hidden md:block">
          <button className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-full hover:bg-green-50 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;