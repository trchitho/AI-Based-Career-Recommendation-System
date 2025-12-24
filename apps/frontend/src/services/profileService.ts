import api from '../lib/api';
import { ProfileData, UserProfile } from '../types/profile';
import { assessmentService } from './assessmentService';

export const profileService = {
  async getProfileData(): Promise<ProfileData> {
    try {
      console.log('🔍 [ProfileService] Getting profile data...');
      
      // Fetch user profile
      const profileResponse = await api.get('/api/users/me');
      const profile: UserProfile = profileResponse.data;
      console.log('👤 [ProfileService] Profile loaded:', profile);

      // Fetch assessment history using the new assessmentService
      let assessmentHistory: any[] = [];
      try {
        console.log('📊 [ProfileService] Loading assessment history...');
        assessmentHistory = await assessmentService.getHistory();
        console.log('✅ [ProfileService] Assessment history loaded:', assessmentHistory);
      } catch (error) {
        console.error('❌ [ProfileService] Failed to load assessment history:', error);
      }

      // Fetch development progress
      let developmentProgress = [];
      try {
        const progressResponse = await api.get('/api/users/progress');
        developmentProgress = progressResponse.data || [];
      } catch (error) {
        console.log('Progress data not available');
      }

      const result = {
        profile,
        assessmentHistory,
        developmentProgress,
      };
      
      console.log('🎯 [ProfileService] Final profile data:', result);
      return result;
    } catch (error) {
      console.error('❌ [ProfileService] Error fetching profile data:', error);
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
