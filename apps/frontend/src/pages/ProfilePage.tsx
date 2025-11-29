import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { ProfileData } from '../types/profile';
import ProfileInfoSection from '../components/profile/ProfileInfoSection.tsx';
import AssessmentHistorySection from '../components/profile/AssessmentHistorySection.tsx';
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
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">

          {/* PAGE HEADER */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#3d6449] flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  My Profile
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Manage your account and track your career journey
                </p>
              </div>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4A7C59] dark:border-green-600 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading your profile...</p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6 mb-6 shadow-lg">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 dark:text-red-300 font-semibold">{error}</p>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          {!loading && !error && profileData && (
            <div className="space-y-8">
              <ProfileInfoSection profile={profileData.profile} onUpdate={handleProfileUpdate} />
              <AssessmentHistorySection assessmentHistory={profileData.assessmentHistory} />
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
