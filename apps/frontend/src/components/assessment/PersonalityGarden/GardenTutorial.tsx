import { useState } from 'react';

interface GardenTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const GardenTutorial: React.FC<GardenTutorialProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Chào mừng đến với Vườn Tính Cách! 🌳",
      description: "Bạn sắp bắt đầu một hành trình kỳ diệu khám phá bản thân. Hãy cùng học cách trồng cây tính cách độc đáo của riêng bạn!",
      icon: "🌱",
      image: null,
      tips: [
        "Đây không phải bài kiểm tra truyền thống",
        "Câu trả lời của bạn sẽ nuôi dưỡng một cây sống động",
        "Cây cuối cùng đại diện cho CHÍNH BẠN"
      ]
    },
    {
      title: "Gieo Hạt Giống 🌱",
      description: "Đầu tiên, bạn sẽ gieo một hạt giống kỳ diệu vào đất. Hạt giống này đại diện cho khởi đầu hành trình của bạn.",
      icon: "🌱",
      image: null,
      tips: [
        "Nhấp để gieo hạt giống",
        "Xem nó rơi xuống đất",
        "Chứng kiến mầm non đầu tiên nảy lên"
      ]
    },
    {
      title: "Chăm Sóc Bằng Các Yếu Tố ✨",
      description: "Trả lời câu hỏi bằng cách chọn các yếu tố kỳ diệu. Mỗi yếu tố đại diện cho một câu trả lời khác nhau và sẽ giúp cây của bạn phát triển!",
      icon: "✨",
      image: null,
      tips: [
        "☀️ Ánh nắng ấm áp - Rất đồng ý",
        "💧 Nước trong lành - Phản hồi nhẹ nhàng",
        "🌿 Phân bón tăng trưởng - Lựa chọn cân bằng",
        "🍃 Gió tự nhiên - Sở thích nhẹ",
        "✨ Năng lượng kỳ diệu - Cảm xúc mạnh mẽ"
      ]
    },
    {
      title: "Xem Cây Của Bạn Lớn Lên 🌳",
      description: "Với mỗi câu trả lời, cây của bạn sẽ cao lên, mọc thêm cành mới và nở những bông hoa xinh đẹp. Môi trường sẽ thay đổi từ bình minh đến hoàng hôn!",
      icon: "🌳",
      image: null,
      tips: [
        "Cây lớn lên sau mỗi câu trả lời",
        "Cành và lá xuất hiện",
        "Hoa nở khi bạn tiến bộ",
        "Môi trường biến đổi tuyệt đẹp"
      ]
    },
    {
      title: "Theo Dõi Tiến Trình 📊",
      description: "Xem Năng Lượng Tự Nhiên của bạn tăng lên và Cấp Độ Phát Triển tăng cao. Bạn có thể lưu tiến trình và tiếp tục bất cứ lúc nào!",
      icon: "📊",
      image: null,
      tips: [
        "Năng Lượng Tự Nhiên = Điểm kinh nghiệm",
        "Cấp Độ Phát Triển tăng mỗi 100 năng lượng",
        "Thanh tiến trình hiển thị hoàn thành",
        "Lưu & tiếp tục bất cứ lúc nào"
      ]
    },
    {
      title: "Khám Phá Cây Tính Cách Của Bạn 🎨",
      description: "Cuối cùng, bạn sẽ thấy cây tính cách đã phát triển hoàn toàn - một đại diện độc đáo, tuyệt đẹp về con người bạn!",
      icon: "🎨",
      image: null,
      tips: [
        "Xem cây hoàn chỉnh của bạn",
        "Xem thành tích của bạn",
        "Nhận gợi ý nghề nghiệp",
        "Chụp màn hình & chia sẻ cây của bạn!"
      ]
    }
  ];

  const currentTutorial = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="garden-tutorial relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20">
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${8 + Math.random() * 4}s`
              }}
            >
              <div className="text-2xl opacity-30">
                {['🌱', '🌿', '🌳', '🌸', '✨', '☀️', '💧'][Math.floor(Math.random() * 7)]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-4xl w-full px-4">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-green-500'
                  : index < currentStep
                  ? 'w-2 bg-green-400'
                  : 'w-2 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Tutorial card */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-white/50 p-8 md:p-12 animate-fade-in">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-block text-7xl mb-4 animate-bounce-slow">
              {currentTutorial.icon}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {currentTutorial.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              {currentTutorial.description}
            </p>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>💡</span>
              <span>Điểm Chính:</span>
            </h3>
            <ul className="space-y-3">
              {currentTutorial.tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                  style={{
                    animation: 'fadeInUp 0.5s ease-out forwards',
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="flex-1">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Previous button */}
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                currentStep === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              ← Trước
            </button>

            {/* Step indicator */}
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Bước {currentStep + 1} / {tutorialSteps.length}
            </div>

            {/* Next/Start button */}
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {isLastStep ? (
                <span className="flex items-center gap-2">
                  <span>Bắt Đầu Trồng Cây!</span>
                  <span>🌱</span>
                </span>
              ) : (
                <span>Tiếp →</span>
              )}
            </button>
          </div>

          {/* Skip button */}
          <div className="text-center mt-6">
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors"
            >
              Bỏ Qua Hướng Dẫn
            </button>
          </div>
        </div>

        {/* Fun fact */}
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>💡 <strong>Thú Vị:</strong> Cây của bạn sẽ hoàn toàn độc nhất vô nhị!</p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(10px, -10px) rotate(5deg); }
          50% { transform: translate(-5px, -20px) rotate(-5deg); }
          75% { transform: translate(-10px, -10px) rotate(5deg); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default GardenTutorial;
