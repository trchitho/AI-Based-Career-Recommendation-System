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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {promptTitle || 'Reflective Essay'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {promptText ||
                'Please write a short essay about your personality, interests, and dream career.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Skip
          </button>
        </div>

        {/* Textarea */}
        <div className="mb-3">
          <textarea
            value={essayText}
            onChange={handleChange}
            rows={8}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100"
            placeholder="Describe your strengths, weaknesses, interests, and the kind of work you enjoy..."
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{essayText.trim().length} characters</span>
            <span>Minimum {MIN_CHARS} characters</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Skip essay
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Essay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EssayModalComponent;
