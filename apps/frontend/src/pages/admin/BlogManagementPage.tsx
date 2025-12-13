import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogService, BlogPost, BlogListResponse } from '../../services/blogService';

const BlogManagementPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp: BlogListResponse = await blogService.list({ page: 1, pageSize: 50 });
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
    if (!confirm('Bạn có chắc muốn xóa blog này?')) return;
    
    try {
      await blogService.deleteBlog(id);
      await loadPosts(); // Reload list
    } catch (e: any) {
      alert('Không thể xóa blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await blogService.updateBlog(id, { is_published: true });
      await loadPosts(); // Reload list
    } catch (e: any) {
      alert('Không thể duyệt blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Bạn có chắc muốn từ chối blog này?')) return;
    
    try {
      await blogService.updateBlog(id, { status: 'Rejected' });
      await loadPosts(); // Reload list
    } catch (e: any) {
      alert('Không thể từ chối blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white">
        
        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        `}</style>

        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-500/5 dark:bg-green-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
                Quản lý <span className="text-green-600 dark:text-green-500">Blog</span>
              </h1>
              <p className="text-xl text-gray-500 dark:text-gray-400">
                Tạo, chỉnh sửa và quản lý các bài viết blog
              </p>
            </div>
            
            <button
              onClick={() => navigate('/admin/blog/create')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo Blog Mới
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải...</p>
            </div>
          )}

          {/* Blog List */}
          {!loading && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Chưa có blog nào</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Bắt đầu bằng cách tạo blog đầu tiên của bạn.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/admin/blog/create')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Tạo Blog Mới
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tiêu đề
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Danh mục
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Ngày tạo
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {posts.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {post.title}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {post.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {post.category || 'Không có'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              post.status === 'Published' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : post.status === 'Pending'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                : post.status === 'Rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {post.status === 'Published' ? 'Đã xuất bản' 
                               : post.status === 'Pending' ? 'Chờ duyệt'
                               : post.status === 'Rejected' ? 'Từ chối'
                               : 'Bản nháp'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {post.created_at ? new Date(post.created_at).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigate(`/blog/${post.slug}`)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                Xem
                              </button>
                              
                              {/* Approval buttons for pending posts */}
                              {post.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(post.id)}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleReject(post.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              
                              <button
                                onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Xóa
                              </button>
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
        </div>
      </div>
  );
};

export default BlogManagementPage;