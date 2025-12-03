import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { ProfileData } from '../types/profile';
import ProfileInfoSection from '../components/profile/ProfileInfoSection';
import AssessmentHistorySection from '../components/profile/AssessmentHistorySection';
import MainLayout from '../components/layout/MainLayout';

const ProfilePage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
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

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">

        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#E5E7EB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* --- PAGE HEADER --- */}
          <div className="mb-12 text-center md:text-left animate-fade-in-up">
            <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-4 border border-green-200 dark:border-green-800">
              Account Settings
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
              Your <span className="text-green-600 dark:text-green-500">Profile</span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
              Manage your personal information and view your assessment history.
            </p>
          </div>

          {/* --- LOADING STATE --- */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div>
              <p className="text-gray-500 font-medium">Loading your profile...</p>
            </div>
          )}

          {/* --- ERROR STATE --- */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4 animate-fade-in-up mb-8">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* --- PROFILE CONTENT --- */}
          {!loading && !error && profileData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">

              {/* Left Column: Personal Info (Chiếm 1/3 trên màn lớn) */}
              <div className="lg:col-span-1 flex flex-col gap-8">
                <ProfileInfoSection profile={profileData.profile} onUpdate={handleProfileUpdate} />

                {/* Additional info card (optional) */}
                <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                    Account Status
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Active</p>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">Verified Member</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: History (Chiếm 2/3 trên màn lớn) */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-1 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 h-full">
                  {/* Wrapper để đồng bộ style với ProfileInfoSection */}
                  <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 rounded-[28px] overflow-hidden p-0">
                    <AssessmentHistorySection assessmentHistory={profileData.assessmentHistory} />
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;