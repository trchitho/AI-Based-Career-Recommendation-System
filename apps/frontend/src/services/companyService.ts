import api from '../lib/api';

export interface CompanyItem {
  id: number;
  career_group_id: number;
  career_group_slug: string;
  career_group_name: string;
  name: string;
  name_vi?: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: string;
  urls: {
    careers?: string;
    linkedin?: string;
    vietnamworks?: string;
    topcv?: string;
    itviec?: string;
    jobstreet?: string;
    other?: string;
  };
  verified: boolean;
}

/** O*NET major group code (first 2 digits) → career_group_slug */
const ONET_TO_SLUG: Record<string, string> = {
  '11': 'management',
  '13': 'business-finance',
  '15': 'computer-math',
  '17': 'architecture-engineering',
  '19': 'life-science',
  '21': 'community-social',
  '23': 'legal',
  '25': 'education',
  '27': 'arts-media',
  '29': 'healthcare-practitioners',
  '31': 'healthcare-support',
  '33': 'protective-service',
  '35': 'food-service',
  '37': 'building-maintenance',
  '39': 'personal-care',
  '41': 'sales',
  '43': 'office-admin',
  '45': 'farming-forestry',
  '47': 'construction',
  '49': 'installation-repair',
  '51': 'production',
  '53': 'transportation',
};

/** Extract O*NET major group from career_id (e.g. "25-2012-00" → "25") */
export function onetToSlug(careerId: string): string | null {
  const major = careerId?.split('-')[0];
  return ONET_TO_SLUG[major] ?? null;
}

/** Best clickable URL for a company (priority order) */
export function bestUrl(company: CompanyItem): string | null {
  // careers_url = official page (most reliable when available)
  // Otherwise fall back to job board search URLs (always work)
  return (
    company.urls.careers ||
    company.urls.vietnamworks ||
    company.urls.topcv ||
    company.urls.linkedin ||
    company.urls.itviec ||
    company.urls.jobstreet ||
    company.urls.other ||
    null
  );
}

/** All available URLs for a company as labeled links */
export function allUrls(company: CompanyItem): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  if (company.urls.careers)      links.push({ label: 'Trang tuyển dụng', url: company.urls.careers });
  if (company.urls.vietnamworks) links.push({ label: 'VietnamWorks', url: company.urls.vietnamworks });
  if (company.urls.topcv)        links.push({ label: 'TopCV', url: company.urls.topcv });
  if (company.urls.linkedin)     links.push({ label: 'LinkedIn', url: company.urls.linkedin });
  if (company.urls.other)        links.push({ label: 'Indeed', url: company.urls.other });
  return links;
}

class CompanyService {
  async getByGroup(slug: string): Promise<CompanyItem[]> {
    const res = await api.get(`/api/companies/group/${slug}`);
    return res.data;
  }

  async getByOnet(onetCode: string): Promise<CompanyItem[]> {
    const res = await api.get(`/api/companies/onet/${onetCode}`);
    return res.data;
  }

  async getForCareer(careerId: string): Promise<CompanyItem[]> {
    const slug = onetToSlug(careerId);
    if (!slug) return [];
    return this.getByGroup(slug);
  }

  async search(q: string, groupSlug?: string): Promise<CompanyItem[]> {
    const params: Record<string, string> = { q };
    if (groupSlug) params.group_slug = groupSlug;
    const res = await api.get('/api/companies/search', { params });
    return res.data;
  }

  async getGroupsSummary(): Promise<{ group_id: number; slug: string; name: string; company_count: number }[]> {
    const res = await api.get('/api/companies/groups/summary');
    return res.data;
  }
}

export const companyService = new CompanyService();
