// CV Types
export interface CVPersonalInfo {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    summary?: string;
}

export interface CVEducation {
    id?: string;
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    description?: string;
}

export interface CVExperience {
    id?: string;
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description: string;
    achievements?: string[];
}

export interface CVSkill {
    id?: string;
    name: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    category?: string;
}

export interface CVProject {
    id?: string;
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
}

export interface CVCertification {
    id?: string;
    name: string;
    issuer: string;
    date: string;
    url?: string;
}

export interface CVLanguage {
    id?: string;
    name: string;
    proficiency: 'Basic' | 'Conversational' | 'Fluent' | 'Native';
}

export interface CV {
    id?: string;
    userId?: string;
    title: string;
    template: 'modern' | 'classic' | 'minimal' | 'creative';
    personalInfo: CVPersonalInfo;
    education: CVEducation[];
    experience: CVExperience[];
    skills: CVSkill[];
    projects?: CVProject[];
    certifications?: CVCertification[];
    languages?: CVLanguage[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CVListItem {
    id: string;
    title: string;
    template: string;
    updatedAt: string;
}
