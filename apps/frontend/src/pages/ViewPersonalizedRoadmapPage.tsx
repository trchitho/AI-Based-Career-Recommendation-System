import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle, ExternalLink, ChevronRight,
  Sparkles, BookOpen, Briefcase, Target, Lock, CheckCircle2, Trophy,
} from 'lucide-react';
// @ts-ignore - canvas-confetti default export
import confetti from 'canvas-confetti';
import MainLayout from '../components/layout/MainLayout';
import api from '../lib/api';
import personalizedRoadmapService, { PersonalizedRoadmapDetail } from '../services/personalizedRoadmapService';

const LABEL_GOAL: Record<string, string> = {
  career_switch: 'Chuyển ngành', job_promotion: 'Thăng chức', skill_upgrade: 'Nâng cấp kỹ năng',
  first_job: 'Tìm việc đầu tiên', freelance: 'Làm freelance', side_project: 'Dự án cá nhân',
};
const LABEL_EXP: Record<string, string> = {
  none: 'Chưa có kinh nghiệm', beginner: 'Người mới (0-1 năm)',
  intermediate: 'Trung cấp (1-3 năm)', advanced: 'Nâng cao (3+ năm)',
};
const LABEL_PATTERN: Record<string, string> = {
  daily: 'Mỗi ngày', weekdays: 'Trong tuần', weekends: 'Cuối tuần', flexible: 'Linh hoạt',
};
const LABEL_DIFFICULTY: Record<string, string> = {
  gentle: 'Nhẹ nhàng', standard: 'Tiêu chuẩn', intensive: 'Cường độ cao', extreme: 'Cực đại',
};
const LABEL_PROJECT: Record<string, string> = {
  minimal: 'Tối thiểu', balanced: 'Cân bằng', project_heavy: 'Nặng dự án',
};
const LABEL_COMPANY: Record<string, string> = {
  startup: 'Startup', enterprise: 'Tập đoàn', agency: 'Agency', remote: 'Remote', any: 'Linh hoạt',
};
const LABEL_STYLE: Record<string, string> = {
  video: 'Video', reading: 'Đọc tài liệu', practice: 'Thực hành', mixed: 'Kết hợp',
};
const LABEL_BUDGET: Record<string, string> = {
  free: 'Miễn phí', mixed: 'Kết hợp', paid: 'Trả phí', budget: 'Có giới hạn ngân sách',
};

const ViewPersonalizedRoadmapPage = () => {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PersonalizedRoadmapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const [savingCourse, setSavingCourse] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const previouslyFinishedRef = useRef(false);

  useEffect(() => {
    if (!roadmapId) return;
    personalizedRoadmapService.getDetail(parseInt(roadmapId))
      .then((d) => {
        setData(d);
        setCompletedCourses(new Set(d.completed_course_ids || []));
        // Track init state - nếu đã 100% lúc load, không trigger celebration
        previouslyFinishedRef.current = (d.progress_percentage || 0) >= 100;
      })
      .catch((err) => {
        console.error('Load roadmap error:', err);
        setError(err?.response?.data?.detail || 'Không tải được lộ trình.');
      })
      .finally(() => setLoading(false));
  }, [roadmapId]);

  // Confetti từ hai bên màn hình
  // multiplier để tăng độ dài/cường độ (1 = mặc định, 10 = ăn mừng lớn khi đóng modal)
  const fireConfetti = (multiplier: number = 1) => {
    const duration = 3500 * multiplier;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 360, ticks: 60, zIndex: 10000, gravity: 0.9 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        window.clearInterval(interval);
        return;
      }
      const particleCount = 30 * (timeLeft / duration);
      // Bắn từ trái
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0, 0.15), y: randomInRange(0.4, 0.7) },
        colors: ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#10b981'],
      });
      // Bắn từ phải
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.85, 1), y: randomInRange(0.4, 0.7) },
        colors: ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#10b981'],
      });
    }, 250);
  };

  const roadmap: any = data?.roadmap_data || {};
  const phases: any[] = useMemo(() => Array.isArray(roadmap.phases) ? roadmap.phases : [], [roadmap]);

  // Tính phase nào đã unlocked: phase 0 always; phase n unlocked nếu phase n-1 hoàn thành
  const isPhaseCompleted = (phaseIdx: number): boolean => {
    const phase = phases[phaseIdx];
    if (!phase) return false;
    const courses = phase.courses || [];
    if (courses.length === 0) return true;
    return courses.every((c: any, ci: number) => {
      const cid = c.course_id || `course-${phase.phase || phaseIdx + 1}-${ci}`;
      return completedCourses.has(cid);
    });
  };

  const isPhaseLocked = (phaseIdx: number): boolean => {
    if (phaseIdx === 0) return false;
    return !isPhaseCompleted(phaseIdx - 1);
  };

  // Course n+1 trong cùng phase chỉ unlock khi course n đã hoàn thành
  const isCourseLocked = (phaseIdx: number, courseIdx: number): boolean => {
    if (isPhaseLocked(phaseIdx)) return true;
    if (courseIdx === 0) return false;
    const phase = phases[phaseIdx];
    if (!phase) return false;
    const courses = phase.courses || [];
    // Tất cả course trước phải hoàn thành
    for (let i = 0; i < courseIdx; i++) {
      const c = courses[i];
      if (!c) continue;
      const cid = c.course_id || `course-${phase.phase || phaseIdx + 1}-${i}`;
      if (!completedCourses.has(cid)) return true;
    }
    return false;
  };

  const toggleCourse = async (courseId: string, phaseIdx: number, courseIdx: number) => {
    if (!data) return;
    // Khóa: không cho toggle nếu course đang locked (course trước chưa xong)
    if (isCourseLocked(phaseIdx, courseIdx)) return;

    const currentlyCompleted = completedCourses.has(courseId);
    const newCompleted = !currentlyCompleted;

    // Optimistic update
    const newSet = new Set(completedCourses);
    if (newCompleted) newSet.add(courseId);
    else newSet.delete(courseId);
    setCompletedCourses(newSet);

    setSavingCourse(courseId);
    try {
      const res = await api.post(`/api/learning-path/personalized/${data.id}/toggle-course`, {
        course_id: courseId,
        completed: newCompleted,
      });
      const completedIds: string[] = res.data.completed_course_ids || [];
      setCompletedCourses(new Set(completedIds));

      // Trigger celebration nếu vừa hoàn thành 100% và chưa từng hoàn thành trước đó
      if (res.data.is_finished && !previouslyFinishedRef.current) {
        previouslyFinishedRef.current = true;
        setShowCelebration(true);
      } else if (!res.data.is_finished) {
        previouslyFinishedRef.current = false;
      }
    } catch (e) {
      // Rollback
      setCompletedCourses(completedCourses);
      console.error('Toggle course error:', e);
    } finally {
      setSavingCourse(null);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-slate-600">Đang tải lộ trình...</span>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-slate-700 dark:text-slate-300 font-semibold mb-4">{error || 'Không tải được dữ liệu.'}</p>
          <button onClick={() => navigate('/learning-path')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">Quay lại</button>
        </div>
      </MainLayout>
    );
  }

  if (data.status === 'failed') {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tạo lộ trình thất bại</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{data.generation_error || 'Đã xảy ra lỗi.'}</p>
          <button onClick={() => navigate('/learning-path')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">Quay lại</button>
        </div>
      </MainLayout>
    );
  }

  if (data.status === 'generating' || !data.roadmap_data) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">AI đang tạo lộ trình...</h2>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">Tải lại</button>
        </div>
      </MainLayout>
    );
  }

  const totalCourses = phases.reduce((sum, p) => sum + (Array.isArray(p?.courses) ? p.courses.length : 0), 0);
  const completedCount = completedCourses.size;
  const progressPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  const d = data;

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
        {/* Celebration Banner sticky on top khi đã 100% */}
        {progressPct >= 100 && (
          <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg">
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-center gap-3 text-center">
              <Trophy size={22} className="text-yellow-200 animate-pulse flex-shrink-0" />
              <div>
                <p className="font-bold text-sm md:text-base">Chúc mừng! Bạn đã hoàn thành 100% lộ trình</p>
                <p className="text-xs opacity-90">Hãy ăn mừng thành tựu này và sẵn sàng cho thử thách mới</p>
              </div>
            </div>
          </div>
        )}

        {/* Celebration Modal khi vừa đạt 100% */}
        {showCelebration && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" />
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center pointer-events-auto animate-celebrate">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
                <Trophy size={42} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Chúc mừng bạn!</h2>
              <p className="text-base font-bold text-emerald-600 mb-3">Bạn đã hoàn thành 100% lộ trình</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Một hành trình học tập tuyệt vời. Hãy tự hào về bản thân và sẵn sàng áp dụng những gì đã học vào sự nghiệp của bạn.
              </p>
              <button
                onClick={() => {
                  setShowCelebration(false);
                  // Auto bắn pháo hoa với multiplier 10 (= 10 lần click)
                  fireConfetti(10);
                }}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={15} /> Đóng và ăn mừng
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-100 via-violet-100 to-purple-100 dark:from-indigo-950/40 dark:via-violet-950/40 dark:to-purple-950/40 border-b border-indigo-200/50 dark:border-indigo-900/50 py-8 px-6">
          <div className="max-w-5xl mx-auto">
            <button onClick={() => navigate('/learning-path')} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 mb-3 text-sm font-medium">
              <ArrowLeft size={16} /> Quay lại
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">{d.career_title || 'Lộ trình học tập'}</h1>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge label={_toSafeString(d.level_name || d.level_slug)} />
              <Badge label={`${d.duration_months} tháng`} />
              <Badge label={`${d.daily_hours}h/ngày`} />
              <Badge label={`${totalCourses} khóa học`} />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-5 space-y-5">

          {/* Progress bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tiến độ học tập</span>
              <span className="text-sm font-bold text-indigo-600">{completedCount}/{totalCourses} khóa học · {progressPct}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Skills overview - 3 boxes ở trên + skills tags ở dưới */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Tổng quan kỹ năng</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatBox color="orange" value={(d.critical_skills || []).length} label="QUAN TRỌNG" sub="Cần học trước" />
              <StatBox color="amber" value={(d.important_skills || []).length} label="NÊN CÓ" sub="Bổ sung sau" />
              <StatBox color="emerald" value={d.total_existing || 0} label="ĐÃ CÓ" sub="Trong CV" />
            </div>

            {/* Critical skills tags */}
            {Array.isArray(d.critical_skills) && d.critical_skills.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-orange-700 mb-1.5">Kỹ năng quan trọng:</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.critical_skills.map((s: any, i) => (
                    <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-xs rounded font-medium">{_toSafeString(s)}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Important skills tags */}
            {Array.isArray(d.important_skills) && d.important_skills.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-amber-700 mb-1.5">Kỹ năng nên có:</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.important_skills.map((s: any, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded font-medium">{_toSafeString(s)}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Existing skills tags */}
            {Array.isArray(d.existing_skills) && d.existing_skills.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-700 mb-1.5">Kỹ năng đã có (khớp với nghề):</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.existing_skills.map((s: any, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded font-medium">{_toSafeString(s)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Personalization detailed explanation */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
              <Sparkles size={16} /> Vì sao lộ trình này phù hợp với bạn
            </h3>
            {Array.isArray(roadmap.personalization_highlights) && roadmap.personalization_highlights.length > 0 && (
              <ul className="space-y-1.5 mb-4">
                {roadmap.personalization_highlights.map((h: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{_toSafeString(h)}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Detailed options breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2.5">Các tùy chọn cá nhân hóa bạn đã chọn:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <OptionRow label="Cấp bậc nhắm tới" value={_toSafeString(d.level_name || d.level_slug)} />
                <OptionRow label="Mục tiêu học" value={(d.learning_goal && LABEL_GOAL[d.learning_goal]) || d.learning_goal || 'Mặc định'} />
                <OptionRow label="Kinh nghiệm hiện tại" value={(d.prior_experience && LABEL_EXP[d.prior_experience]) || d.prior_experience || 'Mặc định'} />
                <OptionRow label="Loại công ty mục tiêu" value={(d.target_company_type && LABEL_COMPANY[d.target_company_type]) || d.target_company_type || 'Linh hoạt'} />
                <OptionRow label="Tổng thời gian" value={`${d.duration_months} tháng (${d.daily_hours}h/ngày)`} />
                <OptionRow label="Pattern học" value={(d.weekly_pattern && LABEL_PATTERN[d.weekly_pattern]) || d.weekly_pattern || 'Linh hoạt'} />
                <OptionRow label="Cường độ AI" value={(d.ai_difficulty_level && LABEL_DIFFICULTY[d.ai_difficulty_level]) || d.ai_difficulty_level || 'Tiêu chuẩn'} />
                <OptionRow label="Phong cách học" value={(d.learning_style && LABEL_STYLE[d.learning_style]) || d.learning_style || 'Kết hợp'} />
                <OptionRow label="Cường độ dự án" value={(d.project_intensity && LABEL_PROJECT[d.project_intensity]) || d.project_intensity || 'Cân bằng'} />
                <OptionRow label="Ngân sách" value={(d.budget_type && LABEL_BUDGET[d.budget_type]) || d.budget_type} />
                {d.max_budget && (
                  <OptionRow label="Giới hạn chi phí" value={`${Number(d.max_budget).toLocaleString('vi-VN')}đ`} />
                )}
                <OptionRow label="Ngôn ngữ khóa học" value={d.preferred_language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'} />
                <OptionRow label="Ưu tiên chứng chỉ" value={d.certification_priority ? 'Có' : 'Không'} />
                <OptionRow label="Nhắc nhở email" value={d.email_reminder_enabled ? `Có (${d.email_reminder_time || ''})` : 'Không'} />
                {d.current_position && <OptionRow label="Vị trí hiện tại" value={_toSafeString(d.current_position)} fullWidth />}
                {d.target_salary_range && <OptionRow label="Lương mong muốn" value={_toSafeString(d.target_salary_range)} fullWidth />}
                {d.user_notes && <OptionRow label="Ghi chú thêm" value={_toSafeString(d.user_notes)} fullWidth />}
              </div>
            </div>
          </div>

          {/* Summary */}
          {(roadmap.summary || (Array.isArray(roadmap.summary_bullets) && roadmap.summary_bullets.length > 0)) && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" /> Tổng quan lộ trình
              </h3>
              {Array.isArray(roadmap.summary_bullets) && roadmap.summary_bullets.length > 0 ? (
                <ul className="space-y-2 mb-3">
                  {roadmap.summary_bullets.map((b: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="text-indigo-500 mt-0.5 flex-shrink-0">•</span>
                      <span>{_toSafeString(b)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{_toSafeString(roadmap.summary)}</p>
              )}
              {(roadmap.estimated_cost_vnd != null || roadmap.total_courses) && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                  {roadmap.estimated_cost_vnd != null && (
                    <span>Chi phí: <strong className="text-slate-900 dark:text-white">{roadmap.estimated_cost_vnd === 0 ? 'Miễn phí' : `${Number(roadmap.estimated_cost_vnd).toLocaleString('vi-VN')}đ`}</strong></span>
                  )}
                  {roadmap.total_courses && <span>{roadmap.total_courses} khóa học</span>}
                  {roadmap.total_weeks && <span>{roadmap.total_weeks} tuần</span>}
                </div>
              )}
            </div>
          )}

          {/* URL Validation */}
          {roadmap.url_validation_summary && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">Đã kiểm tra liên kết khóa học</p>
                  <p>
                    <strong>{roadmap.url_validation_summary.verified}/{roadmap.url_validation_summary.total}</strong> link hoạt động ({roadmap.url_validation_summary.verification_rate}%).
                    {roadmap.url_validation_summary.replaced > 0 && (
                      <> {roadmap.url_validation_summary.replaced} link đã thay bằng <strong>tìm kiếm trên platform</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Phases */}
          {phases.length > 0 ? (
            <div className="space-y-3">
              {phases.map((phase: any, idx: number) => {
                const isOpen = expandedPhase === idx;
                const locked = isPhaseLocked(idx);
                const completed = isPhaseCompleted(idx);
                return (
                  <div key={idx} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border overflow-hidden ${
                    completed ? 'border-emerald-300 dark:border-emerald-800' :
                    locked ? 'border-slate-200 dark:border-slate-700 opacity-75' : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    <button
                      onClick={() => setExpandedPhase(isOpen ? null : idx)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          completed ? 'bg-emerald-100 text-emerald-700' :
                          locked ? 'bg-slate-100 text-slate-400' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {completed ? (
                            <CheckCircle size={18} />
                          ) : (
                            <>
                              <span>T{phase.month || phase.phase || idx + 1}</span>
                              {locked && (
                                <span
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center"
                                  title="Phase chưa mở khóa"
                                >
                                  <Lock size={9} />
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            {_toSafeString(phase.title || `Giai đoạn ${idx + 1}`)}
                            {completed && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">HOÀN THÀNH</span>}
                            {locked && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">CHƯA MỞ KHÓA</span>}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {phase.weeks || ''}{phase.courses?.length ? ` · ${phase.courses.length} khóa học` : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                        {locked && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                            <Lock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 dark:text-amber-300">
                              <p className="font-semibold mb-0.5">Giai đoạn này chưa được mở khóa</p>
                              <p>Hoàn thành tất cả khóa học của giai đoạn trước để mở khóa và bấm vào link khóa học.</p>
                            </div>
                          </div>
                        )}

                        {/* Focus - bullet list nếu có, fallback paragraph */}
                        {Array.isArray(phase.focus_bullets) && phase.focus_bullets.length > 0 ? (
                          <ul className="mb-4 space-y-1.5">
                            {phase.focus_bullets.map((b: any, bi: number) => (
                              <li key={bi} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="text-indigo-500 mt-0.5 flex-shrink-0">•</span>
                                <span>{_toSafeString(b)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          phase.focus && <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{_toSafeString(phase.focus)}</p>
                        )}

                        {/* Lịch học theo tuần (7 ngày) — ưu tiên hiển thị weekly_schedule */}
                        {phase.weekly_schedule && typeof phase.weekly_schedule === 'object' && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">Lịch học mẫu theo tuần</p>
                            <div className="space-y-1.5">
                              {([
                                ['monday', 'Thứ 2'],
                                ['tuesday', 'Thứ 3'],
                                ['wednesday', 'Thứ 4'],
                                ['thursday', 'Thứ 5'],
                                ['friday', 'Thứ 6'],
                                ['saturday', 'Thứ 7'],
                                ['sunday', 'Chủ nhật'],
                              ] as const).map(([key, label]) => {
                                const dayRaw = (phase.weekly_schedule as any)?.[key];
                                if (!dayRaw) return null;
                                // Defensive: handle 3 cases — string, object, anything else
                                let slot = '';
                                let activity = '';
                                if (typeof dayRaw === 'string') {
                                  slot = dayRaw.trim();
                                } else if (typeof dayRaw === 'object') {
                                  slot = String(dayRaw.time_slot ?? '').trim();
                                  activity = String(dayRaw.activity ?? '').trim();
                                }
                                const isOff = slot.toLowerCase() === 'off' || !slot || slot === '-' || slot === 'nghỉ' || slot === 'off-day';
                                return (
                                  <div key={key} className="flex items-start gap-2 text-sm">
                                    <span className="font-bold text-blue-900 dark:text-blue-300 flex-shrink-0" style={{ minWidth: 64 }}>{label}:</span>
                                    {isOff ? (
                                      <span className="text-slate-500 italic">Nghỉ</span>
                                    ) : (
                                      <span className="text-blue-800 dark:text-blue-300 leading-relaxed">
                                        <span className="font-semibold">{slot}</span>
                                        {activity && <span> — {activity}</span>}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Fallback: daily_schedule cũ nếu chưa có weekly_schedule */}
                        {!phase.weekly_schedule && phase.daily_schedule && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">Lịch học mẫu/ngày</p>
                            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                              {(() => {
                                const raw = String(phase.daily_schedule);
                                const parts = raw.split(/(?=\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2})/g)
                                  .map((s) => s.trim())
                                  .filter((s) => s.length > 0);
                                return parts.length > 1
                                  ? parts.map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)
                                  : <p className="leading-relaxed whitespace-pre-line">{raw}</p>;
                              })()}
                            </div>
                          </div>
                        )}

                        {Array.isArray(phase.skills) && phase.skills.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Kỹ năng trọng tâm:</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {phase.skills.map((s: any, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-md font-medium">{_toSafeString(s)}</span>
                              ))}
                            </div>
                            {phase.skills_explanation && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 italic">{_toSafeString(phase.skills_explanation)}</p>
                            )}
                          </div>
                        )}

                        {Array.isArray(phase.courses) && phase.courses.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Khóa học:</p>
                            <div className="space-y-2">
                              {phase.courses.map((course: any, ci: number) => {
                                const courseId = course.course_id || `course-${phase.phase || idx + 1}-${ci}`;
                                const isCompleted = completedCourses.has(courseId);
                                const isSaving = savingCourse === courseId;
                                const courseLocked = isCourseLocked(idx, ci);
                                return (
                                  <div key={ci} className={`p-3 rounded-xl border transition-colors ${
                                    isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                                    courseLocked ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70' :
                                    'bg-slate-50 dark:bg-slate-700/40 border-slate-100 dark:border-slate-600'
                                  }`}>
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className={`font-medium text-sm flex items-center gap-1.5 ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                          {courseLocked && <Lock size={13} className="text-slate-400 flex-shrink-0" />}
                                          {_toSafeString(course.name_vi || course.name || 'Khóa học')}
                                          {course.name_vi && course.name && course.name_vi !== course.name && (
                                            <span className="block text-[11px] text-slate-400 dark:text-slate-500 italic font-normal mt-0.5">
                                              ({_toSafeString(course.name)})
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                                          {course.platform && <span>{_toSafeString(course.platform)}</span>}
                                          {course.instructor && <span>· {_toSafeString(course.instructor)}</span>}
                                          {course.duration_hours && <span>· {course.duration_hours}h</span>}
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${course.is_free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {course.is_free ? 'Miễn phí' : course.price_vnd ? `${Number(course.price_vnd).toLocaleString('vi-VN')}đ` : 'Trả phí'}
                                          </span>
                                          {course.has_certificate && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">Chứng chỉ</span>}
                                          {course.url_verified === true && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700" title="Link đã xác thực">✓ Đã xác thực</span>}
                                          {course.is_search_url === true && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700" title="Link tìm kiếm trên platform">Tìm trên platform</span>}
                                        </div>
                                        {course.description && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">{_toSafeString(course.description)}</p>
                                        )}
                                        {course.why_recommend && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{_toSafeString(course.why_recommend)}</p>
                                        )}
                                        {Array.isArray(course.key_takeaways) && course.key_takeaways.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Sẽ học được:</p>
                                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                                              {course.key_takeaways.map((t: any, ti: number) => <li key={ti}>• {_toSafeString(t)}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                      {/* Link mở khóa học */}
                                      {course.url && !courseLocked && (
                                        <a href={course.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Mở khóa học">
                                          <ExternalLink size={14} />
                                        </a>
                                      )}
                                      {course.url && courseLocked && (
                                        <div className="flex-shrink-0 p-1.5 text-slate-300 cursor-not-allowed" title="Hoàn thành khóa trước để mở link">
                                          <Lock size={14} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Action button - thay cho checkbox */}
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                      {courseLocked ? (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                          <Lock size={13} />
                                          <span>Hãy hoàn thành khóa trước để mở khóa này</span>
                                        </div>
                                      ) : isCompleted ? (
                                        <button
                                          onClick={() => toggleCourse(courseId, idx, ci)}
                                          disabled={isSaving}
                                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-50 text-emerald-700 text-xs font-bold transition-colors disabled:opacity-50"
                                        >
                                          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                          Đã học xong khóa học
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => toggleCourse(courseId, idx, ci)}
                                          disabled={isSaving}
                                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-600 text-xs font-bold transition-colors disabled:opacity-50"
                                        >
                                          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                                          Đánh dấu hoàn thành
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {Array.isArray(phase.practice_projects) && phase.practice_projects.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Dự án thực hành:</p>
                            <div className="space-y-2">
                              {phase.practice_projects.map((p: any, pi: number) => {
                                const proj = typeof p === 'string' ? { title: p } : p;
                                return (
                                  <div key={pi} className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800">
                                    <div className="font-medium text-sm text-violet-900 dark:text-violet-300">{_toSafeString(proj.title || proj.name)}</div>
                                    {proj.description && <p className="text-xs text-violet-700 dark:text-violet-400 mt-1 leading-relaxed">{_toSafeString(proj.description)}</p>}
                                    {Array.isArray(proj.tech_stack) && proj.tech_stack.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {proj.tech_stack.map((t: any, ti: number) => (
                                          <span key={ti} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] rounded font-medium">{_toSafeString(t)}</span>
                                        ))}
                                      </div>
                                    )}
                                    {Array.isArray(proj.deliverables) && proj.deliverables.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-[11px] font-semibold text-violet-700 mb-0.5">Sản phẩm cần làm:</p>
                                        <ul className="text-xs text-violet-800 space-y-0.5">
                                          {proj.deliverables.map((d2: any, di: number) => <li key={di}>• {_toSafeString(d2)}</li>)}
                                        </ul>
                                      </div>
                                    )}
                                    {Array.isArray(proj.learning_outcomes) && proj.learning_outcomes.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-[11px] font-semibold text-violet-700 mb-0.5">Sẽ học được:</p>
                                        <ul className="text-xs text-violet-800 space-y-0.5">
                                          {proj.learning_outcomes.map((o: any, oi: number) => <li key={oi}>• {_toSafeString(o)}</li>)}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {phase.milestone && (
                          <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 mb-2">
                            <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Mốc cần đạt:</p>
                              <NumberedTextList text={phase.milestone} color="emerald" />
                            </div>
                          </div>
                        )}

                        {phase.completion_criteria && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mb-2">
                            <Target size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Điều kiện qua phase:</p>
                              <NumberedTextList text={phase.completion_criteria} color="amber" />
                            </div>
                          </div>
                        )}

                        {Array.isArray(phase.tips) && phase.tips.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">💡 Tips:</p>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                              {phase.tips.map((t: any, i: number) => <li key={i}>• {_toSafeString(t)}</li>)}
                            </ul>
                          </div>
                        )}

                        {Array.isArray(phase.common_mistakes) && phase.common_mistakes.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Lỗi thường gặp:</p>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                              {phase.common_mistakes.map((m: any, i: number) => <li key={i}>• {_toSafeString(m)}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-amber-700">Lộ trình chưa có giai đoạn cụ thể.</p>
            </div>
          )}

          {/* Interview prep */}
          {roadmap.interview_prep && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                <Briefcase size={16} /> Chuẩn bị phỏng vấn
              </h3>
              {Array.isArray(roadmap.interview_prep.tips) && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Tips:</p>
                  <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {roadmap.interview_prep.tips.map((t: any, i: number) => <li key={i}>• {_toSafeString(t)}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(roadmap.interview_prep.common_questions) && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Câu hỏi thường gặp:</p>
                  <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {roadmap.interview_prep.common_questions.map((q: any, i: number) => <li key={i}>• {_toSafeString(q)}</li>)}
                  </ul>
                </div>
              )}
              {roadmap.interview_prep.portfolio_advice && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-700 mb-1.5">Lời khuyên về portfolio:</p>
                  <SentenceList text={roadmap.interview_prep.portfolio_advice} color="indigo" />
                </div>
              )}
            </div>
          )}

          {roadmap.completion_criteria && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
              <h3 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                <CheckCircle size={18} /> Tiêu chí hoàn thành lộ trình
              </h3>
              <NumberedTextList text={roadmap.completion_criteria} color="emerald" />
            </div>
          )}

          {Array.isArray(roadmap.next_steps_after_completion) && roadmap.next_steps_after_completion.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
                <BookOpen size={16} /> Bước tiếp theo sau khi hoàn thành
              </h3>
              <ol className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                {roadmap.next_steps_after_completion.map((s: any, i: number) => <li key={i}>{_toSafeString(s)}</li>)}
              </ol>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

// ─── Helper: Normalize bất kỳ input nào thành string an toàn ──────────────
function _toSafeString(input: any): string {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'number' || typeof input === 'boolean') return String(input);
  if (Array.isArray(input)) {
    // AI có thể trả về dạng array → join với numbered list
    return input
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item, idx) => {
        const s = typeof item === 'string' ? item : (typeof item === 'object' ? JSON.stringify(item) : String(item));
        // Nếu item đã có "1." rồi thì giữ nguyên, ngược lại thêm số thứ tự
        if (/^\d+\.\s/.test(s.trim())) return s.trim();
        return `${idx + 1}. ${s.trim()}`;
      })
      .join(' ');
  }
  if (typeof input === 'object') {
    // Object → thử lấy field text/value/description, fallback JSON stringify
    const obj = input as Record<string, any>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.value === 'string') return obj.value;
    if (typeof obj.description === 'string') return obj.description;
    if (typeof obj.content === 'string') return obj.content;
    try {
      return JSON.stringify(input);
    } catch {
      return '';
    }
  }
  try {
    return String(input);
  } catch {
    return '';
  }
}

// ─── Helper render text dạng numbered list (1. ... 2. ... 3.) ──────────────
const NumberedTextList = ({ text, color = 'slate' }: { text: any; color?: 'slate' | 'amber' | 'emerald' | 'indigo' }) => {
  const items: string[] = [];
  const raw = _toSafeString(text).trim();
  if (!raw) return null;

  const parts = raw.split(/(?:^|\s)(\d+)\.\s+/g).filter(Boolean);
  let i = 0;
  let leading = '';
  if (parts.length > 0 && !/^\d+$/.test(parts[0])) {
    leading = parts[0].trim();
    i = 1;
  }
  while (i < parts.length - 1) {
    if (/^\d+$/.test(parts[i]) && parts[i + 1]) {
      items.push(parts[i + 1].trim());
      i += 2;
    } else {
      i++;
    }
  }

  if (items.length < 2) {
    return <p className="text-sm leading-relaxed whitespace-pre-line">{raw}</p>;
  }

  const colorMap = {
    slate: { num: '#475569', text: '#1e293b' },
    amber: { num: '#b45309', text: '#78350f' },
    emerald: { num: '#047857', text: '#064e3b' },
    indigo: { num: '#4338ca', text: '#1e1b4b' },
  };
  const c = colorMap[color];

  return (
    <div className="space-y-1.5">
      {leading && <p className="text-sm mb-2" style={{ color: c.text }}>{leading}</p>}
      <ol className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: c.text }}>
            <span className="flex-shrink-0 font-bold" style={{ color: c.num, minWidth: 18 }}>{idx + 1}.</span>
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

// ─── Helper render text có period-based sentences (cho portfolio_advice) ───
const SentenceList = ({ text, color = 'indigo' }: { text: any; color?: 'slate' | 'amber' | 'emerald' | 'indigo' }) => {
  const raw = _toSafeString(text).trim();
  if (!raw) return null;
  // Tách theo dấu chấm + space + chữ cái viết hoa, giữ dấu chấm
  const sentences = raw.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map(s => s.trim()).filter(Boolean) || [];
  if (sentences.length < 2) {
    return <p className="text-sm leading-relaxed whitespace-pre-line">{raw}</p>;
  }
  const colorMap = {
    slate: { dot: '#64748b', text: '#1e293b' },
    amber: { dot: '#b45309', text: '#78350f' },
    emerald: { dot: '#10b981', text: '#064e3b' },
    indigo: { dot: '#6366f1', text: '#1e1b4b' },
  };
  const c = colorMap[color];
  return (
    <ul className="space-y-1.5">
      {sentences.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: c.text }}>
          <span className="flex-shrink-0 mt-0.5" style={{ color: c.dot, fontSize: 16, lineHeight: 1 }}>•</span>
          <span className="flex-1">{s}</span>
        </li>
      ))}
    </ul>
  );
};

const Badge = ({ label }: { label: string }) => (
  <span className="inline-flex items-center bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-medium border border-slate-200 dark:border-slate-700">
    {label}
  </span>
);

const StatBox = ({ color, value, label, sub }: { color: 'orange' | 'amber' | 'emerald'; value: number; label: string; sub: string }) => {
  const styles = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <div className={`${styles[color]} rounded-xl p-3 text-center border`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[11px] font-bold mt-0.5">{label}</div>
      <div className="text-[10px] opacity-80">{sub}</div>
    </div>
  );
};

const OptionRow = ({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) => (
  <div className={`flex items-start justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-lg ${fullWidth ? 'md:col-span-2' : ''}`}>
    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{label}</span>
    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-right">{value}</span>
  </div>
);

export default ViewPersonalizedRoadmapPage;
