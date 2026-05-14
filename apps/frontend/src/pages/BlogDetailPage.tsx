import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Share2, ThumbsUp, Eye, Tag, List, X } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost } from '../services/blogService';
import { getBlogImage, getBlogGradient } from '../utils/blogImages';
import ReactMarkdown from 'react-markdown';
import BlogInteractionSection from '../components/blog/BlogInteractionSection';
import RelatedArticles from '../components/blog/RelatedArticles';

interface Heading {
    id: string;
    text: string;
    level: number;
}

const BlogDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [activeHeading, setActiveHeading] = useState<string>('');
    const [tocOpen, setTocOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!slug) {
            navigate('/blog');
            return;
        }

        const loadPost = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await blogService.get(slug);
                setPost(data);

                // Extract headings from content
                if (data.content_md) {
                    const extractedHeadings = extractHeadings(data.content_md);
                    setHeadings(extractedHeadings);
                }

                // Load related posts
                const related = await blogService.getRelated(slug, 3);
                setRelatedPosts(related);
            } catch (e: any) {
                setError(e?.response?.data?.detail || e?.message || 'Failed to load article');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [slug, navigate]);

    // Extract headings from markdown content
    const extractHeadings = (content: string): Heading[] => {
        const headingRegex = /^(#{2,3})\s+(.+)$/gm;
        const extracted: Heading[] = [];
        let match;

        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            const text = match[2].trim();
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            extracted.push({ id, text, level });
        }

        return extracted;
    };

    // Intersection Observer for active heading
    useEffect(() => {
        if (!contentRef.current || headings.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveHeading(entry.target.id);
                    }
                });
            },
            { rootMargin: '-100px 0px -80% 0px' }
        );

        const headingElements = contentRef.current.querySelectorAll('h2, h3');
        headingElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [headings]);

    // Smooth scroll to heading
    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setTocOpen(false);
        }
    };

    // Calculate reading time
    const calculateReadingTime = (content: string) => {
        const words = content.split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return `${minutes} min read`;
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

    // Handle share
    const handleShare = async () => {
        if (navigator.share && post) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.excerpt || post.title,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share failed:', err);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !post) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-6">
                    <div className="bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center max-w-2xl">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-red-600 dark:text-red-400 font-semibold text-lg mb-6">
                            {error || 'Article not found'}
                        </p>
                        <button
                            onClick={() => navigate('/blog')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Blog
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const readingTime = calculateReadingTime(post.content_md || '');
    const publishDate = post.published_at
        ? new Date(post.published_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Draft';

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Back Button */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <button
                            onClick={() => navigate('/blog')}
                            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-all duration-250"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Blog
                        </button>
                    </div>
                </div>

                {/* Hero Section */}
                <article className="bg-white dark:bg-gray-800">
                    <div className="max-w-7xl mx-auto px-6 py-10">
                        {/* Category Badge */}
                        <div className="mb-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold uppercase tracking-wide">
                                {getCategoryDisplayName(post.category)}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                            {post.title}
                        </h1>

                        {/* Excerpt */}
                        {post.excerpt && (
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                                {post.excerpt}
                            </p>
                        )}

                        {/* Meta Info Row */}
                        <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400 text-sm mb-6">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{publishDate}</span>
                            </div>
                            {post.view_count !== undefined && (
                                <div className="flex items-center gap-1.5">
                                    <Eye className="w-4 h-4" />
                                    <span>{post.view_count} views</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>{readingTime}</span>
                            </div>
                        </div>

                        {/* Share Button */}
                        <div className="mb-8">
                            <button
                                onClick={handleShare}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-250 font-medium text-gray-700 dark:text-gray-300 text-sm"
                            >
                                <Share2 className="w-4 h-4" />
                                <span>Share</span>
                            </button>
                        </div>
                    </div>

                    {/* Featured Image */}
                    <div className="max-w-7xl mx-auto px-6 pb-8">
                        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                            {post.featured_image ? (
                                <img
                                    src={getBlogImage(post.category, post.featured_image)}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop';
                                    }}
                                />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${getBlogGradient(post.category)} flex items-center justify-center`}>
                                    <img
                                        src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop"
                                        alt="Placeholder"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content with TOC */}
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
                            {/* Main Content - 70% */}
                            <div className="lg:col-span-8">
                                <div
                                    ref={contentRef}
                                    className="prose prose-lg max-w-none space-y-6"
                                >
                                    <ReactMarkdown
                                        components={{
                                            h2: ({ node, ...props }) => {
                                                const text = props.children?.toString() || '';
                                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                                return (
                                                    <h2
                                                        id={id}
                                                        className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 scroll-mt-24"
                                                        {...props}
                                                    />
                                                );
                                            },
                                            h3: ({ node, ...props }) => {
                                                const text = props.children?.toString() || '';
                                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                                return (
                                                    <h3
                                                        id={id}
                                                        className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3 scroll-mt-24"
                                                        {...props}
                                                    />
                                                );
                                            },
                                            p: ({ node, ...props }) => (
                                                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-4" style={{ lineHeight: '1.7' }} {...props} />
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
                                            img: ({ node, ...props }) => (
                                                <img
                                                    className="rounded-xl my-6 w-full"
                                                    style={{ margin: '24px 0' }}
                                                    {...props}
                                                />
                                            ),
                                            a: ({ node, ...props }) => (
                                                <a
                                                    className="text-green-600 dark:text-green-400 hover:underline transition-all duration-250"
                                                    {...props}
                                                />
                                            ),
                                            blockquote: ({ node, ...props }) => (
                                                <blockquote
                                                    className="border-l-4 border-green-500 pl-4 italic text-gray-600 dark:text-gray-400 my-6"
                                                    {...props}
                                                />
                                            ),
                                            code: ({ node, inline, ...props }: any) =>
                                                inline ? (
                                                    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-green-600 dark:text-green-400" {...props} />
                                                ) : (
                                                    <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono overflow-x-auto my-4" {...props} />
                                                )
                                        }}
                                    >
                                        {post.content_md || ''}
                                    </ReactMarkdown>
                                </div>

                                {/* Tags */}
                                {post.tags && post.tags.length > 0 && (
                                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Tags:</span>
                                            {post.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-250 cursor-pointer"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Blog Interaction Section */}
                                <BlogInteractionSection
                                    postId={post.id}
                                    postSlug={post.slug}
                                    initialLikes={post.like_count}
                                    initialDislikes={post.dislike_count}
                                />
                            </div>

                            {/* Desktop TOC Sidebar - 30% */}
                            {headings.length > 0 && (
                                <aside className="hidden lg:block lg:col-span-4">
                                    <div className="sticky top-24 space-y-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <List className="w-5 h-5" />
                                                Table of Contents
                                            </h3>
                                            <nav className="space-y-2.5">
                                                {headings.map((heading) => (
                                                    <button
                                                        key={heading.id}
                                                        onClick={() => scrollToHeading(heading.id)}
                                                        className={`block w-full text-left text-sm transition-all duration-250 hover:text-green-600 dark:hover:text-green-400 py-1 ${activeHeading === heading.id
                                                            ? 'text-green-600 dark:text-green-400 font-semibold'
                                                            : 'text-gray-600 dark:text-gray-400'
                                                            } ${heading.level === 3 ? 'pl-4' : ''}`}
                                                    >
                                                        {heading.text}
                                                    </button>
                                                ))}
                                            </nav>
                                        </div>

                                        {/* Share Buttons in Sidebar */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                                                Share Article
                                            </h3>
                                            <button
                                                onClick={handleShare}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-all duration-250"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                Share
                                            </button>
                                        </div>
                                    </div>
                                </aside>
                            )}
                        </div>
                    </div>

                    {/* Mobile TOC Button */}
                    {headings.length > 0 && (
                        <>
                            <button
                                onClick={() => setTocOpen(!tocOpen)}
                                className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg transition-all duration-250"
                            >
                                <List className="w-5 h-5" />
                                Contents
                            </button>

                            {/* Mobile TOC Overlay */}
                            {tocOpen && (
                                <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setTocOpen(false)}>
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <List className="w-5 h-5" />
                                                Table of Contents
                                            </h3>
                                            <button
                                                onClick={() => setTocOpen(false)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <nav className="space-y-3">
                                            {headings.map((heading) => (
                                                <button
                                                    key={heading.id}
                                                    onClick={() => scrollToHeading(heading.id)}
                                                    className={`block w-full text-left text-base transition-all duration-250 hover:text-green-600 dark:hover:text-green-400 py-2 ${activeHeading === heading.id
                                                        ? 'text-green-600 dark:text-green-400 font-semibold'
                                                        : 'text-gray-600 dark:text-gray-400'
                                                        } ${heading.level === 3 ? 'pl-4' : ''}`}
                                                >
                                                    {heading.text}
                                                </button>
                                            ))}
                                        </nav>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </article>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <RelatedArticles posts={relatedPosts} />
                )}
            </div>
        </MainLayout>
    );
};

export default BlogDetailPage;
