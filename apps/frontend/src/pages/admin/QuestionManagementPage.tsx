import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Question, QuestionFormData } from '../../types/admin';

const QuestionManagementPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTestType, setFilterTestType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, [filterTestType, filterActive]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const isActive = filterActive === 'all' ? undefined : filterActive === 'active';
      const data = await adminService.getAllQuestions(
        filterTestType || undefined,
        isActive
      );
      setQuestions(data);
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
      alert('Failed to delete question');
    }
  };

  const handleToggleActive = async (question: Question) => {
    try {
      await adminService.updateQuestion(question.id, {
        isActive: !question.is_active,
      });
      await loadQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Question Management</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Type
            </label>
            <select
              value={filterTestType}
              onChange={(e) => setFilterTestType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="RIASEC">RIASEC</option>
              <option value="BIG_FIVE">Big Five</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading questions...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dimension
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2">{question.text}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {question.test_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {question.dimension}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {question.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Scale'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(question)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        question.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {question.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(question)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    {deleteConfirm === question.id ? (
                      <span className="space-x-2">
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(question.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {questions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No questions found</p>
            </div>
          )}
        </div>
      )}

      {/* Question Form Modal */}
      {showForm && (
        <QuestionFormModal
          question={editingQuestion}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

interface QuestionFormModalProps {
  question: Question | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QuestionFormModal: React.FC<QuestionFormModalProps> = ({ question, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<QuestionFormData>({
    text: question?.text || '',
    testType: question?.test_type || 'RIASEC',
    dimension: question?.dimension || '',
    questionType: question?.question_type || 'scale',
    options: question?.options || [],
    scaleRange: question?.scale_range || { min: 1, max: 5 },
  });
  const [optionInput, setOptionInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const riasecDimensions = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
  const bigFiveDimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  const addOption = () => {
    if (optionInput.trim() && !formData.options?.includes(optionInput.trim())) {
      setFormData({
        ...formData,
        options: [...(formData.options || []), optionInput.trim()],
      });
      setOptionInput('');
    }
  };

  const removeOption = (option: string) => {
    const newFormData: QuestionFormData = {
      ...formData,
    };
    if (formData.options) {
      newFormData.options = formData.options.filter((o) => o !== option);
    }
    setFormData(newFormData);
  };

  const availableDimensions = formData.testType === 'RIASEC' ? riasecDimensions : bigFiveDimensions;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {question ? 'Edit Question' : 'Add Question'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text *
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Type *
                </label>
                <select
                  value={formData.testType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      testType: e.target.value as 'RIASEC' | 'BIG_FIVE',
                      dimension: '',
                    })
                  }
                  disabled={!!question}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="RIASEC">RIASEC</option>
                  <option value="BIG_FIVE">Big Five</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimension *
                </label>
                <select
                  value={formData.dimension}
                  onChange={(e) => {
                    const newFormData: QuestionFormData = { 
                      ...formData, 
                      dimension: e.target.value
                    };
                    if (formData.options) {
                      newFormData.options = formData.options;
                    }
                    setFormData(newFormData);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select dimension</option>
                  {availableDimensions.map((dim) => (
                    <option key={dim} value={dim} className="capitalize">
                      {dim}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Type *
              </label>
              <select
                value={formData.questionType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    questionType: e.target.value as 'multiple_choice' | 'scale',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="scale">Scale</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>
            </div>

            {formData.questionType === 'scale' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Value
                  </label>
                  <input
                    type="number"
                    value={formData.scaleRange?.min || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scaleRange: {
                          ...formData.scaleRange!,
                          min: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Value
                  </label>
                  <input
                    type="number"
                    value={formData.scaleRange?.max || 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scaleRange: {
                          ...formData.scaleRange!,
                          max: parseInt(e.target.value) || 5,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer Options
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    placeholder="Add an option..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.options?.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm text-gray-900">{option}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(option)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : question ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionManagementPage;
