// CV Helper utilities for scoring and suggestions

export interface CVScore {
    overall: number;
    completeness: number;
    quality: number;
    suggestions: string[];
}

export function calculateCVScore(cv: any): CVScore {
    const suggestions: string[] = [];
    let completenessScore = 0;
    let qualityScore = 0;

    // Completeness checks (50 points)
    if (cv.personalInfo?.fullName) completenessScore += 5;
    if (cv.personalInfo?.email) completenessScore += 5;
    if (cv.personalInfo?.phone) completenessScore += 5;
    if (cv.personalInfo?.address) completenessScore += 3;
    if (cv.personalInfo?.dateOfBirth) completenessScore += 2;
    if (cv.personalInfo?.summary && cv.personalInfo.summary.length > 50) {
        completenessScore += 10;
    } else {
        suggestions.push('Add a professional summary (at least 50 characters)');
    }

    if (cv.experience?.length > 0) {
        completenessScore += 10;
        if (cv.experience.length < 2) {
            suggestions.push('Add more work experience entries to strengthen your CV');
        }
    } else {
        suggestions.push('Add your work experience');
    }

    if (cv.education?.length > 0) {
        completenessScore += 5;
    } else {
        suggestions.push('Add your education background');
    }

    if (cv.skills?.length >= 5) {
        completenessScore += 5;
    } else {
        suggestions.push('Add at least 5 skills to showcase your expertise');
    }

    // Quality checks (50 points)

    // Summary quality
    if (cv.personalInfo?.summary) {
        const summaryLength = cv.personalInfo.summary.length;
        if (summaryLength >= 100 && summaryLength <= 300) {
            qualityScore += 10;
        } else if (summaryLength > 300) {
            suggestions.push('Keep your summary concise (100-300 characters)');
            qualityScore += 5;
        } else if (summaryLength > 0) {
            suggestions.push('Expand your summary to 100-300 characters');
            qualityScore += 3;
        }
    }

    // Experience quality
    cv.experience?.forEach((exp: any, idx: number) => {
        if (exp.description && exp.description.length > 50) {
            qualityScore += 5;
        } else {
            suggestions.push(`Add detailed description for experience #${idx + 1}`);
        }
    });

    // Skills diversity
    if (cv.skills?.length >= 8) {
        qualityScore += 10;
    } else if (cv.skills?.length >= 5) {
        qualityScore += 5;
    }

    // Projects (bonus)
    if (cv.projects?.length > 0) {
        qualityScore += 10;
    } else {
        suggestions.push('Add projects to demonstrate your practical experience');
    }

    // Contact info quality
    if (cv.personalInfo?.linkedin || cv.personalInfo?.github) {
        qualityScore += 5;
    } else {
        suggestions.push('Add LinkedIn or GitHub profile to increase credibility');
    }

    const overall = Math.min(100, completenessScore + qualityScore);

    return {
        overall,
        completeness: completenessScore * 2, // Scale to 100
        quality: qualityScore * 2, // Scale to 100
        suggestions: suggestions.slice(0, 5), // Top 5 suggestions
    };
}

export function generateCareerSummary(
    riasecScores: Record<string, number>,
    targetRole?: string
): string {
    const dimensions = Object.entries(riasecScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([key]) => key);

    const careerMap: Record<string, string> = {
        realistic: 'hands-on technical work and practical problem-solving',
        investigative: 'research, analysis, and intellectual challenges',
        artistic: 'creative expression and innovative design',
        social: 'helping others and collaborative teamwork',
        enterprising: 'leadership, business development, and strategic initiatives',
        conventional: 'organization, data management, and systematic processes',
    };

    const interests = dimensions
        .map((dim) => careerMap[dim])
        .filter(Boolean)
        .join(', ');

    if (targetRole) {
        return `${targetRole} with strong interests in ${interests}. Seeking opportunities to leverage my skills and passion to contribute to organizational success.`;
    }

    return `Motivated professional with strong interests in ${interests}. Seeking opportunities to leverage my skills and passion to contribute to organizational success.`;
}

export function suggestSkillsFromRIASEC(riasecScores: Record<string, number>): string[] {
    const topDimension = Object.entries(riasecScores)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

    const skillSuggestions: Record<string, string[]> = {
        realistic: [
            'Technical Skills',
            'Equipment Operation',
            'Mechanical Aptitude',
            'Troubleshooting',
            'Quality Control',
        ],
        investigative: [
            'Data Analysis',
            'Research Methods',
            'Critical Thinking',
            'Problem Solving',
            'Statistical Analysis',
        ],
        artistic: [
            'Creative Design',
            'Visual Communication',
            'Content Creation',
            'Innovation',
            'Artistic Expression',
        ],
        social: [
            'Communication',
            'Team Collaboration',
            'Interpersonal Skills',
            'Customer Service',
            'Mentoring',
        ],
        enterprising: [
            'Leadership',
            'Project Management',
            'Strategic Planning',
            'Negotiation',
            'Business Development',
        ],
        conventional: [
            'Organization',
            'Data Management',
            'Attention to Detail',
            'Process Optimization',
            'Documentation',
        ],
    };

    return skillSuggestions[topDimension] || [];
}
