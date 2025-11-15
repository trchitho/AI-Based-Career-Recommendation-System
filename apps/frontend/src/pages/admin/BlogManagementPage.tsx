import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

interface AdminPost {
  id: string;
  title: string;
  slug: string;
  content_md: string;
  status?: string;
  published_at?: string | null;
  created_at?: string | null;
}

const emptyForm = { title: '', slug: '', content_md: '', status: 'Draft' } as const;

const BlogManagementPage = () => {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const rows = await adminService.listPosts();
      setPosts(rows || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createPost(form);
      setForm({ ...emptyForm });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await adminService.updatePost(String(editing.id), {
        title: editing.title,
        slug: editing.slug,
        content_md: editing.content_md,
        status: editing.status,
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await adminService.deletePost(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Delete failed');
    }
  };

  const togglePublish = async (p: AdminPost) => {
    const next = p.status === 'Published' ? 'Draft' : 'Published';
    try {
      await adminService.updatePost(String(p.id), { status: next });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manage Posts</h1>

      {/* Create form */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">New Post</h2>
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
            <input className="border rounded px-3 py-2" placeholder="Slug (optional)" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <select className="border rounded px-3 py-2 md:col-span-1" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
            <textarea className="border rounded px-3 py-2 md:col-span-3" placeholder="Content (Markdown)" rows={5} value={form.content_md} onChange={e=>setForm(f=>({...f,content_md:e.target.value}))} />
          </div>
          <div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Posts</h2>
        </div>
        {loading ? (
          <div className="p-4">Loading...</div>
        ) : error ? (
          <div className="p-4 text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Slug</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Published</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">{p.title}</td>
                    <td className="px-4 py-2">{p.slug}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${p.status==='Published'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{p.status || 'Draft'}</span>
                    </td>
                    <td className="px-4 py-2 text-center">{p.published_at ? new Date(p.published_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 space-x-2 text-center">
                      <button className="px-2 py-1 border rounded" onClick={()=>setEditing(p)}>Edit</button>
                      <button className="px-2 py-1 border rounded" onClick={()=>togglePublish(p)}>
                        {p.status==='Published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="px-2 py-1 border rounded text-red-700" onClick={()=>onDelete(String(p.id))}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow max-w-2xl w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Edit Post</h3>
              <button className="px-2 py-1" onClick={()=>setEditing(null)}>✕</button>
            </div>
            <form onSubmit={onUpdate} className="space-y-3">
              <input className="border rounded px-3 py-2 w-full" value={editing.title} onChange={e=>setEditing({...editing, title: e.target.value})} />
              <input className="border rounded px-3 py-2 w-full" value={editing.slug} onChange={e=>setEditing({...editing, slug: e.target.value})} />
              <select className="border rounded px-3 py-2" value={editing.status || 'Draft'} onChange={e=>setEditing({...editing, status: e.target.value})}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
              <textarea className="border rounded px-3 py-2 w-full" rows={8} value={editing.content_md} onChange={e=>setEditing({...editing, content_md: e.target.value})} />
              <div className="flex gap-2">
                <button disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{submitting?'Saving...':'Save'}</button>
                <button type="button" className="px-4 py-2 border rounded" onClick={()=>setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BlogManagementPage;

