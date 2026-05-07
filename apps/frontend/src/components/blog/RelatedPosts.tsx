import { Link } from 'react-router-dom';
import { BlogPost } from '../../services/blogService';
import { getBlogImage, getBlogGradient } from '../../utils/blogImages';

interface RelatedPostsProps {
    posts: BlogPost[];
    title?: string;
}

const RelatedPosts = ({ posts, title = 'Related Articles' }: RelatedPostsProps) => {
    if (posts.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                </svg>
                {title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => {
                    return (
                        <Link
                            key={post.id}
                            to={`/blog/${post.slug}`}
                            className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-indigo-600 dark:hover:border-indigo-600 transition-all hover:-translate-y-1 hover:shadow-xl"
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
                                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">
                                        {post.category || 'Article'}
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
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-800 dark:group-hover:text-indigo-400 transition-colors">
                                    {post.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {post.excerpt || post.content_md.substring(0, 100) + '...'}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default RelatedPosts;
