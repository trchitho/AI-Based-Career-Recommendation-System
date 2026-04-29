import { useState, useEffect } from 'react';
import { QuestionResponse, AssessmentResult } from '../../types/assessment';
import { useAuth } from '../../contexts/AuthContext';
import StoryBasedAssessment from './StoryBasedAssessment';
import { getGeminiService } from '@/services/geminiService';

interface EnhancedAssessmentFlowProps {
  onComplete: (result: AssessmentResult) => void;
  onCancel: () => void;
}

type FlowStep = 'intro' | 'assessment' | 'processing' | 'complete';

const EnhancedAssessmentFlow = ({ onComplete, onCancel }: EnhancedAssessmentFlowProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FlowStep>('assessment');
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  const handleAssessmentComplete = async (responses: QuestionResponse[], essayText?: string) => {
    console.log('[EnhancedAssessmentFlow] Starting assessment submission...', responses);
    console.log('[EnhancedAssessmentFlow] Essay text:', essayText);
    setCurrentStep('processing');

    try {
      // Get token once at the beginning
      const token = localStorage.getItem('accessToken');
      console.log('[EnhancedAssessmentFlow] Token exists:', !!token);
      
      // Submit to backend API
      console.log('[EnhancedAssessmentFlow] Submitting to backend...');
      console.log('[EnhancedAssessmentFlow]  SENDING test_mode: story');
      const submitResponse = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testTypes: ['RIASEC', 'BIGFIVE'],
          responses: responses,
          test_mode: 'story'
        })
      });

      console.log('[EnhancedAssessmentFlow] Submit response status:', submitResponse.status);

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('[EnhancedAssessmentFlow] Submit failed:', errorText);
        throw new Error('Failed to submit assessment');
      }

      const submitData = await submitResponse.json();
      console.log('[EnhancedAssessmentFlow] Submit data:', submitData);
      const assessmentId = submitData.assessmentId;

      // Submit essay if provided
      if (essayText && essayText.trim().length > 0) {
        console.log('[EnhancedAssessmentFlow] Submitting essay...');
        try {
          await fetch('/api/assessments/essay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              assessmentId: assessmentId,
              essayText: essayText,
              lang: 'vi'
            })
          });
          console.log('[EnhancedAssessmentFlow] Essay submitted successfully');
        } catch (essayError) {
          console.error('[EnhancedAssessmentFlow] Essay submission failed:', essayError);
          // Don't fail the whole process if essay fails
        }
      }

      // Get results from backend (with AI-core predictions)
      console.log('[EnhancedAssessmentFlow] Fetching results for assessment:', assessmentId);
      const resultsResponse = await fetch(`/api/assessments/${assessmentId}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[EnhancedAssessmentFlow] Results response status:', resultsResponse.status);

      if (!resultsResponse.ok) {
        const errorText = await resultsResponse.text();
        console.error('[EnhancedAssessmentFlow] Results fetch failed:', errorText);
        throw new Error('Failed to get results');
      }

      const resultsData = await resultsResponse.json();
      console.log('[EnhancedAssessmentFlow] Results data:', resultsData);

      // Transform backend data to AssessmentResult format
      const result: AssessmentResult = {
        id: assessmentId,
        userId: user?.id || 'guest',
        personalityProfile: {
          riasec: resultsData.riasec_scores || {},
          bigFive: resultsData.big_five_scores || {}
        },
        careerRecommendations: resultsData.career_recommendations || [],
        completedAt: new Date().toISOString(),
        assessmentType: 'interactive_story'
      };
      
      console.log('[EnhancedAssessmentFlow] Transformed result:', result);
      
      // Skip AI enhancement and narrative, go directly to complete
      console.log('[EnhancedAssessmentFlow] Completing assessment...');
      setAssessmentResult(result);
      setCurrentStep('complete');
      onComplete(result); // Call parent's onComplete to show results page
      console.log('[EnhancedAssessmentFlow] Assessment completed');
    } catch (error) {
      console.error('[EnhancedAssessmentFlow] Error processing assessment:', error);
      // Fallback to basic processing if backend fails
      console.log('[EnhancedAssessmentFlow] Using fallback processing...');
      const basicResult = await processAssessmentResults(responses);
      console.log('[EnhancedAssessmentFlow] Fallback result:', basicResult);
      setAssessmentResult(basicResult);
      setCurrentStep('complete');
      onComplete(basicResult); // Call parent's onComplete to show results page
      console.log('[EnhancedAssessmentFlow] Assessment completed (fallback)');
    }
  };

  const processAssessmentResults = async (responses: QuestionResponse[]): Promise<AssessmentResult> => {
    // Calculate RIASEC scores
    const riasecScores = calculateRIASECScores(responses);
    
    // Calculate Big Five scores
    const bigFiveScores = calculateBigFiveScores(responses);
    
    // Generate career recommendations
    const careerRecommendations = generateCareerRecommendations(riasecScores, bigFiveScores);
    
    return {
      id: `assessment_${Date.now()}`,
      userId: user?.id || 'guest',
      personalityProfile: {
        riasec: riasecScores,
        bigFive: bigFiveScores
      },
      careerRecommendations,
      completedAt: new Date().toISOString(),
      assessmentType: 'interactive_story'
    };
  };

  const calculateRIASECScores = (responses: QuestionResponse[]) => {
    const riasecResponses = responses.filter(r => r.questionId.includes('riasec'));
    const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

    riasecResponses.forEach(response => {
      const trait = response.questionId.split('_')[1] as keyof typeof scores;
      if (trait && scores.hasOwnProperty(trait)) {
        scores[trait] += Number(response.answer);
        counts[trait]++;
      }
    });

    // Normalize scores
    Object.keys(scores).forEach(key => {
      const trait = key as keyof typeof scores;
      if (counts[trait] > 0) {
        scores[trait] = scores[trait] / counts[trait] / 5; // Normalize to 0-1
      }
    });

    return scores;
  };

  const calculateBigFiveScores = (responses: QuestionResponse[]) => {
    const bigFiveResponses = responses.filter(r => r.questionId.includes('bigfive'));
    const scores = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
    const counts = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };

    const traitMap: { [key: string]: keyof typeof scores } = {
      'O': 'openness',
      'C': 'conscientiousness', 
      'E': 'extraversion',
      'A': 'agreeableness',
      'N': 'neuroticism'
    };

    bigFiveResponses.forEach(response => {
      const parts = response.questionId.split('_');
      if (parts.length > 1) {
        const traitCode = parts[1];
        if (traitCode && traitCode in traitMap) {
          const trait = traitMap[traitCode];
          if (trait && scores.hasOwnProperty(trait)) {
            scores[trait] += Number(response.answer);
            counts[trait]++;
          }
        }
      }
    });

    // Normalize scores
    Object.keys(scores).forEach(key => {
      const trait = key as keyof typeof scores;
      if (counts[trait] > 0) {
        scores[trait] = scores[trait] / counts[trait] / 5; // Normalize to 0-1
      }
    });

    return scores;
  };

  const generateCareerRecommendations = (riasec: any, bigFive: any) => {
    // Career matching algorithm based on RIASEC and Big Five
    const careers = [
      {
        id: 'software_developer',
        title: 'Software Developer',
        description: 'Thiết kế và phát triển ứng dụng phần mềm',
        riasecMatch: { I: 0.8, R: 0.6, C: 0.7 },
        bigFiveMatch: { openness: 0.7, conscientiousness: 0.8 },
        salaryRange: '$60,000 - $120,000',
        growthRate: 'Very High',
        skills: ['Programming', 'Problem Solving', 'Logic']
      },
      {
        id: 'data_scientist',
        title: 'Data Scientist',
        description: 'Phân tích dữ liệu để tìm ra insights và patterns',
        riasecMatch: { I: 0.9, R: 0.5, C: 0.8 },
        bigFiveMatch: { openness: 0.8, conscientiousness: 0.9 },
        salaryRange: '$70,000 - $140,000',
        growthRate: 'Very High',
        skills: ['Statistics', 'Machine Learning', 'Data Analysis']
      },
      {
        id: 'ux_designer',
        title: 'UX Designer',
        description: 'Thiết kế trải nghiệm người dùng cho sản phẩm số',
        riasecMatch: { A: 0.8, S: 0.6, I: 0.5 },
        bigFiveMatch: { openness: 0.9, agreeableness: 0.7 },
        salaryRange: '$55,000 - $110,000',
        growthRate: 'High',
        skills: ['Design Thinking', 'User Research', 'Prototyping']
      },
      {
        id: 'product_manager',
        title: 'Product Manager',
        description: 'Quản lý và phát triển sản phẩm từ ý tưởng đến thị trường',
        riasecMatch: { E: 0.8, S: 0.7, I: 0.6 },
        bigFiveMatch: { extraversion: 0.8, conscientiousness: 0.8 },
        salaryRange: '$80,000 - $150,000',
        growthRate: 'High',
        skills: ['Strategy', 'Leadership', 'Analytics']
      },
      {
        id: 'marketing_manager',
        title: 'Marketing Manager',
        description: 'Phát triển và thực hiện chiến lược marketing',
        riasecMatch: { E: 0.9, A: 0.6, S: 0.8 },
        bigFiveMatch: { extraversion: 0.9, openness: 0.7 },
        salaryRange: '$50,000 - $100,000',
        growthRate: 'Medium',
        skills: ['Communication', 'Creativity', 'Analytics']
      }
    ];

    // Calculate match scores
    const recommendations = careers.map(career => {
      let riasecScore = 0;
      let bigFiveScore = 0;
      let riasecCount = 0;
      let bigFiveCount = 0;

      // Calculate RIASEC match
      Object.entries(career.riasecMatch).forEach(([trait, weight]) => {
        riasecScore += riasec[trait] * weight;
        riasecCount++;
      });

      // Calculate Big Five match
      Object.entries(career.bigFiveMatch).forEach(([trait, weight]) => {
        bigFiveScore += bigFive[trait] * weight;
        bigFiveCount++;
      });

      const avgRiasecScore = riasecCount > 0 ? riasecScore / riasecCount : 0;
      const avgBigFiveScore = bigFiveCount > 0 ? bigFiveScore / bigFiveCount : 0;
      const matchPercentage = Math.round((avgRiasecScore * 0.6 + avgBigFiveScore * 0.4) * 100);

      return {
        ...career,
        matchPercentage,
        reasons: generateMatchReasons(career, riasec, bigFive)
      };
    });

    // Sort by match percentage and return top 5
    return recommendations
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 5);
  };

  const generateMatchReasons = (career: any, riasec: any, bigFive: any): string[] => {
    const reasons: string[] = [];
    
    // Check RIASEC matches
    Object.entries(career.riasecMatch).forEach(([trait, weight]) => {
      const weightNum = Number(weight);
      if (riasec[trait] > 0.6 && weightNum > 0.6) {
        const traitNames: { [key: string]: string } = {
          'R': 'thực tế và kỹ thuật',
          'I': 'nghiên cứu và phân tích',
          'A': 'sáng tạo và nghệ thuật',
          'S': 'xã hội và giúp đỡ người khác',
          'E': 'lãnh đạo và kinh doanh',
          'C': 'tổ chức và chi tiết'
        };
        reasons.push(`Bạn có xu hướng ${traitNames[trait]} mạnh mẽ`);
      }
    });

    // Check Big Five matches
    Object.entries(career.bigFiveMatch).forEach(([trait, weight]) => {
      const weightNum = Number(weight);
      if (bigFive[trait] > 0.6 && weightNum > 0.6) {
        const traitNames: { [key: string]: string } = {
          'openness': 'cởi mở với ý tưởng mới',
          'conscientiousness': 'có tính kỷ luật cao',
          'extraversion': 'năng động và hướng ngoại',
          'agreeableness': 'hòa đồng và hợp tác tốt',
          'neuroticism': 'ổn định cảm xúc'
        };
        reasons.push(`Tính cách ${traitNames[trait]} của bạn rất phù hợp`);
      }
    });

    return reasons.slice(0, 3);
  };

  const enhanceWithAI = async (result: AssessmentResult): Promise<AssessmentResult> => {
    const geminiService = getGeminiService();
    if (!geminiService) {
      return result; // Return original result if Gemini is not available
    }

    try {
      // Generate AI-enhanced descriptions for top careers
      const enhancedRecommendations = await Promise.all(
        result.careerRecommendations.slice(0, 3).map(async (career) => {
          const dayInLife = await geminiService.generateDayInLifeStory(
            career.title, 
            result.personalityProfile
          );
          
          const challenges = await geminiService.generateCareerChallenges(
            career.title,
            result.personalityProfile
          );

          return {
            ...career,
            aiEnhanced: {
              dayInLife,
              challenges,
              personalizedAdvice: await geminiService.generatePersonalizedAdvice(result)
            }
          };
        })
      );

      return {
        ...result,
        careerRecommendations: [
          ...enhancedRecommendations,
          ...result.careerRecommendations.slice(3)
        ]
      };
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      return result;
    }
  };

  const handleNarrativeComplete = () => {
    setCurrentStep('complete');
    if (assessmentResult) {
      onComplete(assessmentResult);
    }
  };

  // Render different steps
  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
        <div className="max-w-4xl mx-auto p-8 text-center">
          <div className="text-8xl mb-8 animate-bounce"></div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            Enhanced Career Discovery
          </h1>
          <p className="text-xl mb-8 text-white/80 max-w-2xl mx-auto leading-relaxed">
            Trải nghiệm đánh giá nghề nghiệp thế hệ mới với AI. Khám phá bản thân qua những câu chuyện tương tác 
            và nhận được phân tích cá nhân hóa từ trí tuệ nhân tạo.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4"></div>
              <h3 className="font-bold mb-2 text-yellow-300">Interactive Stories</h3>
              <p className="text-sm text-white/70">Câu chuyện tương tác thay vì câu hỏi khô khan</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4"></div>
              <h3 className="font-bold mb-2 text-pink-300">AI-Powered Analysis</h3>
              <p className="text-sm text-white/70">Phân tích sâu với Gemini AI</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4"></div>
              <h3 className="font-bold mb-2 text-blue-300">Personalized Results</h3>
              <p className="text-sm text-white/70">Kết quả và lời khuyên cá nhân hóa</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setCurrentStep('assessment')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg text-lg"
            >
              Bắt đầu hành trình khám phá 
            </button>
            <div>
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 hover:border-white/40 transition-all text-white/80 hover:text-white"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'assessment') {
    return (
      <StoryBasedAssessment
        onComplete={handleAssessmentComplete}
      />
    );
  }

  if (currentStep === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-gray-600">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-green-600 rounded-full animate-spin"></div>
          <p className="text-base font-medium">Đang xử lý kết quả...</p>
        </div>
      </div>
    );
  }

  // No narrative step - go directly to results via onComplete
  return null;
};

export default EnhancedAssessmentFlow;