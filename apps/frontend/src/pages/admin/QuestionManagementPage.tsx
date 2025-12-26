/**
 * QUESTION MANAGEMENT PAGE - English Only
 */

import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Question, QuestionFormData } from '../../types/admin';

const baseInput =
  "w-full px-4 py-3 rounded-lg border " +
  "bg-white dark:bg-[#1E293B] " +
  "border-gray-300 dark:border-[#2C3A4B] " +
  "text-gray-800 dark:text-gray-200 " +
  "placeholder-gray-400 dark:placeholder-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500";

const cardClass =
  "bg-gray-50 dark:bg-[#0F172A] rounded-lg shadow p-4 " +
  "border border-gray-200 dark:border-[#1E293B]";

const tableHead =
  "bg-gray-100 dark:bg-[#1E293B] text-gray-700 dark:text-gray-300";

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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">
          Question Management
        </h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
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
                className="px-4 py-2 rounded-full border bg-white dark:bg-[#1E293B] text-gray-900 dark:text-gray-200 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                className="px-4 py-2 rounded-full border bg-white dark:bg-[#1E293B] text-gray-900 dark:text-gray-200 disabled:opacity-50"
                disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-300">Loading...</p>
        </div>
      ) : (
        <div className="rounded-lg shadow overflow-hidden bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#1E293B]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={tableHead}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Dimension</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#0F172A] divide-y divide-gray-200 dark:divide-gray-700">
              {questions.map(question => (
                <tr key={question.id} className="hover:bg-gray-50 dark:hover:bg-[#1A2333]">
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
                        ? "px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
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
            <div className="text-center py-6 text-gray-500 dark:text-gray-300">
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
    "w-full px-4 py-3 rounded-lg border " +
    "bg-white dark:bg-[#1E293B] " +
    "border-gray-300 dark:border-[#2C3A4B] " +
    "text-gray-800 dark:text-gray-200 " +
    "placeholder-gray-400 dark:placeholder-gray-500 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
              onChange={(e) => setFormData({ ...formData, testType: e.target.value, dimension: '' })}
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
              onChange={(e) => setFormData({ ...formData, questionType: e.target.value })}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
