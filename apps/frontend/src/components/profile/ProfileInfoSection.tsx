import { useState } from 'react';
import { UserProfile } from '../../types/profile';
import { profileService } from '../../services/profileService';
import ProfileAvatar from './ProfileAvatar';

interface ProfileInfoSectionProps {
  profile: UserProfile;
  onUpdate: (updatedProfile: UserProfile) => void;
}

const ProfileInfoSection = ({ profile, onUpdate }: ProfileInfoSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    dateOfBirth: profile.date_of_birth || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updatedProfile = await profileService.updateProfile(formData);
      onUpdate(updatedProfile);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      dateOfBirth: profile.date_of_birth || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-[32px] overflow-hidden font-['Plus_Jakarta_Sans'] h-full flex flex-col">

      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-800 dark:to-green-900 px-8 py-6 relative overflow-hidden shrink-0">
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-10 pointer-events-none"></div>

        <div className="relative z-10">
          {/* Avatar and basic info */}
          <div className="flex items-center gap-4 mb-6">
            <ProfileAvatar 
              name={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}
              email={profile.email}
              size="lg"
            />
            <div className="flex-1">
              <h3 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
                {profile.first_name || profile.last_name 
                  ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                  : 'Your Profile'
                }
              </h3>
              <p className="text-green-100 font-medium text-sm">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Header and edit button */}
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">
                Personal Information
              </h4>
              <p className="text-green-100 font-medium text-sm">
                Manage your account details
              </p>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col">

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 flex items-center gap-3 animate-fade-in-up">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm font-bold">{error}</p>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save Changes</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full content-start">

            {/* Email Card */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800 transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm group-hover:text-green-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white break-all pl-1">{profile.email}</p>
            </div>

            {/* Member Since Card */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800 transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm group-hover:text-green-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Member Since</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white pl-1">{formatDate(profile.created_at)}</p>
            </div>

            {/* First Name */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800 transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm group-hover:text-green-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">First Name</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white pl-1">{profile.first_name || 'Not set'}</p>
            </div>

            {/* Last Name */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800 transition-colors group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm group-hover:text-green-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Last Name</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white pl-1">{profile.last_name || 'Not set'}</p>
            </div>

            {/* DOB */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800 transition-colors group md:col-span-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-green-600 shadow-sm group-hover:text-green-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date of Birth</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white pl-1">{formatDate(profile.date_of_birth)}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileInfoSection;