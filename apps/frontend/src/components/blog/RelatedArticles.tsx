import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Clock } from 'lucide-react';
import { BlogPost } from '../../services/blogService';
import { getBlogImage, getBlogGradient } from '../../utils/blogImages';
import { useBlogWebSocket } from '../../hooks/useBlogWebSocket';

interface RelatedArticlesProps {
    posts: BlogPost[];
}

const RelatedArticles = ({ posts }: RelatedArticlesProps) => {
    const navigate = useNavigate();
    const [localPosts, setLocalPosts] = useState<BlogPost[]>(posts);
    const [loading, setLoading] = useState(true);

    // Initialize with props
    useEffect(() => {
        setLocalPosts(posts);
        setLoading(false);
    }, [posts]);

    // Real-time WebSocket updates
    const postIds = posts.map(p => p.id);
    useBlogWebSocket({
        postIds,
        onBlogUpdate: (postId, data) => {
            setLocalPosts(prev => prev.map(post =>
                post.id === postId
                    ? {
                        ...post,
                        like_count: data.like_count ?? post.like_count,
                        comment_count: data.comment_count ?? post.comment_count
                    }
                    : post
            ));
        }
    });

    // Calculate reading time
    const calculateReadingTime = (content: string) => {
        const words = content.split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return `${minutes} min`;
    };

    // Convert category slug to display name
    const getCategoryDisplayName = (categorySlug: string | undefined) => {
        if (!categorySlug) return 'Tư vấn nghề nghiệp';

        const categoryMap: Record<string, string> = {
            'career-advice': 'Tư vấn nghề nghiệp',
            'interview-tips': 'Mẹo phỏng vấn',
            'resume-writing': 'Viết CV',
            'workplace-culture': 'Văn hóa công sở',
            'skill-development': 'Phát triển kỹ năng',
            'job-search': 'Tìm việc làm',
            'industry-insights': 'Góc nhìn ngành',
        };

        return categoryMap[categorySlug.toLowerCase()] || categorySlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (localPosts.length === 0) return null;

    const [featuredPost, ...smallPosts] = localPosts;

    return (
        <section className="bg-gray-50 dark:bg-gray-900 py-16">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Related Articles
                    </h2>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                        Continue exploring career insights and advice
                    </p>
                </div>

                {/* Loading Skeleton */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-96 animate-pulse" />
                        <div className="space-y-6">
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-44 animate-pulse" />
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-44 animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Featured Large Card - Left */}
                        <article
                            onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                            className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 border border-gray-200 dark:border-gray-700"
                        >
                            {/* Image */}
                            <div className="relative h-64 overflow-hidden">
                                <img
                                    src={getBlogImage(featuredPost.category, featuredPost.featured_image)}
                                    alt={featuredPost.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop';
                                    }}
                                />
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Category Badge */}
                                <span className="inline-block px-3 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold uppercase tracking-wide mb-3">
                                    {getCategoryDisplayName(featuredPost.category)}
                                </span>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                                    {featuredPost.title}
                                </h3>

                                {/* Excerpt */}
                                {featuredPost.excerpt && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                        {featuredPost.excerpt}
                                    </p>
                                )}

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Heart className="w-4 h-4" />
                                        <span>{featuredPost.like_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MessageCircle className="w-4 h-4" />
                                        <span>{featuredPost.comment_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        <span>{calculateReadingTime(featuredPost.content_md)}</span>
                                    </div>
                                </div>
                            </div>
                        </article>

                        {/* Small Cards Column - Right */}
                        <div className="space-y-6">
                            {smallPosts.slice(0, 2).map((post) => (
                                <article
                                    key={post.id}
                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                    className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 border border-gray-200 dark:border-gray-700 flex"
                                >
                                    {/* Image Left */}
                                    <div className="relative w-32 sm:w-40 flex-shrink-0 overflow-hidden">
                                        <img
                                            src={getBlogImage(post.category, post.featured_image)}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop';
                                            }}
                                        />
                                    </div>

                                    {/* Content Right */}
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div>
                                            <span className="inline-block text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                                                {getCategoryDisplayName(post.category)}
                                            </span>
                                            <h4 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300 mb-2">
                                                {post.title}
                                            </h4>
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Heart className="w-3.5 h-3.5" />
                                                <span>{post.like_count || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                <span>{post.comment_count || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default RelatedArticles;
