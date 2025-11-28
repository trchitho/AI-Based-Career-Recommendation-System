import { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost, BlogListResponse } from '../services/blogService';

const BlogPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog</h1>
          <button
            className="px-4 py-2 rounded-lg 
                       bg-gradient-to-r from-purple-500 to-purple-700 
                       text-white font-semibold
                       hover:from-purple-400 hover:to-purple-600
                       active:scale-95 transition"
            onClick={() => setShowForm(true)}
          >
            New Post
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mb-6 p-4 rounded-xl shadow-lg
                          bg-white dark:bg-[#1E2533]
                          border border-gray-200 dark:border-white/5">

            <form onSubmit={submit} className="space-y-3">

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className="w-full px-3 py-2 rounded-lg
                           bg-white dark:bg-[#111827]
                           border border-gray-300 dark:border-gray-700
                           text-gray-800 dark:text-gray-100"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post..."
                rows={6}
                required
                className="w-full px-3 py-2 rounded-lg
                           bg-white dark:bg-[#111827]
                           border border-gray-300 dark:border-gray-700
                           text-gray-800 dark:text-gray-100"
              />

              <div className="flex gap-2">
                <button
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg 
                             bg-gradient-to-r from-purple-500 to-purple-700 
                             text-white font-semibold
                             disabled:opacity-50 active:scale-95"
                >
                  {submitting ? 'Publishing...' : 'Publish'}
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border 
                             border-gray-300 dark:border-gray-700
                             text-gray-700 dark:text-gray-200"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Content */}
        {loading && <div className="text-gray-500 dark:text-gray-300">Loading...</div>}
        {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
        {!loading && !error && posts.length === 0 && (
          <div className="text-gray-600 dark:text-gray-300">No posts</div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((p) => (
              <article
                key={p.slug}
                className="p-4 rounded-xl shadow-lg
                           bg-white dark:bg-[#1E2533]
                           border border-gray-200 dark:border-white/5
                           transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {p.title}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {p.published_at ? new Date(p.published_at).toLocaleString() : ''}
                </p>

                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                  {p.content_md}
                </p>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="mt-6 flex items-center justify-center gap-3
                          bg-white/10 dark:bg-[#1E2533]/40
                          px-4 py-3 rounded-lg border 
                          border-purple-400/20 backdrop-blur shadow">

            <button
              className="px-3 py-2 rounded border
                         bg-gray-200 dark:bg-gray-700
                         text-gray-800 dark:text-gray-200
                         disabled:opacity-50 active:scale-95"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <span className="text-sm text-gray-700 dark:text-gray-200">
              Page {page} / {totalPages}
            </span>

            <button
              className="px-3 py-2 rounded border
                         bg-gradient-to-r from-purple-500 to-purple-700 
                         text-white
                         disabled:opacity-50 active:scale-95"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>

          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default BlogPage;
