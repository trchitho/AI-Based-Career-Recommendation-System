import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Crown, ArrowRight, Sparkles, Zap } from 'lucide-react';

interface LimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: number;
  limit: number;
  message?: string;
}

export const LimitExceededModal: React.FC<LimitExceededModalProps> = ({
  isOpen,
  onClose,
  currentUsage,
  limit,
  message
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-red-50/50 to-pink-50/50 dark:from-orange-900/10 dark:via-red-900/10 dark:to-pink-900/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Giới hạn đã đạt
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nâng cấp để tiếp tục
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="text-center mb-8">
            <div className="mb-6 flex justify-center text-6xl">
              🚫
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              {message || "Bạn đã sử dụng hết lượt test miễn phí trong tháng này. Nâng cấp Premium để tiếp tục khám phá nghề nghiệp phù hợp!"}
            </p>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 mb-8 border border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Sử dụng tháng này</span>
                <span className="font-bold text-orange-800 dark:text-orange-200 text-lg">{currentUsage}/{limit}</span>
              </div>
              <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full transition-all duration-500 shadow-sm relative overflow-hidden"
                  style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 mb-8 border border-green-200 dark:border-green-700 relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Sparkles className="text-green-500 animate-pulse" size={20} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Crown className="text-green-600 dark:text-green-400" size={24} />
              <h4 className="font-bold text-green-800 dark:text-green-200 text-lg">
                Nâng cấp Premium
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Zap size={16} className="text-green-500" />
                <span>Test không giới hạn</span>
              </div>
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Zap size={16} className="text-green-500" />
                <span>Phân tích AI chi tiết</span>
              </div>
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Zap size={16} className="text-green-500" />
                <span>Roadmap đầy đủ</span>
              </div>
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Zap size={16} className="text-green-500" />
                <span>Hỗ trợ ưu tiên</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
            >
              Để sau
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <span>Nâng cấp ngay</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};