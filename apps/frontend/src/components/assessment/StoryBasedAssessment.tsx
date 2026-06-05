import React, { useRef, forwardRef, useState, useEffect, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useTranslation } from 'react-i18next';
import './StoryBasedAssessment.css';
import { Question, QuestionResponse } from '../../types/assessment';
import { assessmentService } from '../../services/assessmentService';

// ─── Types (defined early so cache helpers can reference them) ────────────────
interface StoryScenarioType {
  emoji: string;
  title: string;
  context: string;
  situation: string;
}

interface GroupScenarioType {
  emoji: string;
  title: string;
  introduction: string;
}

interface StoryGroupType {
  groupScenario: GroupScenarioType;
  questionScenarios: StoryScenarioType[];
}

// ─── localStorage keys ────────────────────────────────────────────────────────
const CACHE_KEY    = 'story_assessment_cache_v2';
const PROGRESS_KEY = 'story_assessment_progress_v2';
const CACHE_TTL    = 24 * 60 * 60 * 1000; // 24h

// ─── Question/scenario cache ──────────────────────────────────────────────────
interface AssessmentCache {
  questions: Question[];
  scenarios: StoryScenarioType[];
  storyGroups: StoryGroupType[];
  essayPrompt: string;
  timestamp: number;
}

function saveToCache(data: Omit<AssessmentCache, 'timestamp'>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, timestamp: Date.now() })); } catch { /* noop */ }
}

function loadFromCache(): AssessmentCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: AssessmentCache = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    if (!cached.questions?.length || !cached.scenarios?.length) return null;
    return cached;
  } catch { return null; }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}

// ─── Answer progress auto-save (every 1s) ─────────────────────────────────────
interface AnswerProgress {
  answers: Record<string, number>;
  essayText: string;
  currentPage: number;
  savedAt: number;
}

function saveProgress(data: Omit<AnswerProgress, 'savedAt'>) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch { /* noop */ }
}

function loadProgress(): AnswerProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const p: AnswerProgress = JSON.parse(raw);
    // Discard progress older than 24h
    if (Date.now() - p.savedAt > CACHE_TTL) { localStorage.removeItem(PROGRESS_KEY); return null; }
    if (!p.answers || typeof p.answers !== 'object') return null;
    return p;
  } catch { return null; }
}

function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* noop */ }
}

// ─── Ambient music engine (module-level singleton) ────────────────────────────
let _activeCtx: AudioContext | null = null;
let _activeMaster: GainNode | null = null;
let _activeOscs: OscillatorNode[] = [];
let _musicRunning = false;

function startAmbientMusic() {
  if (_musicRunning) return;
  try {
    stopAmbientMusic(); // clean up stale context first
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    _activeCtx = ctx;

    const master = ctx.createGain();
    _activeMaster = master;
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);
    master.connect(ctx.destination);

    const freqs = [130.81, 196.0, 261.63, 329.63, 392.0];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = i === 0 ? 0.06 : 0.035;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      _activeOscs.push(osc);
    });

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
    _activeOscs.push(lfo);

    _musicRunning = true;
  } catch { /* audio not supported */ }
}

function stopAmbientMusic() {
  _musicRunning = false;

  // ── THE FIX: disconnect master from destination FIRST ──────────────────────
  // This cuts the audio signal path immediately, regardless of LFO modulation.
  // (Setting gain.value=0 alone doesn't work because LFO still adds to it)
  if (_activeMaster) {
    try { _activeMaster.disconnect(); } catch { /* already disconnected */ }
  }

  // Capture refs before clearing
  const ctx    = _activeCtx;
  const oscs   = _activeOscs;
  const master = _activeMaster;

  // Clear module state synchronously
  _activeCtx    = null;
  _activeMaster = null;
  _activeOscs   = [];

  // Async cleanup (audio already silent from disconnect above)
  setTimeout(() => {
    oscs.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch { } });
    master?.disconnect();
    if (ctx && ctx.state !== 'closed') {
      ctx.suspend().catch(() => {});
      setTimeout(() => ctx.close().catch(() => {}), 200);
    }
  }, 50);
}

// ── Global safety net — fires before React gets a chance to handle anything ───
if (typeof window !== 'undefined') {
  window.addEventListener('popstate',         stopAmbientMusic, true); // capture phase
  window.addEventListener('pagehide',         stopAmbientMusic, true);
  window.addEventListener('beforeunload',     stopAmbientMusic, true);
  window.addEventListener('hashchange',       stopAmbientMusic, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopAmbientMusic();
  });
}

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

// ─── EssayPageContent (chỉ hiển thị header trong flipbook) ──────────────────
// Textarea thực sự được render bên ngoài flipbook như overlay
const EssayPageContent = ({
  questions,
  essayPrompt,
  essayText,
  onOpenOverlay,
}: {
  questions: Question[];
  essayPrompt: string;
  essayText: string;
  onOpenOverlay: () => void;
}) => {
  const wordCount = essayText.trim() === '' ? 0 : essayText.trim().split(/\s+/).length;
  const isGoodLength = wordCount >= 50;

  return (
    <div
      className="scenario-content essay-page-content"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}
    >
      {/* Header */}
      <div className="scenario-header" style={{ marginBottom: '0.75rem' }}>
        <span className="scenario-number">
          Câu {questions.length + 1} / {questions.length + 1}
        </span>
        <div className="label-badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)', color: 'white' }}>
          <span className="label-emoji">✍️</span>
          <span className="label-name">Câu Chuyện Cá Nhân</span>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
          Chia Sẻ Câu Chuyện Của Bạn
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
          {essayPrompt || 'Hãy chia sẻ về bản thân, sở thích, điểm mạnh và nghề nghiệp bạn quan tâm (50–300 từ).'}
        </p>
      </div>

      {/* Preview text nếu đã có, hoặc nút mở overlay */}
      <div
        onClick={onOpenOverlay}
        style={{
          flex: 1,
          background: essayText ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
          borderRadius: '12px',
          border: essayText ? '2px solid rgba(255,255,255,0.8)' : '2px dashed rgba(255,255,255,0.4)',
          padding: '1rem',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.2s',
        }}
      >
        {essayText ? (
          <p className="essay-preview-text" style={{ margin: 0, fontSize: '0.9rem', color: '#1a202c', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {essayText.slice(0, 200)}{essayText.length > 200 ? '...' : ''}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nhấn để viết câu chuyện</span>
            <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>hoặc dùng mic để nói tiếng Việt</span>
          </div>
        )}
        {/* Mic icon nhỏ góc phải */}
        <div style={{
          position: 'absolute', bottom: '0.6rem', right: '0.6rem',
          width: '1.8rem', height: '1.8rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 9a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V23h-2v-2.06A9 9 0 0 1 3 12h2z" />
          </svg>
        </div>
      </div>

      {/* Đếm từ */}
      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{ color: isGoodLength ? '#4ade80' : 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
          {wordCount} từ {isGoodLength ? '✓' : `(cần thêm ${Math.max(0, 50 - wordCount)} từ)`}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{essayText.length} ký tự</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────


const StoryBasedAssessment = ({ onComplete }: StoryBasedAssessmentProps) => {
  const { t } = useTranslation();
  const bookRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Music is managed at module level — no ref needed
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
  const [isFlipping, setIsFlipping] = useState(false);
  const [showEssayOverlay, setShowEssayOverlay] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [cacheToast, setCacheToast] = useState('');
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [restoredProgress, setRestoredProgress] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // STT state cho overlay
  const [sttActive, setSttActive] = useState(false);
  const [sttError, setSttError] = useState('');
  const sttRecognitionRef = useRef<any>(null);

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

  // ── Voice recording state (dùng để submit audio nếu có) ─────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceStatus] = useState<'idle' | 'recording' | 'done' | 'error'>('idle');
  // ─────────────────────────────────────────────────────────────────

  // ── STT functions cho essay overlay ──────────────────────────────
  const startSTT = () => {
    setSttError('');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSttError('Trình duyệt không hỗ trợ. Dùng Chrome.'); return; }
    const rec = new SR();
    sttRecognitionRef.current = rec;
    rec.lang = 'vi-VN';
    rec.continuous = true;
    rec.interimResults = true;
    let final = essayText;
    rec.onstart = () => setSttActive(true);
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const c = t.trim();
          if (c) final = final ? final.trimEnd() + ' ' + c.charAt(0).toUpperCase() + c.slice(1) : c.charAt(0).toUpperCase() + c.slice(1);
        } else interim += t;
      }
      setEssayText(final + (interim ? ' ' + interim : ''));
    };
    rec.onerror = (e: any) => {
      setSttError(e.error === 'not-allowed' ? 'Cần cấp quyền microphone.' : 'Lỗi: ' + e.error);
      setSttActive(false);
    };
    rec.onend = () => { setSttActive(false); setEssayText(final); };
    rec.start();
  };
  const stopSTT = () => { sttRecognitionRef.current?.stop(); setSttActive(false); };
  // ─────────────────────────────────────────────────────────────────

  // Build translated response options
  const responseOptions = [
    { value: 1, label: t('assessment.response.notMe'), color: '#e74c3c' },
    { value: 2, label: t('assessment.response.rarely'), color: '#e67e22' },
    { value: 3, label: t('assessment.response.sometimes'), color: '#f39c12' },
    { value: 4, label: t('assessment.response.often'), color: '#27ae60' },
    { value: 5, label: t('assessment.response.totallyMe'), color: '#2ecc71' },
  ];

  // Start/stop music (module-level — survives component re-renders)
  const startMusic = useCallback(() => { startAmbientMusic(); }, []);
  const stopMusic  = useCallback(() => { stopAmbientMusic();  }, []);

  // Stop music on unmount — DO NOT clear cache/progress here
  // (clearCache + clearProgress are only called on intentional exit/submit,
  //  so page reload preserves questions & answers for seamless resume)
  useEffect(() => {
    return () => { stopAmbientMusic(); };
  }, []);

  // Intercept browser back button → reload to kill AudioContext
  useEffect(() => {
    const onPop = () => {
      stopAmbientMusic();
      window.location.reload();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Auto-save answers + essay + page every 1 second ──────────────────────────
  useEffect(() => {
    if (loading || questions.length === 0) return; // don't save while loading
    const id = setInterval(() => {
      saveProgress({ answers, essayText, currentPage });
      setLastSavedAt(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, [loading, answers, essayText, currentPage, questions.length]);

  // ── Restore progress once questions are loaded ────────────────────────────────
  useEffect(() => {
    if (loading || questions.length === 0 || restoredProgress) return;
    const saved = loadProgress();
    if (saved && Object.keys(saved.answers).length > 0) {
      setAnswers(saved.answers);
      setEssayText(saved.essayText || '');
      // Restore page position after flipbook mounts
      if (saved.currentPage > 0) {
        setTimeout(() => {
          bookRef.current?.pageFlip().flip(saved.currentPage);
        }, 600);
      }
      setRestoredProgress(true);
      showToast(`↩️ Đã khôi phục tiến trình: ${Object.keys(saved.answers).length} câu đã trả lời`);
    } else {
      setRestoredProgress(true); // mark so we don't check again
    }
  }, [loading, questions.length, restoredProgress]);

  // Show cache toast briefly
  const showToast = (msg: string) => {
    setCacheToast(msg);
    setTimeout(() => setCacheToast(''), 4000);
  };

  // Load questions and generate stories from API (or cache)
  useEffect(() => {
    const loadQuestionsAndStories = async () => {
      // ── Try cache first ──────────────────────────────────────────
      const cached = loadFromCache();
      if (cached) {
        setQuestions(cached.questions);
        setScenarios(cached.scenarios as StoryScenario[]);
        setStoryGroups(cached.storyGroups as StoryGroup[]);
        setEssayPrompt(cached.essayPrompt);
        setLoadedFromCache(true);
        setLoading(false);
        startMusic();
        return;
      }

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

        // Add essay as scenario 34
        const essayScenario: StoryScenario = {
          emoji: '',
          title: 'Chia Sẻ Câu Chuyện Của Bạn',
          context: 'Đây là cơ hội để bạn chia sẻ sâu hơn về bản thân, ước mơ và định hướng nghề nghiệp của mình.',
          situation: 'Hãy viết một đoạn văn ngắn (100-300 từ) về bản thân bạn, sở thích, điểm mạnh và nghề nghiệp mà bạn quan tâm.'
        };

        const allScenarios = [...generatedScenarios, essayScenario];
        setScenarios(allScenarios);

        console.log(` Story groups: ${groups.length}, scenarios: ${allScenarios.length}`);

        if (generatedScenarios.length < selected.length) {
          console.warn(` Missing ${selected.length - generatedScenarios.length} scenarios!`);
        }

        // ── Save to cache ──────────────────────────────────────────
        const promptText = await assessmentService.getEssayPrompt('vi').then(p => p.prompt_text).catch(() => '');
        setEssayPrompt(promptText);
        saveToCache({ questions: selected, scenarios: allScenarios as StoryScenarioType[], storyGroups: groups as StoryGroupType[], essayPrompt: promptText });

        setLoadingMessage(t('assessment.startAssessment'));
        setError(null);
        startMusic();
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Không thể tải câu hỏi. Vui lòng thử lại.');
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };

    loadQuestionsAndStories();
  }, [startMusic]);

  // Disable flipbook keyboard events when editing essay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Luôn block keyboard events của flipbook khi đang ở trang essay
      // Kiểm tra target có phải textarea không
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || isEditingEssay) {
        e.stopPropagation();
        // KHÔNG preventDefault để textarea vẫn nhận ký tự
      }
    };

    // Luôn add listener, không chỉ khi isEditingEssay
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyDown, true);
    };
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
    setIsFlipping(false); // lật xong, mở khóa nav

    // Check if we're on essay page (page index = 3 + questions.length)
    const essayPageIndex = 3 + questions.length;
    void essayPageIndex; // không dùng overlay nữa

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
            setIsFlipping(true);
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
              setIsFlipping(true);
              bookRef.current?.pageFlip().flipNext();
            }, 600);
          }
        }
      }

      return newAnswers;
    });
  };

  const doNavigate = () => {
    stopAmbientMusic();
    // Reload page to fully destroy AudioContext — guaranteed music stop
    window.location.reload();
  };

  /** Thoát không lưu — xóa hết, lần sau câu hỏi mới */
  const handleExitNoSave = () => {
    clearProgress();
    clearCache();
    doNavigate();
  };

  /** Thoát có lưu — giữ câu hỏi & câu trả lời, lần sau resume */
  const handleExitSave = () => {
    // progress đã được auto-save mỗi 1s, cache đã có → không cần làm gì thêm
    doNavigate();
  };

  // Keep handleExit as alias for submit flow
  const handleExit = handleExitNoSave;

  const handleSubmit = () => {
    stopMusic();
    clearProgress(); // xóa tiến trình đã lưu
    clearCache();    // xóa cache câu hỏi → lần sau sẽ tạo câu hỏi mới
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

  // ── Voice recording functions (không dùng trong UI, giữ để submit audio) ──
  // ─────────────────────────────────────────────────────────────────

  const canGoNext = () => {
    // Khóa khi sách đang lật
    if (isFlipping) return false;

    if (currentPage < 3) return true; // Cover, intro, story intro
    if (currentPage >= totalPages - 2) return true; // Ending and back cover

    const questionIndex = currentPage - 3;
    if (questionIndex < 0 || questionIndex >= questions.length) return true;

    // Trang đầu tiên: chỉ có câu 0 (index 0) — phải trả lời câu 0
    if (questionIndex === 0) {
      return answers[String(questions[0].id)] !== undefined;
    }

    // Các trang sau: mỗi trang có 2 câu theo cặp
    // Câu index 1,2 → trang 1; câu 3,4 → trang 2; ...
    // questionIndex = 1 → pair [1,2]; questionIndex = 2 → pair [1,2]; ...
    // Tính cặp: pairIndex = Math.floor((questionIndex - 1) / 2)
    // Cặp đó gồm câu: pairStart = pairIndex*2 + 1, pairStart+1
    const pairIndex = Math.floor((questionIndex - 1) / 2);
    const pairStart = pairIndex * 2 + 1;
    const pairEnd = Math.min(pairStart + 1, questions.length - 1);

    // Phải trả lời TẤT CẢ câu trong cặp hiện tại
    for (let i = pairStart; i <= pairEnd; i++) {
      if (answers[String(questions[i].id)] === undefined) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (isFlipping) return; // khóa khi đang lật

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
      setIsFlipping(true); // khóa nav trong khi lật
      bookRef.current?.pageFlip().flipNext();
    } else {
      alert('Vui lòng trả lời tất cả câu hỏi trên trang này trước khi tiếp tục.');
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

      {/* ── Cache toast notification ── */}
      {cacheToast && (
        <div style={{
          position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, background: 'linear-gradient(135deg,#1a237e,#0d9488)',
          color: 'white', padding: '0.75rem 1.5rem', borderRadius: '50px',
          fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'fadeInDown 0.3s ease',
        }}>
          {cacheToast}
        </div>
      )}

      {/* ── Auto-save badge (bottom-left) ── */}
      <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {!loading && questions.length > 0 && lastSavedAt && (
          <div style={{
            background: 'rgba(30,41,59,0.75)', backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.85)', padding: '0.4rem 0.9rem', borderRadius: '50px',
            fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />
            Tự lưu · {Object.keys(answers).length}/{questions.length} câu
          </div>
        )}
      </div>

      {/* ── Exit button ── */}
      {!loading && (
        <button
          onClick={() => setShowExitConfirm(true)}
          style={{
            position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            color: 'white', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '50px', padding: '0.45rem 1.1rem',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
        >
          <span>✕</span> Thoát
        </button>
      )}

      {/* ── Exit confirm dialog ── */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '2rem',
            maxWidth: '400px', width: '100%', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            position: 'relative',
          }}>
            {/* ── Nút X đóng ── */}
            <button
              onClick={() => setShowExitConfirm(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: '#64748b', fontWeight: 700,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
              title="Đóng"
            >✕</button>

            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: '#1a237e' }}>
              Thoát khỏi bài đánh giá?
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
              Chọn cách bạn muốn thoát:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Thoát không lưu */}
              <button
                onClick={() => { setShowExitConfirm(false); handleExitNoSave(); }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  border: 'none', borderRadius: '12px', fontWeight: 700,
                  fontSize: '0.9rem', cursor: 'pointer', color: 'white',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <span>🗑</span> Thoát không lưu
              </button>
              <p style={{ margin: '-0.3rem 0 0.3rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Câu hỏi &amp; câu trả lời sẽ bị xóa. Lần sau bắt đầu mới.
              </p>

              {/* Thoát có lưu */}
              <button
                onClick={() => { setShowExitConfirm(false); handleExitSave(); }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg,#1a237e,#0d9488)',
                  border: 'none', borderRadius: '12px', fontWeight: 700,
                  fontSize: '0.9rem', cursor: 'pointer', color: 'white',
                  boxShadow: '0 4px 12px rgba(26,35,126,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <span>💾</span> Thoát &amp; Lưu tiến trình
              </button>
              <p style={{ margin: '-0.3rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Câu trả lời được lưu. Lần sau vào tiếp tục từ chỗ dang dở.
              </p>
            </div>
          </div>
        </div>
      )}

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
          <span className="progress-text">Tiến Độ: {Math.round(storyProgress)}%</span>
        </div>
      )}

      {/* Navigation - Left Side (Previous Button) */}
      <div className="navigation">
        {!isBookClosed && (() => {
          const isOnEndingPage = currentPage === 3 + questions.length + 1;
          // Ẩn nút Trước khi ở trang ending
          if (isOnEndingPage) return null;
          return (
            <button
              className="nav-btn prev-btn"
              onClick={() => {
                if (!isFlipping) {
                  setIsFlipping(true);
                  bookRef.current?.pageFlip().flipPrev();
                }
              }}
              disabled={currentPage === 0 || isFlipping}
            >
              <span>←</span>
              <span>Trước</span>
            </button>
          );
        })()}
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
          swipeDistance={120}
          clickEventForward={false}
          onFlip={handleFlip}
          onChangeState={(e: any) => {
            // 'flipping' state → khóa nav; 'read' state → mở khóa
            if (e.data === 'flipping') setIsFlipping(true);
            else setIsFlipping(false);
          }}
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
                Bạn sắp bắt đầu hành trình khám phá bản thân.
                Thay vì những câu hỏi nhàm chán, bạn sẽ trải nghiệm các tình huống thực tế.
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
                Không có câu trả lời đúng hay sai. Hãy là chính mình!
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
                  {/* ── Scrollable body (header + context + situation) ── */}
                  <div
                    className="scenario-body"
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      touchAction: 'pan-y',
                      WebkitOverflowScrolling: 'touch' as any,
                      padding: '1rem 1rem 0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div className="scenario-header">
                      <span className="scenario-number">Câu {index + 1} / {questions.length}</span>
                      {groupScenario && (
                        <div className="label-badge" style={{ backgroundColor: 'rgba(26,35,126,0.15)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                          <span className="label-emoji">{groupScenario.emoji}</span>
                          <span className="label-name">{groupScenario.title}</span>
                        </div>
                      )}
                    </div>

                    {isFirstInGroup && groupScenario && (
                      <div className="label-intro" style={{ borderLeftColor: 'var(--color-primary)' }}>
                        <h3 style={{ color: 'var(--color-primary)' }}>
                          {groupScenario.emoji} {groupScenario.title}
                        </h3>
                        <p className="label-description">{groupScenario.introduction}</p>
                      </div>
                    )}

                    <div className="scenario-context">
                      <p className="context-text">{scenario.context}</p>
                    </div>

                    <div className="scenario-situation">
                      <div className="situation-box">
                        <p className="situation-text">{scenario.situation}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Fixed bottom: response buttons always visible ── */}
                  <div
                    style={{
                      flexShrink: 0,
                      padding: '0.75rem 1rem',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, white 18%)',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <div className="response-options" style={{ marginTop: 0 }}>
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
                      <div className="continue-hint" style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
                        {(() => {
                          if (index === 0) return '✓ Đã ghi nhận! Nhấn Tiếp để tiếp tục';
                          const pairIdx = Math.floor((index - 1) / 2);
                          const pairStart = pairIdx * 2 + 1;
                          const pairEnd = Math.min(pairStart + 1, questions.length - 1);
                          const pairDone = Array.from({ length: pairEnd - pairStart + 1 }, (_, k) => pairStart + k)
                            .every(i => answers[String(questions[i]?.id)] !== undefined);
                          if (pairDone) return '✓ Cả hai câu đã trả lời! Nhấn Tiếp để tiếp tục';
                          return '✓ Đã ghi nhận! Hãy trả lời câu còn lại';
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </Page>
            );
          })}

          {/* Essay Page - Câu hỏi tự luận */}
          <Page className="essay-page">
            <EssayPageContent
              questions={questions}
              essayPrompt={essayPrompt}
              essayText={essayText}
              onOpenOverlay={() => setShowEssayOverlay(true)}
            />
          </Page>

          {/* Kết thúc */}
          <Page className="ending-page">
            <div className="ending-content">
              <h2>Hoàn Thành Đánh Giá!</h2>
              <p className="ending-text">
                Bạn đã trả lời {questions.length} câu hỏi và khám phá thêm về bản thân mình.
              </p>
              <div className="ending-stats">
                <div className="stat">
                  <span className="stat-text">{Object.keys(answers).length} / {questions.length} Câu Đã Hoàn Thành</span>
                </div>
                <div className="stat">
                  <span className="stat-text">Kết Quả Nghề Nghiệp Sẵn Sàng</span>
                </div>
              </div>
            </div>
          </Page>

          {/* Bìa sau */}
          <Page className="story-cover back-cover">
            <div className="back-cover-content">
              <p className="back-quote">"Hành trình ngàn dặm bắt đầu từ một bước chân"</p>
              <p className="back-author">— Lão Tử</p>
            </div>
          </Page>
        </HTMLFlipBook>
      </div>

      {/* Navigation - Right Side (Next/Submit Button) */}
      <div className="navigation">
        {isBookClosed ? (
          <button className="nav-btn submit-nav-btn" onClick={handleSubmit}>
            <span>Xem Kết Quả</span>
          </button>
        ) : (
          <>
            {(() => {
              const questionIndex = currentPage - 3;
              const isLastQuestion = questionIndex === questions.length - 1;
              const allAnswered = Object.keys(answers).length === questions.length;
              const isOnQuestionPage = questionIndex >= 0 && questionIndex < questions.length;
              const isOnEssayPage = currentPage === 3 + questions.length;
              const isOnEndingPage = currentPage === 3 + questions.length + 1;

              // Trang essay hoặc ending → submit (ending luôn hiển thị song song bên phải)
              if (isOnEssayPage || isOnEndingPage) {
                return (
                  <button
                    className="nav-btn submit-nav-btn"
                    onClick={handleSubmit}
                    disabled={isFlipping}
                    style={{ fontSize: '1rem', padding: '1.25rem 1.75rem', animation: 'pulse-submit 2s ease-in-out infinite' }}
                  >
                    <span>Nộp Bài & Xem Kết Quả</span>
                  </button>
                );
              }

              // Câu hỏi cuối + đã trả lời hết: nút Nộp Bài
              if (isOnQuestionPage && isLastQuestion && allAnswered) {
                return (
                  <button
                    className="nav-btn submit-nav-btn"
                    onClick={handleSubmit}
                    disabled={isFlipping}
                  >
                    <span>Nộp Bài</span>
                  </button>
                );
              }

              // Mặc định: nút Tiếp
              return (
                <button
                  className="nav-btn next-btn"
                  onClick={handleNext}
                  disabled={!canGoNext() || isFlipping}
                >
                  <span>Tiếp</span>
                  <span>→</span>
                </button>
              );
            })()}
          </>
        )}
      </div>

      {/* ── Essay Overlay: textarea + mic, render NGOÀI flipbook ── */}
      {showEssayOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEssayOverlay(false); }}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            {/* Header overlay */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#1a237e' }}>
                  ✍️ Chia Sẻ Câu Chuyện Của Bạn
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                  {essayPrompt || 'Hãy chia sẻ về bản thân, sở thích, điểm mạnh và nghề nghiệp bạn quan tâm.'}
                </p>
              </div>
              <button
                onClick={() => setShowEssayOverlay(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.4rem', lineHeight: 1, padding: '0 0 0 0.5rem', flexShrink: 0 }}
              >×</button>
            </div>

            {/* Textarea + mic */}
            <div style={{ position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={essayText}
                onChange={(e) => setEssayText(e.target.value)}
                onFocus={() => setIsEditingEssay(true)}
                onBlur={() => setIsEditingEssay(false)}
                autoFocus
                placeholder="Bắt đầu viết hoặc nhấn mic để nói bằng tiếng Việt..."
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.9rem 3.2rem 0.9rem 0.9rem',
                  border: sttActive ? '2px solid #0d9488' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  lineHeight: 1.65,
                  resize: 'vertical',
                  background: sttActive ? '#f0fdf9' : '#f8fafc',
                  color: '#1a202c',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              {/* Nút mic */}
              <button
                onClick={() => sttActive ? stopSTT() : startSTT()}
                title={sttActive ? 'Dừng nhận dạng' : 'Nhận dạng giọng nói tiếng Việt'}
                style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.6rem',
                  width: '2.2rem',
                  height: '2.2rem',
                  borderRadius: '50%',
                  border: 'none',
                  background: sttActive
                    ? 'linear-gradient(135deg,#0d9488,#0f766e)'
                    : 'linear-gradient(135deg,#667eea,#764ba2)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: sttActive ? '0 0 0 3px rgba(13,148,136,0.3)' : '0 2px 8px rgba(102,126,234,0.4)',
                  flexShrink: 0,
                }}
              >
                {sttActive ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 9a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V23h-2v-2.06A9 9 0 0 1 3 12h2z"/></svg>
                )}
              </button>
            </div>

            {/* STT status */}
            {sttActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0d9488', fontSize: '0.82rem', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0d9488', display: 'inline-block', animation: 'pulse-stt 1s infinite' }} />
                Đang nghe... Hãy nói tiếng Việt
              </div>
            )}
            {sttError && (
              <div style={{ color: '#e74c3c', fontSize: '0.82rem' }}>⚠ {sttError}</div>
            )}

            {/* Footer: đếm từ + nút Lưu */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '0.82rem', fontWeight: 600,
                color: (() => { const wc = essayText.trim() === '' ? 0 : essayText.trim().split(/\s+/).length; return wc >= 50 ? '#0d9488' : '#94a3b8'; })(),
              }}>
                {(() => { const wc = essayText.trim() === '' ? 0 : essayText.trim().split(/\s+/).length; return wc >= 50 ? `${wc} từ ✓` : `${wc} từ (cần thêm ${50 - wc} từ)`; })()}
              </span>
              <button
                onClick={() => setShowEssayOverlay(false)}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'linear-gradient(135deg,#1a237e,#0d9488)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Lưu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-stt {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(1.3); }
        }
        @keyframes fadeInDown {
          from { opacity:0; transform:translateX(-50%) translateY(-12px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes pulse-submit {
          0%,100% { box-shadow: 0 4px 20px rgba(99,102,241,0.4); transform: scale(1); }
          50%      { box-shadow: 0 8px 32px rgba(99,102,241,0.7); transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
};

export default StoryBasedAssessment;
