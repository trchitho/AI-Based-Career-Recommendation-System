import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Brain, Target, Sparkles, BookOpen, Users, TrendingUp, CheckCircle2, Lightbulb } from 'lucide-react';

const RecommendationsLearnMorePage = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/20" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-800/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-200/30 dark:bg-purple-800/10 rounded-full blur-3xl" />

          <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
            <Link to="/recommendations" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-8 transition-colors">
              <ArrowLeft size={16} />
              Quay lại Nghề phù hợp
            </Link>

            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold mb-6">
                <Sparkles size={16} />
                Hệ thống gợi ý nghề nghiệp AI
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                Khám phá nghề nghiệp{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  phù hợp với bạn
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
                Hoàn thành bài đánh giá để nhận gợi ý nghề nghiệp cá nhân hóa dựa trên kỹ năng, sở thích và mục tiêu của bạn.
                Hệ thống AI phân tích câu trả lời và đối chiếu với hơn 900 nghề nghiệp để tìm ra lựa chọn tốt nhất.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Bài đánh giá hoạt động như thế nào?</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Chỉ mất khoảng 10 phút để hoàn thành 33 câu trắc nghiệm và 1 câu tự luận.
              Kết quả được phân tích bởi AI để đưa ra gợi ý chính xác nhất.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-5">
                <BookOpen className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Bước 1: Làm bài đánh giá</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Trả lời 33 câu trắc nghiệm (mỗi câu chọn mức độ đồng ý từ 1-5) và 1 câu tự luận chia sẻ về bản thân.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-5">
                <Brain className="text-purple-600 dark:text-purple-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Bước 2: AI phân tích</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Hệ thống AI phân tích câu trả lời, xác định sở thích nghề nghiệp (RIASEC) và đặc điểm tính cách (Big Five/OCEAN).
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-5">
                <Target className="text-green-600 dark:text-green-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Bước 3: Nhận gợi ý</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Nhận danh sách nghề nghiệp phù hợp nhất, kèm theo mức độ phù hợp (%), mô tả chi tiết và lộ trình phát triển.
              </p>
            </div>
          </div>
        </section>

        {/* Assessment Structure */}
        <section className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Cấu trúc bài đánh giá</h2>
              <p className="text-gray-600 dark:text-gray-400">33 câu trắc nghiệm + 1 câu tự luận, tổng thời gian ~10 phút</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* RIASEC */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">R</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mô hình RIASEC</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">18 câu (3 câu × 6 nhãn)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { code: 'R', name: 'Thực tế (Realistic)', desc: 'Thích làm việc với đồ vật, máy móc, công cụ' },
                    { code: 'I', name: 'Nghiên cứu (Investigative)', desc: 'Thích tìm hiểu, phân tích, giải quyết vấn đề' },
                    { code: 'A', name: 'Nghệ thuật (Artistic)', desc: 'Thích sáng tạo, biểu đạt, tự do' },
                    { code: 'S', name: 'Xã hội (Social)', desc: 'Thích giúp đỡ, dạy học, chăm sóc người khác' },
                    { code: 'E', name: 'Doanh nhân (Enterprising)', desc: 'Thích lãnh đạo, thuyết phục, kinh doanh' },
                    { code: 'C', name: 'Quy ước (Conventional)', desc: 'Thích tổ chức, chi tiết, có cấu trúc' },
                  ].map(item => (
                    <div key={item.code} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm flex-shrink-0">
                        {item.code}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Big Five */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">O</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mô hình Big Five (OCEAN)</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">15 câu (3 câu × 5 nhãn)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { code: 'O', name: 'Cởi mở (Openness)', desc: 'Tò mò, sáng tạo, thích trải nghiệm mới' },
                    { code: 'C', name: 'Tận tâm (Conscientiousness)', desc: 'Có kỷ luật, có tổ chức, đáng tin cậy' },
                    { code: 'E', name: 'Hướng ngoại (Extraversion)', desc: 'Năng động, hòa đồng, thích giao tiếp' },
                    { code: 'A', name: 'Dễ chịu (Agreeableness)', desc: 'Hợp tác, đồng cảm, tin tưởng người khác' },
                    { code: 'N', name: 'Nhạy cảm (Neuroticism)', desc: 'Mức độ ổn định cảm xúc, quản lý stress' },
                  ].map(item => (
                    <div key={item.code} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm flex-shrink-0">
                        {item.code}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Essay section */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={18} className="text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-amber-800 dark:text-amber-300 text-sm">+ 1 câu tự luận</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Chia sẻ về bản thân, sở thích, điểm mạnh và nghề nghiệp bạn quan tâm (50-300 từ). AI sẽ phân tích để hiểu sâu hơn về bạn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Bạn sẽ nhận được gì?</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, title: 'Mức độ phù hợp (%)', desc: 'Mỗi nghề được đánh giá % phù hợp dựa trên profile của bạn' },
              { icon: Users, title: 'Gợi ý cá nhân hóa', desc: 'Kết quả dựa trên sở thích, tính cách và mục tiêu riêng của bạn' },
              { icon: BookOpen, title: 'Mô tả chi tiết', desc: 'Thông tin đầy đủ về mỗi nghề: công việc, kỹ năng, mức lương' },
              { icon: Target, title: 'Lộ trình phát triển', desc: 'Xem lộ trình học tập và phát triển cho từng nghề nghiệp' },
              { icon: Brain, title: 'Phân tích AI', desc: 'Thuật toán AI kết hợp RIASEC + Big Five để đưa ra gợi ý chính xác' },
              { icon: CheckCircle2, title: 'Cập nhật liên tục', desc: 'Làm lại bài đánh giá bất cứ lúc nào để cập nhật kết quả' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <item.icon size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-10 md:p-14 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Sẵn sàng khám phá?</h2>
            <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
              Chỉ mất 10 phút để hoàn thành bài đánh giá. Bắt đầu ngay để tìm nghề nghiệp phù hợp nhất với bạn.
            </p>
            <Link
              to="/assessment"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
            >
              Bắt đầu đánh giá ngay
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        </section>

      </div>
    </MainLayout>
  );
};

export default RecommendationsLearnMorePage;
