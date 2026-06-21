import { useEffect, useRef, useState } from 'react';
import { Map, Clock, RotateCcw } from 'lucide-react';
import { streamLearningPlan } from '../../services/sseService';
import LearningPlan from './LearningPlan';
import { LearningPlan as LearningPlanType } from '../../types/skillGap';

interface Props {
  analysisId: number;
  careerId: string;
  autoStart?: boolean;
}

const StreamingLearningPlan: React.FC<Props> = ({ analysisId, careerId, autoStart = false }) => {
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [streamedText, setStreamedText] = useState('');
  const [plan, setPlan] = useState<LearningPlanType | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const ctrlRef = useRef<AbortController | null>(null);

  const startStream = () => {
    if (status === 'streaming') return;
    setStatus('streaming');
    setStreamedText('');
    setPlan(null);
    setErrorMsg('');

    ctrlRef.current = streamLearningPlan(analysisId, {
      onStart: () => setStreamedText(''),
      onChunk: (text) => setStreamedText(prev => prev + text),
      onDone: (data) => {
        setStatus('done');
        if (data.plan) setPlan(data.plan as LearningPlanType);
      },
      onError: (msg) => { setStatus('error'); setErrorMsg(msg); },
    });
  };

  useEffect(() => {
    if (autoStart) startStream();
    return () => ctrlRef.current?.abort();
  }, [analysisId]);

  /* ── Render ── */

  if (status === 'idle') {
    return (
      <div style={{ background: 'var(--neu-bg-card)', borderRadius: 16, padding: '1.5rem 2rem', boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--neu-border, #e5e7eb)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neu-text)', marginBottom: '0.2rem' }}><Map size={15} className="inline mr-1.5" />Lộ trình học tập AI</div>
          <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Lộ trình cá nhân hóa dựa trên kỹ năng còn thiếu của bạn</div>
        </div>
        <button onClick={startStream} style={{ padding: '0.6rem 1.4rem', background: 'var(--neu-accent)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={14} />
          Tạo lộ trình học tập
        </button>
      </div>
    );
  }

  if (status === 'streaming') {
    return (
      <div style={{ background: 'var(--neu-bg-card)', borderRadius: 16, padding: '1.5rem 2rem', boxShadow: 'var(--neu-raised-sm)', border: '1px solid var(--neu-border, #e5e7eb)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neu-accent)', animation: 'pulse 1s infinite' }} />
          <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`}</style>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--neu-accent)' }}>AI đang tạo lộ trình...</span>
          <button onClick={() => { ctrlRef.current?.abort(); setStatus('idle'); }}
            style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
            Dừng
          </button>
        </div>
        {/* Streaming text preview */}
        <div style={{ background: 'var(--neu-bg, #f9fafb)', borderRadius: 10, padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--neu-text-muted, #6b7280)', maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {streamedText || <span style={{ opacity: 0.5 }}>Đang tạo...</span>}
          <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--neu-accent)', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} />
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ background: '#fef2f2', borderRadius: 16, padding: '1.5rem 2rem', border: '1px solid #fecaca' }}>
        <div style={{ color: '#dc2626', fontWeight: 700, marginBottom: '0.5rem' }}> Tạo lộ trình thất bại</div>
        <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>{errorMsg}</div>
        <button onClick={startStream} style={{ padding: '0.5rem 1.25rem', background: 'var(--neu-accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          Thử lại
        </button>
      </div>
    );
  }

  // done — show plan
  if (plan) {
    return <LearningPlan plan={plan} careerName={careerId} />;
  }

  // done but couldn't parse
  return (
    <div style={{ background: 'var(--neu-bg-card)', borderRadius: 16, padding: '1.5rem 2rem', boxShadow: 'var(--neu-raised-sm)' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}> Lộ trình học tập</div>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: 'var(--neu-text-muted)', fontFamily: 'monospace', maxHeight: 400, overflowY: 'auto' }}>
        {streamedText}
      </pre>
      <button onClick={startStream} style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: 'var(--neu-accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
        Tạo lại
      </button>
    </div>
  );
};

export default StreamingLearningPlan;
