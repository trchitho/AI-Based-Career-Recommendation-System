/**
 * QUESTION MANAGEMENT PAGE - English Only
 */

import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Question, QuestionFormData } from '../../types/admin';

const baseInput =
  "w-full px-3 py-2 text-sm rounded-lg border " +
  "bg-white dark:bg-gray-800 " +
  "border-gray-200 dark:border-gray-700 " +
  "text-gray-900 dark:text-white " +
  "placeholder-gray-400 dark:placeholder-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-600";

const cardClass =
  "bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 " +
  "border border-gray-100 dark:border-gray-700";

const tableHead =
  "bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700";

const QuestionManagementPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTestType, setFilterTestType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, [filterTestType, filterActive, page, pageSize]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const isActive = filterActive === 'all' ? undefined : filterActive === 'active';
      const data = await adminService.getAllQuestions(
        filterTestType || undefined,
        isActive,
        { page, pageSize }
      );
      setQuestions(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleDelete = async (questionId: string) => {
    try {
      await adminService.deleteQuestion(questionId);
      await loadQuestions();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete');
    }
  };

  const handleToggleActive = async (question: Question) => {
    try {
      await adminService.updateQuestion(question.id, { isActive: !question.is_active });
      await loadQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingQuestion(null);
    loadQuestions();
  };

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Question Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage RIASEC and Big Five test questions</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-indigo-800 text-white px-4 py-2 rounded-lg hover:bg-indigo-900 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Question
        </button>
      </div>

      {/* FILTERS */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
              Test Type
            </label>
            <select
              value={filterTestType}
              onChange={(e) => setFilterTestType(e.target.value)}
              className={baseInput}
            >
              <option value="">All Types</option>
              <option value="RIASEC">RIASEC</option>
              <option value="BIG_FIVE">Big Five</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className={baseInput}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="ml-auto flex items-center gap-2">
              <button
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="rounded-xl shadow-sm overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Question</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Test Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Dimension</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {questions.map(question => (
                <tr key={question.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-200 line-clamp-2">
                      {question.text}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {question.test_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 capitalize">
                    {question.dimension}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {question.question_type === "multiple_choice" ? "Multiple Choice" : "Scale"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(question)}
                      className={question.is_active
                        ? "px-2 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200"
                        : "px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }
                    >
                      {question.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(question)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      Edit
                    </button>
                    {deleteConfirm === question.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(question.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {questions.length === 0 && !loading && (
            <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
              No questions found
            </div>
          )}
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <QuestionForm
          question={editingQuestion}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   QUESTION FORM MODAL
   ───────────────────────────────────────────────────────────────────────────── */

interface QuestionFormProps {
  question: Question | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QuestionForm = ({ question, onClose, onSuccess }: QuestionFormProps) => {
  const [formData, setFormData] = useState<QuestionFormData>({
    text: question?.text || '',
    testType: question?.test_type || 'RIASEC',
    dimension: question?.dimension || '',
    questionType: question?.question_type || 'scale',
    options: question?.options || [],
    isActive: question?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const dimensionOptions: Record<string, string[]> = {
    RIASEC: ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional'],
    BIG_FIVE: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim() || !formData.dimension) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      setSaving(true);
      if (question) {
        await adminService.updateQuestion(question.id, formData);
      } else {
        await adminService.createQuestion(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const baseInput =
    "w-full px-3 py-2 text-sm rounded-lg border " +
    "bg-white dark:bg-gray-800 " +
    "border-gray-200 dark:border-gray-700 " +
    "text-gray-900 dark:text-white " +
    "placeholder-gray-400 dark:placeholder-gray-500 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-600";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {question ? 'Edit Question' : 'Add Question'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question Text *
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className={baseInput}
              rows={3}
              placeholder="Enter question text..."
            />
          </div>

          {/* Test Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test Type *
            </label>
            <select
              value={formData.testType}
              onChange={(e) => setFormData({ ...formData, testType: e.target.value as 'RIASEC' | 'BIG_FIVE', dimension: '' })}
              className={baseInput}
            >
              <option value="RIASEC">RIASEC</option>
              <option value="BIG_FIVE">Big Five</option>
            </select>
          </div>

          {/* Dimension */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dimension *
            </label>
            <select
              value={formData.dimension}
              onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
              className={baseInput}
            >
              <option value="">Select dimension...</option>
              {dimensionOptions[formData.testType]?.map(dim => (
                <option key={dim} value={dim.toLowerCase()}>{dim}</option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question Type
            </label>
            <select
              value={formData.questionType}
              onChange={(e) => setFormData({ ...formData, questionType: e.target.value as 'multiple_choice' | 'scale' })}
              className={baseInput}
            >
              <option value="scale">Scale (1-5)</option>
              <option value="multiple_choice">Multiple Choice</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : question ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionManagementPage;
