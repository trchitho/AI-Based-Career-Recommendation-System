import React from 'react';
import { UserProfileSummary } from '../../types/dashboard';
import { useTranslation } from 'react-i18next';

interface ProfileSummaryCardProps {
  profile: UserProfileSummary;
}

const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ profile }) => {
  const { t } = useTranslation();
  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.first_name || profile.email;

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg transition-colors duration-300">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-[#4A7C59] dark:bg-green-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('dashboard.profileSummary.memberSince')} {memberSince}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
