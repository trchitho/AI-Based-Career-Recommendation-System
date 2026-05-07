import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface EssayModalComponentProps {
  onSubmit: (essayText: string) => void;
  onSkip: () => void;
  loading?: boolean;
  promptTitle?: string;
  promptText?: string;
}

const MIN_CHARS = 100;
const MAX_CHARS = 5000;

const EssayModalComponent = ({
  onSubmit,
  onSkip,
  loading = false,
  promptTitle,
  promptText,
}: EssayModalComponentProps) => {
  const { t } = useTranslation();
  const [essayText, setEssayText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmedLen = essayText.trim().length;
  const rawLen = essayText.length;
  const isValid = trimmedLen >= MIN_CHARS && rawLen <= MAX_CHARS;

  const progressPct = Math.min((trimmedLen / MIN_CHARS) * 100, 100);
  const remaining = MAX_CHARS - rawLen;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return; // hard cap
    setEssayText(val);
    if (error && val.trim().length >= MIN_CHARS) {
      setError(null);
    }
  };

  const handleSubmit = () => {
    const trimmed = essayText.trim();
    if (trimmed.length < MIN_CHARS) {
      setError(t('assessment.essay.minCharsError', { min: MIN_CHARS }));
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans']">

      <style>{`
        @keyframes modal-pop {
            0% { opacity: 0; transform: scale(0.95) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop { animation: modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-modal-pop">

        {/* Header */}
        <div className="relative p-8 md:p-10 border-b border-gray-100 dark:border-gray-700">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-700 to-indigo-600"></div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-200 dark:border-indigo-800">
                {t('assessment.essay.optionalStep')}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                {promptTitle || t('assessment.essay.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {promptText || t('assessment.essay.defaultPrompt')}
              </p>
            </div>

            <button
              onClick={onSkip}
              disabled={loading}
              className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
            >
              {t('assessment.essay.skip')}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 md:p-10 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="relative">
            <textarea
              value={essayText}
              onChange={handleChange}
              rows={10}
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-4 text-base text-gray-900 dark:text-white shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all resize-none placeholder-gray-400 font-medium"
              placeholder={t('assessment.essay.placeholder')}
              disabled={loading}
            />

            {/* Max chars warning */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {remaining <= 500 && (
                <span className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                  remaining <= 100
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {t('assessment.essay.maxCharsWarning', { remaining })}
                </span>
              )}
              <span className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                trimmedLen >= MIN_CHARS
                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {t('assessment.essay.charCount', { count: trimmedLen, min: MIN_CHARS })}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  trimmedLen >= MIN_CHARS ? 'bg-indigo-700' : 'bg-blue-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {trimmedLen < MIN_CHARS && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('assessment.essay.minCharsError', { min: MIN_CHARS })}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/50">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onSkip}
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {t('assessment.essay.skipStep')}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="px-8 py-3 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('assessment.essay.submitting')}</span>
                </>
              ) : (
                <>
                  <span>{t('assessment.essay.submit')}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EssayModalComponent;
