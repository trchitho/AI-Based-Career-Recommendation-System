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
  if (pct >= 75) return { level: "great",     label: "Great" };
  return            { level: "good",           label: "Good" };
};
const CIRC = 2 * Math.PI * 20; // r=20

const GRADIENTS = [
  "from-indigo-700 to-violet-600",
  "from-blue-500 to-indigo-600",
  "from-orange-400 to-pink-500",
  "from-purple-500 to-violet-600",
  "from-violet-500 to-cyan-500",
  "from-rose-400 to-red-500",
];

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const { hasFeature, currentPlan, getPlanInfo } = useFeatureAccess();
  const { canUseFeature } = useUsageTracking();

  /* ── AI recommendations (top strip) ── */
  const [recData, setRecData]     = useState<RecommendationsResponse | null>(null);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError]   = useState<string | null>(null);
  const [feedback, setFeedback]   = useState<Record<string, "up" | "down">>(() => {
    try { return JSON.parse(localStorage.getItem("career_feedback") || "{}"); } catch { return {}; }
  });
  const stripRef = useRef<HTMLDivElement>(null);

  /* ── Career browse (bottom grid) ── */
  const [items, setItems]     = useState<CareerItem[]>([]);
  const [careerLoading, setCareerLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [pageSize]            = useState(9);
  const [total, setTotal]     = useState(0);
  const [q, setQ]             = useState("");

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <span className="rec-hero-badge" style={{ display: "inline-block", marginBottom: "0.4rem" }}>AI-Powered</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--neu-text)", margin: 0 }}>
                Nghề nghiệp gợi ý cho bạn
              </h2>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => scrollStrip(-1)} style={arrowBtnStyle}><ChevronLeft size={16} /></button>
              <button onClick={() => scrollStrip(1)}  style={arrowBtnStyle}><ChevronRight size={16} /></button>
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
              {recError ?? "Hoàn thành bài đánh giá để nhận gợi ý nghề nghiệp cá nhân."}
              {" "}
              <Link to="/assessment" style={{ color: "var(--neu-accent)", fontWeight: 600 }}>Làm ngay →</Link>
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
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--neu-text-muted)", flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
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
                  <button onClick={() => { setQ(""); setPage(1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--neu-text-muted)", padding: 2, display:"flex", alignItems:"center" }}>
                    <ArrowRight size={14} style={{ transform:"rotate(45deg)" }} />
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
                const grad = GRADIENTS[index % GRADIENTS.length];

                const CardContent = (
                  <div className="career-card" style={{ opacity: isLocked ? 0.75 : 1, position: "relative" }}>
                    {/* lock badge */}
                    {isLocked && (
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
                        <span style={{
                          padding: "0.2rem 0.6rem",
                          background: "linear-gradient(to right,#a855f7,ec4899)",
                          color: "#fff", borderRadius: 999,
                          fontSize: "0.68rem", fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                           {requiredPlanInfo?.name || "PRO"}
                        </span>
                      </div>
                    )}

                    {/* Card top — gradient banner */}
                    <div style={{
                      height: 120,
                      background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                      backgroundImage: `linear-gradient(135deg,${grad.includes("green") ? "10b981,14b8a6" : grad.includes("blue") ? "3b82f6,6366f1" : grad.includes("orange") ? "f97316,ec4899" : grad.includes("purple") ? "a855f7,7c3aed" : grad.includes("emerald") ? "34d399,06b6d4" : "fb7185,ef4444"})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                      }}>
                        {isLocked
                          ? <Lock size={22} />
                          : <Briefcase size={22} />
                        }
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="card-body">
                      <h3 className="card-title" style={{ fontSize: "1rem", WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.title}
                      </h3>
                      <p className="card-desc">
                        {isLocked
                          ? "Nâng cấp gói để xem thông tin nghề nghiệp này."
                          : (c.short_desc || c.description || "Khám phá lộ trình nghề nghiệp này.")}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--neu-shadow-dark)" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: isLocked ? "#a78bfa" : "var(--neu-text-muted)", letterSpacing: "0.05em" }}>
                          {isLocked ? "Locked" : "Full Time"}
                        </span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isLocked ? "#a78bfa" : "var(--neu-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                          {isLocked ? "Upgrade →" : "Chi tiết →"}
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
          {!careerLoading && total > pageSize && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginTop: "2rem" }}>
              <button
                style={pgBtnStyle(page <= 1)}
                disabled={page <= 1}
                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--neu-text)", padding: "0.5rem 1.25rem", background: "var(--neu-bg-card)", borderRadius: 999, boxShadow: "var(--neu-raised-sm)" }}>
                {page} / {totalPages}
              </span>
              <button
                style={pgBtnStyle(page >= totalPages)}
                disabled={page >= totalPages}
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
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

const pgBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: 40, height: 40, borderRadius: "50%",
  border: "none", cursor: disabled ? "not-allowed" : "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--neu-bg-card)",
  boxShadow: disabled ? "none" : "var(--neu-raised-sm)",
  color: disabled ? "var(--neu-shadow-dark)" : "var(--neu-text-muted)",
  opacity: disabled ? 0.4 : 1,
});

export default RecommendationsPage;
