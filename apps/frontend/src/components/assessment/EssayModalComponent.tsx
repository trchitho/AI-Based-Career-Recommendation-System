import { useState } from 'react';

interface EssayModalComponentProps {
  onSubmit: (essayText: string) => void;
  onSkip: () => void;
  loading?: boolean;
  promptTitle?: string;
  promptText?: string;
}

const EssayModalComponent = ({
  onSubmit,
  onSkip,
  loading = false,
  promptTitle,
  promptText,
}: EssayModalComponentProps) => {
  const [essayText, setEssayText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Giữ bài viết nhẹ nhàng; backend chấp nhận mọi nội dung không rỗng
  const MIN_CHARS = 50;

  const isValid = essayText.trim().length >= MIN_CHARS;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEssayText(e.target.value);
    if (error && e.target.value.trim().length >= MIN_CHARS) {
      setError(null);
    }
  };

  const handleSubmit = () => {
    const trimmed = essayText.trim();
    if (trimmed.length < MIN_CHARS) {
      setError(`Please write at least ${MIN_CHARS} characters.`);
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 font-['Plus_Jakarta_Sans']">

      {/* CSS Animation Injection for Modal */}
      <style>{`
        @keyframes modal-pop {
            0% { opacity: 0; transform: scale(0.95) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop { animation: modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-modal-pop">

        {/* Header with Gradient Line */}
        <div className="relative p-8 md:p-10 border-b border-gray-100 dark:border-gray-700">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 to-teal-500"></div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-3 border border-green-200 dark:border-green-800">
                Optional Step
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                {promptTitle || 'Reflective Essay'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {promptText || 'Please write a short essay about your personality, interests, and dream career.'}
              </p>
            </div>

            <button
              onClick={onSkip}
              className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Skip
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
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-4 text-base text-gray-900 dark:text-white shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all resize-none placeholder-gray-400 font-medium"
              placeholder="Describe your strengths, weaknesses, interests, and the kind of work you enjoy..."
              disabled={loading}
            />

            {/* Character Count */}
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${essayText.trim().length >= MIN_CHARS
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                {essayText.trim().length} / {MIN_CHARS} chars
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/50">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
              Skip this step
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Essay</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
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