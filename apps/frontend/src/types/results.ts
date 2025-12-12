export interface RIASECScores {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
}

export interface BigFiveScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EssayAnalysis {
  themes: string[];
  sentiment: string;
  key_insights: string[];
}

export interface AssessmentResults {
  assessment_id: string;
  user_id: string;
  riasec_scores: RIASECScores;
  big_five_scores: BigFiveScores;
  top_interest?: string;  // L1 từ raw test scores - khớp với filter logic
  career_recommendations: string[];
  essay_analysis?: EssayAnalysis;
  completed_at: string;
}

export interface CareerRecommendation {
  id: string;
  slug?: string;
  title: string;
  description: string;
  matchPercentage: number;
  required_skills?: string[];
  salary_range?: string;
  industry_category?: string;
}
