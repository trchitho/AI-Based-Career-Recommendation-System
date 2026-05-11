import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Brain, Target, Sparkles, Users, MessageCircle, Calendar, Star, Shield, Zap, BookOpen, Network } from 'lucide-react';

const MentorLearnMorePage = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/30 dark:bg-purple-800/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-800/10 rounded-full blur-3xl" />

          <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
            <Link to="/mentor-matching" className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 mb-8 transition-colors">
              <ArrowLeft size={16} />
              Quay lại Tìm Mentor
            </Link>

            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-bold mb-6">
                <Sparkles size={16} />
                AI-Powered Mentor Matching
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                Tìm{' '}
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Mentor Phù Hợp
                </span>
                {' '}Với Bạn
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
                Kết nối với chuyên gia hàng đầu — được xếp hạng bởi AI dựa trên kỹ năng, kinh nghiệm và tính cách của bạn.
                Hệ thống sử dụng 5 tín hiệu AI để tìm mentor phù hợp nhất.
              </p>
            </div>
          </div>
        </section>

        {/* How AI Matching Works */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">AI Matching hoạt động thế nào?</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Hệ thống kết hợp 5 tín hiệu AI khác nhau để tìm mentor phù hợp nhất với bạn.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-5">
                <BookOpen className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Bước 1: Tạo hồ sơ</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Hệ thống tự động tạo hồ sơ mentee từ bài đánh giá và CV của bạn. Hoặc bạn có thể điền thủ công.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-5">
                <Brain className="text-purple-600 dark:text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Bước 2: AI phân tích</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                AI chạy pipeline 5 tín hiệu: kỹ năng, ngữ nghĩa, nghề nghiệp, tính cách và đồ thị tri thức để tìm mentor phù hợp.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-5">
                <Users className="text-green-600 dark:text-green-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Bước 3: Kết nối</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Gửi yêu cầu kết nối, nhắn tin trực tiếp và đặt lịch hẹn với mentor phù hợp nhất.
              </p>
            </div>
          </div>
        </section>

        {/* 5 AI Signals */}
        <section className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">5 Tín Hiệu AI Matching</h2>
              <p className="text-gray-600 dark:text-gray-400">Kết hợp đa chiều để đảm bảo kết quả chính xác nhất</p>
            </div>

            <div className="space-y-4">
              {[
                { weight: '30%', name: 'Kỹ năng trùng khớp', desc: 'So sánh kỹ năng bạn muốn học với chuyên môn của mentor', icon: Target, color: 'blue' },
                { weight: '20%', name: 'Ngữ nghĩa (vi-SBERT)', desc: 'Hiểu quan hệ ngữ nghĩa giữa kỹ năng (VD: React ↔ Frontend)', icon: Brain, color: 'purple' },
                { weight: '20%', name: 'Nghề nghiệp', desc: 'Đối chiếu nghề mục tiêu của bạn với kinh nghiệm mentor', icon: Zap, color: 'orange' },
                { weight: '15%', name: 'Tính cách (RIASEC + Big5)', desc: 'Cosine similarity giữa vector tính cách 11 chiều', icon: Star, color: 'pink' },
                { weight: '15%', name: 'Đồ thị tri thức (Neo4j)', desc: 'Jaccard, PageRank và Path Traversal trên graph database', icon: Network, color: 'green' },
              ].map((signal, i) => (
                <div key={i} className="flex items-center gap-5 p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className={`w-12 h-12 rounded-xl bg-${signal.color}-100 dark:bg-${signal.color}-900/40 flex items-center justify-center flex-shrink-0`}>
                    <signal.icon size={22} className={`text-${signal.color}-600 dark:text-${signal.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">{signal.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                        {signal.weight}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{signal.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Tính năng hỗ trợ</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageCircle, title: 'Nhắn tin trực tiếp', desc: 'Chat real-time với mentor qua WebSocket' },
              { icon: Calendar, title: 'Đặt lịch hẹn', desc: 'Chọn ngày giờ, thời lượng và chủ đề buổi gặp' },
              { icon: Shield, title: 'Tự động tạo hồ sơ', desc: 'Hệ thống tự điền từ CV và bài đánh giá của bạn' },
              { icon: Users, title: '66 Mentor / 22 ngành', desc: 'Pool mentor phủ đầy đủ các lĩnh vực nghề nghiệp' },
              { icon: Star, title: 'Điểm tương thích (%)', desc: 'Mỗi mentor có điểm match dựa trên 5 tín hiệu AI' },
              { icon: Target, title: 'Lý do phù hợp', desc: 'AI giải thích tại sao mentor này phù hợp với bạn' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <item.icon size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Important Notice */}
        <section className="max-w-5xl mx-auto px-6 pb-8">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 font-bold text-sm">!</span>
              </div>
              <div>
                <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-1">Lưu ý quan trọng</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Hệ thống hỗ trợ gửi yêu cầu kết nối, nhắn tin và đặt lịch gặp với mentor.
                  Hệ thống <strong>không</strong> bao gồm gọi video trực tuyến. Các buổi gặp được sắp xếp qua lịch hẹn.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-10 md:p-14 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Sẵn sàng tìm mentor?</h2>
            <p className="text-purple-100 text-lg mb-8 max-w-xl mx-auto">
              Bắt đầu ngay để kết nối với chuyên gia phù hợp nhất với mục tiêu nghề nghiệp của bạn.
            </p>
            <Link
              to="/mentor-matching"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
            >
              Tìm Mentor ngay
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        </section>

      </div>
    </MainLayout>
  );
};

export default MentorLearnMorePage;
