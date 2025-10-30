import api from "../lib/api";

export interface CareerItem {
  id: string;
  slug: string;
  title: string;
  short_desc?: string;
  description?: string;
}

export const careerService = {
  async list(): Promise<CareerItem[]> {
    const res = await api.get("/api/careers");
    return res.data || [];
  },
  async get(idOrSlug: string | number): Promise<CareerItem> {
    const res = await api.get(`/api/careers/${idOrSlug}`);
    return res.data;
  },
};
