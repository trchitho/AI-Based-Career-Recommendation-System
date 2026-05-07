import React from 'react';
import { Zap, BarChart2, Search, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const FEATURES = [
  {
    icon: <Zap size={28} />,
    title: 'Phân tích tức thì',
    desc: 'Nhận kết quả phân tích và chấm điểm CV chỉ trong vài giây sau khi tải lên.',
  },
  {
    icon: <BarChart2 size={28} />,
    title: 'Chấm điểm chi tiết',
    desc: 'Hệ thống chấm điểm dựa trên nhiều tiêu chí: kinh nghiệm, kỹ năng, và độ phù hợp với JD.',
  },
  {
    icon: <Search size={28} />,
    title: 'Đối chiếu với JD',
    desc: 'So sánh kỹ năng trong CV với yêu cầu công việc để tìm ra điểm mạnh và điểm yếu.',
  },
  {
    icon: <CheckCircle size={28} />,
    title: 'Gợi ý cải thiện',
    desc: 'Đề xuất cụ thể để bổ sung nội dung, giúp CV của bạn nổi bật hơn.',
  },
];

const WhyUseAIScanner: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="my-8 p-8 rounded-2xl border-l-4 transition-all duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(2,6,23,0.9))'
          : 'var(--neu-bg-card)',

        borderColor: 'var(--neu-accent)',

        boxShadow: isDark
          ? '0 20px 50px rgba(0,0,0,0.6)'
          : 'var(--neu-raised)',

        backdropFilter: isDark ? 'blur(14px)' : undefined,
      }}
    >
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold mb-3"
          style={{ color: isDark ? '#f1f5f9' : 'var(--neu-text)' }}
        >
          Tại sao nên sử dụng AI CV Scanner?
        </h2>

        <p
          className="text-lg max-w-xl mx-auto leading-relaxed"
          style={{ color: isDark ? '#94a3b8' : 'var(--neu-text-muted)' }}
        >
          Công nghệ AI tiên tiến giúp bạn đánh giá CV một cách khách quan và chính xác nhất.
        </p>
      </div>

      {/* GRID "BẢNG" */}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
            style={{
              // ✅ LIGHT MODE GIỮ NGUYÊN
              background: isDark
                ? 'rgba(15, 23, 42, 0.6)'
                : 'var(--neu-bg)',

              // ✅ DARK MODE "CARD TABLE" RÕ + SANG HƠN
              boxShadow: isDark
                ? '0 12px 35px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)'
                : 'var(--neu-raised-sm)',

              border: isDark
                ? '1px solid rgba(148, 163, 184, 0.12)'
                : 'none',
            }}
          >
            <div className="text-5xl mb-4 text-[var(--neu-accent)]">
              {f.icon}
            </div>

            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: isDark ? '#e2e8f0' : 'var(--neu-text)' }}
            >
              {f.title}
            </h3>

            <p
              className="text-sm leading-relaxed"
              style={{ color: isDark ? '#94a3b8' : 'var(--neu-text-muted)' }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyUseAIScanner;