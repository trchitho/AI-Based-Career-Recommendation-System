import { useSubscription } from './useSubscription';

export type PlanType = 'free' | 'basic' | 'premium' | 'pro';
export type FeatureType =
  | 'career_recommendations'  // Đề xuất nghề nghiệp
  | 'unlimited_assessments'   // Không giới hạn bài test định hướng
  | 'unlimited_careers'       // Xem tất cả nghề nghiệp
  | 'detailed_analysis'       // Phân tích chi tiết kết quả
  | 'career_roadmap'          // Lộ trình phát triển nghề nghiệp
  | 'skill_assessment'        // Đánh giá kỹ năng
  | 'personality_insights'    // Phân tích tính cách
  | 'career_matching'         // Độ phù hợp nghề nghiệp
  | 'industry_trends'         // Xu hướng ngành nghề
  | 'salary_insights'         // Thông tin lương
  | 'career_counseling'       // Tư vấn nghề nghiệp qua chat
  | 'progress_tracking'       // Theo dõi tiến bộ
  | 'priority_support'        // Hỗ trợ ưu tiên
  | 'pdf_export'              // Xuất báo cáo PDF
  | 'course_recommendations'  // Gợi ý khóa học
  | 'career_view';            // Xem chi tiết nghề nghiệp

// Feature matrix - 4 gói: Free (mặc định) + 3 gói thanh toán
const FEATURE_MATRIX: Record<PlanType, FeatureType[]> = {
  free: [
    // Gói Free - Miễn phí (mặc định cho tất cả user)
    'career_recommendations',  // Xem 1 nghề nghiệp đầu tiên
    // 5 bài test/tháng, roadmap Level 1 only
  ],
  basic: [
    // Gói Cơ Bản - 99k: Cho người dùng mới muốn thử nghiệm
    'career_recommendations',  // Xem 25 nghề nghiệp phù hợp nhất (thay đổi từ 3 lên 25)
    'unlimited_assessments',   // Tối đa 20 bài kiểm tra/tháng
    'career_roadmap',         // Lộ trình học tập cơ bản (Level 1-2)
    'skill_assessment',       // Phân tích tóm tắt RIASEC & Big Five
    'career_view',            // Xem chi tiết nghề nghiệp (25 total)
    // Hỗ trợ thông thường qua Email
  ],
  premium: [
    // Gói Premium - 299k: Gói phổ biến nhất, định hướng rõ ràng
    'career_recommendations',  // Xem toàn bộ danh mục nghề nghiệp
    'unlimited_assessments',   // Làm bài kiểm tra không giới hạn
    'unlimited_careers',       // Xem toàn bộ danh mục nghề nghiệp
    'detailed_analysis',       // Phân tích AI chi tiết tính cách & tiềm năng
    'career_roadmap',         // Lộ trình học tập đầy đủ (Full Roadmap)
    'skill_assessment',       // Phân tích chi tiết
    'personality_insights',    // Phân tích AI chi tiết về đặc điểm tính cách
    'career_matching',        // Độ phù hợp nghề nghiệp
    'priority_support',       // Ưu tiên hỗ trợ kỹ thuật và tư vấn
    'career_view',            // Xem chi tiết nghề nghiệp (unlimited)
  ],
  pro: [
    // Gói Pro - 499k: Người cố vấn số đồng hành suốt hành trình
    'career_recommendations',  // Tất cả tính năng Premium
    'unlimited_assessments',   // Không giới hạn
    'unlimited_careers',       // Toàn bộ danh mục
    'detailed_analysis',       // Phân tích AI chi tiết
    'career_roadmap',         // Lộ trình đầy đủ
    'skill_assessment',       // Phân tích chuyên sâu
    'personality_insights',    // Phân tích tính cách
    'career_matching',        // Độ phù hợp
    'career_counseling',      // Trợ lý ảo AI 24/7 (Gemini API)
    'industry_trends',        // Xu hướng ngành nghề
    'salary_insights',        // Thông tin lương chi tiết
    'progress_tracking',      // So sánh lịch sử phát triển
    'priority_support',       // Ưu tiên hỗ trợ
    'pdf_export',            // Xuất báo cáo PDF chuyên sâu
    'course_recommendations', // Gợi ý khóa học từ Coursera, LinkedIn Learning
    'career_view',            // Xem chi tiết nghề nghiệp (unlimited)
  ],
};

// Plan hierarchy for upgrade suggestions
const PLAN_HIERARCHY: Record<PlanType, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  pro: 3,
};

export const useFeatureAccess = () => {
  const { isPremium, planName } = useSubscription();

  // Determine current plan type
  const getCurrentPlanType = (): PlanType => {
    if (!isPremium) return 'free';

    // Map database plan names to our plan types based on 4-tier structure
    // Database: Basic (99k) → basic features
    // Database: Premium (299k) → premium features  
    // Database: Pro (499k) → pro features (all features)
    switch (planName) {
      case 'Basic':
      case 'Cơ Bản':
      case 'Gói Cơ Bản':
        return 'basic'; // Basic in database (99k) = basic tier
      case 'Premium':
      case 'Gói Premium':
        return 'premium'; // Premium in database (299k) = premium tier
      case 'Pro':
      case 'Gói Pro':
        return 'pro'; // Pro in database (499k) = pro tier (highest)
      default:
        // Check by plan name patterns as fallback
        const plan = planName.toLowerCase();

        if (plan.includes('pro')) {
          return 'pro';
        }

        if (plan.includes('premium')) {
          return 'premium';
        }

        if (plan.includes('basic') || plan.includes('cơ bản') || plan.includes('co ban')) {
          return 'basic';
        }

        // For any paid plan that doesn't match, default to basic
        return isPremium ? 'basic' : 'free';
    }
  };

  const currentPlan = getCurrentPlanType();

  // Check if user has access to a specific feature
  const hasFeature = (feature: FeatureType): boolean => {
    return FEATURE_MATRIX[currentPlan].includes(feature);
  };

  // Get minimum plan required for a feature
  const getRequiredPlan = (feature: FeatureType): PlanType | null => {
    for (const [plan, features] of Object.entries(FEATURE_MATRIX)) {
      if (features.includes(feature)) {
        return plan as PlanType;
      }
    }
    return null;
  };

  // Get all features for current plan
  const getCurrentPlanFeatures = (): FeatureType[] => {
    return FEATURE_MATRIX[currentPlan];
  };

  // Get features available in a specific plan
  const getPlanFeatures = (plan: PlanType): FeatureType[] => {
    return FEATURE_MATRIX[plan];
  };

  // Check if user can upgrade to a specific plan
  const canUpgradeTo = (targetPlan: PlanType): boolean => {
    return PLAN_HIERARCHY[targetPlan] > PLAN_HIERARCHY[currentPlan];
  };

  // Get next available upgrade plan
  const getNextUpgradePlan = (): PlanType | null => {
    const currentLevel = PLAN_HIERARCHY[currentPlan];
    const nextLevel = currentLevel + 1;

    for (const [plan, level] of Object.entries(PLAN_HIERARCHY)) {
      if (level === nextLevel) {
        return plan as PlanType;
      }
    }

    return null;
  };

  // Get feature display info - theo đúng yêu cầu chi tiết
  const getFeatureInfo = (feature: FeatureType) => {
    const featureInfo: Record<FeatureType, { name: string; description: string; icon: string }> = {
      career_recommendations: {
        name: 'Đề xuất nghề nghiệp',
        description: 'AI phân tích và đề xuất nghề nghiệp phù hợp với bạn',
        icon: '🎯'
      },
      unlimited_assessments: {
        name: 'Bài kiểm tra định hướng',
        description: 'Thực hiện các bài kiểm tra tính cách và năng lực',
        icon: '📊'
      },
      unlimited_careers: {
        name: 'Danh mục nghề nghiệp đầy đủ',
        description: 'Truy cập toàn bộ cơ sở dữ liệu nghề nghiệp',
        icon: '💼'
      },
      detailed_analysis: {
        name: 'Phân tích AI chi tiết',
        description: 'Phân tích sâu về tính cách và tiềm năng phát triển',
        icon: '📈'
      },
      career_roadmap: {
        name: 'Lộ trình học tập',
        description: 'Lộ trình phát triển kỹ năng cho từng nghề nghiệp',
        icon: '🗺️'
      },
      skill_assessment: {
        name: 'Phân tích RIASEC & Big Five',
        description: 'Đánh giá chi tiết các chỉ số tính cách và năng lực',
        icon: '⚡'
      },
      personality_insights: {
        name: 'Phân tích tính cách chuyên sâu',
        description: 'Hiểu rõ đặc điểm tính cách và phong cách làm việc',
        icon: '🧠'
      },
      career_matching: {
        name: 'Độ phù hợp nghề nghiệp',
        description: 'Tính toán mức độ phù hợp với từng lĩnh vực',
        icon: '🎯'
      },
      industry_trends: {
        name: 'Xu hướng ngành nghề',
        description: 'Thông tin về triển vọng và xu hướng phát triển',
        icon: '📊'
      },
      salary_insights: {
        name: 'Thông tin lương bổng',
        description: 'Dữ liệu mức lương theo vị trí và kinh nghiệm',
        icon: '💰'
      },
      career_counseling: {
        name: 'Trợ lý ảo AI 24/7',
        description: 'Tư vấn nghề nghiệp qua AI chatbot (Gemini API)',
        icon: '🤖'
      },
      progress_tracking: {
        name: 'So sánh lịch sử phát triển',
        description: 'Theo dõi và so sánh tiến bộ qua các lần kiểm tra',
        icon: '📈'
      },
      priority_support: {
        name: 'Hỗ trợ ưu tiên',
        description: 'Được ưu tiên hỗ trợ kỹ thuật và tư vấn',
        icon: '🚀'
      },
      pdf_export: {
        name: 'Xuất báo cáo PDF',
        description: 'Xuất báo cáo phân tích chi tiết dạng PDF',
        icon: '📄'
      },
      course_recommendations: {
        name: 'Gợi ý khóa học',
        description: 'Gợi ý khóa học từ Coursera, LinkedIn Learning',
        icon: '🎓'
      },
      career_view: {
        name: 'Xem chi tiết nghề nghiệp',
        description: 'Xem thông tin chi tiết và lộ trình nghề nghiệp',
        icon: '👁️'
      }
    };

    return featureInfo[feature];
  };

  // Get plan display info
  const getPlanInfo = (plan: PlanType) => {
    const planInfo = {
      free: { name: 'Free', color: 'gray', price: 0 },
      basic: { name: 'Basic', color: 'blue', price: 99000 },
      premium: { name: 'Premium', color: 'green', price: 299000 },
      pro: { name: 'Pro', color: 'purple', price: 499000 }
    };

    return planInfo[plan];
  };

  return {
    currentPlan,
    hasFeature,
    getRequiredPlan,
    getCurrentPlanFeatures,
    getPlanFeatures,
    canUpgradeTo,
    getNextUpgradePlan,
    getFeatureInfo,
    getPlanInfo,
    isPremium,
    planName
  };
};