export interface LearningResource {
  title: string;
  url: string;
  type: "course" | "article" | "video" | "book";
}

export interface Milestone {
  order: number;
  skillName: string;
  description: string;
  estimatedDuration: string;
  resources: LearningResource[];
}

export interface UserProgress {
  id: string;
  user_id: string;
  career_id: string;
  roadmap_id: string;
  completed_milestones: string[];
  milestone_completions: { [milestoneId: string]: string }; // milestoneId -> completion timestamp
  current_milestone_id?: string;
  progress_percentage: number;
  started_at: string;
  last_updated_at: string;
}

export interface Roadmap {
  id: string;
  careerId: string;
  careerTitle: string;
  milestones: Milestone[];
  estimatedTotalDuration: string;
  userProgress?: UserProgress;
  createdAt: string;
  updatedAt: string;
}
