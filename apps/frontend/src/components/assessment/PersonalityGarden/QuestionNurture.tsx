import { useState, useEffect } from 'react';
import { Question } from '../../../types/assessment';
import { TreeGrowthState, NurtureElement } from './types/garden.types';
import TreeCanvas from './TreeCanvas';
import NatureEnergyBar from './NatureEnergyBar';
import AnswerHistory from './AnswerHistory';
import NurtureParticles from './NurtureParticles';
import GardenScenery from './GardenScenery';

interface QuestionNurtureProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  treeGrowth: TreeGrowthState;
  progress: number;
  natureEnergy: number;
  growthLevel: number;
  bloomChain: number;
  answeredQuestions?: Array<{
    question: Question;
    selectedElement: NurtureElement;
    questionNumber: number;
  }>;
  onAnswer: (answer: string | number, selectedElement?: NurtureElement) => void;
  onCancel: () => void;
  disabled?: boolean; // Disable buttons during processing
  currentDay?: number;
  timeOfDay?: 'morning' | 'noon' | 'afternoon' | 'evening';
  timeEmoji?: string;
  timeLabel?: string;
}

const QuestionNurture: React.FC<QuestionNurtureProps> = ({
  question,
  questionNumber,
  totalQuestions,
  treeGrowth,
  progress,
  natureEnergy,
  growthLevel,
  bloomChain,
  answeredQuestions = [],
  onAnswer,
  onCancel,
  disabled = false,
  currentDay = 1,
  timeOfDay = 'morning',
  timeEmoji = '🌅',
  timeLabel = 'Buổi sáng'
}) => {
  const [selectedElement, setSelectedElement] = useState<NurtureElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Debug log to check time props
  useEffect(() => {
    console.log('[QuestionNurture] Time props:', { timeOfDay, timeEmoji, timeLabel, currentDay });
  }, [timeOfDay, timeEmoji, timeLabel, currentDay]);

  // Transform answers into nurture elements - REALISTIC PLANT NEEDS
  const getNurtureElements = (): NurtureElement[] => {
    if (question.question_type === 'SCALE') {
      return [
        {
          id: '1',
          type: 'water',
          label: 'Rất không đồng ý',
          emoji: '💧',
          value: 1,
          color: 'from-blue-400 to-blue-600',
          particleColor: '#60A5FA'
        },
        {
          id: '2',
          type: 'fertilizer',
          label: 'Không đồng ý',
          emoji: '🌱',
          value: 2,
          color: 'from-amber-600 to-amber-800',
          particleColor: '#D97706'
        },
        {
          id: '3',
          type: 'soil',
          label: 'Trung lập',
          emoji: '🪴',
          value: 3,
          color: 'from-stone-500 to-stone-700',
          particleColor: '#78716C'
        },
        {
          id: '4',
          type: 'sunlight',
          label: 'Đồng ý',
          emoji: '☀️',
          value: 4,
          color: 'from-yellow-400 to-orange-500',
          particleColor: '#FBBF24'
        },
        {
          id: '5',
          type: 'nutrients',
          label: 'Rất đồng ý',
          emoji: '🌿',
          value: 5,
          color: 'from-green-500 to-green-700',
          particleColor: '#22C55E'
        }
      ];
    } else {
      // Multiple choice - cycle through realistic plant elements
      const elementTypes: NurtureElement['type'][] = ['sunlight', 'water', 'nutrients', 'soil', 'fertilizer'];
      const elementConfigs = {
        sunlight: { emoji: '☀️', color: 'from-yellow-400 to-orange-500', particleColor: '#FBBF24' },
        water: { emoji: '💧', color: 'from-blue-400 to-blue-600', particleColor: '#60A5FA' },
        nutrients: { emoji: '🌿', color: 'from-green-500 to-green-700', particleColor: '#22C55E' },
        soil: { emoji: '🪴', color: 'from-stone-500 to-stone-700', particleColor: '#78716C' },
        fertilizer: { emoji: '🌱', color: 'from-amber-600 to-amber-800', particleColor: '#D97706' }
      };

      // Translation map for English options to Vietnamese
      const optionTranslations: Record<string, string> = {
        'Strongly Dislike': 'Rất không thích',
        'Dislike': 'Không thích',
        'Unsure': 'Không chắc',
        'Like': 'Thích',
        'Strongly Like': 'Rất thích',
        'Strongly Disagree': 'Rất không đồng ý',
        'Disagree': 'Không đồng ý',
        'Neutral': 'Trung lập',
        'Agree': 'Đồng ý',
        'Strongly Agree': 'Rất đồng ý'
      };

      return (question.options || []).map((option, index) => {
        const type = elementTypes[index % elementTypes.length];
        const config = elementConfigs[type];
        // Translate option if it exists in translation map, otherwise use original
        const translatedLabel = optionTranslations[option] || option;
        return {
          id: `${index}`,
          type,
          label: translatedLabel,
          emoji: config.emoji,
          value: option, // Keep original value for backend
          color: config.color,
          particleColor: config.particleColor
        };
      });
    }
  };

  const elements = getNurtureElements();

  const handleElementSelect = (element: NurtureElement) => {
    console.log('[QuestionNurture] Element selected:', element);
    
    if (isAnimating) {
      console.log('[QuestionNurture] Already animating, ignoring click');
      return;
    }
    
    setSelectedElement(element);
    setIsAnimating(true);

    // Play sound effect based on element type
    playElementSound(element.type);

    // Animate element flowing to tree
    setTimeout(() => {
      console.log('[QuestionNurture] Calling onAnswer with:', element.value, element);
      onAnswer(element.value, element);
      setIsAnimating(false);
      setSelectedElement(null);
    }, 1500);
  };

  // Play sound effect for element selection
  const playElementSound = (elementType: NurtureElement['type']) => {
    try {
      // Create audio context for sound effects
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different elements - REALISTIC PLANT NEEDS
      const frequencies: Record<NurtureElement['type'], number> = {
        water: 400,      // Low, calming (essential)
        sunlight: 600,   // Bright, warm (essential)
        nutrients: 550,  // Medium, growth (essential)
        soil: 450,       // Low-medium, earthy (foundation)
        fertilizer: 500  // Medium, boost (enhancement)
      };
      
      oscillator.frequency.value = frequencies[elementType];
      oscillator.type = 'sine';
      
      // Fade in and out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently fail if audio not supported
      console.log('[QuestionNurture] Audio not supported');
    }
  };

  return (
    <div className="question-nurture relative w-full h-screen flex flex-col overflow-hidden">
      {/* Background with time-of-day gradient - DYNAMIC BASED ON TIME */}
      <div className={`absolute inset-0 transition-colors duration-2000 z-0 ${
        timeOfDay === 'morning' ? 'bg-gradient-to-b from-orange-200 via-yellow-100 to-green-100 dark:from-orange-900/40 dark:via-yellow-900/30 dark:to-green-900/20' :
        timeOfDay === 'noon' ? 'bg-gradient-to-b from-sky-200 via-blue-100 to-green-100 dark:from-sky-900/50 dark:via-blue-900/40 dark:to-green-900/30' :
        timeOfDay === 'afternoon' ? 'bg-gradient-to-b from-orange-300 via-pink-200 to-purple-100 dark:from-orange-900/50 dark:via-pink-900/40 dark:to-purple-900/30' :
        'bg-gradient-to-b from-indigo-900 via-purple-800 to-blue-900 dark:from-indigo-950 dark:via-purple-950 dark:to-blue-950' // Evening - DARK
      }`}>
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden z-1">
          {[...Array(15)].map((_, i) => (
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
              <div className={`w-3 h-3 rounded-full blur-sm ${
                timeOfDay === 'evening' ? 'bg-yellow-300/40' : 'bg-white/20'
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Garden Scenery - ALWAYS VISIBLE AT BOTTOM */}
      <GardenScenery timeOfDay={timeOfDay} isAnswering={isAnimating} treeGrowth={treeGrowth} />

      {/* Top bar with stats */}
      <div className="relative z-20 p-3 space-y-2 flex-shrink-0">
        <NatureEnergyBar
          natureEnergy={natureEnergy}
          growthLevel={growthLevel}
          bloomChain={bloomChain}
          progress={progress}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      </div>
      
      {/* Day and Time indicator - LEFT SIDE, at cloud level */}
      <div className="fixed top-[28%] left-12 z-30">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-purple-300 dark:border-purple-600 flex items-center gap-2">
          <span className="text-3xl animate-pulse filter drop-shadow-lg">{timeEmoji}</span>
          <div className="flex flex-col">
            <span className="text-sm font-black text-purple-600 dark:text-purple-400">
              Ngày {currentDay}
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {timeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Main content area - COMPACT */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 py-2 min-h-0">
        {/* Floating question - COMPACT */}
        <div className="mb-4 max-w-2xl w-full animate-float">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border-2 border-white/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">
                {question.test_type === 'RIASEC' ? '🎯' : '🧠'}
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                {question.test_type === 'RIASEC' ? 'Sở Thích Nghề Nghiệp' : 'Đặc Điểm Tính Cách'}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-snug">
              {question.question_text}
            </h3>
          </div>
        </div>

        {/* Tree canvas - LARGER AND LOWER */}
        <div className="flex items-end justify-center w-full max-w-4xl relative flex-shrink-0" style={{ height: '350px', marginBottom: '-50px' }}>
          <div className="transform scale-125 origin-bottom">
            <TreeCanvas
              growth={treeGrowth}
              isAnimating={isAnimating}
              selectedElement={selectedElement}
              timeOfDay={timeOfDay}
            />
          </div>
          
          {/* Particle effects when element is selected */}
          {selectedElement && isAnimating && (
            <NurtureParticles
              element={selectedElement}
              isActive={isAnimating}
            />
          )}
        </div>
      </div>

      {/* Bottom element selector - CLEAR BUTTONS WITH MINIMAL BACKGROUND */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto p-2 pb-3">
          <p className="text-center text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full px-4 py-1 inline-block shadow-lg">
            🌱 Chọn cách nuôi dưỡng cây của bạn
          </p>
          
          <div className="grid grid-cols-5 gap-2 mb-2">
            {elements.map((element) => (
              <button
                key={element.id}
                onClick={() => handleElementSelect(element)}
                disabled={isAnimating || disabled}
                className={`group relative p-3 rounded-xl transition-all duration-300 ${
                  (isAnimating || disabled) && selectedElement?.id === element.id
                    ? 'scale-110 opacity-50'
                    : 'hover:scale-105 hover:-translate-y-1'
                } ${
                  (isAnimating || disabled) && selectedElement?.id !== element.id
                    ? 'opacity-30'
                    : ''
                } ${
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${element.color} rounded-xl opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${element.color} rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity`}></div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <span className="text-3xl drop-shadow-lg">{element.emoji}</span>
                  <span className="text-white font-bold text-xs text-center leading-tight">
                    {element.label}
                  </span>
                </div>

                {/* Particle effect on hover */}
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-particle-rise"
                      style={{
                        left: `${20 + i * 15}%`,
                        bottom: '10%',
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Element descriptions - CLEAR BACKGROUND */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl p-2 border border-green-300 dark:border-green-700 shadow-lg">
            <div className="grid grid-cols-5 gap-1 text-xs text-center">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg">💧</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">Nước</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg">🌱</span>
                <span className="font-bold text-amber-700 dark:text-amber-500 text-xs">Phân bón</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg">🪴</span>
                <span className="font-bold text-stone-600 dark:text-stone-400 text-xs">Đất</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg">☀️</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400 text-xs">Ánh sáng</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg">🌿</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-xs">Dinh dưỡng</span>
              </div>
            </div>
          </div>

          {/* Cancel button - CLEAR */}
          <button
            onClick={onCancel}
            className="mt-2 w-full py-2 text-sm text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 font-bold transition-colors bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-md"
          >
            Hủy Đánh Giá
          </button>
        </div>
      </div>

      {/* Answer History */}
      <AnswerHistory
        answeredQuestions={answeredQuestions}
        isExpanded={historyExpanded}
        onToggle={() => setHistoryExpanded(!historyExpanded)}
      />

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -10px); }
          50% { transform: translate(-5px, -20px); }
          75% { transform: translate(-10px, -10px); }
        }
        
        @keyframes particle-rise {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        
        .animate-particle-rise {
          animation: particle-rise 1.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default QuestionNurture;
