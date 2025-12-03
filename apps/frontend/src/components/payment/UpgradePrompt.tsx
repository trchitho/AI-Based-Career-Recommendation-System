import React from 'react';
import { Lock, Zap } from 'lucide-react';

interface UpgradePromptProps {
  message: string;
  onUpgrade: () => void;
  variant?: 'card' | 'banner' | 'overlay';
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  message,
  onUpgrade,
  variant = 'card',
}) => {
  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white flex items-center justify-center z-10">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nội dung Premium</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onUpgrade}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all inline-flex items-center"
          >
            <Zap size={20} className="mr-2" />
            Nâng cấp ngay
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center">
          <Lock size={24} className="mr-3" />
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onUpgrade}
          className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Nâng cấp
        </button>
      </div>
    );
  }

  // Default: card variant
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nội dung bị khóa</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      <button
        onClick={onUpgrade}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all inline-flex items-center"
      >
        <Zap size={20} className="mr-2" />
        Xem gói nâng cấp
      </button>
    </div>
  );
};
