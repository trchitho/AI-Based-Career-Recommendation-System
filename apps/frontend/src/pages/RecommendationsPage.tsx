// apps/frontend/src/pages/RecommendationsPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ThumbsUp, ThumbsDown, ChevronRight, ChevronLeft, Lock, Briefcase, ArrowRight } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";

/* ── Career group icon mapping ── */
const getCareerIcon = (title: string, slug: string): string => {
  const text = (title + ' ' + slug).toLowerCase();
  if (text.match(/giáo viên|teacher|education|dạy|training|đào tạo/)) return '📚';
  if (text.match(/y tế|health|medical|bác sĩ|doctor|nurse|điều dưỡng|dược/)) return '🏥';
  if (text.match(/kỹ thuật|engineer|technical|cơ khí|điện|electronic/)) return '⚙️';
  if (text.match(/máy tính|computer|software|developer|lập trình|IT|tech/)) return '💻';
  if (text.match(/kiến trúc|architect|xây dựng|construction|building/)) return '🏗️';
  if (text.match(/bán hàng|sales|marketing|quảng cáo|advertising/)) return '📈';
  if (text.match(/tài chính|finance|ngân hàng|bank|kế toán|accounting/)) return '💰';
  if (text.match(/luật|law|legal|pháp/)) return '⚖️';
  if (text.match(/nghệ thuật|art|design|thiết kế|creative|đồ họa/)) return '🎨';
  if (text.match(/truyền thông|media|journalist|báo chí|communication/)) return '📡';
  if (text.match(/vận tải|transport|logistics|giao hàng|delivery|lái xe/)) return '🚛';
  if (text.match(/nông nghiệp|agriculture|farm|trồng|chăn nuôi/)) return '🌾';
  if (text.match(/ẩm thực|food|cook|đầu bếp|nhà hàng|restaurant/)) return '🍳';
  if (text.match(/quản lý|management|giám đốc|director|admin/)) return '👔';
  if (text.match(/khoa học|science|research|nghiên cứu|lab/)) return '🔬';
  if (text.match(/bảo vệ|security|police|cảnh sát|quân đội|military/)) return '🛡️';
  if (text.match(/du lịch|travel|tourism|khách sạn|hotel/)) return '✈️';
  if (text.match(/thể thao|sport|fitness|gym/)) return '⚽';
  if (text.match(/môi trường|environment|ecology|sinh thái/)) return '🌿';
  if (text.match(/sản xuất|production|manufacturing|nhà máy|factory/)) return '🏭';
  if (text.match(/bảo trì|maintenance|sửa chữa|repair|thợ/)) return '🔧';
  if (text.match(/xã hội|social|community|cộng đồng/)) return '🤝';
  return '💼';
};
import {
  recommendationService,
  CareerRecommendationDTO,
  RecommendationsResponse,
} from "../services/recommendationService";
import { careerService, CareerItem } from "../services/careerService";
import { assessmentService } from "../services/assessmentService";
import { getRIASECTagDisplay } from "../utils/riasec";
import { useFeatureAccess } from "../hooks/useFeatureAccess";
import { useUsageTracking } from "../hooks/useUsageTracking";
import api from "../lib/api";
import "./RecommendationsPage.css";
import "./RecommendationsPage-hero.css";

/* ── helpers ── */
type MatchLevel = "excellent" | "great" | "good";
const getMatchLevel = (score: number): { level: MatchLevel; label: string } => {
  const pct = Math.round(score * 100);
  if (pct >= 90) return { level: "excellent", label: "Excellent" };
  if (pct >= 75) return { level: "great", label: "Great" };
  return { level: "good", label: "Good" };
};
const CIRC = 2 * Math.PI * 20; // r=20

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const { hasFeature, currentPlan, getPlanInfo } = useFeatureAccess();
  const { canUseFeature } = useUsageTracking();

  /* ── AI recommendations (top strip) ── */
  const [recData, setRecData] = useState<RecommendationsResponse | null>(null);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>(() => {
    try { return JSON.parse(localStorage.getItem("career_feedback") || "{}"); } catch { return {}; }
  });
  const stripRef = useRef<HTMLDivElement>(null);

  /* ── Career browse (bottom grid) ── */
  const [items, setItems] = useState<CareerItem[]>([]);
  const [careerLoading, setCareerLoading] = useState(true);
  const [q, setQ] = useState("");

  const recItems = recData?.items ?? [];
  const requestId = recData?.request_id ?? null;

  /* fetch AI recs — same pattern as dashboard */
  useEffect(() => {
    (async () => {
      setRecLoading(true);
      try {
        const history = await assessmentService.getHistory();
        if (!history.length) { setRecLoading(false); return; }

        const latestId = history[0].id;

        // 1. Try fast saved recommendations first
        try {
          const saved = await api.get("/api/recommendations/saved", {
            params: { assessment_id: latestId, top_k: 10 },
          });
          const rows: any[] = Array.isArray(saved.data)
            ? saved.data
            : saved.data?.items ?? [];
          if (rows.length > 0) {
            setRecData({
              request_id: null,
              items: rows.map((c: any) => ({
                career_id: c.career_id || c.id,
                slug: c.slug || c.career_id,
                title_vn: c.title_vn,
                title_en: c.title_en,
                description: c.description,
                match_score: (c.score ?? c.match_score ?? 0) / (c.score > 1 ? 100 : 1),
                tags: c.tags ?? [],
                position: c.rank || 0,
              })),
            });
            setRecLoading(false);
            return;
          }
        } catch { /* fall through to fresh fetch */ }

        // 2. Fallback: fresh recommendations
        const res = await recommendationService.getMain(latestId, 10);
        setRecData(res);
      } catch (e: any) {
        setRecError(e?.message || "Không thể tải gợi ý");
      } finally {
        setRecLoading(false);
      }
    })();
  }, []);

  /* fetch career browse — random 9 careers each time */
  const fetchCareers = useCallback(async () => {
    setCareerLoading(true);
    try {
      if (q.trim()) {
        // If searching, use normal search
        const resp = await careerService.list({ page: 1, pageSize: 9, q: q.trim() });
        setItems(resp.items);
      } else {
        // Random page for discovery - fetch from a random offset
        const totalResp = await careerService.list({ page: 1, pageSize: 1 });
        const totalCareers = totalResp.total || 100;
        const maxPage = Math.max(1, Math.floor(totalCareers / 9));
        const randomPage = Math.floor(Math.random() * maxPage) + 1;
        const resp = await careerService.list({ page: randomPage, pageSize: 9 });
        setItems(resp.items);
      }
    } catch { /* ignore */ } finally {
      setCareerLoading(false);
    }
  }, [q]);

  useEffect(() => { fetchCareers(); }, [fetchCareers]);

  /* feedback */
  const handleFeedback = async (career_id: string, value: "up" | "down") => {
    const nf = { ...feedback, [career_id]: value };
    setFeedback(nf);
    localStorage.setItem("career_feedback", JSON.stringify(nf));
    try {
      await api.post("/api/recommendations/feedback", {
        career_id, rating: value === "up" ? 5 : 1,
        comment: `User ${value === "up" ? "liked" : "disliked"} career: ${career_id}`,
      });
    } catch { /* ignore */ }
  };

  const handleRecClick = async (item: CareerRecommendationDTO, index: number) => {
    const id = item.slug || item.career_id;
    try {
      await recommendationService.logClick({
        career_id: id, position: item.position ?? index + 1,
        request_id: requestId, match_score: item.match_score,
      });
    } catch { /* ignore */ }
    navigate(`/careers/${id}`);
  };

  /* strip scroll */
  const scrollStrip = (dir: -1 | 1) => {
    if (stripRef.current) stripRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <MainLayout>
      <div className="rec-page">

        {/* ════════════════════════════════════════
            SECTION 1 — AI Recommendations strip
            ════════════════════════════════════════ */}
        <div className="rec-content" style={{ paddingTop: "1.75rem", paddingBottom: "0" }}>
          <div className="rec-hero">
            <div className="rec-hero-left">
              <div className="section-badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span>AI-Powered Recommendations</span>
              </div>
              <h1 className="hero-title">
                Khám phá nghề nghiệp<br />
                <span className="hero-highlight">phù hợp với bạn</span>
              </h1>
              <p className="hero-sub">
                Hoàn thành bài đánh giá để nhận gợi ý nghề nghiệp cá nhân hóa dựa trên kỹ năng, sở thích và mục tiêu của bạn.
              </p>
              <div className="hero-actions">
                <Link to="/assessment" className="hero-btn-primary">
                  Bắt đầu đánh giá →
                </Link>
                <Link to="/recommendations/learn-more" className="hero-btn-secondary">
                  Tìm hiểu thêm
                </Link>
              </div>
            </div>
            <div className="rec-hero-right">
              <div className="hero-visual-wrapper">
                <div className="hero-visual-glow"></div>

                {/* Orbit rings */}
                <div className="orbit-ring ring-1"></div>
                <div className="orbit-ring ring-2"></div>

                {/* Floating particles */}
                <div className="hero-visual">
                  <div className="floating-particle"></div>
                  <div className="floating-particle"></div>
                  <div className="floating-particle"></div>

                  {/* Main central card with briefcase icon */}
                  <div className="floating-card main">
                    <div className="icon-wrapper">
                      <Briefcase size={48} strokeWidth={2} />
                      <div className="sparkle">✦</div>
                    </div>
                  </div>

                  {/* Small floating cards with icons */}
                  <div className="floating-card small chart">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                  </div>

                  <div className="floating-card small user">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>

                  <div className="floating-card small clock">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>

                  <div className="floating-card small pie">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                      <path d="M22 12A10 10 0 0 0 12 2v10z" />
                    </svg>
                  </div>

                  <div className="floating-card small analytics">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-nav">
              <button onClick={() => scrollStrip(-1)} style={arrowBtnStyle}><ChevronLeft size={16} /></button>
              <button onClick={() => scrollStrip(1)} style={arrowBtnStyle}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Loading */}
          {recLoading && (
            <div className="rec-loading" style={{ padding: "2rem 0" }}>
              <div className="rec-spinner" />
              <span>Đang phân tích...</span>
            </div>
          )}

          {/* Error / no assessment */}
          {!recLoading && (recError || recItems.length === 0) && (
            <div style={{ padding: "1rem", textAlign: "center", color: "var(--neu-text-muted)", fontSize: "0.88rem" }}>
              {recError ?? ""}
            </div>
          )}

          {/* Horizontal strip */}
          {!recLoading && recItems.length > 0 && (
            <div
              ref={stripRef}
              style={{
                display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "0.75rem",
                scrollbarWidth: "none", msOverflowStyle: "none",
              }}
            >
              {recItems.map((it, index) => {
                const { level, label } = getMatchLevel(it.match_score);
                const pct = Math.round(it.match_score * 100);
                const title = it.title_vn || it.title_en || it.career_id || "Unknown";
                const offset = CIRC - (CIRC * pct) / 100;
                const fb = feedback[it.career_id];

                return (
                  <div key={it.career_id} style={{
                    minWidth: 260, maxWidth: 260,
                    background: "var(--neu-bg-card)",
                    borderRadius: 16,
                    boxShadow: "var(--neu-raised)",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    flexShrink: 0,
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                    className="rec-strip-card"
                  >
                    {/* Card header */}
                    <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--neu-shadow-dark)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <span className={`match-badge ${level}`} style={{ fontSize: "0.68rem" }}>{label}</span>
                        {/* mini donut */}
                        <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                          <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
                            <circle className="score-donut-track" cx="20" cy="20" r="16"
                              stroke="currentColor" strokeWidth="4" fill="transparent" />
                            <circle className={`score-donut-fill-${level}`} cx="20" cy="20" r="16"
                              stroke="currentColor" strokeWidth="4" fill="transparent"
                              strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round" />
                          </svg>
                          <span style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.6rem", fontWeight: 800, color: "var(--neu-accent)",
                          }}>{pct}%</span>
                        </div>
                      </div>
                      <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--neu-text)", margin: "0 0 0.5rem", lineHeight: 1.3 }}>
                        {title}
                      </h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                        {it.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="card-tag riasec" style={{ fontSize: "0.65rem" }}>
                            {getRIASECTagDisplay(tag)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card footer */}
                    <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          className={`feedback-btn${fb === "up" ? " active-up" : ""}`}
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem", display: "flex", alignItems: "center" }}
                          onClick={() => handleFeedback(it.career_id, "up")}
                        ><ThumbsUp size={13} /></button>
                        <button
                          className={`feedback-btn${fb === "down" ? " active-down" : ""}`}
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem", display: "flex", alignItems: "center" }}
                          onClick={() => handleFeedback(it.career_id, "down")}
                        ><ThumbsDown size={13} /></button>
                      </div>
                      <button
                        className="view-btn"
                        onClick={() => handleRecClick(it, index)}
                      >
                        Xem →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* divider */}
        <div style={{ maxWidth: 1200, margin: "1.75rem auto 0", padding: "0 1.5rem" }}>
          <div style={{ borderTop: "1px solid var(--neu-shadow-dark)" }} />
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — Career browser (like CareersPage)
            ════════════════════════════════════════ */}
        <div className="rec-content" style={{ paddingTop: "1.75rem" }}>

          {/* Header + search */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--neu-text)", margin: "0 0 1rem" }}>
              Khám phá tất cả nghề nghiệp
            </h2>

            {/* Search bar */}
            <div style={{ position: "relative", maxWidth: 560 }}>
              <div style={{
                display: "flex", alignItems: "center",
                background: "var(--neu-bg)",
                borderRadius: 14,
                boxShadow: "var(--neu-pressed-sm)",
                padding: "0.5rem 0.75rem",
                gap: "0.6rem",
              }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--neu-text-muted)", flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); }}
                  placeholder="Tìm theo tên nghề, ngành, từ khóa..."
                  style={{
                    flex: 1, border: "none", outline: "none", background: "transparent",
                    fontSize: "0.9rem", color: "var(--neu-text)", fontFamily: "inherit",
                  }}
                />
                {q && (
                  <button onClick={() => { setQ(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--neu-text-muted)", padding: 2, display: "flex", alignItems: "center" }}>
                    <ArrowRight size={14} style={{ transform: "rotate(45deg)" }} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          {careerLoading ? (
            <div className="rec-loading" style={{ padding: "3rem 0" }}>
              <div className="rec-spinner" />
              <span>Đang tải danh sách nghề nghiệp...</span>
            </div>
          ) : items.length > 0 ? (
            <div className="rec-grid">
              {items.map((c, index) => {
                const isLocked = (() => {
                  if (hasFeature("unlimited_careers")) return false;
                  if (currentPlan === "basic") return !canUseFeature("career_view");
                  if (currentPlan === "free") {
                    if (!canUseFeature("career_view")) return true;
                    return index > 0;
                  }
                  return false;
                })();

                const requiredPlan = !isLocked ? null : currentPlan === "basic" ? "premium" : "basic";
                const requiredPlanInfo = requiredPlan ? getPlanInfo(requiredPlan) : null;

                const gradients = [
                  'from-emerald-500 to-teal-600',
                  'from-blue-500 to-indigo-600',
                  'from-orange-400 to-rose-500',
                  'from-purple-500 to-violet-600',
                  'from-cyan-500 to-blue-600',
                  'from-pink-500 to-rose-600',
                  'from-amber-500 to-orange-600',
                  'from-indigo-500 to-purple-600',
                  'from-teal-500 to-emerald-600',
                ];
                const gradient = gradients[index % gradients.length];

                const CardContent = (
                  <div className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                    {/* Locked overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="text-center p-4">
                          <Lock size={24} className="mx-auto mb-2 text-gray-400" />
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {requiredPlanInfo?.name || 'PRO'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Card header with gradient */}
                    <div className={`h-32 bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 text-3xl">
                        {isLocked ? <Lock size={24} className="text-white" /> : getCareerIcon(c.title, (c as any).slug || c.id)}
                      </div>
                      {/* Decorative circles */}
                      <div className="absolute top-3 right-3 w-16 h-16 bg-white/10 rounded-full" />
                      <div className="absolute bottom-2 left-4 w-8 h-8 bg-white/10 rounded-full" />
                    </div>

                    {/* Card body */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                        {c.short_desc || c.description || 'Khám phá lộ trình nghề nghiệp này.'}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {isLocked ? 'Khóa' : 'Có sẵn'}
                        </span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Chi tiết <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                );

                return isLocked ? (
                  <Link key={c.id} to="/pricing" style={{ textDecoration: "none" }}>{CardContent}</Link>
                ) : (
                  <Link key={c.id} to={`/careers/${(c as any).slug || c.id}`} state={{ fromCareersPage: true }} style={{ textDecoration: "none" }}>{CardContent}</Link>
                );
              })}
            </div>
          ) : (
            <div className="rec-empty">
              <div className="rec-empty-icon"><Briefcase size={32} /></div>
              <h3>Không tìm thấy nghề nghiệp</h3>
              <p>Thử tìm với từ khóa khác.</p>
              <button
                className="rec-empty-link"
                onClick={() => { setQ(""); }}
                style={{ border: "none", cursor: "pointer" }}
              >
                Xoá tìm kiếm
              </button>
            </div>
          )}

          {/* Refresh button instead of pagination */}
          {
            !careerLoading && items.length > 0 && !q.trim() && (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <button
                  onClick={() => fetchCareers()}
                  style={{
                    padding: "0.75rem 2rem",
                    background: "var(--neu-bg)",
                    boxShadow: "var(--neu-raised)",
                    border: "none",
                    borderRadius: 14,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "var(--neu-accent)",
                    transition: "all 0.2s",
                  }}
                >
                  🔄 Xem nghề khác
                </button>
              </div>
            )
          }

        </div >
      </div >
    </MainLayout >
  );
};

/* ── inline style helpers ── */
const arrowBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--neu-bg)",
  boxShadow: "3px 3px 8px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light)",
  color: "var(--neu-text-muted)",
};

export default RecommendationsPage;
