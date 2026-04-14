import React from 'react';
import { Zap, BarChart2, Search, CheckCircle } from 'lucide-react';
import './WhyUseAIScanner.css';

const features = [
  {
    icon: <Zap size={28} />,
    title: 'Phân tích tức thì',
    description: 'Nhận kết quả phân tích và chấm điểm CV chỉ trong vài giây sau khi tải lên.'
  },
  {
    icon: <BarChart2 size={28} />,
    title: 'Chấm điểm chi tiết',
    description: 'Hệ thống chấm điểm dựa trên nhiều tiêu chí: kinh nghiệm, kỹ năng, và độ phù hợp với JD.'
  },
  {
    icon: <Search size={28} />,
    title: 'Đối chiếu với JD',
    description: 'So sánh kỹ năng trong CV với yêu cầu công việc để tìm ra điểm mạnh và điểm yếu.'
  },
  {
    icon: <CheckCircle size={28} />,
    title: 'Gợi ý cải thiện',
    description: 'Đề xuất cụ thể để bổ sung nội dung, giúp CV của bạn nổi bật hơn.'
  }
];

const WhyUseAIScanner: React.FC = () => {
  return (
    <div className="why-use-ai-scanner">
      <div className="scanner-header">
        <h2>Tại sao nên sử dụng AI CV Scanner?</h2>
        <p className="scanner-subtitle">
          Công nghệ AI tiên tiến giúp bạn đánh giá CV một cách khách quan và chính xác nhất.
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhyUseAIScanner;
