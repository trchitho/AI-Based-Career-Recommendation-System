import api from "../lib/api";
import {
  DashboardData,
  CareerSuggestion,
  ProgressMetrics,
} from "../types/dashboard";

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    try {
      // Fetch user profile
      const profileResponse = await api.get("/api/users/me");
      const profileSummary = profileResponse.data;

      // Fetch user history to check for assessments (best-effort)
      let assessmentHistory: any[] = [];
      try {
        const historyResponse = await api.get(
          `/api/users/${profileSummary.id}/history`,
        );
        assessmentHistory = historyResponse.data || [];
      } catch (error) {
        console.log("History data not available");
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
          const resultsResponse = await api.get(
            `/api/assessments/${latestAssessment.id}/results`,
          );
          const results = resultsResponse.data;

          if (
            results.career_recommendations_full &&
            results.career_recommendations_full.length > 0
          ) {
            topCareerSuggestions = results.career_recommendations_full
              .slice(0, 3)
              .map(
                (c: any, index: number) =>
                  ({
                    id: c.id,
                    slug: c.slug,
                    title: c.title,
                    description: c.description,
                    matchPercentage: 95 - index * 5,
                  }) as CareerSuggestion,
              );
          } else {
            // No preloaded careers; do not fallback to per-id fetch to avoid 404 noise.
            // Leave topCareerSuggestions empty; UI will show analyzing state.
          }
        } catch (error) {
          console.error("Error fetching career recommendations:", error);
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
          console.log("Progress data not available");
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
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  },
};
