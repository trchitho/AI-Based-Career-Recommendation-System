/**
 * Blog image utilities for category-based image assignment
 */

// Mapping of blog categories to their corresponding images
const BLOG_IMAGE_MAPPING: Record<string, string> = {
    'career-advice': '/images/blog/career-advice.jpg',
    'career-development': '/images/blog/career-development.jpg',
    'career-tips': '/images/blog/career-tips.jpg',
    'interview-tips': '/images/blog/interview-tips.jpg',
    'resume-writing': '/images/blog/resume-writing.jpg',
    'workplace-culture': '/images/blog/workplace-culture.jpg',
    'industry-insights': '/images/blog/industry-insights.jpg',
    'job-search': '/images/blog/job-search.jpg',
    'skill-development': '/images/blog/skill-development.jpg',
    'technology': '/images/blog/technology.jpg',
    'leadership': '/images/blog/leadership.jpg',
    'remote-work': '/images/blog/remote-work.jpg',
    'personal-branding': '/images/blog/personal-branding.jpg',
};

// Default fallback image
const DEFAULT_BLOG_IMAGE = '/images/blog/career-advice.jpg';

/**
 * Get the appropriate image for a blog post based on its category
 * @param category - The blog post category slug
 * @param featuredImage - The custom featured image URL (if any)
 * @returns The image URL to use for the blog post
 */
export const getBlogImage = (category?: string, featuredImage?: string): string => {
    // If there's a custom featured image, use it
    if (featuredImage && featuredImage.trim()) {
        return featuredImage;
    }

    // If no category, use default
    if (!category) {
        return DEFAULT_BLOG_IMAGE;
    }

    // Normalize category to lowercase and handle variations
    const normalizedCategory = category.toLowerCase().trim();

    // Convert spaces to dashes for consistent mapping
    const dashCategory = normalizedCategory.replace(/\s+/g, '-');

    // Direct mapping with dash format
    if (BLOG_IMAGE_MAPPING[dashCategory]) {
        return BLOG_IMAGE_MAPPING[dashCategory];
    }

    // Direct mapping with original format
    if (BLOG_IMAGE_MAPPING[normalizedCategory]) {
        return BLOG_IMAGE_MAPPING[normalizedCategory];
    }

    // Fuzzy matching for common variations
    const categoryMappings: Record<string, string> = {
        'career': 'career-advice',
        'advice': 'career-advice',
        'development': 'career-development',
        'tips': 'career-tips',
        'interview': 'interview-tips',
        'resume': 'resume-writing',
        'cv': 'resume-writing',
        'workplace': 'workplace-culture',
        'culture': 'workplace-culture',
        'company': 'workplace-culture',
        'industry': 'industry-insights',
        'insights': 'industry-insights',
        'business': 'industry-insights',
        'job': 'job-search',
        'search': 'job-search',
        'hiring': 'job-search',
        'skill': 'skill-development',
        'learning': 'skill-development',
        'training': 'skill-development',
        'tech': 'technology',
        'programming': 'technology',
        'coding': 'technology',
        'software': 'technology',
        'lead': 'leadership',
        'management': 'leadership',
        'manager': 'leadership',
        'remote': 'remote-work',
        'wfh': 'remote-work',
        'work-from-home': 'remote-work',
        'personal': 'personal-branding',
        'branding': 'personal-branding',
        'brand': 'personal-branding',
    };

    // Check for partial matches
    for (const [keyword, mappedCategory] of Object.entries(categoryMappings)) {
        if (normalizedCategory.includes(keyword) || dashCategory.includes(keyword)) {
            return BLOG_IMAGE_MAPPING[mappedCategory] || DEFAULT_BLOG_IMAGE;
        }
    }

    // Fallback to default image
    return DEFAULT_BLOG_IMAGE;
};

/**
 * Get a gradient background color based on category
 * @param category - The blog post category
 * @returns CSS gradient classes for Tailwind
 */
export const getBlogGradient = (category?: string): string => {
    const gradients: Record<string, string> = {
        'career-advice': 'from-blue-400 to-purple-500',
        'career-development': 'from-emerald-400 to-blue-500',
        'career-tips': 'from-indigo-600 to-violet-600',
        'interview-tips': 'from-indigo-600 to-blue-500',
        'resume-writing': 'from-purple-400 to-pink-500',
        'workplace-culture': 'from-yellow-400 to-orange-500',
        'industry-insights': 'from-indigo-400 to-purple-500',
        'job-search': 'from-violet-500 to-blue-500',
        'skill-development': 'from-emerald-400 to-violet-600',
        'technology': 'from-cyan-400 to-blue-500',
        'leadership': 'from-orange-400 to-red-500',
        'remote-work': 'from-pink-400 to-purple-500',
        'personal-branding': 'from-rose-400 to-pink-500',
    };

    if (!category) {
        return 'from-indigo-600 to-blue-500';
    }

    const normalizedCategory = category.toLowerCase().trim();
    const dashCategory = normalizedCategory.replace(/\s+/g, '-');

    // Try dash format first, then original format
    return gradients[dashCategory] || gradients[normalizedCategory] || 'from-indigo-600 to-blue-500';
};

/**
 * Get all available blog images for admin/selection purposes
 * @returns Array of image options with metadata
 */
export const getAllBlogImages = () => {
    return Object.entries(BLOG_IMAGE_MAPPING).map(([category, imagePath]) => ({
        category,
        imagePath,
        displayName: category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
    }));
};