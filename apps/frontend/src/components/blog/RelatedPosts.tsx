import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Clock, Zap } from 'lucide-react';
import { BlogPost } from '../../services/blogService';
import { getBlogImage, getBlogGradient } from '../../utils/blogImages';
import { useBlogWebSocket } from '../../hooks/useBlogWebSocket';

interface RelatedPostsProps {
    posts: BlogPost[];
    title?: string;
}

const RelatedPosts = ({ posts, title = 'Related Articles' }: RelatedPostsProps) => {
    const [localPosts, setLocalPosts] = useState<BlogPost[]>(posts);

    // Initialize with props
    useEffect(() => {
        setLocalPosts(posts);
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <Zap className="w-7 h-7 text-green-600" />
                {title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localPosts.map((post) => {
                    return (
                        <Link
                            key={post.id}
                            to={`/blog/${post.slug}`}
                            className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 transition-all hover:-translate-y-1 hover:shadow-xl"
                        >
                            {/* Image */}
                            <div className={`h-40 bg-gradient-to-br ${getBlogGradient(post.category)} relative overflow-hidden`}>
                                <img
                                    src={getBlogImage(post.category, post.featured_image)}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />

                                {/* Fallback content */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-white/20 text-4xl font-bold">
                                        {post.title.charAt(0)}
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                                        {getCategoryDisplayName(post.category)}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {post.published_at
                                            ? new Date(post.published_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })
                                            : 'Draft'}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                    {post.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                    {post.excerpt || post.content_md.substring(0, 100) + '...'}
                                </p>

                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Heart className="w-4 h-4" />
                                        <span className="font-medium">{post.like_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="font-medium">{post.comment_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        <span className="font-medium">{calculateReadingTime(post.content_md)}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default RelatedPosts;
