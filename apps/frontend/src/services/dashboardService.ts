import api from '../lib/api';
import {
  DashboardData,
  CareerSuggestion,
  ProgressMetrics,
} from '../types/dashboard';
import { assessmentService } from './assessmentService';
import { recommendationService } from './recommendationService';

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
          '🎯 [DashboardService] Getting career recommendations from latest assessment results:',
          latestAssessment.id,
        );

        // Use the SAME API as Results page - recommendationService.getMain()
        try {
          const recData = await recommendationService.getMain(
            latestAssessment.id,
            3,
          ); // Get top 3 careers
          console.log(
            '📋 [DashboardService] Recommendations from BFF:',
            recData,
          );

          if (recData.items && recData.items.length > 0) {
            topCareerSuggestions = recData.items.slice(0, 3).map((career) => ({
              id: career.career_id,
              slug: career.slug || career.career_id,
              title: career.title_en || career.title_vi || 'Unknown Career',
              description: career.description || 'No description available',
              matchPercentage: career.display_match || career.match_score || 0,
            }));

            console.log(
              '✅ [DashboardService] Career suggestions from BFF:',
              topCareerSuggestions,
            );
          } else {
            console.log(
              '⚠️ [DashboardService] No career recommendations from BFF',
            );
          }
        } catch (error) {
          console.error(
            '❌ [DashboardService] Error fetching recommendations from BFF:',
            error,
          );

          // Fallback: try to get from assessment results
          try {
            const resultsResponse = await api.get(
              `/api/assessments/${latestAssessment.id}/results`,
            );
            const results = resultsResponse.data;
            console.log(
              '📋 [DashboardService] Fallback - Assessment results:',
              results,
            );

            if (
              results.career_recommendations_full &&
              results.career_recommendations_full.length > 0
            ) {
              topCareerSuggestions = results.career_recommendations_full
                .slice(0, 3)
                .map((career: any, index: number) => ({
                  id: career.id,
                  slug: career.slug,
                  title: career.title,
                  description: career.description,
                  matchPercentage: 95 - index * 5,
                }));

              console.log(
                '✅ [DashboardService] Fallback career suggestions:',
                topCareerSuggestions,
              );
            }
          } catch (fallbackError) {
            console.error(
              '❌ [DashboardService] Fallback also failed:',
              fallbackError,
            );
          }
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
