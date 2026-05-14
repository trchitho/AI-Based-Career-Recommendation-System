import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, Compass, TrendingUp, MessageCircle, BookOpen } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">

          {/* Hero Section */}
          <div className="mb-16">
            {/* Animated 404 with Character */}
            <div className="relative mb-12">
              {/* Background Glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-96 h-96 bg-gradient-to-r from-indigo-200/30 via-purple-200/30 to-pink-200/30 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-full blur-3xl animate-pulse"></div>
              </div>

              {/* 404 Number */}
              <div className="relative z-10 text-[8rem] md:text-[12rem] lg:text-[14rem] font-black text-transparent bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-600 dark:to-slate-500 bg-clip-text leading-none select-none mb-8">
                404
              </div>

              {/* Floating Character */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative animate-bounce">
                  {/* Character Body */}
                  <div className="w-24 h-32 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full shadow-2xl flex items-end justify-center pb-3 border-4 border-white dark:border-slate-700">
                    {/* Face */}
                    <div className="w-16 h-20 bg-gradient-to-b from-orange-200 to-orange-300 rounded-full relative shadow-inner">
                      {/* Eyes */}
                      <div className="absolute top-5 left-3 w-2.5 h-2.5 bg-slate-800 rounded-full animate-pulse"></div>
                      <div className="absolute top-5 right-3 w-2.5 h-2.5 bg-slate-800 rounded-full animate-pulse"></div>
                      {/* Mouth */}
                      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 w-5 h-2.5 border-2 border-slate-800 border-t-0 rounded-b-full"></div>
                    </div>
                  </div>

                  {/* Speech Bubble */}
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 shadow-xl border border-slate-200 dark:border-slate-700 animate-pulse">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Trang này không tồn tại!
                    </p>
                    {/* Arrow */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700"></div>
                  </div>

                  {/* Floating Particles */}
                  <div className="absolute -top-8 -left-8 w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                  <div className="absolute -top-4 -right-6 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping animation-delay-300"></div>
                  <div className="absolute -bottom-6 -left-4 w-1 h-1 bg-pink-400 rounded-full animate-ping animation-delay-700"></div>
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-6 mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent leading-tight">
                Oops! Trang không tìm thấy
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                Trang bạn đang tìm kiếm có thể đã được di chuyển, xóa hoặc không bao giờ tồn tại.
                Đừng lo lắng, chúng tôi sẽ giúp bạn tìm đúng hướng!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={() => navigate('/')}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-1 transform"
              >
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Về trang chủ</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <button
                onClick={() => navigate(-1)}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 transform"
              >
                <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Quay lại</span>
              </button>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200/50 dark:border-slate-700/50 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-3">
                <Compass className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Có thể bạn đang tìm kiếm
              </h2>
              <p className="text-slate-600 dark:text-slate-400">Khám phá các tính năng phổ biến của CareerVerse</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Xu hướng */}
              <button
                onClick={() => navigate('/careers')}
                className="group p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xu hướng</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Khám phá các ngành nghề hot và xu hướng tuyển dụng mới nhất</p>
              </button>

              {/* Nghề phù hợp */}
              <button
                onClick={() => navigate('/recommendations')}
                className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nghề phù hợp</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Nhận gợi ý nghề nghiệp được cá nhân hóa dựa trên đánh giá của bạn</p>
              </button>

              {/* Phỏng vấn AI */}
              <button
                onClick={() => navigate('/interview')}
                className="group p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-2 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Phỏng vấn AI</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Luyện tập phỏng vấn với AI thông minh và nhận phản hồi chi tiết</p>
              </button>

              {/* Blog & Tin tức */}
              <button
                onClick={() => navigate('/blog')}
                className="group p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-2 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Blog & Tin tức</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">Cẩm nang nghề nghiệp và những bài viết hữu ích cho sự nghiệp</p>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Vẫn không tìm thấy những gì bạn cần?{' '}
              <a
                href="mailto:support@CareerVerse.com"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold hover:underline transition-colors"
              >
                Liên hệ với chúng tôi
              </a>
              {' '}để được hỗ trợ.
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-700 {
          animation-delay: 700ms;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </MainLayout>
  );
};

export default NotFoundPage;