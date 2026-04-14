import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Clock, Calendar, ArrowRight, Sparkles, Edit3, Settings } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { blogService, BlogPost, BlogListResponse } from '../services/blogService';
import { useAuth } from '../contexts/AuthContext';

const BlogPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const POSTS_PER_PAGE = 9;

  // Category mapping: Display Name -> Database Slug
  const categoryMap: Record<string, string> = {
    'All': 'all',
    'Career Advice': 'career-advice',
    'Interview Tips': 'interview-tips',
    'Resume Writing': 'resume-writing',
    'Workplace Culture': 'workplace-culture',
    'Industry Insights': 'industry-insights',
    'Job Search': 'job-search',
    'Skill Development': 'skill-development'
  };

  const categories = [
    'All',
    'Career Advice',
    'Interview Tips',
    'Job Search',
    'Skill Development',
    'Industry Insights'
  ];

  const trendingTopics = ['Remote Work', 'AI Careers', 'Leadership', 'Salary Negotiation'];

  // Load all posts once
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
        hasMore = total !== undefined
          ? loadedPosts.length < total
          : items.length === pageSize;

        page += 1;
      }

      setAllPosts(loadedPosts);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Filter and paginate posts
  const filterAndPaginatePosts = (
    postsToFilter: BlogPost[],
    category: string,
    search: string,
    page: number
  ) => {
    let filtered = postsToFilter;

    // Step 1: Filter by category
    if (category !== 'All') {
      const categorySlug = categoryMap[category] || category.toLowerCase().replace(/\s+/g, '-');
      filtered = filtered.filter(post => {
        const postCategory = post.category?.toLowerCase() || '';
        return postCategory === categorySlug || postCategory === category.toLowerCase();
      });
    }

    // Step 2: Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.content_md?.toLowerCase().includes(query)
      );
    }

    // Step 3: Apply pagination to filtered results
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const paginated = filtered.slice(startIndex, endIndex);

    setDisplayedPosts(paginated);
    return filtered.length; // Return total filtered count for pagination
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
    filterAndPaginatePosts(allPosts, category, searchQuery, 1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when search changes
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

  // Load all posts on mount
  useEffect(() => {
    loadAllPosts();
  }, []);

  // Update displayed posts when allPosts changes
  useEffect(() => {
    if (allPosts.length > 0) {
      filterAndPaginatePosts(allPosts, selectedCategory, searchQuery, currentPage);
    }
  }, [allPosts]);

  // Calculate total pages based on filtered results
  const getFilteredCount = () => {
    let filtered = allPosts;

    if (selectedCategory !== 'All') {
      const categorySlug = categoryMap[selectedCategory] || selectedCategory.toLowerCase().replace(/\s+/g, '-');
      filtered = filtered.filter(post => {
        const postCategory = post.category?.toLowerCase() || '';
        return postCategory === categorySlug || postCategory === selectedCategory.toLowerCase();
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

  // Calculate reading time (rough estimate: 200 words per minute)
  const calculateReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  // Convert category slug to display name
  const getCategoryDisplayName = (categorySlug: string | undefined) => {
    if (!categorySlug) return 'Career Advice';

    // Find the display name from the map
    const entry = Object.entries(categoryMap).find(
      ([_, slug]) => slug === categorySlug.toLowerCase()
    );

    if (entry) return entry[0];

    // Fallback: Convert slug to title case
    return categorySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">

        {/* Hero Section with Search */}
        <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Career Insights & Expert Advice
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Latest News & <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Articles</span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
                Expert career guidance, interview strategies, and professional development insights to accelerate your success.
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search career advice, interview tips, resume strategies..."
                    className="w-full pl-14 pr-6 py-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-green-500 dark:focus:border-green-500 shadow-lg hover:shadow-xl transition-all text-lg"
                  />
                </div>
              </div>

              {/* Trending Topics */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">Trending:</span>
                </div>
                {trendingTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleSearchChange(topic)}
                    className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-all"
                  >
                    {topic}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => navigate(isAdmin ? '/admin/blog/create' : '/blog/create')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Edit3 className="w-5 h-5" />
                  Write Article
                </button>

                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin/blog/manage')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200"
                  >
                    <Settings className="w-5 h-5" />
                    Manage Blog
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter Bar */}
        <section className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ${selectedCategory === category
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Grid Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-32">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 font-semibold text-lg">{error}</p>
                <button
                  onClick={() => loadAllPosts()}
                  className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Blog Cards Grid */}
            {!loading && !error && displayedPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedPosts.map((post) => {
                  const readingTime = calculateReadingTime(post.content_md || '');
                  const publishDate = post.published_at
                    ? new Date(post.published_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                    : 'Draft';

                  return (
                    <article
                      key={post.slug}
                      onClick={() => navigate(`/blog/${post.slug}`)}
                      className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-2 transition-all duration-300 flex flex-col"
                    >
                      {/* Featured Image */}
                      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-green-400 to-blue-500">
                        {post.featured_image ? (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              // Fallback to gradient background if image fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}

                        {/* Fallback content - always show but behind image */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white/20 text-6xl font-bold">
                            {post.title.charAt(0)}
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-bold text-gray-900 dark:text-white border border-white/20">
                            {getCategoryDisplayName(post.category)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-grow">
                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{publishDate}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{readingTime}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {post.title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-6 flex-grow leading-relaxed">
                          {post.excerpt || post.content_md?.substring(0, 150) + '...'}
                        </p>

                        {/* Read More Link */}
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm group-hover:gap-3 transition-all mt-auto">
                          <span>Read Article</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && displayedPosts.length === 0 && (
              <div className="text-center py-32">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {searchQuery
                    ? 'No articles found'
                    : selectedCategory === 'All'
                      ? 'No articles yet'
                      : `No articles in ${selectedCategory}`}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {searchQuery
                    ? `Try adjusting your search or browse all articles`
                    : selectedCategory === 'All'
                      ? 'Be the first to share your insights!'
                      : 'Try selecting a different category or check back later.'}
                </p>
                {searchQuery ? (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/blog/create')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
                  >
                    <Edit3 className="w-5 h-5" />
                    Write First Article
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && displayedPosts.length > 0 && (
          <section className="pb-20">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex items-center justify-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:text-gray-700 dark:disabled:hover:text-gray-300 transition-all"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-12 h-12 rounded-xl font-semibold transition-all ${currentPage === pageNum
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                          : 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile Page Indicator */}
                <div className="sm:hidden px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                  {currentPage} / {totalPages}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700 disabled:hover:text-gray-700 dark:disabled:hover:text-gray-300 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
};

export default BlogPage;
