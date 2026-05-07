import { useEffect, useState } from 'react';
import { X, Calendar, Clock, Eye, CheckCircle, XCircle, Edit } from 'lucide-react';
import { BlogPost, blogService } from '../../services/blogService';
import { getBlogImage } from '../../utils/blogImages';
import ReactMarkdown from 'react-markdown';

interface BlogPreviewModalProps {
    isOpen: boolean;
    blogId: string | null;
    onClose: () => void;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onEdit?: (id: string) => void;
}

const BlogPreviewModal = ({
    isOpen,
    blogId,
    onClose,
    onApprove,
    onReject,
    onEdit
}: BlogPreviewModalProps) => {
    const [blog, setBlog] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && blogId) {
            loadBlog();
        } else {
            setBlog(null);
            setError(null);
        }
    }, [isOpen, blogId]);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const loadBlog = async () => {
        if (!blogId) return;

        setLoading(true);
        setError(null);
        try {
            const response = await blogService.adminList({ page: 1, pageSize: 100 });
            const foundBlog = response.items.find(b => b.id === blogId);

            if (foundBlog) {
                setBlog(foundBlog);
            } else {
                setError('Blog not found');
            }
        } catch (e: any) {
            setError(e?.response?.data?.detail || e?.message || 'Failed to load blog');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!blog) return;

        setProcessing(true);
        try {
            await onApprove(blog.id);
            onClose();
        } catch (e: any) {
            alert('Failed to approve: ' + (e?.response?.data?.detail || e?.message));
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!blog) return;

        if (!confirm('Are you sure you want to reject this blog?')) return;

        setProcessing(true);
        try {
            await onReject(blog.id);
            onClose();
        } catch (e: any) {
            alert('Failed to reject: ' + (e?.response?.data?.detail || e?.message));
        } finally {
            setProcessing(false);
        }
    };

    const handleEdit = () => {
        if (blog && onEdit) {
            onEdit(blog.id);
            onClose();
        }
    };

    const calculateReadingTime = (content: string) => {
        const words = content.split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return `${minutes} min read`;
    };

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

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-[90%] max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                    disabled={processing}
                >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
                        </div>
                    ) : blog ? (
                        <>
                            {/* Header Section */}
                            <div className="p-8 pb-6">
                                {/* Category Badge */}
                                <div className="mb-4">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold uppercase tracking-wide">
                                        {getCategoryDisplayName(blog.category)}
                                    </span>
                                </div>

                                {/* Title */}
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                                    {blog.title}
                                </h1>

                                {/* Excerpt */}
                                {blog.excerpt && (
                                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                                        {blog.excerpt}
                                    </p>
                                )}

                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400 text-sm mb-4">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {blog.created_at
                                                ? new Date(blog.created_at).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })
                                                : 'Draft'}
                                        </span>
                                    </div>
                                    {blog.view_count !== undefined && (
                                        <div className="flex items-center gap-1.5">
                                            <Eye className="w-4 h-4" />
                                            <span>{blog.view_count} views</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        <span>{calculateReadingTime(blog.content_md || '')}</span>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="mb-6">
                                    <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-full border ${blog.status === 'Published'
                                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                        : blog.status === 'Pending'
                                            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                            : blog.status === 'Rejected'
                                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                                        }`}>
                                        {blog.status || 'Draft'}
                                    </span>
                                </div>
                            </div>

                            {/* Featured Image */}
                            {blog.featured_image && (
                                <div className="px-8 pb-6">
                                    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                                        <img
                                            src={getBlogImage(blog.category, blog.featured_image)}
                                            alt={blog.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="px-8 pb-8">
                                <div className="prose prose-lg max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ node, ...props }) => (
                                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4" {...props} />
                                            ),
                                            h3: ({ node, ...props }) => (
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3" {...props} />
                                            ),
                                            p: ({ node, ...props }) => (
                                                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-4" {...props} />
                                            ),
                                            ul: ({ node, ...props }) => (
                                                <ul className="list-disc list-inside mb-6 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                                            ),
                                            ol: ({ node, ...props }) => (
                                                <ol className="list-decimal list-inside mb-6 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                                            ),
                                            li: ({ node, ...props }) => (
                                                <li className="text-base leading-relaxed" {...props} />
                                            ),
                                            a: ({ node, ...props }) => (
                                                <a className="text-green-600 dark:text-green-400 hover:underline" {...props} />
                                            ),
                                            blockquote: ({ node, ...props }) => (
                                                <blockquote className="border-l-4 border-green-500 pl-4 italic text-gray-600 dark:text-gray-400 my-6" {...props} />
                                            ),
                                            code: ({ node, inline, ...props }: any) =>
                                                inline ? (
                                                    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-green-600 dark:text-green-400" {...props} />
                                                ) : (
                                                    <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono overflow-x-auto my-4" {...props} />
                                                )
                                        }}
                                    >
                                        {blog.content_md || ''}
                                    </ReactMarkdown>
                                </div>

                                {/* Tags */}
                                {blog.tags && blog.tags.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Tags:</span>
                                            {blog.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Sticky Footer with Actions */}
                {blog && (
                    <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 px-8 py-4 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Close
                        </button>

                        {onEdit && (
                            <button
                                onClick={handleEdit}
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                        )}

                        {blog.status !== 'Published' && (
                            <button
                                onClick={handleApprove}
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                    </>
                                )}
                            </button>
                        )}

                        {blog.status !== 'Rejected' && (
                            <button
                                onClick={handleReject}
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default BlogPreviewModal;
