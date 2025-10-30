import { useState } from "react";

interface EssayModalComponentProps {
  onSubmit: (essayText: string) => void;
  onSkip: () => void;
  loading?: boolean;
}

const EssayModalComponent = ({
  onSubmit,
  onSkip,
  loading = false,
}: EssayModalComponentProps) => {
  const [essayText, setEssayText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Keep essay lightweight; backend accepts any non-empty content
  const MIN_CHARS = 50;
  const charCount = essayText.length;
  const isValid = charCount >= MIN_CHARS;

  const handleSubmit = () => {
    if (!isValid) {
      setError(
        `Essay must be at least ${MIN_CHARS} characters. You have ${charCount}.`,
      );
      return;
    }

    setError(null);
    onSubmit(essayText);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEssayText(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h3 className="text-2xl font-semibold text-gray-900">
            Optional: Share Your Career Aspirations
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Tell us about your career goals, interests, and what motivates you.
            This helps us provide more personalized recommendations.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="essay"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Response
            </label>
            <textarea
              id="essay"
              value={essayText}
              onChange={handleTextChange}
              disabled={loading}
              placeholder="Example: I've always been passionate about technology and helping people. I enjoy solving complex problems and working in teams. My goal is to find a career where I can combine my technical skills with my desire to make a positive impact..."
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span
                className={`font-medium ${
                  isValid
                    ? "text-green-600"
                    : charCount > 0
                      ? "text-yellow-600"
                      : "text-gray-500"
                }`}
              >
                {charCount} / {MIN_CHARS} characters
              </span>
              {isValid && (
                <span className="ml-2 text-green-600">✓ Minimum reached</span>
              )}
            </div>
          </div>

          {loading && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                <p className="text-blue-800 text-sm">
                  Submitting your essay and analyzing your responses...
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onSkip}
            disabled={loading}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip for Now
          </button>

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Essay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EssayModalComponent;
