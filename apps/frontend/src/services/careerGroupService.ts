import api from '../lib/api';

export interface CareerGroup {
    id: number;
    name: string;
    slug: string;
    description?: string;
    onet_major_group?: string;
    created_at?: string;
    career_count?: number;
    level_count?: number;
}

export interface CareerGroupsResponse {
    items: CareerGroup[];
    total: number;
    limit: number;
    offset: number;
}

export interface CareersByGroupResponse {
    items: Array<{
        id: string;
        slug: string;
        title: string;
        short_desc?: string;
        description?: string;
        onet_code?: string;
        industry_category?: string;
    }>;
    total: number;
    limit: number;
    offset: number;
    group: {
        id: number;
        name: string;
        slug: string;
        description?: string;
    };
}

export const careerGroupService = {
    async listGroups(params?: { page?: number; pageSize?: number }): Promise<CareerGroupsResponse> {
        const page = params?.page ?? 1;
        const pageSize = params?.pageSize ?? 6;
        const offset = (page - 1) * pageSize;

        const res = await api.get(`/api/career-system/groups?limit=${pageSize}&offset=${offset}`);
        return res.data;
    },

    async getCareersByGroup(
        groupSlug: string,
        params?: { page?: number; pageSize?: number; q?: string }
    ): Promise<CareersByGroupResponse> {
        const page = params?.page ?? 1;
        const pageSize = params?.pageSize ?? 50;
        const offset = (page - 1) * pageSize;
        const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : '';

        const res = await api.get(`/api/career-system/groups/${groupSlug}/careers?limit=${pageSize}&offset=${offset}${q}`);
        return res.data;
    },
};