import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getAccessToken } from '../../utils/auth';

interface VoiceAssessmentComponentProps {
  assessmentId: string;
  onComplete: () => void;
  onSkip: () => void;
}

type RecordingState = 'idle' | 'recording' | 'ready' | 'submitting' | 'done' | 'error';

const MIN_DURATION_SEC = 10;
const MAX_DURATION_SEC = 120;
const WAVEFORM_BARS = 32;

const VoiceAssessmentComponent = ({
  assessmentId,
  onComplete,
  onSkip,
}: VoiceAssessmentComponentProps) => {
  const { t } = useTranslation();

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(WAVEFORM_BARS).fill(3));
  const [voiceSummary, setVoiceSummary] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  const stopEverything = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      const step = Math.floor(dataArray.length / WAVEFORM_BARS);
      const bars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
        const val = dataArray[i * step] ?? 0;
        return Math.max(3, Math.round((val / 255) * 60));
      });
      setWaveformData(bars);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setDuration(0);
    chunksRef.current = [];
    blobRef.current = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(t('assessment.voice.notSupported'));
      setRecordingState('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio analyser for waveform
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        blobRef.current = blob;
        setRecordingState('ready');
        stopEverything();
        setWaveformData(Array(WAVEFORM_BARS).fill(3));
      };

      recorder.start(250);
      setRecordingState('recording');
      animateWaveform();

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SEC) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: unknown) {
      const isPermissionError =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setErrorMsg(isPermissionError
        ? t('assessment.voice.permissionDenied')
        : t('assessment.voice.notSupported')
      );
      setRecordingState('error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const resetRecording = () => {
    stopEverything();
    blobRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    setWaveformData(Array(WAVEFORM_BARS).fill(3));
    setErrorMsg(null);
    setRecordingState('idle');
  };

  const submitVoice = async () => {
    if (!blobRef.current) return;
    if (duration < MIN_DURATION_SEC) {
      setErrorMsg(t('assessment.voice.minDuration', { min: MIN_DURATION_SEC }));
      return;
    }

    // No assessmentId means voice-only mode — skip API call, go straight to complete
    if (!assessmentId) {
      setRecordingState('done');
      setTimeout(() => onComplete(), 800);
      return;
    }

    setRecordingState('submitting');
    setErrorMsg(null);

    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append('audio', blobRef.current, 'voice.webm');
      formData.append('assessmentId', assessmentId);

      const response = await fetch(`/api/assessments/${assessmentId}/voice`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
          onComplete();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.voice_summary) setVoiceSummary(data.voice_summary);
      setRecordingState('done');
      setTimeout(() => onComplete(), 2000);
    } catch {
      // Voice endpoint is optional — show error but let user skip
      setErrorMsg(t('assessment.voice.submitError'));
      setRecordingState('ready');
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans']">
      <style>{`
        @keyframes modal-pop {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop { animation: modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bar-pulse {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-modal-pop">

        {/* Header */}
        <div className="relative p-8 border-b border-gray-100 dark:border-gray-700">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-bold uppercase tracking-wider mb-3 border border-violet-200 dark:border-violet-800">
                🎙️ {t('assessment.voice.title')}
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed text-sm">
                {t('assessment.voice.subtitle')}
              </p>
            </div>
            <button
              onClick={onSkip}
              disabled={recordingState === 'submitting'}
              className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
            >
              {t('assessment.voice.skip')}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col items-center gap-6">

          {/* Waveform Visualizer */}
          <div className="w-full flex items-center justify-center gap-[2px] h-16 px-4">
            {waveformData.map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  recordingState === 'recording'
                    ? 'bg-gradient-to-t from-violet-600 to-indigo-400'
                    : recordingState === 'done'
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className={`text-3xl font-mono font-bold tabular-nums ${
            recordingState === 'recording' ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'
          }`}>
            {formatTime(duration)}
            {recordingState === 'recording' && (
              <span className="ml-3 inline-flex items-center gap-1 text-sm font-sans font-medium text-violet-500">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                {t('assessment.voice.recording')}
              </span>
            )}
          </div>

          {/* Duration info */}
          {recordingState === 'ready' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('assessment.voice.duration', { seconds: duration })}
            </p>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="w-full flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/50">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
          )}

          {/* No endpoint note */}
          {(recordingState === 'idle' || recordingState === 'error') && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 px-4">
              {t('assessment.voice.noEndpointNote')}
            </p>
          )}

          {/* Tip */}
          {recordingState === 'recording' && (
            <p className="text-xs text-center text-violet-600 dark:text-violet-400 px-4 italic">
              💡 {t('assessment.voice.tip')}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 w-full">
            {recordingState === 'idle' || recordingState === 'error' ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 9h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V21h2v2H9v-2h2v-2.08A7 7 0 0 1 5 12z"/>
                </svg>
                {t('assessment.voice.startRecording')}
              </button>
            ) : recordingState === 'recording' ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                {t('assessment.voice.stopRecording')}
              </button>
            ) : recordingState === 'ready' ? (
              <>
                <button
                  onClick={resetRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('assessment.voice.recordAgain')}
                </button>
                <button
                  onClick={submitVoice}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  {t('assessment.voice.submit')}
                </button>
              </>
            ) : recordingState === 'submitting' ? (
              <button disabled className="flex items-center gap-2 px-8 py-3 bg-violet-400 text-white font-bold rounded-2xl cursor-not-allowed opacity-75">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('assessment.voice.submitting')}
              </button>
            ) : recordingState === 'done' ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex items-center gap-2 px-8 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold rounded-2xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('assessment.voice.readyToSubmit')}
                </div>
                {voiceSummary && (
                  <p className="text-sm text-center text-gray-600 dark:text-gray-300 italic px-6 max-w-md">
                    "{voiceSummary}"
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssessmentComponent;
