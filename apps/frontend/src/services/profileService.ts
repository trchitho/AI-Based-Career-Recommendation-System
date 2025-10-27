import api from '../lib/api';
import { ProfileData, UserProfile } from '../types/profile';

export const profileService = {
  async getProfileData(): Promise<ProfileData> {
    try {
      // Fetch user profile
      const profileResponse = await api.get('/api/users/me');
      const profile: UserProfile = profileResponse.data;

      // Fetch assessment history (best-effort)
      let assessmentHistory: any[] = [];
      try {
        const historyResponse = await api.get(`/api/users/${profile.id}/history`);
        assessmentHistory = historyResponse.data || [];
      } catch (error) {
        console.log('History data not available');
      }

      // Fetch development progress
      let developmentProgress = [];
      try {
        const progressResponse = await api.get('/api/users/progress');
        developmentProgress = progressResponse.data || [];
      } catch (error) {
        console.log('Progress data not available');
      }

      return {
        profile,
        assessmentHistory,
        developmentProgress,
      };
    } catch (error) {
      console.error('Error fetching profile data:', error);
      throw error;
    }
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  }): Promise<UserProfile> {
    try {
      // Map to backend expected fields
      const payload: any = {
        full_name: [data.firstName, data.lastName].filter(Boolean).join(' ') || undefined,
        date_of_birth: data.dateOfBirth,
      };
      const response = await api.patch('/api/users/me', payload);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
};
