import React, { useRef, forwardRef, useState, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useTranslation } from 'react-i18next';
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

interface GroupScenario {
  emoji: string;
  title: string;
  introduction: string;
}

interface StoryGroup {
  groupScenario: GroupScenario;
  questionScenarios: StoryScenario[];
}

// Response option colors (labels are resolved via i18n at render time)
const responseOptionColors = [
  { value: 1, color: '#e74c3c' },
  { value: 2, color: '#e67e22' },
  { value: 3, color: '#f39c12' },
  { value: 4, color: '#27ae60' },
  { value: 5, color: '#2ecc71' },
];

const StoryBasedAssessment = ({ onComplete }: StoryBasedAssessmentProps) => {
  const { t } = useTranslation();
  const bookRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isBookClosed, setIsBookClosed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scenarios, setScenarios] = useState<StoryScenario[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [essayText, setEssayText] = useState('');
  const [essayPrompt, setEssayPrompt] = useState('');
  const [isEditingEssay, setIsEditingEssay] = useState(false);
  const [showEssayOverlay, setShowEssayOverlay] = useState(false);

  // Responsive book dimensions
  const [bookDimensions, setBookDimensions] = useState({ width: 750, height: 950, portrait: false });

  useEffect(() => {
    const updateBookDimensions = () => {
      const vw = window.innerWidth;
      if (vw < 640) {
        // Mobile: single-page portrait mode
        const w = Math.min(vw - 32, 400);
        setBookDimensions({ width: w, height: Math.round(w * 1.4), portrait: true });
      } else if (vw < 1024) {
        // Tablet: smaller two-page spread
        const w = Math.round((vw - 64) / 2);
        setBookDimensions({ width: w, height: Math.round(w * 1.3), portrait: false });
      } else {
        // Desktop: default
        setBookDimensions({ width: 750, height: 950, portrait: false });
      }
    };
    updateBookDimensions();
    window.addEventListener('resize', updateBookDimensions);
    return () => window.removeEventListener('resize', updateBookDimensions);
  }, []);

  // Voice recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'done' | 'error'>('idle');
  const [voiceDuration, setVoiceDuration] = useState(0);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build translated response options
  const responseOptions = [
    { value: 1, label: t('assessment.response.notMe'), color: '#e74c3c' },
    { value: 2, label: t('assessment.response.rarely'), color: '#e67e22' },
    { value: 3, label: t('assessment.response.sometimes'), color: '#f39c12' },
    { value: 4, label: t('assessment.response.often'), color: '#27ae60' },
    { value: 5, label: t('assessment.response.totallyMe'), color: '#2ecc71' },
  ];

  // Load questions and generate stories from API
  useEffect(() => {
    const loadQuestionsAndStories = async () => {
      try {
        setLoading(true);
        setLoadingMessage(t('assessment.loadingQuestions'));

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

        // Take first 33 questions (3 per dimension: 6 RIASEC × 3 + 5 Big Five × 3)
        const selected = combined.slice(0, 33);

        console.log(` Total questions loaded: ${selected.length}`);
        console.log(` RIASEC questions: ${riasecData.length}`);
        console.log(` Big Five questions: ${bigFiveData.length}`);

        setQuestions(selected);

        // Generate story scenarios using backend API
        setLoadingMessage(t('assessment.generating'));

        const { groups, flat: generatedScenarios } = await generateStoriesFromBackend(selected);

        // Set both together so render sees consistent state
        setStoryGroups(groups);

        // Add essay as scenario 45
        const essayScenario: StoryScenario = {
          emoji: '',
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

        console.log(` Story groups: ${groups.length}, scenarios: ${allScenarios.length}`);

        if (generatedScenarios.length < selected.length) {
          console.warn(` Missing ${selected.length - generatedScenarios.length} scenarios!`);
        }

        setLoadingMessage(t('assessment.startAssessment'));
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
        console.log(' Blocking flipbook keyboard event:', e.key);
        e.stopPropagation();
      }
    };

    if (isEditingEssay) {
      console.log(' Essay editing mode ENABLED - keyboard events blocked');
      // Add event listener with capture phase to intercept before flipbook
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('keyup', handleKeyDown, true);
      document.addEventListener('keypress', handleKeyDown, true);

      return () => {
        console.log(' Essay editing mode DISABLED');
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('keyup', handleKeyDown, true);
        document.removeEventListener('keypress', handleKeyDown, true);
      };
    }
  }, [isEditingEssay]);

  // Local fallback by dimension
  const _localFallback = (qs: Question[]): { groups: StoryGroup[]; flat: StoryScenario[] } => {
    const dimMap: Record<string, [string, string, string]> = {
      R: ['', 'Thực Hành', 'Bạn đang làm việc với công cụ và máy móc trong xưởng.'],
      I: ['', 'Nghiên Cứu', 'Bạn đang phân tích dữ liệu trong phòng thí nghiệm.'],
      A: ['', 'Sáng Tạo', 'Bạn đang tham gia dự án nghệ thuật và thiết kế.'],
      S: ['', 'Giao Tiếp', 'Bạn đang hỗ trợ và làm việc cùng mọi người.'],
      E: ['', 'Lãnh Đạo', 'Bạn đang thuyết phục và dẫn dắt một nhóm.'],
      C: ['', 'Tổ Chức', 'Bạn cần xử lý công việc theo quy trình chặt chẽ.'],
      O: ['', 'Tư Duy Mở', 'Bạn đang đối mặt với ý tưởng và thay đổi mới.'],
      N: ['', 'Cảm Xúc', 'Bạn đang xử lý tình huống áp lực và cảm xúc.'],
    };
    const GROUP_SIZE = 5;
    const groups: StoryGroup[] = [];
    for (let i = 0; i < qs.length; i += GROUP_SIZE) {
      const chunk = qs.slice(i, i + GROUP_SIZE);
      const dim = (chunk[0]?.dimension || '').toUpperCase();
      const [emoji, title, introduction] = dimMap[dim] ?? ['', `Nhóm ${groups.length + 1}`, 'Hãy đánh giá mức độ phù hợp:'];
      groups.push({
        groupScenario: { emoji, title, introduction },
        questionScenarios: chunk.map(q => ({ emoji, title, context: introduction, situation: q.question_text })),
      });
    }
    const flat = groups.flatMap(g => g.questionScenarios);
    return { groups, flat };
  };

  // Generate stories: 1 Gemini call for all groups, returns group narratives + flat scenarios
  // Returns { groups, flat } so caller can set both states together before rendering
  const generateStoriesFromBackend = async (
    questions: Question[]
  ): Promise<{ groups: StoryGroup[]; flat: StoryScenario[] }> => {
    setStoryProgress(10);
    setLoadingMessage(`${t('assessment.scenario.generating')} ...`);

    try {
      const response = await fetch('/api/assessments/generate-stories-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            dimension: q.dimension,
            test_type: q.test_type,
          })),
          group_size: 5,
        }),
      });

      setStoryProgress(80);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      const groups: StoryGroup[] = result.groups ?? [];
      const flat: StoryScenario[] = result.scenarios ?? [];

      // Pad missing scenarios with fallback
      while (flat.length < questions.length) {
        const q = questions[flat.length];
        flat.push({ emoji: '', title: `Tình Huống ${flat.length + 1}`, context: 'Hãy đánh giá mức độ phù hợp:', situation: q?.question_text ?? '' });
      }

      setStoryProgress(100);
      console.log(` Story groups: ${groups.length}, scenarios: ${flat.length} (success=${result.success})`);
      return { groups, flat };

    } catch (err) {
      console.error('Batch story generation failed, using client fallback:', err);
      return _localFallback(questions);
    }
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
      onComplete(responses, essayText);

      // Submit voice recording to backend if available (fire-and-forget)
      if (voiceStatus === 'done' && audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'voice.webm');
        fetch('/api/assessments/voice-story', { method: 'POST', body: form })
          .catch(() => {/* non-critical */ });
      }
    }
  };

  // ── Voice recording ──────────────────────────────────────────────
  const startVoiceRecording = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
        setVoiceStatus('done');
      };

      mr.start(250);
      setVoiceStatus('recording');
      setVoiceDuration(0);
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration(d => d + 1);
      }, 1000);
    } catch {
      setVoiceStatus('error');
    }
  };

  const stopVoiceRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    mediaRecorderRef.current?.stop();
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
  };

  const resetVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioChunksRef.current = [];
    setVoiceStatus('idle');
    setVoiceDuration(0);
  };
  // ─────────────────────────────────────────────────────────────────

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
      alert(t('assessment.response.choosePrompt'));
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
                background: 'linear-gradient(90deg, #16a34a 0%, #0d9488 100%)',
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
          width={bookDimensions.width}
          height={bookDimensions.height}
          size="stretch"
          minWidth={280}
          maxWidth={850}
          minHeight={400}
          maxHeight={1100}
          maxShadowOpacity={0.5}
          showCover={false}
          mobileScrollSupport={true}
          className="story-book"
          usePortrait={bookDimensions.portrait}
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
              <h1>Hành Trình Nghề Nghiệp Của Bạn</h1>
              <p className="cover-subtitle">Cuộc Phiêu Lưu Tương Tác</p>
            </div>
          </Page>

          {/* Welcome */}
          <Page className="welcome-page">
            <div className="welcome-content">
              <h2>Chào Mừng, Nhà Thám Hiểm!</h2>
              <p className="welcome-text">
                You're about to embark on a journey of self-discovery.
                Instead of boring questions, you'll experience real-life scenarios.
              </p>
              <div className="welcome-features">
                <div className="feature">
                  <span>Kịch Bản Tương Tác</span>
                </div>
                <div className="feature">
                  <span>Phản Hồi Trung Thực</span>
                </div>
                <div className="feature">
                  <span>Hiểu Biết Nghề Nghiệp</span>
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
              <h2>Cách Thức Hoạt Động</h2>
              <div className="instructions">
                <div className="instruction-step">
                  <span className="step-number">1</span>
                  <p>Đọc kỹ từng tình huống</p>
                </div>
                <div className="instruction-step">
                  <span className="step-number">2</span>
                  <p>Tưởng tượng bạn trong tình huống đó</p>
                </div>
                <div className="instruction-step">
                  <span className="step-number">3</span>
                  <p>Chọn cách bạn sẽ phản ứng tự nhiên</p>
                </div>
              </div>
              <div className="response-guide">
                <p className="guide-title">Hướng Dẫn Trả Lời:</p>
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
              emoji: '',
              title: 'Tình Huống',
              context: 'Hãy suy nghĩ về tình huống này...',
              situation: question.question_text,
            };
            const isAnswered = answers[String(question.id)] !== undefined;

            // Group info: which group does this question belong to?
            const GROUP_SIZE = 5;
            const groupIndex = Math.floor(index / GROUP_SIZE);
            const posInGroup = index % GROUP_SIZE; // 0-4
            const isFirstInGroup = posInGroup === 0;
            const group = storyGroups[groupIndex];
            const groupScenario = group?.groupScenario;

            return (
              <Page key={question.id} className="scenario-page">
                <div className="scenario-content">
                  <div className="scenario-header">
                    <span className="scenario-number">Câu {index + 1} / {questions.length}</span>
                    {groupScenario && (
                      <div className="label-badge" style={{ backgroundColor: 'rgba(26,35,126,0.15)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                        <span className="label-emoji">{groupScenario.emoji}</span>
                        <span className="label-name">{groupScenario.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Group story intro — shown only on the FIRST question of each group */}
                  {isFirstInGroup && groupScenario && (
                    <div className="label-intro" style={{ borderLeftColor: 'var(--color-primary)' }}>
                      <h3 style={{ color: 'var(--color-primary)' }}>
                        {groupScenario.emoji} {groupScenario.title}
                      </h3>
                      <p className="label-description">{groupScenario.introduction}</p>
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
                <span className="scenario-number">Câu {questions.length + 1} / {questions.length + 1}</span>
                <div className="label-badge" style={{
                  backgroundColor: '0d948820',
                  borderColor: '#0d9488',
                  color: '#0d9488'
                }}>
                  <span className="label-emoji"></span>
                  <span className="label-name">Personal Story</span>
                </div>
              </div>

              <div className="essay-intro">
                <h3 style={{ color: '#0d9488' }}>
                  Chia Sẻ Câu Chuyện Của Bạn
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

              {/* Two options: write or record voice */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                {/* Write button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEssayOverlay(true);
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }}
                  style={{
                    padding: '0.9rem 1.5rem',
                    background: 'white',
                    color: '#0d9488',
                    border: '2px solid #0d9488',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  Viết Câu Chuyện Của Bạn
                </button>

                {/* Voice record button */}
                {voiceStatus === 'idle' && (
                  <button
                    onClick={startVoiceRecording}
                    style={{
                      padding: '0.9rem 1.5rem',
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    Thu Âm Giọng Nói (Voice AI)
                  </button>
                )}

                {voiceStatus === 'recording' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.9rem 1.5rem',
                      background: '#ffeaea',
                      border: '2px solid #e74c3c',
                      borderRadius: '12px',
                      width: '100%',
                      justifyContent: 'center',
                    }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e74c3c', animation: 'pulse 1s infinite' }} />
                      <span style={{ color: '#e74c3c', fontWeight: 600 }}>Đang thu âm... {voiceDuration}s</span>
                    </div>
                    <button
                      onClick={stopVoiceRecording}
                      style={{
                        padding: '0.6rem 1.5rem',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ⏹ Dừng Thu Âm
                    </button>
                  </div>
                )}

                {voiceStatus === 'done' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      padding: '0.9rem 1.5rem',
                      background: '#eafaf1',
                      border: '2px solid #27ae60',
                      borderRadius: '12px',
                      color: '#27ae60',
                      fontWeight: 600,
                      width: '100%',
                      textAlign: 'center',
                    }}>
                      Đã thu âm {voiceDuration}s — AI sẽ phân tích giọng nói của bạn
                    </div>
                    <button
                      onClick={resetVoice}
                      style={{
                        padding: '0.4rem 1rem',
                        background: 'transparent',
                        color: '#888',
                        border: '1px solid ccc',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Thu âm lại
                    </button>
                  </div>
                )}

                {voiceStatus === 'error' && (
                  <div style={{ color: '#e74c3c', fontSize: '0.9rem', textAlign: 'center' }}>
                    Không thể truy cập microphone. Kiểm tra quyền truy cập.
                  </div>
                )}
              </div>

              {essayText.trim().length > 0 && (
                <div className="continue-hint" style={{ marginTop: '0.75rem' }}>
                  Đã viết {essayText.split(/\s+/).filter(w => w.length > 0).length} từ
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
                  <span className="stat-text">Hiểu Biết Nghề Nghiệp Sẵn Sàng</span>
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
              Chia Sẻ Câu Chuyện Của Bạn
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
              Đây là cơ hội để bạn chia sẻ sâu hơn về bản thân, ước mơ và định hướng nghề nghiệp của mình.
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={essayText}
            onChange={(e) => {
              console.log(' Overlay textarea onChange:', e.target.value);
              setEssayText(e.target.value);
            }}
            onFocus={() => {
              console.log(' Overlay textarea focused');
              setIsEditingEssay(true);
            }}
            onBlur={() => {
              console.log(' Overlay textarea blurred');
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
                color: 'var(--color-primary)',
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
