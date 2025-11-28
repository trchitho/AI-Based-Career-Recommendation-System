import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useTranslation } from 'react-i18next';

interface AdminPost {
  id: string;
  title: string;
  slug: string;
  content_md: string;
  status?: string;
  published_at?: string | null;
  created_at?: string | null;
}

interface PostForm {
  title: string;
  slug: string;
  content_md: string;
  status: string;
}

const emptyForm: PostForm = {
  title: '',
  slug: '',
  content_md: '',
  status: 'Draft',
};

/* 🎨 THEME CLASSES */
const inputClass =
  'w-full px-3 py-2 rounded-lg border ' +
  'bg-white text-black placeholder-gray-500 ' +
  'focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'dark:bg-[#1E293B] dark:text-white dark:border-[#334155]';

const cardClass =
  'rounded-lg shadow p-6 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155]';

const tableHeadClass =
  'bg-gray-100 dark:bg-[#1E293B] text-gray-700 dark:text-gray-200';

const tableRowClass =
  'border-t border-gray-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] ' +
  'hover:bg-gray-50 dark:hover:bg-[#1E253A]';

const primaryBtn =
  'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50';

const BlogManagementPage = () => {
  const { t } = useTranslation();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PostForm>(emptyForm);
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await adminService.listPosts();
      setPosts(rows || []);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
        e?.message ||
        t('blog.loadFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createPost(form);
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
        e?.message ||
        t('blog.createFailed')
      );
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
      alert(
        e?.response?.data?.detail ||
        e?.message ||
        t('blog.updateFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t('blog.confirmDelete'))) return;
    try {
      await adminService.deletePost(id);
      await load();
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
        e?.message ||
        t('blog.deleteFailed')
      );
    }
  };

  const togglePublish = async (p: AdminPost) => {
    const next = p.status === 'Published' ? 'Draft' : 'Published';
    try {
      await adminService.updatePost(String(p.id), { status: next });
      await load();
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
        e?.message ||
        t('blog.statusUpdateFailed')
      );
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-black dark:text-white">
        {t("blog.managePosts")}
      </h1>

      {/* Create Form */}
      <div className={cardClass}>
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
          {t("blog.newPost")}
        </h2>

        <form onSubmit={onCreate} className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className={inputClass}
              placeholder={t("blog.titlePlaceholder")}
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              required
            />

            <input
              className={inputClass}
              placeholder={t("blog.slugPlaceholder")}
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <select
              className={inputClass + ' md:col-span-1'}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="Draft">{t("blog.statusDraft")}</option>
              <option value="Published">{t("blog.statusPublished")}</option>
            </select>

            <textarea
              className={inputClass + ' md:col-span-3 h-40'}
              placeholder={t("blog.contentPlaceholder")}
              value={form.content_md}
              onChange={(e) =>
                setForm((f) => ({ ...f, content_md: e.target.value }))
              }
            />
          </div>

          <button className={primaryBtn} disabled={submitting}>
            {submitting ? t("blog.creating") : t("blog.createPost")}
          </button>
        </form>
      </div>

      {/* LIST */}
      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-black dark:text-white p-4 border-b border-gray-200 dark:border-[#334155]">
          {t("blog.allPosts")}
        </h2>

        {loading ? (
          <div className="p-4 text-gray-600 dark:text-gray-300">
            {t("blog.loading")}
          </div>
        ) : error ? (
          <div className="p-4 text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-700 dark:text-gray-200">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-2 text-left">{t("blog.colTitle")}</th>
                  <th className="px-4 py-2 text-left">{t("blog.colSlug")}</th>
                  <th className="px-4 py-2 text-center">{t("blog.colStatus")}</th>
                  <th className="px-4 py-2 text-center">{t("blog.colPublished")}</th>
                  <th className="px-4 py-2 text-center">{t("blog.colActions")}</th>
                </tr>
              </thead>

              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className={tableRowClass}>
                    <td className="px-4 py-2">{p.title}</td>
                    <td className="px-4 py-2">{p.slug}</td>

                    <td className="px-4 py-2 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded ${p.status === 'Published'
                            ? 'bg-green-100 text-green-800 dark:bg-green-300 dark:text-green-900'
                            : 'bg-gray-200 text-gray-800 dark:bg-gray-400 dark:text-gray-900'
                          }`}
                      >
                        {p.status === 'Published'
                          ? t("blog.statusPublished")
                          : t("blog.statusDraft")}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-center">
                      {p.published_at
                        ? new Date(p.published_at).toLocaleString()
                        : '-'}
                    </td>

                    <td className="px-4 py-2 text-center space-x-2">
                      <button
                        className="px-2 py-1 border border-gray-500 dark:border-gray-400 rounded text-black dark:text-white"
                        onClick={() => setEditing(p)}
                      >
                        {t("blog.edit")}
                      </button>

                      <button
                        className="px-2 py-1 border border-gray-500 dark:border-gray-400 rounded text-black dark:text-white"
                        onClick={() => togglePublish(p)}
                      >
                        {p.status === 'Published'
                          ? t("blog.unpublish")
                          : t("blog.publish")}
                      </button>

                      <button
                        className="px-2 py-1 border border-red-500 rounded text-red-600 dark:text-red-400"
                        onClick={() => onDelete(String(p.id))}
                      >
                        {t("blog.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow max-w-2xl w-full p-6 border border-gray-200 dark:border-[#334155]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">
                {t("blog.editPost")}
              </h3>
              <button
                className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                onClick={() => setEditing(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={onUpdate} className="space-y-4">
              <input
                className={inputClass}
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />

              <input
                className={inputClass}
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
              />

              <select
                className={inputClass}
                value={editing.status || 'Draft'}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                <option value="Draft">{t("blog.statusDraft")}</option>
                <option value="Published">{t("blog.statusPublished")}</option>
              </select>

              <textarea
                className={inputClass + ' h-40'}
                value={editing.content_md}
                onChange={(e) =>
                  setEditing({ ...editing, content_md: e.target.value })
                }
              />

              <div className="flex gap-2">
                <button disabled={submitting} className={primaryBtn}>
                  {submitting ? t("blog.saving") : t("blog.save")}
                </button>

                <button
                  type="button"
                  className="px-4 py-2 border border-gray-400 dark:border-gray-300 rounded text-black dark:text-white"
                  onClick={() => setEditing(null)}
                >
                  {t("blog.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagementPage;
