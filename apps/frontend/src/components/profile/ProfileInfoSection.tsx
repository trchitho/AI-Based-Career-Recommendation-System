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
    <div
      className="
        bg-white dark:bg-[#1A1F2C]
        border border-gray-200 dark:border-white/10
        shadow-sm rounded-xl p-6 transition-colors
      "
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Personal Information
        </h3>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="
              px-4 py-2 rounded-lg text-white font-semibold
              bg-gradient-to-r from-purple-500 to-purple-700
              hover:from-purple-400 hover:to-purple-600
              active:scale-95 transition
            "
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div
          className="
            mb-4 p-3 rounded-lg
            bg-red-50 dark:bg-red-900/20
            border border-red-200 dark:border-red-800
          "
        >
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">

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
                focus:ring-2 focus:ring-purple-500 outline-none
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
                focus:ring-2 focus:ring-purple-500 outline-none
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
                focus:ring-2 focus:ring-purple-500 outline-none
              "
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="
                px-4 py-2 rounded-md text-white font-semibold
                bg-gradient-to-r from-purple-500 to-purple-700
                hover:from-purple-400 hover:to-purple-600
                disabled:opacity-50 active:scale-95 transition
              "
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="
                px-4 py-2 rounded-md
                bg-gray-200 dark:bg-[#0F1629]
                text-gray-700 dark:text-gray-200
                border border-gray-300 dark:border-gray-700
                hover:bg-gray-300 dark:hover:bg-gray-700
              "
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
            <p className="mt-1 text-base text-gray-900 dark:text-white">{profile.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</p>
            <p className="mt-1 text-base text-gray-900 dark:text-white">{formatDate(profile.created_at)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</p>
            <p className="mt-1 text-base text-gray-900 dark:text-white">{profile.first_name || 'Not set'}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</p>
            <p className="mt-1 text-base text-gray-900 dark:text-white">{profile.last_name || 'Not set'}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</p>
            <p className="mt-1 text-base text-gray-900 dark:text-white">{formatDate(profile.date_of_birth)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</p>
            <p className="mt-1 text-base text-gray-900 dark:text-white">{formatDate(profile.last_login_at)}</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default ProfileInfoSection;
