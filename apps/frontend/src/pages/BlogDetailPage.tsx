import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import api from '../lib/api';
import { BlogPost } from '../types/blog';

const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (postSlug: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/blog/${postSlug}`);
      setPost(response.data);
    } catch (err) {
      console.error('Error loading post:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
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

  if (error || !post) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Article not found</h2>
            <button
              onClick={() => navigate('/blog')}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Back to Blog
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-900">
        {/* Hero Section with Gradient */}
        <div className="bg-gradient-to-b from-green-600 to-green-800 py-16 relative">
          <div className="max-w-4xl mx-auto px-4">
            {/* Back Button */}
            <button
              onClick={() => navigate('/blog')}
              className="mb-8 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              ← Back to Blog
            </button>

            {/* Article Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Article Content Card */}
        <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10 pb-16">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-700">
            {/* Meta Info */}
            <div className="flex items-center gap-4 mb-6 text-sm">
              <span className="px-3 py-1 bg-green-600/20 border border-green-600 rounded-full text-green-400 font-semibold">
                ARTICLE
              </span>
              <span className="text-gray-400">
                {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-gray-400">• 3 MIN READ</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Author */}
            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-gray-700">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
              <div>
                <p className="text-white font-semibold">Admin</p>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </button>
                <button className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {post.content_md}
              </div>
            </div>

            {/* Tags/Categories */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="flex flex-wrap gap-2">
                {post.tags && post.tags.length > 0 ? (
                  post.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default BlogDetailPage;
