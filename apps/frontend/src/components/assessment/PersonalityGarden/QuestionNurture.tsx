import { useState } from 'react';
import { Question } from '../../../types/assessment';
import { TreeGrowthState, NurtureElement } from './types/garden.types';
import TreeCanvas from './TreeCanvas';
import NatureEnergyBar from './NatureEnergyBar';
import AnswerHistory from './AnswerHistory';

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
  onCancel
}) => {
  const [selectedElement, setSelectedElement] = useState<NurtureElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Transform answers into nurture elements - REALISTIC PLANT NEEDS
  const getNurtureElements = (): NurtureElement[] => {
    if (question.question_type === 'SCALE') {
      return [
        {
          id: '1',
          type: 'water',
          label: 'Strongly Disagree',
          emoji: '💧',
          value: 1,
          color: 'from-blue-400 to-blue-600',
          particleColor: '#60A5FA'
        },
        {
          id: '2',
          type: 'fertilizer',
          label: 'Disagree',
          emoji: '🌱',
          value: 2,
          color: 'from-amber-600 to-amber-800',
          particleColor: '#D97706'
        },
        {
          id: '3',
          type: 'soil',
          label: 'Neutral',
          emoji: '🪴',
          value: 3,
          color: 'from-stone-500 to-stone-700',
          particleColor: '#78716C'
        },
        {
          id: '4',
          type: 'sunlight',
          label: 'Agree',
          emoji: '☀️',
          value: 4,
          color: 'from-yellow-400 to-orange-500',
          particleColor: '#FBBF24'
        },
        {
          id: '5',
          type: 'nutrients',
          label: 'Strongly Agree',
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

      return (question.options || []).map((option, index) => {
        const type = elementTypes[index % elementTypes.length];
        const config = elementConfigs[type];
        return {
          id: `${index}`,
          type,
          label: option,
          emoji: config.emoji,
          value: option,
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
      {/* Background with time-of-day gradient */}
      <div className={`absolute inset-0 transition-colors duration-2000 ${
        progress < 25 ? 'bg-gradient-to-b from-orange-200 via-yellow-100 to-green-100' : // Dawn
        progress < 50 ? 'bg-gradient-to-b from-sky-200 via-blue-100 to-green-100' : // Day
        progress < 75 ? 'bg-gradient-to-b from-orange-300 via-pink-200 to-purple-100' : // Golden hour
        'bg-gradient-to-b from-purple-300 via-indigo-200 to-blue-200' // Twilight
      } dark:from-gray-900 dark:via-gray-800 dark:to-gray-900`}>
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
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
              <div className="w-3 h-3 bg-white/20 rounded-full blur-sm"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Top bar with stats */}
      <div className="relative z-20 p-4">
        <NatureEnergyBar
          natureEnergy={natureEnergy}
          growthLevel={growthLevel}
          bloomChain={bloomChain}
          progress={progress}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">
        {/* Floating question */}
        <div className="mb-8 max-w-2xl w-full animate-float">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-2 border-white/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">
                {question.test_type === 'RIASEC' ? '🎯' : '🧠'}
              </span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {question.test_type === 'RIASEC' ? 'Career Interest' : 'Personality Trait'}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
              {question.question_text}
            </h3>
          </div>
        </div>

        {/* Tree canvas */}
        <div className="flex-1 flex items-center justify-center w-full max-w-4xl">
          <TreeCanvas
            growth={treeGrowth}
            isAnimating={isAnimating}
            selectedElement={selectedElement}
          />
        </div>
      </div>

      {/* Bottom element selector */}
      <div className="relative z-20 bg-gradient-to-t from-white/95 via-white/90 to-transparent dark:from-gray-900/95 dark:via-gray-900/90 backdrop-blur-md p-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
            🌱 Choose how to nurture your tree
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {elements.map((element) => (
              <button
                key={element.id}
                onClick={() => handleElementSelect(element)}
                disabled={isAnimating}
                className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                  isAnimating && selectedElement?.id === element.id
                    ? 'scale-110 opacity-50'
                    : 'hover:scale-105 hover:-translate-y-1'
                } ${
                  isAnimating && selectedElement?.id !== element.id
                    ? 'opacity-30'
                    : ''
                }`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${element.color} rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${element.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity`}></div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <span className="text-4xl drop-shadow-lg">{element.emoji}</span>
                  <span className="text-white font-bold text-sm text-center leading-tight">
                    {element.label}
                  </span>
                </div>

                {/* Particle effect on hover */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
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

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="mt-6 w-full py-3 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors"
          >
            Cancel Assessment
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
