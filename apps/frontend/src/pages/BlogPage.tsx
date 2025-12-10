import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { blogService } from '../services/blogService';
import { BlogPost } from '../types/blog';

const BlogPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await blogService.getAllPosts();
      setPosts(response.items);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!newPostContent.trim()) {
      alert('Please enter some content');
      return;
    }

    try {
      setCreating(true);
      await blogService.createPost({
        title: newPostTitle,
        content: newPostContent,
      });
      setNewPostTitle('');
      setNewPostContent('');
      setShowCreateModal(false);
      loadPosts();
      alert('Post created successfully!');
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-green-600 rounded-full animate-spin"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 py-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="inline-block px-4 py-2 bg-green-600/20 border border-green-600 rounded-full text-green-400 text-sm font-semibold mb-6">
              CAREER INSIGHTS
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Latest News & <span className="text-green-400">Articles</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Discover expert advice, career guidance, and success stories to help you navigate your professional journey.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Post
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
              {error}
            </div>
          </div>
        )}

        {/* Posts Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          {posts.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-700">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No articles yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first article to get started
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                Create Your First Article
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-gray-700 hover:border-green-600 overflow-hidden group"
                >
                  {/* Image Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-green-600/20 border border-green-600 rounded-full text-green-400 text-xs font-semibold">
                        Career Advice
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mb-2">
                      {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </p>

                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-green-400 transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                      {post.content_md}
                    </p>

                    <button className="text-green-400 font-semibold text-sm hover:text-green-300 transition-colors">
                      Read Article →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">
                Create New Article
              </h2>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Article title..."
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-700 text-white mb-4 placeholder-gray-400"
              />
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your insights..."
                rows={10}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-700 text-white mb-4 placeholder-gray-400"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleCreatePost}
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Publish Article'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPostTitle('');
                    setNewPostContent('');
                  }}
                  className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-bold hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BlogPage;
