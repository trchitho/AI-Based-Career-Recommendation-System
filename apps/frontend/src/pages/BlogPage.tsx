import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost, BlogListResponse } from '../services/blogService';

const BlogPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: BlogListResponse = await blogService.list({ page, pageSize });
      setPosts(resp.items || []);
      setTotal(resp.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await blogService.create({ title, content_md: content });
      setShowForm(false);
      setTitle('');
      setContent('');
      load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Career Insights & Tips
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Discover expert advice, career guidance, and success stories to help you navigate your professional journey
          </p>
          <button
            className="px-6 py-3 rounded-lg 
                       bg-[#4A7C59] dark:bg-green-600
                       text-white font-semibold
                       hover:bg-[#3d6449] dark:hover:bg-green-700
                       active:scale-95 transition shadow-lg
                       flex items-center gap-2 mx-auto"
            onClick={() => setShowForm(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Post
          </button>
        </div>

        {/* Create Form Modal */}
        {showForm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Form Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Post</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={submit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Post Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter an engaging title..."
                    required
                    className="w-full px-4 py-3 rounded-lg
                               bg-white dark:bg-gray-900
                               border border-gray-300 dark:border-gray-700
                               text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 focus:border-transparent
                               transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your insights, tips, or stories..."
                    rows={10}
                    required
                    className="w-full px-4 py-3 rounded-lg
                               bg-white dark:bg-gray-900
                               border border-gray-300 dark:border-gray-700
                               text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 focus:border-transparent
                               transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 rounded-lg 
                               bg-[#4A7C59] dark:bg-green-600
                               text-white font-semibold
                               hover:bg-[#3d6449] dark:hover:bg-green-700
                               disabled:opacity-50 disabled:cursor-not-allowed
                               active:scale-95 transition-all shadow-lg
                               flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Publish Post
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="px-6 py-3 rounded-lg border-2
                               border-gray-300 dark:border-gray-600
                               text-gray-700 dark:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-700
                               font-semibold transition-colors"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#4A7C59] dark:border-green-600 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading posts...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 dark:text-red-300 font-semibold">{error}</p>
          </div>
        )}
        
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No posts yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Be the first to share your career insights!</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 font-semibold transition-colors shadow-lg"
            >
              Create First Post
            </button>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p, index) => {
              // Generate placeholder image based on index
              const imageColors = [
                'from-[#4A7C59] to-[#3d6449]',
                'from-[#E8DCC8] to-[#D4C4B0]',
                'from-green-600 to-green-700',
                'from-[#6B8E7C] to-[#4A7C59]',
                'from-amber-500 to-orange-600',
                'from-blue-500 to-blue-600',
              ];
              const bgGradient = imageColors[index % imageColors.length];

              return (
                <article
                  key={p.slug}
                  onClick={() => navigate(`/blog/${p.slug}`)}
                  className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-lg
                             border border-gray-200 dark:border-gray-700
                             hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden
                             flex flex-col h-full"
                >
                  {/* Image Placeholder */}
                  <div className={`h-48 bg-gradient-to-br ${bgGradient} flex items-center justify-center relative overflow-hidden flex-shrink-0`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                    <svg className="w-16 h-16 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>

                  {/* Content - flex-grow để chiếm hết không gian còn lại */}
                  <div className="p-5 flex flex-col flex-grow">
                    {/* Date - fixed height */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center h-5">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {p.published_at ? new Date(p.published_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 'Draft'}
                    </p>

                    {/* Title - fixed 2 lines */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 h-14 group-hover:text-[#4A7C59] dark:group-hover:text-green-400 transition-colors">
                      {p.title}
                    </h3>

                    {/* Description - fixed 3 lines, flex-grow để đẩy "Read more" xuống dưới */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 flex-grow h-[4.5rem]">
                      {p.content_md}
                    </p>

                    {/* Read more - luôn ở dưới cùng */}
                    <div className="flex items-center text-[#4A7C59] dark:text-green-400 text-sm font-semibold group-hover:translate-x-1 transition-transform mt-auto">
                      Read more
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border
                         bg-white dark:bg-gray-800
                         border-gray-300 dark:border-gray-700
                         text-gray-700 dark:text-gray-200
                         hover:bg-gray-50 dark:hover:bg-gray-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all flex items-center gap-2"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-2 px-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
            </div>

            <button
              className="px-4 py-2 rounded-lg
                         bg-[#4A7C59] dark:bg-green-600
                         text-white font-medium
                         hover:bg-[#3d6449] dark:hover:bg-green-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all flex items-center gap-2 shadow-lg"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

      </div>
      </div>
    </MainLayout>
  );
};

export default BlogPage;
