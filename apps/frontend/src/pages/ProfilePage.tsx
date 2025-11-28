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
      const data = await profileService.getProfileData();
      setProfileData(data);
    } catch {
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

        {/* PAGE HEADER */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manage your account and track your progress
          </p>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && !error && profileData && (
          <div className="space-y-6">
            <ProfileInfoSection profile={profileData.profile} onUpdate={handleProfileUpdate} />
            <AssessmentHistorySection assessmentHistory={profileData.assessmentHistory} />
            <DevelopmentProgressSection developmentProgress={profileData.developmentProgress || []} />
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default ProfilePage;
