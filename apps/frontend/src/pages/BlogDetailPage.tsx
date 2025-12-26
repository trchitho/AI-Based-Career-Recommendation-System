import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost } from '../services/blogService';

const BlogDetailPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
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
        
        // Load related posts
        const related = await blogService.getRelated(slug, 2);
        setRelatedPosts(related);
      } catch (e: any) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================

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
  return (
    <MainLayout>
      <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white selection:bg-green-100 selection:text-green-900 pb-20">

        {/* Styles Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
        `}</style>

        {/* Hero Section with Featured Image (Gradient Fallback) */}
        <div className="relative h-[450px] bg-gradient-to-br from-green-600 to-teal-700 overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

          <div className="absolute inset-0 flex items-center justify-center">
            {/* Icon Placeholder nếu không có ảnh */}
            <svg className="w-40 h-40 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>

          {/* Back Button (Floating Pill) */}
          <div className="absolute top-8 left-4 md:left-8 z-10">
            <button
              onClick={() => navigate('/blog')}
              className="group px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full hover:bg-white/20 transition-all shadow-lg flex items-center gap-2 font-bold text-sm"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </button>
          </div>
        </div>

        {/* Content Wrapper (Overlapping Hero) */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 animate-fade-in-up">
          <article className="bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">

            <div className="px-6 md:px-12 py-10 md:py-14">

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                  Article
                </span>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Draft'}
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {Math.ceil(post.content_md.split(' ').length / 200)} min read
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-8 leading-tight">
                {post.title}
              </h1>

              {/* Author & Share Row */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-8 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                    A
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">Admin</div>
                    <div className="text-xs text-gray-500">Author</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-gray-600 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                  </button>
                  <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-600 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="prose prose-lg dark:prose-invert prose-green max-w-none">
                <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {post.content_md.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-6 first:first-letter:text-5xl first:first-letter:font-bold first:first-letter:text-green-600 first:first-letter:mr-1 first:first-letter:float-left">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Tags Section */}
              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {['Career', 'Development', 'Tips'].map((tag) => (
                    <span key={tag} className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors cursor-pointer">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </article>

          {/* Related Posts - Dynamic */}
          {relatedPosts.length > 0 && (
            <div className="mt-20">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link 
                    key={relatedPost.id} 
                    to={`/blog/${relatedPost.slug}`}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:-translate-y-1 transition-transform cursor-pointer group"
                  >
                    <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl mb-4 overflow-hidden relative">
                      {relatedPost.featured_image ? (
                        <img 
                          src={relatedPost.featured_image} 
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors"></div>
                    </div>
                    <div className="text-xs text-green-600 font-bold uppercase tracking-wider mb-2">
                      {relatedPost.category || 'Article'}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 transition-colors">
                      {relatedPost.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">
                      {relatedPost.excerpt || relatedPost.content_md.substring(0, 100) + '...'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default BlogDetailPage;