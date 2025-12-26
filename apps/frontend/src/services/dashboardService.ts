import api from '../lib/api';
import {
  DashboardData,
  CareerSuggestion,
  ProgressMetrics,
} from '../types/dashboard';
import { assessmentService } from './assessmentService';

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    try {
      console.log('🔍 [DashboardService] Getting dashboard data...');

      // Fetch user profile
      const profileResponse = await api.get('/api/users/me');
      const profileSummary = profileResponse.data;
      console.log('👤 [DashboardService] Profile loaded:', profileSummary);

      // Fetch assessment history using the new assessmentService
      let assessmentHistory: any[] = [];
      try {
        console.log('📊 [DashboardService] Loading assessment history...');
        assessmentHistory = await assessmentService.getHistory();
        console.log(
          '✅ [DashboardService] Assessment history loaded:',
          assessmentHistory,
        );
      } catch (error) {
        console.error(
          '❌ [DashboardService] Failed to load assessment history:',
          error,
        );
      }

      const hasCompletedAssessment = assessmentHistory.length > 0;
      const latestAssessment = assessmentHistory[0]; // Most recent assessment

      console.log(
        '🔍 [DashboardService] hasCompletedAssessment:',
        hasCompletedAssessment,
      );
      console.log('🔍 [DashboardService] latestAssessment:', latestAssessment);

      let topCareerSuggestions: CareerSuggestion[] = [];
      let progressMetrics: ProgressMetrics = {
        completedAssessments: assessmentHistory.length,
        activeRoadmaps: 0,
        completedMilestones: 0,
      };

      if (hasCompletedAssessment && latestAssessment) {
        console.log(
          '🎯 [DashboardService] Getting saved career recommendations from DB for assessment:',
          latestAssessment.id,
        );

        // Fetch saved recommendations from DB (not calling AI-core)
        try {
          const savedRecResponse = await api.get('/api/recommendations/saved', {
            params: {
              assessment_id: latestAssessment.id,
              top_k: 3
            }
          });
          console.log(
            '📋 [DashboardService] Saved recommendations from DB:',
            savedRecResponse.data,
          );

          if (savedRecResponse.data.items && savedRecResponse.data.items.length > 0) {
            topCareerSuggestions = savedRecResponse.data.items.map((career: any) => ({
              id: career.career_id.toString(),
              slug: career.slug || career.career_id.toString(),
              title: career.title_en || career.title_vi || 'Unknown Career',
              description: career.description || 'No description available',
              matchPercentage: career.score || 0,
            }));

            console.log(
              '✅ [DashboardService] Career suggestions from DB:',
              topCareerSuggestions,
            );
          } else {
            console.log(
              '⚠️ [DashboardService] No saved career recommendations in DB',
            );
          }
        } catch (error) {
          console.error(
            '❌ [DashboardService] Error fetching saved recommendations:',
            error,
          );
        }

        // Fetch user progress data
        try {
          const progressResponse = await api.get(
            `/api/users/${profileSummary.id}/progress`,
          );
          const progressData = progressResponse.data;

          if (progressData && Array.isArray(progressData)) {
            progressMetrics.activeRoadmaps = progressData.length;
            progressMetrics.completedMilestones = progressData.reduce(
              (total: number, roadmap: any) =>
                total + (roadmap.completed_milestones?.length || 0),
              0,
            );
          }
        } catch (error) {
          // Progress endpoint might not exist yet, use defaults
          console.log('Progress data not available');
        }
      } else {
        console.log('ℹ️ [DashboardService] No completed assessments found');
      }

      const result = {
        profileSummary,
        topCareerSuggestions,
        progressMetrics,
        hasCompletedAssessment,
        latestAssessmentId: latestAssessment?.id,
      };

      console.log('🎯 [DashboardService] Final dashboard data:', result);
      return result;
    } catch (error) {
      console.error('❌ [DashboardService] Error fetching dashboard data:', error);
      throw error;
    }
  },
};
