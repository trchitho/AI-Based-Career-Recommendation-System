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

        // Use FAST saved recommendations for dashboard (no AI-core call)
        try {
          console.log('⚡ [DashboardService] Getting SAVED recommendations (fast)...');
          const savedRecResponse = await api.get('/api/recommendations/saved', {
            params: {
              assessment_id: latestAssessment.id,
              top_k: 3
            }
          });

          console.log('📋 [DashboardService] Saved recommendations response:', savedRecResponse.data);

          if (savedRecResponse.data && savedRecResponse.data.length > 0) {
            // Handle direct array response
            topCareerSuggestions = savedRecResponse.data.slice(0, 3).map((career: any) => ({
              id: career.career_id || career.id,
              slug: career.slug || career.career_id,
              title: career.title_vi || career.title_en || 'Unknown Career',
              description: career.description || 'No description available',
              matchPercentage: Math.round(career.score || 0),
            }));

            console.log('✅ [DashboardService] Fast career suggestions loaded:', topCareerSuggestions);
          } else if (savedRecResponse.data.items && savedRecResponse.data.items.length > 0) {
            // Handle items wrapper response
            topCareerSuggestions = savedRecResponse.data.items.slice(0, 3).map((career: any) => ({
              id: career.career_id || career.id,
              slug: career.slug || career.career_id,
              title: career.title_vi || career.title_en || 'Unknown Career',
              description: career.description || 'No description available',
              matchPercentage: Math.round(career.score || 0),
            }));

            console.log('✅ [DashboardService] Fast career suggestions loaded (items):', topCareerSuggestions);
          } else {
            console.log('⚠️ [DashboardService] No saved recommendations found, trying fallback...');

            // Fallback: try to get fresh recommendations only if no saved data
            try {
              const recData = await recommendationService.getMain(latestAssessment.id, 3);
              if (recData.items && recData.items.length > 0) {
                topCareerSuggestions = recData.items.slice(0, 3).map((career) => ({
                  id: career.career_id,
                  slug: career.slug || career.career_id,
                  title: career.title_en || career.title_vi || 'Unknown Career',
                  description: career.description || 'No description available',
                  matchPercentage: career.display_match || career.match_score || 0,
                }));
                console.log('✅ [DashboardService] Fallback recommendations loaded');
              }
            } catch (fallbackError) {
              console.error('❌ [DashboardService] Fallback recommendations failed:', fallbackError);
            }
          }
        } catch (error) {
          console.error('❌ [DashboardService] Error fetching saved recommendations:', error);
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
