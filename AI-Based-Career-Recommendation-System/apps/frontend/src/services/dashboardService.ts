import api from '../lib/api';
import { DashboardData, CareerSuggestion, ProgressMetrics } from '../types/dashboard';

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    try {
      // Fetch user profile
      const profileResponse = await api.get('/api/users/me');
      const profileSummary = profileResponse.data;

      // Fetch user history to check for assessments (best-effort)
      let assessmentHistory: any[] = [];
      try {
        const historyResponse = await api.get(`/api/users/${profileSummary.id}/history`);
        assessmentHistory = historyResponse.data || [];
      } catch (error) {
        console.log('History data not available');
      }

      const hasCompletedAssessment = assessmentHistory.length > 0;
      const latestAssessment = assessmentHistory[0];

      let topCareerSuggestions: CareerSuggestion[] = [];
      let progressMetrics: ProgressMetrics = {
        completedAssessments: assessmentHistory.length,
        activeRoadmaps: 0,
        completedMilestones: 0,
      };

      if (hasCompletedAssessment && latestAssessment) {
        // Fetch latest assessment results to get career recommendations
        try {
          const resultsResponse = await api.get(`/api/assessments/${latestAssessment.id}/results`);
          const results = resultsResponse.data;

          if (results.career_recommendations && results.career_recommendations.length > 0) {
            // Fetch career details for top recommendations (limit to 3 for dashboard)
            const careerPromises = results.career_recommendations
              .slice(0, 3)
              .map((careerId: string) => api.get(`/api/careers/${careerId}`));

            const careerResponses = await Promise.all(careerPromises);
            
            topCareerSuggestions = careerResponses.map((response: any, index: number) => {
              const career = response.data;
              // Calculate match percentage based on position (first is highest)
              const matchPercentage = 95 - (index * 5);
              
              return {
                id: career.id,
                title: career.title,
                matchPercentage,
                description: career.description,
              };
            });
          }
        } catch (error) {
          console.error('Error fetching career recommendations:', error);
        }

        // Fetch user progress data
        try {
          const progressResponse = await api.get(`/api/users/${profileSummary.id}/progress`);
          const progressData = progressResponse.data;
          
          if (progressData && Array.isArray(progressData)) {
            progressMetrics.activeRoadmaps = progressData.length;
            progressMetrics.completedMilestones = progressData.reduce(
              (total: number, roadmap: any) => total + (roadmap.completed_milestones?.length || 0),
              0
            );
          }
        } catch (error) {
          // Progress endpoint might not exist yet, use defaults
          console.log('Progress data not available');
        }
      }

      return {
        profileSummary,
        topCareerSuggestions,
        progressMetrics,
        hasCompletedAssessment,
        latestAssessmentId: latestAssessment?.id,
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },
};
