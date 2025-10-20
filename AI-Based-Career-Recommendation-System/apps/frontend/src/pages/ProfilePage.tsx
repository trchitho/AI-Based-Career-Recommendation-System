import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { ProfileData } from '../types/profile';
import ProfileInfoSection from '../components/profile/ProfileInfoSection.tsx';
import AssessmentHistorySection from '../components/profile/AssessmentHistorySection.tsx';
import DevelopmentProgressSection from '../components/profile/DevelopmentProgressSection.tsx';
import MainLayout from '../components/layout/MainLayout';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getProfileData();
      setProfileData(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: any) => {
    if (profileData) {
      setProfileData({
        ...profileData,
        profile: updatedProfile,
      });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Manage your account and track your progress</p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && profileData && (
          <div className="space-y-6">
            <ProfileInfoSection
              profile={profileData.profile}
              onUpdate={handleProfileUpdate}
            />
            <AssessmentHistorySection
              assessmentHistory={profileData.assessmentHistory}
            />
            <DevelopmentProgressSection
              developmentProgress={profileData.developmentProgress || []}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
