import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogService, BlogPost, BlogListResponse } from '../../services/blogService';
import BlogPreviewModal from '../../components/admin/BlogPreviewModal';

const BlogManagementPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: BlogListResponse = await blogService.adminList({ page: 1, pageSize: 50 });
      setPosts(resp.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      await blogService.adminDelete(id);
      await loadPosts(); // Reload list
    } catch (e: any) {
      alert('Cannot delete blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await blogService.adminUpdate(id, { status: 'Published' });
      await loadPosts(); // Reload list
      showSuccessToast('Blog approved successfully!');
    } catch (e: any) {
      alert('Cannot approve blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  const handleView = (id: string) => {
    setSelectedBlogId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBlogId(null);
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleReject = async (id: string) => {
    try {
      await blogService.adminUpdate(id, { status: 'Rejected' });
      await loadPosts(); // Reload list
      showSuccessToast('Blog rejected successfully!');
    } catch (e: any) {
      alert('Cannot reject blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Blog Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tạo, chỉnh sửa và quản lý bài viết blog</p>
        </div>
        <button onClick={() => navigate('/admin/blog/create')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tạo Blog Mới
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Đang tải...
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm mb-4">Chưa có bài viết nào</p>
              <button onClick={() => navigate('/admin/blog/create')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">
                Tạo bài viết đầu tiên
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Title</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Created At</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{post.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{post.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {post.category || 'Không có'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded border ${post.status === 'Published'
                            ? 'bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800'
                            : post.status === 'Pending'
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                              : post.status === 'Rejected'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                          }`}>
                          {post.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => navigate(`/blog/${post.slug}`)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">View</button>
                          {post.status === 'Pending' && (<>
                            <button onClick={() => handleApprove(post.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors">Approve</button>
                            <button onClick={() => handleReject(post.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors">Reject</button>
                          </>)}
                          {post.status === 'Draft' && (
                            <button onClick={() => handleApprove(post.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors">Publish</button>
                          )}
                          {post.status === 'Published' && (
                            <button onClick={() => blogService.adminUpdate(post.id, { status: 'Draft' }).then(() => loadPosts())}
                              className="px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 transition-colors">Unpublish</button>
                          )}
                          <button onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors">Edit</button>
                          <button onClick={() => handleDelete(post.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Blog Preview Modal */}
      <BlogPreviewModal
        isOpen={isModalOpen}
        blogId={selectedBlogId}
        onClose={handleCloseModal}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={(id) => navigate(`/admin/blog/edit/${id}`)}
      />

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BlogManagementPage;
