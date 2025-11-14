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
    setLoading(true); setError(null);
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

  // Simple local create form
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
      setTitle(''); setContent('');
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Blog</h1>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" onClick={()=>setShowForm(true)}>New Post</button>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <form onSubmit={submit} className="space-y-3">
              <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 border rounded" required />
              <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Write your post..." rows={6} className="w-full px-3 py-2 border rounded" required />
              <div className="flex gap-2">
                <button disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">{submitting? 'Publishing...' : 'Publish'}</button>
                <button type="button" className="px-4 py-2 border rounded" onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-700">{error}</div>}
        {!loading && !error && posts.length === 0 && <div>No posts</div>}
        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((p) => (
              <article key={p.slug} className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500 mb-2">{p.published_at ? new Date(p.published_at).toLocaleString() : ''}</p>
                <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">{p.content_md}</p>
              </article>
            ))}
          </div>
        )}

        {!loading && total > pageSize && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button className="px-3 py-2 border rounded disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
            <button className="px-3 py-2 border rounded disabled:opacity-50" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BlogPage;

