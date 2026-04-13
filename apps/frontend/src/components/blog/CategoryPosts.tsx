import { Link } from 'react-router-dom';
import { BlogPost } from '../../services/blogService';

interface CategoryPostsProps {
    posts: BlogPost[];
    category: string;
}

const CategoryPosts = ({ posts, category }: CategoryPostsProps) => {
    if (posts.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                </svg>
                More in {category}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post, index) => {
                    const gradients = [
                        'from-green-500 to-teal-600',
                        'from-blue-500 to-indigo-600',
                        'from-orange-400 to-pink-500',
                        'from-purple-500 to-pink-600',
                    ];
                    const bgGradient = gradients[index % gradients.length];

                    return (
                        <Link
                            key={post.id}
                            to={`/blog/${post.slug}`}
                            className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 transition-all hover:-translate-y-1 hover:shadow-lg"
                        >
                            {/* Featured Image */}
                            <div className={`h-32 bg-gradient-to-br ${bgGradient} relative overflow-hidden`}>
                                {post.featured_image ? (
                                    <>
                                        <img
                                            src={post.featured_image}
                                            alt={post.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                                        {post.category || 'Article'}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {post.published_at
                                            ? new Date(post.published_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : 'Draft'}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                    {post.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {post.excerpt || post.content_md?.substring(0, 80) + '...'}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* View All Button */}
            <div className="mt-6 text-center">
                <Link
                    to={`/blog?category=${encodeURIComponent(category)}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-semibold rounded-xl transition-all border border-gray-200 dark:border-gray-600 hover:border-green-500"
                >
                    View All {category} Articles
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
};

export default CategoryPosts;
