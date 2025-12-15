import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blogService, UpdateBlogData } from '../../services/blogService';

const BlogEditPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content_md: '',
    excerpt: '',
    category: '',
    tags: '',
    featured_image: '',
    status: 'Draft'
  });

  // Load existing post data
  useEffect(() => {
    const loadPost = async () => {
      if (!id) return;
      
      setLoadingPost(true);
      try {
        // For now, we'll need to get the post by ID through admin API
        // Since we don't have a direct get by ID admin endpoint, we'll get all posts and find the one
        const resp = await blogService.adminList({ pageSize: 100 });
        const post = resp.items.find(p => p.id === id);
        
        if (post) {
          setFormData({
            title: post.title || '',
            content_md: post.content_md || '',
            excerpt: post.excerpt || '',
            category: post.category || '',
            tags: post.tags?.join(', ') || '',
            featured_image: post.featured_image || '',
            status: post.status || 'Draft'
          });
        } else {
          setError('Không tìm thấy bài viết');
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Không thể tải bài viết');
      } finally {
        setLoadingPost(false);
      }
    };

    loadPost();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      const updateData: UpdateBlogData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      await blogService.adminUpdate(id, updateData);
      navigate('/admin/blog/manage');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Không thể cập nhật blog');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/blog/manage')}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Chỉnh sửa Blog
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            
            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tiêu đề *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nhập tiêu đề blog..."
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <label htmlFor="content_md" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nội dung (Markdown) *
              </label>
              <textarea
                id="content_md"
                name="content_md"
                value={formData.content_md}
                onChange={handleInputChange}
                required
                rows={15}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nhập nội dung blog bằng Markdown..."
              />
            </div>

            {/* Excerpt */}
            <div className="mb-6">
              <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tóm tắt
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Tóm tắt ngắn gọn về bài viết..."
              />
            </div>

            {/* Category and Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Danh mục
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ví dụ: Công nghệ"
                />
              </div>
              
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="react, javascript, web development"
                />
              </div>
            </div>

            {/* Featured Image */}
            <div className="mb-6">
              <label htmlFor="featured_image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ảnh đại diện (URL)
              </label>
              <input
                type="url"
                id="featured_image"
                name="featured_image"
                value={formData.featured_image}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Status */}
            <div className="mb-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trạng thái
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Draft">Bản nháp</option>
                <option value="Published">Đã xuất bản</option>
                <option value="Pending">Chờ duyệt</option>
                <option value="Rejected">Từ chối</option>
                <option value="Archived">Lưu trữ</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/blog/manage')}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang cập nhật...' : 'Cập nhật Blog'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogEditPage;