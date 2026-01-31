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
  onComplete?: (responses: QuestionResponse[]) => void;
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
  const [currentPage, setCurrentPage] = useState(0);
  const [isBookClosed, setIsBookClosed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scenarios, setScenarios] = useState<StoryScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading questions...');
  const [error, setError] = useState<string | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Load questions and generate stories from API
  useEffect(() => {
    const loadQuestionsAndStories = async () => {
      try {
        setLoading(true);
        setLoadingMessage('Loading questions...');
        
        const riasecData = await assessmentService.getQuestions('RIASEC');
        const bigFiveData = await assessmentService.getQuestions('BIGFIVE');
        
        // Mix questions from both tests
        const allQuestions = [...riasecData, ...bigFiveData];
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 30); // 30 questions for better story flow
        
        setQuestions(selected);
        
        // Generate story scenarios using backend API
        setLoadingMessage('Creating your personalized story scenarios with AI...');
        
        const generatedScenarios = await generateStoriesFromBackend(selected);
        setScenarios(generatedScenarios);
        
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
  
  // Generate stories by calling backend API
  const generateStoriesFromBackend = async (questions: Question[]): Promise<StoryScenario[]> => {
    const scenarios: StoryScenario[] = [];
    const groupSize = 5;
    
    for (let i = 0; i < questions.length; i += groupSize) {
      const group = questions.slice(i, i + groupSize);
      const groupIndex = Math.floor(i / groupSize);
      
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
        
        if (result.success && result.data.questionScenarios) {
          scenarios.push(...result.data.questionScenarios);
          console.log(`✓ Group ${groupIndex + 1} story generated successfully`);
        } else {
          throw new Error('Failed to generate story');
        }
        
      } catch (error) {
        console.error(`Error generating group ${groupIndex}:`, error);
        // Fallback scenarios
        const fallbackScenarios = group.map((q, idx) => ({
          emoji: '💭',
          title: `Tình Huống ${i + idx + 1}`,
          context: 'Hãy suy nghĩ về tình huống này...',
          situation: q.question_text,
        }));
        scenarios.push(...fallbackScenarios);
        console.log(`✓ Using fallback scenarios for group ${groupIndex + 1}`);
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
    bookRef.current?.pageFlip().flip(0);
    setIsBookClosed(false);
    setStoryProgress(0);
  };

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (onComplete) {
      const responses: QuestionResponse[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: questionId,
        answer: answer,
      }));
      onComplete(responses);
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
            
            return (
              <Page key={question.id} className="scenario-page">
                <div className="scenario-content">
                  <div className="scenario-header">
                    <span className="scenario-number">Scenario {index + 1} of {questions.length}</span>
                  </div>
                  
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
    </div>
  );
};

export default StoryBasedAssessment;
