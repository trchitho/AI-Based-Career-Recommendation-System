import React, { useRef, forwardRef, useState, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import './StoryBasedAssessment.css';
import { Question, QuestionResponse } from '../../types/assessment';
import { assessmentService } from '../../services/assessmentService';

// Page component with forwardRef
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className = '' }, ref) => {
    return (
      <div className={`page ${className}`} ref={ref}>
        <div className="page-content">{children}</div>
      </div>
    );
  }
);

Page.displayName = 'Page';

interface StoryBasedAssessmentProps {
  onComplete?: (responses: QuestionResponse[], essayText?: string) => void;
}

interface StoryScenario {
  emoji: string;
  title: string;
  context: string;
  situation: string;
}

// Response options - no emoji
const responseOptions = [
  { value: 1, label: 'Not Me', color: '#e74c3c' },
  { value: 2, label: 'Rarely', color: '#e67e22' },
  { value: 3, label: 'Sometimes', color: '#f39c12' },
  { value: 4, label: 'Often', color: '#27ae60' },
  { value: 5, label: 'Totally Me!', color: '#2ecc71' },
];

const StoryBasedAssessment = ({ onComplete }: StoryBasedAssessmentProps) => {
  const bookRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isBookClosed, setIsBookClosed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scenarios, setScenarios] = useState<StoryScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading questions...');
  const [error, setError] = useState<string | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [essayText, setEssayText] = useState('');
  const [essayPrompt, setEssayPrompt] = useState('');
  const [isEditingEssay, setIsEditingEssay] = useState(false);
  const [showEssayOverlay, setShowEssayOverlay] = useState(false);

  // Load questions and generate stories from API
  useEffect(() => {
    const loadQuestionsAndStories = async () => {
      try {
        setLoading(true);
        setLoadingMessage('Loading questions...');
        
        const riasecData = await assessmentService.getQuestions('RIASEC');
        const bigFiveData = await assessmentService.getQuestions('BIGFIVE');
        
        // Group RIASEC questions by label (R, I, A, S, E, C)
        const riasecByLabel: { [key: string]: Question[] } = {};
        riasecData.forEach(q => {
          const label = q.dimension || q.id.toString().charAt(0); // Extract first character
          if (!riasecByLabel[label]) {
            riasecByLabel[label] = [];
          }
          riasecByLabel[label].push(q);
        });

        // Group Big Five questions by label (O, C, E, A, N)
        const bigFiveByLabel: { [key: string]: Question[] } = {};
        bigFiveData.forEach(q => {
          const label = q.dimension || q.id.toString().charAt(0); // Extract first character
          if (!bigFiveByLabel[label]) {
            bigFiveByLabel[label] = [];
          }
          bigFiveByLabel[label].push(q);
        });

        // Combine questions by alternating labels
        const riasecLabels = Object.keys(riasecByLabel).sort(); // R, I, A, S, E, C
        const bigFiveLabels = Object.keys(bigFiveByLabel).sort(); // A, C, E, N, O
        const combined: Question[] = [];

        // Interleave label groups: R group, O group, I group, C group, etc.
        const maxLabels = Math.max(riasecLabels.length, bigFiveLabels.length);
        for (let i = 0; i < maxLabels; i++) {
          if (i < riasecLabels.length) {
            const label = riasecLabels[i];
            if (label && riasecByLabel[label]) {
              combined.push(...riasecByLabel[label]);
            }
          }
          if (i < bigFiveLabels.length) {
            const label = bigFiveLabels[i];
            if (label && bigFiveByLabel[label]) {
              combined.push(...bigFiveByLabel[label]);
            }
          }
        }
        
        // Take first 44 questions (same as traditional test)
        const selected = combined.slice(0, 44);
        
        console.log(`📊 Total questions loaded: ${selected.length}`);
        console.log(`📊 RIASEC questions: ${riasecData.length}`);
        console.log(`📊 Big Five questions: ${bigFiveData.length}`);
        
        setQuestions(selected);
        
        // Generate story scenarios using backend API
        setLoadingMessage('Creating your personalized story scenarios with AI...');
        
        const generatedScenarios = await generateStoriesFromBackend(selected);
        
        // Add essay as scenario 45
        const essayScenario: StoryScenario = {
          emoji: '✍️',
          title: 'Chia Sẻ Câu Chuyện Của Bạn',
          context: 'Đây là cơ hội để bạn chia sẻ sâu hơn về bản thân, ước mơ và định hướng nghề nghiệp của mình.',
          situation: 'Hãy viết một đoạn văn ngắn (100-300 từ) về bản thân bạn, sở thích, điểm mạnh và nghề nghiệp mà bạn quan tâm.'
        };
        
        const allScenarios = [...generatedScenarios, essayScenario];
        setScenarios(allScenarios);
        
        // Fetch essay prompt
        try {
          const prompt = await assessmentService.getEssayPrompt('vi');
          setEssayPrompt(prompt.prompt_text);
        } catch (err) {
          console.warn('Failed to load essay prompt, using default');
        }
        
        console.log(`📖 Total scenarios generated: ${allScenarios.length} (44 questions + 1 essay)`);
        console.log(`📖 Expected scenarios: ${selected.length}`);
        
        if (generatedScenarios.length < selected.length) {
          console.warn(`⚠️ Missing ${selected.length - generatedScenarios.length} scenarios!`);
        }
        
        setLoadingMessage('Ready to begin your journey!');
        setError(null);
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load questions. Please try again.');
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    loadQuestionsAndStories();
  }, []);
  
  // Disable flipbook keyboard events when editing essay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingEssay) {
        // Allow all keyboard input when editing essay
        console.log('🔒 Blocking flipbook keyboard event:', e.key);
        e.stopPropagation();
      }
    };
    
    if (isEditingEssay) {
      console.log('✍️ Essay editing mode ENABLED - keyboard events blocked');
      // Add event listener with capture phase to intercept before flipbook
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('keyup', handleKeyDown, true);
      document.addEventListener('keypress', handleKeyDown, true);
      
      return () => {
        console.log('✍️ Essay editing mode DISABLED');
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('keyup', handleKeyDown, true);
        document.removeEventListener('keypress', handleKeyDown, true);
      };
    }
  }, [isEditingEssay]);
  
  // Generate stories by calling backend API
  const generateStoriesFromBackend = async (questions: Question[]): Promise<StoryScenario[]> => {
    const scenarios: StoryScenario[] = [];
    const groupSize = 5;
    const totalGroups = Math.ceil(questions.length / groupSize);
    
    for (let i = 0; i < questions.length; i += groupSize) {
      const group = questions.slice(i, i + groupSize);
      const groupIndex = Math.floor(i / groupSize);
      
      // Update progress
      const progress = Math.round(((groupIndex + 1) / totalGroups) * 100);
      setStoryProgress(progress);
      setLoadingMessage(`Creating your personalized story scenarios... ${progress}%`);
      
      try {
        console.log(`Generating story for group ${groupIndex + 1}...`);
        
        const response = await fetch('/api/assessments/generate-story', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questions: group.map(q => ({
              id: q.id,
              question_text: q.question_text,
              dimension: q.dimension,
              test_type: q.test_type
            })),
            group_index: groupIndex
          })
        });
        
        const result = await response.json();
        
        // Use data from backend (either AI-generated or fallback)
        if (result.data && result.data.questionScenarios) {
          const receivedScenarios = result.data.questionScenarios;
          
          // Validate: backend should return same number of scenarios as questions in group
          console.log(`📊 Group ${groupIndex + 1}: Expected ${group.length} scenarios, received ${receivedScenarios.length}`);
          
          if (receivedScenarios.length !== group.length) {
            console.warn(`⚠️ Group ${groupIndex + 1}: Mismatch! Expected ${group.length} scenarios, got ${receivedScenarios.length}`);
            console.log(`📝 Questions in group:`, group.map(q => ({ id: q.id, text: q.question_text.substring(0, 50) })));
            console.log(`📝 Received scenarios:`, receivedScenarios.map((s: any) => s.title));
            
            // Fill missing scenarios with enhanced fallback based on dimension
            while (receivedScenarios.length < group.length) {
              const missingIndex = receivedScenarios.length;
              const q = group[missingIndex];
              if (q) {
                console.log(`🔧 Creating fallback for question ${missingIndex + 1}:`, q.question_text.substring(0, 50));
                
                // Enhanced fallback with dimension-specific context
                const dimensionInfo: Record<string, { emoji: string; title: string; context: string }> = {
                  'R': { 
                    emoji: '🔧', 
                    title: 'Thử Thách Thực Tế', 
                    context: 'Bạn đang đối mặt với một tình huống yêu cầu kỹ năng thực hành và làm việc với công cụ, máy móc.' 
                  },
                  'I': { 
                    emoji: '🔬', 
                    title: 'Thử Thách Nghiên Cứu', 
                    context: 'Bạn cần phân tích, nghiên cứu và giải quyết vấn đề phức tạp một cách có hệ thống.' 
                  },
                  'A': { 
                    emoji: '🎨', 
                    title: 'Thử Thách Sáng Tạo', 
                    context: 'Đây là cơ hội để thể hiện khả năng sáng tạo, nghệ thuật và tư duy độc đáo của bạn.' 
                  },
                  'S': { 
                    emoji: '🤝', 
                    title: 'Thử Thách Xã Hội', 
                    context: 'Tình huống này liên quan đến việc giúp đỡ, dạy dỗ và tương tác với người khác.' 
                  },
                  'E': { 
                    emoji: '💼', 
                    title: 'Thử Thách Lãnh Đạo', 
                    context: 'Bạn cần đưa ra quyết định, thuyết phục người khác và dẫn dắt nhóm đạt mục tiêu.' 
                  },
                  'C': { 
                    emoji: '📋', 
                    title: 'Thử Thách Tổ Chức', 
                    context: 'Tình huống yêu cầu sự cẩn thận, chính xác và làm việc có hệ thống theo quy trình.' 
                  },
                  'O': { 
                    emoji: '💡', 
                    title: 'Thử Thách Cởi Mở', 
                    context: 'Đây là cơ hội để khám phá điều mới mẻ, sáng tạo và thử nghiệm ý tưởng độc đáo.' 
                  },
                  'N': { 
                    emoji: '😌', 
                    title: 'Thử Thách Cảm Xúc', 
                    context: 'Bạn cần quản lý cảm xúc và giữ bình tĩnh trong tình huống áp lực này.' 
                  }
                };
                
                const dim = q.dimension || 'R';
                const info = dimensionInfo[dim] || { 
                  emoji: '💭', 
                  title: 'Tình Huống Thực Tế', 
                  context: 'Hãy tưởng tượng bạn đang trong tình huống này và đánh giá mức độ phù hợp với bản thân.' 
                };
                
                // Create a more detailed Vietnamese scenario based on the question
                let vietnameseSituation = q.question_text;
                
                // Try to translate common English phrases to Vietnamese
                const translations: Record<string, string> = {
                  'Teach a high-school class': 'Dạy học cho một lớp học trung học phổ thông',
                  'Operate a machine': 'Vận hành máy móc thiết bị',
                  'Repair household appliances': 'Sửa chữa các thiết bị gia dụng',
                  'Conduct a scientific experiment': 'Tiến hành thí nghiệm khoa học',
                  'Write a novel': 'Viết một cuốn tiểu thuyết',
                  'Design a website': 'Thiết kế một trang web',
                  'Help people with personal problems': 'Giúp đỡ mọi người giải quyết vấn đề cá nhân',
                  'Manage a business': 'Quản lý một doanh nghiệp',
                  'Organize files and records': 'Tổ chức hồ sơ và tài liệu'
                };
                
                // Check if question text matches any translation
                for (const [eng, vie] of Object.entries(translations)) {
                  if (q.question_text.toLowerCase().includes(eng.toLowerCase())) {
                    vietnameseSituation = vie;
                    break;
                  }
                }
                
                receivedScenarios.push({
                  emoji: info.emoji,
                  title: `${info.title} ${i + missingIndex + 1}`,
                  context: info.context,
                  situation: vietnameseSituation,
                });
              }
            }
            
            console.log(`✅ Group ${groupIndex + 1}: Filled to ${receivedScenarios.length} scenarios`);
          }
          
          scenarios.push(...receivedScenarios);
          if (result.success) {
            console.log(`✓ Group ${groupIndex + 1} story generated with AI (${receivedScenarios.length} scenarios)`);
          } else {
            console.log(`✓ Group ${groupIndex + 1} using backend fallback (${result.error || 'AI unavailable'})`);
          }
        } else {
          throw new Error('No data returned from backend');
        }
        
      } catch (error) {
        console.error(`Error generating group ${groupIndex}:`, error);
        // Client-side fallback scenarios with better context based on dimension
        const fallbackScenarios = group.map((q, idx) => {
          const dimension = q.dimension?.toLowerCase() || '';
          
          // Create contextual scenarios based on dimension
          let emoji = '💭';
          let title = `Tình Huống ${i + idx + 1}`;
          let context = '';
          
          // RIASEC dimensions
          if (dimension.includes('realistic') || dimension === 'r') {
            emoji = '🔧';
            title = 'Thử Thách Thực Tế';
            context = 'Bạn đang làm việc với các công cụ và thiết bị. Hãy nghĩ về cách bạn tiếp cận công việc này.';
          } else if (dimension.includes('investigative') || dimension === 'i') {
            emoji = '🔬';
            title = 'Khám Phá & Phân Tích';
            context = 'Bạn đang nghiên cứu một vấn đề phức tạp. Hãy suy nghĩ về cách bạn giải quyết nó.';
          } else if (dimension.includes('artistic') || dimension === 'a') {
            emoji = '🎨';
            title = 'Sáng Tạo & Nghệ Thuật';
            context = 'Bạn đang trong một dự án sáng tạo. Hãy tưởng tượng cách bạn thể hiện ý tưởng.';
          } else if (dimension.includes('social') || dimension === 's') {
            emoji = '🤝';
            title = 'Tương Tác Xã Hội';
            context = 'Bạn đang làm việc với mọi người. Hãy nghĩ về cách bạn giao tiếp và hỗ trợ họ.';
          } else if (dimension.includes('enterprising') || dimension === 'e') {
            emoji = '💼';
            title = 'Lãnh Đạo & Kinh Doanh';
            context = 'Bạn đang đưa ra quyết định quan trọng. Hãy suy nghĩ về cách bạn dẫn dắt nhóm.';
          } else if (dimension.includes('conventional') || dimension === 'c') {
            emoji = '📊';
            title = 'Tổ Chức & Quản Lý';
            context = 'Bạn đang làm việc với dữ liệu và hệ thống. Hãy nghĩ về cách bạn sắp xếp công việc.';
          }
          // Big Five dimensions
          else if (dimension.includes('openness') || dimension === 'o') {
            emoji = '🌟';
            title = 'Khám Phá Điều Mới';
            context = 'Bạn gặp một cơ hội mới lạ. Hãy suy nghĩ về cách bạn phản ứng với điều này.';
          } else if (dimension.includes('conscientiousness')) {
            emoji = '✅';
            title = 'Trách Nhiệm & Kỷ Luật';
            context = 'Bạn có nhiều công việc cần hoàn thành. Hãy nghĩ về cách bạn tổ chức thời gian.';
          } else if (dimension.includes('extraversion')) {
            emoji = '🎉';
            title = 'Năng Lượng & Giao Tiếp';
            context = 'Bạn đang trong một sự kiện với nhiều người. Hãy tưởng tượng cách bạn tương tác.';
          } else if (dimension.includes('agreeableness')) {
            emoji = '💚';
            title = 'Hợp Tác & Thấu Hiểu';
            context = 'Bạn đang làm việc nhóm. Hãy suy nghĩ về cách bạn hỗ trợ đồng đội.';
          } else if (dimension.includes('neuroticism') || dimension === 'n') {
            emoji = '🧘';
            title = 'Quản Lý Cảm Xúc';
            context = 'Bạn đối mặt với áp lực. Hãy nghĩ về cách bạn xử lý tình huống này.';
          } else {
            context = 'Hãy suy nghĩ về tình huống này và chọn câu trả lời phù hợp nhất với bạn.';
          }
          
          return {
            emoji,
            title,
            context,
            situation: q.question_text,
          };
        });
        scenarios.push(...fallbackScenarios);
        console.log(`✓ Using enhanced client fallback scenarios for group ${groupIndex + 1}`);
      }
      
      // Small delay between groups
      if (i + groupSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return scenarios;
  };
  
  // 1 question per page for immersive story experience
  const questionPages = questions.length;
  const totalPages = 3 + questionPages + 2; // cover, intro, story intro, questions, ending, back cover

  const handleFlip = (e: any) => {
    setCurrentPage(e.data);
    
    // Check if we're on essay page (page index = 3 + questions.length)
    const essayPageIndex = 3 + questions.length;
    setShowEssayOverlay(e.data === essayPageIndex);
    
    // Update story progress
    if (e.data > 3 && e.data <= 3 + questionPages) {
      const progress = ((e.data - 3) / questionPages) * 100;
      setStoryProgress(progress);
    }
    
    if (e.data >= totalPages - 1) {
      setIsBookClosed(true);
    } else {
      setIsBookClosed(false);
    }
  };

  const openBook = () => {
    setIsBookClosed(false);
    setStoryProgress(0);
    // Auto flip to first page (How It Works) after opening
    setTimeout(() => {
      bookRef.current?.pageFlip().flip(1);
    }, 300);
  };

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: value };
      
      // Calculate which page we're on
      const questionIndex = questions.findIndex(q => String(q.id) === questionId);
      
      if (questionIndex >= 0) {
        const isLastQuestion = questionIndex === questions.length - 1;
        
        // Don't auto-flip on last question - let user submit manually
        if (isLastQuestion) {
          return newAnswers;
        }
        
        // First question (index 0) is alone on first page
        if (questionIndex === 0) {
          // Auto flip after answering first question
          setTimeout(() => {
            bookRef.current?.pageFlip().flipNext();
          }, 600);
        } else {
          // For other questions, they come in pairs (2 per spread)
          // Calculate which pair this question belongs to
          const pairIndex = Math.floor((questionIndex - 1) / 2);
          const pairStartIndex = pairIndex * 2 + 1; // +1 because first question is alone
          const questionsInPair = questions.slice(pairStartIndex, pairStartIndex + 2);
          
          // Count answered questions in this pair
          const answeredInPair = questionsInPair.filter(q => 
            newAnswers[String(q.id)] !== undefined
          ).length;
          
          // Auto flip when both questions in pair are answered
          if (answeredInPair === questionsInPair.length) {
            setTimeout(() => {
              bookRef.current?.pageFlip().flipNext();
            }, 600);
          }
        }
      }
      
      return newAnswers;
    });
  };

  const handleSubmit = () => {
    if (onComplete) {
      const responses: QuestionResponse[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: questionId,
        answer: answer,
      }));
      // Pass essay text along with responses
      onComplete(responses, essayText);
    }
  };

  const canGoNext = () => {
    if (currentPage < 3) return true; // Cover, intro, story intro
    if (currentPage >= totalPages - 2) return true; // Ending and back cover
    
    // For question pages, check if current question is answered
    const questionIndex = currentPage - 3;
    if (questionIndex >= 0 && questionIndex < questions.length) {
      const question = questions[questionIndex];
      if (question) {
        return answers[String(question.id)] !== undefined;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    // Check if we're on the last question page
    const questionIndex = currentPage - 3;
    const isLastQuestion = questionIndex === questions.length - 1;
    const allAnswered = Object.keys(answers).length === questions.length;
    
    // If on last question and all answered, submit instead of going to next page
    if (isLastQuestion && allAnswered) {
      handleSubmit();
      return;
    }
    
    if (canGoNext()) {
      bookRef.current?.pageFlip().flipNext();
    } else {
      alert('Please choose an option to continue your journey!');
    }
  };

  if (loading) {
    return (
      <div className="story-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
          {storyProgress > 0 && (
            <div style={{ 
              width: '300px', 
              height: '8px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '10px',
              overflow: 'hidden',
              marginTop: '20px'
            }}>
              <div style={{
                width: `${storyProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease',
                borderRadius: '10px'
              }}></div>
            </div>
          )}
          <div className="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="story-container">
        <div className="error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`story-container ${isBookClosed ? 'book-closed' : ''}`}>
      {/* Animated Falling Leaves */}
      <div className="leaves">
        <div className="set">
          <div><img src="/assets/leaf_01.png" alt="" /></div>
          <div><img src="/assets/leaf_02.png" alt="" /></div>
          <div><img src="/assets/leaf_03.png" alt="" /></div>
          <div><img src="/assets/leaf_04.png" alt="" /></div>
          <div><img src="/assets/leaf_01.png" alt="" /></div>
          <div><img src="/assets/leaf_02.png" alt="" /></div>
          <div><img src="/assets/leaf_03.png" alt="" /></div>
          <div><img src="/assets/leaf_04.png" alt="" /></div>
        </div>
      </div>

      {/* Progress bar */}
      {storyProgress > 0 && storyProgress < 100 && (
        <div className="story-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${storyProgress}%` }}></div>
          </div>
          <span className="progress-text">Journey Progress: {Math.round(storyProgress)}%</span>
        </div>
      )}

      {/* Navigation - Left Side (Previous Button) */}
      <div className="navigation">
        {!isBookClosed && (
          <button
            className="nav-btn prev-btn"
            onClick={() => bookRef.current?.pageFlip().flipPrev()}
            disabled={currentPage === 0}
          >
            <span>←</span>
            <span>Previous</span>
          </button>
        )}
      </div>

      <div className="book-wrapper">
        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          width={750}
          height={950}
          size="stretch"
          minWidth={500}
          maxWidth={850}
          minHeight={700}
          maxHeight={1100}
          maxShadowOpacity={0.5}
          showCover={false}
          mobileScrollSupport={true}
          className="story-book"
          usePortrait={false}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          useMouseEvents={false}
          swipeDistance={30}
          clickEventForward={false}
          onFlip={handleFlip}
        >
          {/* Cover */}
          <Page className="story-cover">
            <div className="cover-content">
              <h1>Your Career Journey</h1>
              <p className="cover-subtitle">An Interactive Adventure</p>
            </div>
          </Page>

          {/* Welcome */}
          <Page className="welcome-page">
            <div className="welcome-content">
              <h2>Welcome, Adventurer!</h2>
              <p className="welcome-text">
                You're about to embark on a journey of self-discovery. 
                Instead of boring questions, you'll experience real-life scenarios.
              </p>
              <div className="welcome-features">
                <div className="feature">
                  <span>Interactive Scenarios</span>
                </div>
                <div className="feature">
                  <span>Honest Responses</span>
                </div>
                <div className="feature">
                  <span>Career Insights</span>
                </div>
              </div>
              <p className="welcome-note">
                There are no right or wrong answers. Just be yourself!
              </p>
            </div>
          </Page>

          {/* Story Introduction */}
          <Page className="story-intro-page">
            <div className="story-intro-content">
              <h2>How It Works</h2>
              <div className="instructions">
                <div className="instruction-step">
                  <span className="step-number">1</span>
                  <p>Read each scenario carefully</p>
                </div>
                <div className="instruction-step">
                  <span className="step-number">2</span>
                  <p>Imagine yourself in that situation</p>
                </div>
                <div className="instruction-step">
                  <span className="step-number">3</span>
                  <p>Choose how you'd naturally respond</p>
                </div>
              </div>
              <div className="response-guide">
                <p className="guide-title">Response Guide:</p>
                {responseOptions.map(opt => (
                  <div key={opt.value} className="guide-item">
                    <span className="guide-label">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Page>

          {/* Question Pages - 1 scenario per page */}
          {questions.map((question, index) => {
            const scenario = scenarios[index] || {
              emoji: '💭',
              title: 'Tình Huống',
              context: 'Hãy suy nghĩ về tình huống này...',
              situation: question.question_text,
            };
            const isAnswered = answers[String(question.id)] !== undefined;
            
            // Get label for grouping
            const currentLabel = question.dimension || question.id.toString().charAt(0);
            const prevQuestion = index > 0 ? questions[index - 1] : null;
            const prevLabel = prevQuestion ? (prevQuestion.dimension || prevQuestion.id.toString().charAt(0)) : null;
            const isNewLabelGroup = currentLabel !== prevLabel;
            
            // Label descriptions with emojis
            const labelInfo: { [key: string]: { name: string; emoji: string; color: string } } = {
              'R': { name: 'Realistic', emoji: '🔧', color: '#3498db' },
              'I': { name: 'Investigative', emoji: '🔬', color: '#9b59b6' },
              'A': { name: 'Artistic', emoji: '🎨', color: '#e91e63' },
              'S': { name: 'Social', emoji: '🤝', color: '#27ae60' },
              'E': { name: 'Enterprising', emoji: '💼', color: '#e67e22' },
              'C': { name: 'Conventional', emoji: '📋', color: '#95a5a6' },
              'O': { name: 'Openness', emoji: '🌟', color: '#5c6bc0' },
              'N': { name: 'Neuroticism', emoji: '😌', color: '#ef5350' },
            };
            
            const labelData = labelInfo[currentLabel];
            
            return (
              <Page key={question.id} className="scenario-page">
                <div className="scenario-content">
                  <div className="scenario-header">
                    <span className="scenario-number">Scenario {index + 1} of {questions.length}</span>
                    {labelData && (
                      <div className="label-badge" style={{ 
                        backgroundColor: `${labelData.color}20`,
                        borderColor: labelData.color,
                        color: labelData.color
                      }}>
                        <span className="label-emoji">{labelData.emoji}</span>
                        <span className="label-name">{labelData.name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Show label group intro on first question of each group */}
                  {isNewLabelGroup && labelData && (
                    <div className="label-intro" style={{ borderLeftColor: labelData.color }}>
                      <h3 style={{ color: labelData.color }}>
                        {labelData.emoji} {labelData.name} Personality
                      </h3>
                      <p className="label-description">
                        {currentLabel === 'R' && 'Explore your practical, hands-on approach to work and problem-solving.'}
                        {currentLabel === 'I' && 'Discover your analytical thinking and research-oriented mindset.'}
                        {currentLabel === 'A' && 'Uncover your creative expression and artistic sensibilities.'}
                        {currentLabel === 'S' && 'Understand your people-oriented and helping nature.'}
                        {currentLabel === 'E' && 'Reveal your leadership and entrepreneurial spirit.'}
                        {currentLabel === 'C' && 'Examine your organizational and detail-focused traits.'}
                        {currentLabel === 'O' && 'Assess your openness to new experiences and ideas.'}
                        {currentLabel === 'N' && 'Evaluate your emotional stability and stress management.'}
                      </p>
                    </div>
                  )}
                  
                  {/* Story Context - AI Generated Scenario (TOP) */}
                  <div className="scenario-context">
                    <p className="context-text">{scenario.context}</p>
                  </div>
                  
                  {/* AI Rephrased Question (MIDDLE) */}
                  <div className="scenario-situation">
                    <div className="situation-box">
                      <p className="situation-text">{scenario.situation}</p>
                    </div>
                  </div>
                  
                  {/* Original Question from Database (REFERENCE) */}
                  <div className="original-question">
                    <p className="original-label">Câu hỏi gốc:</p>
                    <p className="original-text">{question.question_text}</p>
                  </div>
                  
                  <div className="response-options">
                    {responseOptions.map((option) => {
                      const selected = answers[String(question.id)] === option.value;
                      return (
                        <button
                          key={option.value}
                          className={`response-btn ${selected ? 'selected' : ''}`}
                          style={{
                            borderColor: selected ? option.color : '#ddd',
                            backgroundColor: selected ? `${option.color}15` : 'white',
                          }}
                          onClick={() => handleAnswer(String(question.id), option.value)}
                        >
                          <span className="response-label">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {isAnswered && (
                    <div className="continue-hint">
                      Response recorded! Click Next to continue
                    </div>
                  )}
                </div>
              </Page>
            );
          })}

          {/* Essay Page - Scenario 45 */}
          <Page className="essay-page">
            <div 
              className="scenario-content"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="scenario-header">
                <span className="scenario-number">Scenario 45 of 45</span>
                <div className="label-badge" style={{ 
                  backgroundColor: '#8e44ad20',
                  borderColor: '#8e44ad',
                  color: '#8e44ad'
                }}>
                  <span className="label-emoji">✍️</span>
                  <span className="label-name">Personal Story</span>
                </div>
              </div>
              
              <div className="essay-intro">
                <h3 style={{ color: '#8e44ad' }}>
                  ✍️ Chia Sẻ Câu Chuyện Của Bạn
                </h3>
                <p className="essay-description">
                  Đây là cơ hội để bạn chia sẻ sâu hơn về bản thân, ước mơ và định hướng nghề nghiệp của mình.
                </p>
              </div>
              
              <div className="essay-prompt">
                <p className="prompt-text">
                  {essayPrompt || 'Hãy viết một đoạn văn ngắn (100-300 từ) về bản thân bạn, sở thích, điểm mạnh và nghề nghiệp mà bạn quan tâm.'}
                </p>
              </div>
              
              {/* Button to open overlay textarea */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEssayOverlay(true);
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'white',
                  color: '#8e44ad',
                  border: '2px solid #8e44ad',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto'
                }}
              >
                ✍️ Viết Câu Chuyện Của Bạn
              </button>
              
              {essayText.trim().length > 0 && (
                <div className="continue-hint" style={{ marginTop: '1rem' }}>
                  ✓ Đã lưu {essayText.split(/\s+/).filter(w => w.length > 0).length} từ
                </div>
              )}
            </div>
          </Page>

          {/* Ending */}
          <Page className="ending-page">
            <div className="ending-content">
              <h2>Journey Complete!</h2>
              <p className="ending-text">
                You've explored {questions.length} different scenarios and discovered more about yourself.
              </p>
              <div className="ending-stats">
                <div className="stat">
                  <span className="stat-text">{Object.keys(answers).length} Scenarios Completed</span>
                </div>
                <div className="stat">
                  <span className="stat-text">Career Insights Ready</span>
                </div>
              </div>
              {Object.keys(answers).length === questions.length && (
                <button className="submit-btn" onClick={handleSubmit}>
                  <span>Discover Your Career Path</span>
                </button>
              )}
            </div>
          </Page>

          {/* Back Cover */}
          <Page className="story-cover back-cover">
            <div className="back-cover-content">
              <p className="back-quote">"The journey of a thousand miles begins with a single step"</p>
              <p className="back-author">- Lao Tzu</p>
            </div>
          </Page>
        </HTMLFlipBook>
      </div>

      {/* Navigation - Right Side (Next/Submit Button) */}
      <div className="navigation">
        {isBookClosed ? (
          <button className="nav-btn open-btn" onClick={openBook}>
            <span>Start New Journey</span>
          </button>
        ) : (
          <>
            {(() => {
              const questionIndex = currentPage - 3;
              const isLastQuestion = questionIndex === questions.length - 1;
              const allAnswered = Object.keys(answers).length === questions.length;
              const isOnQuestionPage = questionIndex >= 0 && questionIndex < questions.length;
              
              // Show Submit button on last question if all answered
              if (isOnQuestionPage && isLastQuestion && allAnswered) {
                return (
                  <button
                    className="nav-btn submit-nav-btn"
                    onClick={handleSubmit}
                  >
                    <span>Submit</span>
                  </button>
                );
              }
              
              // Otherwise show Next button
              return (
                <button
                  className="nav-btn next-btn"
                  onClick={handleNext}
                  disabled={!canGoNext()}
                >
                  <span>Next</span>
                  <span>→</span>
                </button>
              );
            })()}
          </>
        )}
      </div>

      {/* Essay Textarea Overlay - Appears on top when on essay page */}
      {showEssayOverlay && (
        <div 
          className="essay-textarea-overlay"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            background: 'rgba(102, 126, 234, 0.95)',
            padding: '2rem',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '600px',
            width: '90%',
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: '1rem', color: 'white' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✍️ Chia Sẻ Câu Chuyện Của Bạn
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
              Đây là cơ hội để bạn chia sẻ sâu hơn về bản thân, ước mơ và định hướng nghề nghiệp của mình.
            </p>
          </div>
          
          <textarea
            ref={textareaRef}
            value={essayText}
            onChange={(e) => {
              console.log('📝 Overlay textarea onChange:', e.target.value);
              setEssayText(e.target.value);
            }}
            onFocus={() => {
              console.log('🎯 Overlay textarea focused');
              setIsEditingEssay(true);
            }}
            onBlur={() => {
              console.log('👋 Overlay textarea blurred');
              setIsEditingEssay(false);
            }}
            placeholder="Bắt đầu viết câu chuyện của bạn..."
            rows={10}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px solid white',
              borderRadius: '12px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              lineHeight: '1.6',
              resize: 'vertical',
              minHeight: '200px',
              background: 'white',
              color: '#333',
              pointerEvents: 'auto',
              userSelect: 'text',
              cursor: 'text'
            }}
          />
          
          <div style={{ 
            marginTop: '0.5rem', 
            color: 'white', 
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{essayText.split(/\s+/).filter(w => w.length > 0).length} từ</span>
            <button
              onClick={() => setShowEssayOverlay(false)}
              style={{
                padding: '0.5rem 1.5rem',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryBasedAssessment;
