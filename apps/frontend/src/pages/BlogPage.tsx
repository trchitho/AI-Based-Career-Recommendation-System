import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Clock, Heart, MessageCircle, ArrowRight, Edit3, Settings } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost, BlogListResponse } from '../services/blogService';
import { useAuth } from '../contexts/AuthContext';
import { getBlogImage, getBlogGradient } from '../utils/blogImages';
import { isAuthenticated } from '../utils/auth';
import api from '../lib/api';

const BlogPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const POSTS_PER_PAGE = 9;

  // Category mapping with Vietnamese labels
  // Database now stores English keys (career, interview, etc.)
  const categories = [
    { key: "all", label: "Tất cả" },
    { key: "career", label: "Tư vấn nghề nghiệp" },
    { key: "interview", label: "Mẹo phỏng vấn" },
    { key: "resume", label: "Viết CV" },
    { key: "culture", label: "Văn hóa công sở" },
    { key: "skills", label: "Phát triển kỹ năng" },
    { key: "jobs", label: "Tìm việc làm" },
    { key: "industry", label: "Góc nhìn ngành" }
  ];

  const trendingTopics = ['Remote Work', 'AI Careers', 'Leadership', 'Salary Negotiation'];

  // Load all posts
  const loadAllPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 100;
      let page = 1;
      let loadedPosts: BlogPost[] = [];
      let hasMore = true;

      while (hasMore) {
        const resp: BlogListResponse = await blogService.list({ page, pageSize });
        const items = resp.items || [];
        loadedPosts = [...loadedPosts, ...items];
        const total = typeof resp.total === 'number' ? resp.total : undefined;
        hasMore = total !== undefined ? loadedPosts.length < total : items.length === pageSize;
        page += 1;
      }

      setAllPosts(loadedPosts);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Filter and paginate
  const filterAndPaginatePosts = (
    postsToFilter: BlogPost[],
    categoryKey: string,
    search: string,
    page: number
  ) => {
    let filtered = postsToFilter;

    // Debug logging
    console.log('🔍 Filter Debug:', {
      selectedCategory: categoryKey,
      totalPosts: postsToFilter.length,
      sampleCategories: postsToFilter.slice(0, 5).map(p => ({ title: p.title, category: p.category }))
    });

    if (categoryKey !== 'all') {
      filtered = filtered.filter(post => {
        const postCategory = (post.category || '').toLowerCase().trim();
        const matches = postCategory === categoryKey.toLowerCase();
        return matches;
      });

      console.log('✅ After category filter:', {
        category: categoryKey,
        matchedPosts: filtered.length,
        sampleMatches: filtered.slice(0, 3).map(p => p.title)
      });
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.content_md?.toLowerCase().includes(query)
      );
    }

    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const paginated = filtered.slice(startIndex, endIndex);

    setDisplayedPosts(paginated);
    return filtered.length;
  };

  const handleCategoryChange = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    setCurrentPage(1);
    filterAndPaginatePosts(allPosts, categoryKey, searchQuery, 1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    filterAndPaginatePosts(allPosts, selectedCategory, query, 1);
  };

  const handlePageChange = (page: number) => {
    const totalFiltered = filterAndPaginatePosts(allPosts, selectedCategory, searchQuery, page);
    const totalPages = Math.ceil(totalFiltered / POSTS_PER_PAGE);

    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    loadAllPosts();
  }, []);

  useEffect(() => {
    if (allPosts.length > 0) {
      filterAndPaginatePosts(allPosts, selectedCategory, searchQuery, currentPage);
    }
  }, [allPosts]);

  const getFilteredCount = () => {
    let filtered = allPosts;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => {
        const postCategory = (post.category || '').toLowerCase().trim();
        return postCategory === selectedCategory.toLowerCase();
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.content_md?.toLowerCase().includes(query)
      );
    }

    return filtered.length;
  };

  const totalFilteredPosts = getFilteredCount();
  const totalPages = Math.ceil(totalFilteredPosts / POSTS_PER_PAGE);

  const calculateReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min`;
  };

  const getCategoryDisplayName = (categoryKey: string | undefined) => {
    if (!categoryKey) return 'Tư vấn nghề nghiệp';

    // Find matching category by key
    const category = categories.find(cat => cat.key === categoryKey.toLowerCase());
    return category?.label || categoryKey;
  };

  const featuredPost = displayedPosts[0];
  const gridPosts = displayedPosts.slice(1);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

        {/* ── Compact Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-700 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Latest News & Articles
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
              Expert career guidance, interview strategies, and professional development insights.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-10">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search career advice, interview tips..."
                  className="w-full pl-14 pr-6 py-5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg transition-all text-lg"
                />
              </div>
            </div>

            {/* Trending Topics */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Trending:</span>
              </div>
              {trendingTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleSearchChange(topic)}
                  className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAdmin ? '/admin/blog/create' : '/blog/create')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <Edit3 className="w-5 h-5" />
                Write Article
              </button>

              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/blog/manage')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-full hover:border-indigo-500 transition-all"
                >
                  <Settings className="w-5 h-5" />
                  Manage
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="relative flex items-center gap-3">
              {/* Left Arrow - pointing right (inward) */}
              <button
                onClick={() => {
                  const container = document.getElementById('category-scroll');
                  if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-md"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Category Buttons */}
              <div id="category-scroll" className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => handleCategoryChange(category.key)}
                    className={`px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all ${selectedCategory === category.key
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

        {/* ── Category Filter Bar ── */}
        <section className="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-all duration-200 ${selectedCategory === category
                    ? 'bg-indigo-800 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <p className="text-red-600 dark:text-red-400 font-semibold text-lg mb-4">{error}</p>
                <button
                  onClick={() => loadAllPosts()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && displayedPosts.length > 0 && (
              <div className="space-y-8">
                {/* Featured post — full width dark card */}
                {featuredPost && (
                  <article
                    onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                    className={`group cursor-pointer relative rounded-2xl overflow-hidden h-72 lg:h-80 bg-gradient-to-br ${getBlogGradient(featuredPost.category)} shadow-xl hover:shadow-2xl transition-all duration-300`}
                  >
                    <img
                      src={getBlogImage(featuredPost.category, featuredPost.featured_image)}
                      alt={featuredPost.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />

                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2.5 py-1 rounded-md bg-indigo-700 text-white text-xs font-bold uppercase tracking-wide">
                          Featured
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                          {getCategoryDisplayName(featuredPost.category)}
                        </span>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
                        {featuredPost.title}
                      </h2>
                      <p className="text-white/70 text-sm line-clamp-2 mb-4 max-w-2xl">
                        {featuredPost.excerpt || featuredPost.content_md?.substring(0, 120) + '...'}
                      </p>
                      <div className="flex items-center gap-4">
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors">
                          Read Full Report
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 text-white/80 text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{calculateReadingTime(featuredPost.content_md || '')}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )}

                {/* Grid of remaining posts */}
                {gridPosts.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gridPosts.map((post) => {
                      const readingTime = calculateReadingTime(post.content_md || '');
                      const publishDate = post.published_at
                        ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Draft';
                      const authorInitial = (post.author_name || 'A').charAt(0).toUpperCase();

                      return (
                        <article
                          key={post.slug}
                          onClick={() => navigate(`/blog/${post.slug}`)}
                          className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                        >
                          {/* Image */}
                          <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${getBlogGradient(post.category)}`}>
                            <img
                              src={getBlogImage(post.category, post.featured_image)}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent dark:from-black/50" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-white/10 dark:text-white/5 text-7xl font-black">{post.title.charAt(0)}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-5 flex flex-col flex-grow">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wide">
                                {getCategoryDisplayName(post.category)}
                              </span>
                              <span className="text-gray-300 dark:text-gray-600">·</span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{readingTime}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-indigo-800 dark:group-hover:text-indigo-400 transition-colors">
                              {post.title}
                            </h3>

                            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-grow leading-relaxed">
                              {post.excerpt || post.content_md?.substring(0, 100) + '...'}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {authorInitial}
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {post.author_name || 'Author'}
                                </span>
                              </div>
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                                Read More <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!loading && !error && displayedPosts.length === 0 && (
              <div className="text-center py-32">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  No articles found
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  Try adjusting your search or browse all articles
                </p>
                <button
                  onClick={() => {
                    handleSearchChange('');
                    handleCategoryChange('all');
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && displayedPosts.length > 0 && (
          <section className="pb-20">
            <div className="max-w-6xl mx-auto px-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
};

// Blog Card Component
interface BlogCardProps {
  post: BlogPost;
  onNavigate: () => void;
  getCategoryDisplayName: (slug: string | undefined) => string;
  calculateReadingTime: (content: string) => string;
  onReactionUpdate?: () => void;
}

const BlogCard = ({ post, onNavigate, getCategoryDisplayName, calculateReadingTime, onReactionUpdate }: BlogCardProps) => {
  const navigate = useNavigate();
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [dislikeCount, setDislikeCount] = useState(post.dislike_count || 0);
  const [commentCount] = useState(post.comment_count || 0);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(post.user_reaction || null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Debug: Log post data to verify image field
  useEffect(() => {
    console.log('BlogCard post data:', {
      title: post.title,
      featured_image: post.featured_image,
      category: post.category
    });
  }, [post]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/api/blog/${post.id}/like`);
      const data = response.data;

      // Update with actual counts from server (source of truth)
      setLikeCount(data.like_count);
      setDislikeCount(data.dislike_count);
      setUserReaction(data.user_reaction);

      // Trigger animation if liked
      if (data.user_reaction === 'like') {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);
      }

      // Notify parent to refresh if needed
      onReactionUpdate?.();
    } catch (error: any) {
      console.error('Failed to like post:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const readingTime = calculateReadingTime(post.content_md || '');
  const isLiked = userReaction === 'like';

  return (
    <article
      onClick={onNavigate}
      className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col border border-gray-100 dark:border-gray-700"
    >
      {/* Image */}
      <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${getBlogGradient(post.category)}`}>
        <img
          src={getBlogImage(post.category, post.featured_image)}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Show fallback letter only if image fails to load
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = 'absolute inset-0 flex items-center justify-center';
              fallback.innerHTML = `<div class="text-white text-6xl font-bold">${post.title.charAt(0)}</div>`;
              parent.appendChild(fallback);
            }
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Category Tag */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-xs font-bold text-gray-900 dark:text-white">
            {getCategoryDisplayName(post.category)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {post.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-6 flex-1 leading-relaxed">
          {post.excerpt || post.content_md?.substring(0, 150) + '...'}
        </p>

        {/* Interaction Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart className={`w-4 h-4 transition-transform ${isAnimating ? 'scale-125' : 'scale-100'} ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="font-medium">{likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium">{commentCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{readingTime} read</span>
          </div>
        </div>

        {/* Read More */}
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mt-4 group-hover:gap-3 transition-all">
          <span>Read Article</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </article>
  );
};

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Prev
      </button>

      <div className="hidden sm:flex items-center gap-2">
        {getPageNumbers().map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`w-12 h-12 rounded-xl font-semibold transition-all ${currentPage === pageNum
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500'
              }`}
          >
            {pageNum}
          </button>
        ))}
      </div>

      <div className="sm:hidden px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
        {currentPage} / {totalPages}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Next
      </button>
    </div>
  );
};

export default BlogPage;
