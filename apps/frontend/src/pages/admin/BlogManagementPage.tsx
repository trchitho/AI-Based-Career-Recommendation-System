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
    } catch (e: any) {
      alert('Cannot approve blog: ' + (e?.response?.data?.detail || e?.message));
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this blog?')) return;
    
    try {
      await blogService.adminUpdate(id, { status: 'Rejected' });
      await loadPosts(); // Reload list
    } catch (e: any) {
      alert('Cannot reject blog: ' + (e?.response?.data?.detail || e?.message));
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                <span className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
                Blog Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-5">
                Create, edit and manage blog posts
              </p>
            </div>
            
            <button
              onClick={() => navigate('/admin/blog/create')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/30 hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Blog
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Blog List */}
          {!loading && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg overflow-hidden">
              
              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No blogs yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Start by creating your first blog post.</p>
                  <button
                    onClick={() => navigate('/admin/blog/create')}
                    className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-green-500/30"
                  >
                    Create New Blog
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
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
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border ${
                              post.status === 'Published' 
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                : post.status === 'Pending'
                                ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                : post.status === 'Rejected'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                            }`}>
                              {post.status === 'Published' ? 'Published' 
                               : post.status === 'Pending' ? 'Pending'
                               : post.status === 'Rejected' ? 'Rejected'
                               : 'Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {post.created_at ? new Date(post.created_at).toLocaleDateString('en-US') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigate(`/blog/${post.slug}`)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors"
                              >
                                View
                              </button>
                              
                              {/* Status action buttons */}
                              {post.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(post.id)}
                                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold border border-green-200 dark:border-green-800 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReject(post.id)}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              
                              {/* Publish button for drafts */}
                              {post.status === 'Draft' && (
                                <button
                                  onClick={() => handleApprove(post.id)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors"
                                >
                                  Publish
                                </button>
                              )}
                              
                              {/* Unpublish button for published posts */}
                              {post.status === 'Published' && (
                                <button
                                  onClick={() => blogService.adminUpdate(post.id, { status: 'Draft' }).then(() => loadPosts())}
                                  className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-semibold border border-orange-200 dark:border-orange-800 transition-colors"
                                >
                                  Unpublish
                                </button>
                              )}
                              
                              <button
                                onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 transition-colors"
                              >
                                Delete
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