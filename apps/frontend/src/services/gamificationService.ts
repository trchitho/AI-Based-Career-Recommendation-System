import api from '../lib/api';

export interface GamificationSession {
  gamification_session_id: number;
  quiz_mode: string;
  xp_earned: number;
}

export interface GamificationProfile {
  user_id: number;
  total_xp: number;
  level: number;
  xp_for_next_level: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface GamificationStats {
  total_xp: number;
  level: number;
  achievements_count: number;
  sessions_completed: number;
}

export interface AwardXPResult {
  xp_earned: number;
  total_xp: number;
  level: number;
  level_up: boolean;
  achievements_unlocked: string[];
}

class GamificationService {
  /**
   * Start a new gamification session
   */
  async startSession(assessmentSessionId: number, quizMode: string): Promise<GamificationSession> {
    console.log('[GamificationService] Starting session:', { assessmentSessionId, quizMode });
    try {
      const response = await api.post('/api/assessments/gamification/start-session', {
        assessment_session_id: assessmentSessionId,
        quiz_mode: quizMode,
      });
      console.log('[GamificationService] ✅ Session started:', response.data);
      return response.data;
    } catch (error) {
      console.error('[GamificationService] ❌ Failed to start session:', error);
      throw error;
    }
  }

  /**
   * Award XP for answering a question
   */
  async awardXP(gamificationSessionId: number): Promise<AwardXPResult> {
    const response = await api.post('/api/assessments/gamification/award-xp', {
      gamification_session_id: gamificationSessionId,
    });
    return response.data;
  }

  /**
   * Complete a gamification session
   */
  async completeSession(gamificationSessionId: number): Promise<AwardXPResult> {
    const response = await api.post('/api/assessments/gamification/complete-session', {
      gamification_session_id: gamificationSessionId,
    });
    return response.data;
  }

  /**
   * Get user's gamification stats
   */
  async getUserStats(): Promise<GamificationStats> {
    const response = await api.get('/api/assessments/gamification/stats');
    return response.data;
  }

  /**
   * Get user's gamification profile
   */
  async getProfile(): Promise<GamificationProfile> {
    const response = await api.get('/api/assessments/gamification/profile');
    return response.data;
  }

  /**
   * Save game progress to database
   * This combines session data with current game state
   */
  async saveGameProgress(data: {
    gamificationSessionId: number;
    currentIndex: number;
    xp: number;
    level: number;
    score: number;
    grid?: any;
    responses: Array<[string, string | number]>;
    completedAnswers?: any[];
    bombs?: number;
    rockets?: number;
    nuclear?: number;
    combo?: number;
    maxCombo?: number;
  }): Promise<void> {
    console.log('[GamificationService] Saving progress:', {
      sessionId: data.gamificationSessionId,
      currentIndex: data.currentIndex,
      xp: data.xp,
      level: data.level
    });
    
    try {
      // Save to backend via extra_data field
      const response = await api.post(`/api/assessments/gamification/save-progress`, {
        gamification_session_id: data.gamificationSessionId,
        extra_data: {
          currentIndex: data.currentIndex,
          xp: data.xp,
          level: data.level,
          score: data.score,
          grid: data.grid,
          responses: data.responses,
          completedAnswers: data.completedAnswers,
          bombs: data.bombs,
          rockets: data.rockets,
          nuclear: data.nuclear,
          combo: data.combo,
          maxCombo: data.maxCombo,
          timestamp: Date.now(),
        },
      });
      console.log('[GamificationService] ✅ Progress saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('[GamificationService] ❌ Failed to save progress:', error);
      throw error;
    }
  }

  /**
   * Load game progress from database
   */
  async loadGameProgress(gamificationSessionId: number): Promise<any> {
    const response = await api.get(`/api/assessments/gamification/load-progress/${gamificationSessionId}`);
    return response.data;
  }
}

export default new GamificationService();
