import api from "../lib/api";

export interface CourseOut {
  id: number;
  external_id: string;
  title: string;
  description?: string;
  url?: string;
  platform: string;
  instructor?: string;
  rating: number;
  num_reviews: number;
  price: number;
  is_free: boolean;
  level?: string;
  duration_hrs?: number;
  thumbnail?: string;
  language: string;
  tags: string[];
}

export interface CourseRecommendation {
  course: CourseOut;
  skill_name: string;
  similarity_score: number;
  relevance_label: string;
}

export interface CourseRecommendationsResponse {
  missing_skills: string[];
  recommendations: CourseRecommendation[];
  total: number;
  source: string;
}

export interface PipelineStatus {
  total_courses: number;
  embedded_courses: number;
  total_mappings: number;
  neo4j_synced: boolean;
  platforms?: Record<string, number>;
}

const courseService = {
  getRecommendations: async (
    skills: string[],
    topK = 3
  ): Promise<CourseRecommendationsResponse> => {
    const params = new URLSearchParams({ top_k: String(topK) });
    skills.forEach((s) => params.append("skills", s));
    const res = await api.get(`/api/courses/recommend?${params.toString()}`);
    return res.data;
  },

  searchCourses: async (params: {
    q: string;
    platform?: string;
    level?: string;
    is_free?: boolean;
    limit?: number;
  }): Promise<CourseOut[]> => {
    const res = await api.get("/api/courses/search", { params });
    return res.data;
  },

  // Admin helpers
  seedCourses: async () => {
    const res = await api.post("/api/courses/admin/seed");
    return res.data;
  },

  embedCourses: async () => {
    const res = await api.post("/api/courses/admin/embed");
    return res.data;
  },

  buildSkillMap: async (skills?: string[]) => {
    const res = await api.post("/api/courses/admin/build-map", skills ?? null);
    return res.data;
  },

  syncNeo4j: async () => {
    const res = await api.post("/api/courses/admin/sync-neo4j");
    return res.data;
  },

  runFullPipeline: async () => {
    const res = await api.post("/api/courses/admin/run-all");
    return res.data;
  },

  crawlCourses: async (body: {
    keywords?: string[];
    platforms?: string[];
    page_size?: number;
  }) => {
    const res = await api.post("/api/courses/admin/crawl", body);
    return res.data;
  },

  getPipelineStatus: async (): Promise<PipelineStatus> => {
    const res = await api.get("/api/courses/admin/status");
    return res.data;
  },
};

export default courseService;
