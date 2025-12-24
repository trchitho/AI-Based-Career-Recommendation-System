import React from 'react';
import { Crown, X, Mic, FileText, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PremiumFeaturePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'voice' | 'blog' | 'tts';
}

export const PremiumFeaturePrompt: React.FC<PremiumFeaturePromptProps> = ({ 
  isOpen, 
  onClose, 
  feature 
}) => {
  const navigate = useNavigate();

  const featureInfo = {
    voice: {
      icon: <Mic className="text-purple-600" size={24} />,
      title: 'Nhập liệu bằng giọng nói',
      description: 'Nói trực tiếp với AI thay vì gõ phím. Tiện lợi và nhanh chóng!'
    },
    blog: {
      icon: <FileText className="text-purple-600" size={24} />,
      title: 'Tạo blog từ cuộc trò chuyện',
      description: 'Chuyển đổi cuộc trò chuyện thành bài blog hoàn chỉnh chỉ với một cú click!'
    },
    tts: {
      icon: <Volume2 className="text-purple-600" size={24} />,
      title: 'Đọc tin nhắn bằng giọng nói',
      description: 'AI sẽ đọc to các câu trả lời để bạn có thể nghe trong khi làm việc khác!'
    }
  };

  const currentFeature = featureInfo[feature];

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 max-w-[90vw] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Crown className="text-purple-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">Tính năng Premium</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            {currentFeature.icon}
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {currentFeature.title}
          </h4>
          <p className="text-gray-600 text-sm leading-relaxed">
            {currentFeature.description}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
          <h5 className="font-semibold text-purple-800 mb-2">Nâng cấp Premium để có:</h5>
          <ul className="text-sm text-purple-700 space-y-1">
            <li className="flex items-center gap-2">
              <Mic size={14} />
              Nhập liệu bằng giọng nói
            </li>
            <li className="flex items-center gap-2">
              <Volume2 size={14} />
              Đọc tin nhắn bằng giọng nói
            </li>
            <li className="flex items-center gap-2">
              <FileText size={14} />
              Tạo blog từ cuộc trò chuyện
            </li>
            <li className="flex items-center gap-2">
              <Crown size={14} />
              Tư vấn nghề nghiệp không giới hạn
            </li>
          </ul>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Để sau
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium"
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </div>
  );
};