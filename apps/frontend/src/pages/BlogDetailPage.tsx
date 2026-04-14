import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost } from '../services/blogService';
import AuthorBox from '../components/blog/AuthorBox';
import ReactionBar from '../components/blog/ReactionBar';
import CommentsSection from '../components/blog/CommentsSection';
import RelatedPosts from '../components/blog/RelatedPosts';
import CategoryPosts from '../components/blog/CategoryPosts';

const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [categoryPosts, setCategoryPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) {
        setError('Blog post not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await blogService.get(slug);
        setPost(data);

        // Load related posts (4 posts based on tags)
        const related = await blogService.getRelated(slug, 4);
        setRelatedPosts(related);

        // Load category posts (6 posts from same category)
        const category = await blogService.getRelated(slug, 6);
        setCategoryPosts(category);
      } catch (e: any) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  // Simple content parser - just render markdown as paragraphs and headings
  const parseContent = (content: string) => {
    return content.split('\n').filter(line => line.trim() !== '');
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center font-['Plus_Jakarta_Sans']">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading article...</p>
        </div>
      </MainLayout>
    );
  }

  // --- ERROR STATE ---
  if (error || !post) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center font-['Plus_Jakarta_Sans'] px-4">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Post Not Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">{error || 'The blog post you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/blog')}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold shadow-lg shadow-green-600/20 transition-all"
            >
              Back to Blog
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // --- MAIN CONTENT ---
  const contentLines = parseContent(post.content_md);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white">
        {/* Styles Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        `}</style>

        {/* Back Button */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate('/blog')}
              className="group inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-semibold">Back to Blog</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Article Header */}
          <div className="max-w-4xl mx-auto mb-12">
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Author and Published Date */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  A
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">Admin</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                      : 'Draft'}
                    <span className="mx-2">•</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {Math.ceil(post.content_md.split(' ').length / 200)} min read
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            {post.featured_image && (
              <div className="mb-8">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-2xl shadow-lg"
                />
              </div>
            )}
          </div>

          {/* Simple Article Layout */}
          <div className="max-w-4xl mx-auto">
            <article className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 md:p-12 shadow-lg mb-8">

              {/* Article Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {contentLines.map((line, index) => {
                    if (line.trim() === '') return null;

                    // Simple heading detection
                    if (line.startsWith('# ')) {
                      return (
                        <h1 key={index} className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
                          {line.substring(2)}
                        </h1>
                      );
                    }
                    if (line.startsWith('## ')) {
                      return (
                        <h2 key={index} className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
                          {line.substring(3)}
                        </h2>
                      );
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <h3 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
                          {line.substring(4)}
                        </h3>
                      );
                    }

                    // Regular paragraph
                    return (
                      <p key={index} className="mb-4 text-base leading-7">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {(typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Author Box */}
            <div className="mb-8">
              <AuthorBox />
            </div>

            {/* Reaction Bar */}
            <div className="mb-8">
              <ReactionBar
                postId={post.id.toString()}
                initialLikes={post.like_count || 0}
                initialDislikes={post.dislike_count || 0}
                initialUserReaction={(post as any).user_reaction || null}
              />
            </div>

            {/* Comments Section */}
            <div className="mb-8">
              <CommentsSection postId={parseInt(post.id)} postSlug={post.slug} />
            </div>

            {/* Related Posts (4 posts based on tags) */}
            {relatedPosts.length > 0 && (
              <div className="mb-8">
                <RelatedPosts posts={relatedPosts} title="Related Articles" />
              </div>
            )}

            {/* Category Posts (6 posts from same category) */}
            {categoryPosts.length > 0 && post.category && (
              <div className="mb-8">
                <CategoryPosts posts={categoryPosts} category={post.category} />
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default BlogDetailPage;
