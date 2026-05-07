// apps/frontend/src/pages/RecommendationsPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ThumbsUp, ThumbsDown, ChevronRight, ChevronLeft, Lock, Briefcase, ArrowRight } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");

  const recItems = recData?.items ?? [];
  const requestId = recData?.request_id ?? null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
                title_vi: c.title_vi,
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

  /* fetch career browse */
  const fetchCareers = useCallback(async () => {
    setCareerLoading(true);
    try {
      const resp = await careerService.list({ page, pageSize, ...(q.trim() && { q: q.trim() }) });
      setItems(resp.items);
      setTotal(resp.total);
    } catch { /* ignore */ } finally {
      setCareerLoading(false);
    }
  }, [page, pageSize, q]);

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
                Khám phá nghề nghiệp <span className="hero-highlight">phù hợp với bạn</span>
              </h1>
              <p className="hero-sub">
                Hoàn thành bài đánh giá để nhận gợi ý nghề nghiệp cá nhân hóa dựa trên kỹ năng, sở thích và mục tiêu của bạn.
              </p>
              <div className="hero-actions">
                <Link to="/assessment" className="hero-btn-primary">
                  Bắt đầu đánh giá →
                </Link>
                <span className="hero-btn-secondary">
                  Tìm hiểu thêm
                </span>
              </div>
            </div>
            <div className="rec-hero-right">
              <div className="hero-visual-wrapper">
                <div className="hero-visual-glow"></div>
                <div className="hero-visual">
                  <div className="floating-card main">
                    <div className="icon-wrapper">
                      <Briefcase size={40} />
                      <div className="sparkle">✦</div>
                    </div>
                  </div>
                  <div className="floating-card small chart">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="20" x2="12" y2="10" />
                      <line x1="18" y1="20" x2="18" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="16" />
                    </svg>
                  </div>
                  <div className="floating-card small user">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="floating-card small clock">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="floating-card small pie">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                      <path d="M22 12A10 10 0 0 0 12 2v10z" />
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
                const title = it.title_en || it.title_vi || it.career_id || "Unknown";
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
                  onChange={(e) => { setPage(1); setQ(e.target.value); }}
                  placeholder="Tìm theo tên nghề, ngành, từ khóa..."
                  style={{
                    flex: 1, border: "none", outline: "none", background: "transparent",
                    fontSize: "0.9rem", color: "var(--neu-text)", fontFamily: "inherit",
                  }}
                />
                {q && (
                  <button onClick={() => { setQ(""); setPage(1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--neu-text-muted)", padding: 2, display: "flex", alignItems: "center" }}>
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
                const gradientClass = `gradient-${index % 6}`;

                const CardContent = (
                  <div className={`career-card${isLocked ? " locked" : ""}`}>
                    {/* Blur overlay for locked cards */}
                    {isLocked && <div className="card-blur-overlay" />}

                    {/* Premium badge for locked cards */}
                    {isLocked && (
                      <div className="premium-badge">
                        <Lock size={12} />
                        <span>{requiredPlanInfo?.name || "Basic"}</span>
                      </div>
                    )}

                    {/* Card top — gradient banner */}
                    <div className={`card-top ${gradientClass}`}>
                      {isLocked ? (
                        <div className="overlay-lock">
                          <Lock size={24} />
                        </div>
                      ) : (
                        <div className="icon-container">
                          <Briefcase size={22} />
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="card-body">
                      <h3 className="card-title">
                        {c.title}
                      </h3>
                      <p className="card-desc">
                        {isLocked
                          ? "You have used all free career views. Upgrade to Basic Plan (99k) to view more careers or Premium Plan (199k) for unlimited access."
                          : (c.short_desc || c.description || "Khám phá lộ trình nghề nghiệp này.")}
                      </p>

                      <div className="card-bottom">
                        <span style={{
                          color: isLocked ? '#9ca3af' : undefined,
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {isLocked ? "LOCKED" : "Full Time"}
                        </span>
                        <span className={isLocked ? "upgrade-link" : "view-career-btn"} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isLocked ? (
                            <>
                              <span>Upgrade</span>
                              <Lock size={14} />
                            </>
                          ) : (
                            "Chi tiết →"
                          )}
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
                onClick={() => { setQ(""); setPage(1); }}
                style={{ border: "none", cursor: "pointer" }}
              >
                Xoá tìm kiếm
              </button>
            </div>
          )}

          {/* Pagination */}
          {
            !careerLoading && total > pageSize && (
              <div className="pagination-container">
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="pagination-info">
                  {page} / {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  <ChevronRight size={18} />
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
