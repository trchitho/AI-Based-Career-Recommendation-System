import { useState } from 'react';
import { UserProfile } from '../../types/profile';
import { profileService } from '../../services/profileService';

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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl overflow-hidden">
      
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Personal Information
            </h3>
            <p className="text-white/80 text-sm">
              Your account details and preferences
            </p>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 rounded-lg text-[#4A7C59] dark:text-green-600 bg-white font-semibold hover:bg-gray-50 active:scale-95 transition-all shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="p-8">

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className="
                w-full px-3 py-2 rounded-md
                bg-white dark:bg-[#0F1629]
                border border-gray-300 dark:border-gray-700
                text-gray-900 dark:text-gray-200
                focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 outline-none
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className="
                w-full px-3 py-2 rounded-md
                bg-white dark:bg-[#0F1629]
                border border-gray-300 dark:border-gray-700
                text-gray-900 dark:text-gray-200
                focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 outline-none
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              className="
                w-full px-3 py-2 rounded-md
                bg-white dark:bg-[#0F1629]
                border border-gray-300 dark:border-gray-700
                text-gray-900 dark:text-gray-200
                focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 outline-none
              "
            />
          </div>

            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-lg text-white font-semibold bg-[#4A7C59] dark:bg-green-600 hover:bg-[#3d6449] dark:hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="px-6 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Email</p>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white ml-8">{profile.email}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Member Since</p>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white ml-8">{formatDate(profile.created_at)}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">First Name</p>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white ml-8">{profile.first_name || 'Not set'}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Last Name</p>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white ml-8">{profile.last_name || 'Not set'}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Date of Birth</p>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white ml-8">{formatDate(profile.date_of_birth)}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-[#4A7C59] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Last Login</p>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white ml-8">{formatDate(profile.last_login_at)}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileInfoSection;
