import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Question, QuestionFormData } from '../../types/admin';
import { useTranslation } from 'react-i18next';

/* -------------------- COLOR PRESETS -------------------- */

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


/* ========================================================================== */
/*                         MAIN PAGE – QUESTION MANAGEMENT                    */
/* ========================================================================== */

const QuestionManagementPage = () => {
  const { t } = useTranslation();

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
      const isActive =
        filterActive === 'all'
          ? undefined
          : filterActive === 'active';

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
      await adminService.updateQuestion(question.id, {
        isActive: !question.is_active,
      });
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
          {t("question.managementTitle")}
        </h1>

        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {t("question.addQuestion")}
        </button>
      </div>


      {/* -------------------- FILTERS -------------------- */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Test Type */}
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
              {t("question.testType")}
            </label>
            <select
              value={filterTestType}
              onChange={(e) => setFilterTestType(e.target.value)}
              className={baseInput}
            >
              <option value="">{t("question.allTypes")}</option>
              <option value="RIASEC">RIASEC</option>
              <option value="BIG_FIVE">Big Five</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
              {t("question.status")}
            </label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className={baseInput}
            >
              <option value="all">{t("question.allStatus")}</option>
              <option value="active">{t("question.active")}</option>
              <option value="inactive">{t("question.inactive")}</option>
            </select>
          </div>

          {/* Pagination */}
          <div className="flex items-end">
            <div className="ml-auto flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-full border bg-white dark:bg-[#1E293B] text-gray-900 dark:text-gray-200 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                {t("common.prev")}
              </button>

              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("common.page")} {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>

              <button
                className="px-4 py-2 rounded-full border bg-white dark:bg-[#1E293B] text-gray-900 dark:text-gray-200 disabled:opacity-50"
                disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
                onClick={() => setPage(p => p + 1)}
              >
                {t("common.next")}
              </button>
            </div>
          </div>

        </div>
      </div>


      {/* -------------------- TABLE -------------------- */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-300">Loading…</p>
        </div>
      ) : (
        <div className="rounded-lg shadow overflow-hidden bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#1E293B]">

          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={tableHead}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("question.managementTitle")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("question.testType")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("question.dimension")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("question.type")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("question.status")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-[#0F172A] divide-y divide-gray-200 dark:divide-gray-700">

              {questions.map(question => (
                <tr key={question.id} className="hover:bg-gray-50 dark:hover:bg-[#1A2333]">

                  {/* QUESTION TEXT (KHÔNG DỊCH) */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-200 line-clamp-2">
                      {question.text}
                    </div>
                  </td>

                  {/* TEST TYPE (DỮ LIỆU — KHÔNG DỊCH) */}
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full
                    bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {question.test_type}
                    </span>
                  </td>

                  {/* DIMENSION (KHÔNG DỊCH) */}
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 capitalize">
                    {question.dimension}
                  </td>

                  {/* TYPE */}
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {question.question_type === "multiple_choice"
                      ? t("question.multipleChoice")
                      : t("question.scale")}
                  </td>

                  {/* ACTIVE STATUS */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(question)}
                      className={
                        question.is_active
                          ? "px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }
                    >
                      {question.is_active ? t("question.active") : t("question.inactive")}
                    </button>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(question)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                    >
                      {t("common.update")}
                    </button>

                    {deleteConfirm === question.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(question.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          {t("common.confirm")}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-300"
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(question.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        {t("common.cancel")}
                      </button>
                    )}

                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* No Data */}
          {questions.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-300">
              {t("common.noData")}
            </div>
          )}

        </div>
      )}
      {/* END TABLE */}


      {/* ========================== FORM MODAL ========================== */}
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


/* ========================================================================== */
/*                               QUESTION FORM                                */
/* ========================================================================== */

const QuestionForm = ({
  question,
  onClose,
  onSuccess
}: {
  question: Question | null;
  onClose: () => void;
  onSuccess: () => void;
}) => {

  const { t } = useTranslation();

  const isEdit = !!question;

  const [formData, setFormData] = useState<QuestionFormData>(() =>
    question
      ? {
        text: question.text,
        test_type: question.test_type,
        dimension: question.dimension,
        question_type: question.question_type,
        options: question.options || [],
        min_value: question.min_value || 1,
        max_value: question.max_value || 5,
      }
      : {
        text: "",
        test_type: "RIASEC",
        dimension: "",
        question_type: "multiple_choice",
        options: [],
        min_value: 1,
        max_value: 5,
      }
  );

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () =>
    setFormData({ ...formData, options: [...formData.options, ""] });

  const removeOption = (index: number) =>
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await adminService.updateQuestion(question!.id, formData);
      } else {
        await adminService.createQuestion(formData);
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Failed to save question");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-lg w-full max-w-2xl border border-gray-200 dark:border-[#1E293B]">

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">
          {isEdit ? t("common.update") : t("common.create")}
        </h2>

        <div className="space-y-4">

          {/* QUESTION TEXT (KHÔNG DỊCH) */}
          <div>
            <label className="block mb-1 text-gray-800 dark:text-gray-300">
              Question
            </label>
            <textarea
              className="w-full p-3 rounded border bg-gray-50 dark:bg-[#1E293B] border-gray-300 dark:border-[#2C3A4B] text-gray-900 dark:text-gray-200"
              rows={3}
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
            />
          </div>

          {/* TEST TYPE (KHÔNG DỊCH GIÁ TRỊ) */}
          <div>
            <label className="block mb-1 text-gray-800 dark:text-gray-300">
              {t("question.testType")}
            </label>
            <select
              className={baseInput}
              value={formData.test_type}
              onChange={(e) =>
                setFormData({ ...formData, test_type: e.target.value })
              }
            >
              <option value="RIASEC">RIASEC</option>
              <option value="BIG_FIVE">Big Five</option>
            </select>
          </div>

          {/* DIMENSION (KHÔNG DỊCH) */}
          <div>
            <label className="block mb-1 text-gray-800 dark:text-gray-300">
              {t("question.dimension")}
            </label>
            <input
              className={baseInput}
              value={formData.dimension}
              onChange={(e) =>
                setFormData({ ...formData, dimension: e.target.value })
              }
            />
          </div>

          {/* QUESTION TYPE */}
          <div>
            <label className="block mb-1 text-gray-800 dark:text-gray-300">
              {t("question.type")}
            </label>
            <select
              className={baseInput}
              value={formData.question_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  question_type: e.target.value as any,
                })
              }
            >
              <option value="multiple_choice">
                {t("question.multipleChoice")}
              </option>
              <option value="scale">{t("question.scale")}</option>
            </select>
          </div>

          {/* MULTIPLE CHOICE OPTIONS */}
          {formData.question_type === "multiple_choice" && (
            <div className="space-y-2">
              <label className="block text-gray-800 dark:text-gray-300">
                {t("question.addOption")}
              </label>

              {formData.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={baseInput}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  <button
                    className="text-red-600"
                    onClick={() => removeOption(i)}
                  >
                    {t("question.removeOption")}
                  </button>
                </div>
              ))}

              <button
                className="text-blue-600 mt-2"
                onClick={addOption}
              >
                {t("question.addOption")}
              </button>
            </div>
          )}

          {/* SCALE TYPE */}
          {formData.question_type === "scale" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-gray-800 dark:text-gray-300">
                  {t("question.minValue")}
                </label>
                <input
                  type="number"
                  className={baseInput}
                  value={formData.min_value}
                  onChange={(e) =>
                    setFormData({ ...formData, min_value: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-800 dark:text-gray-300">
                  {t("question.maxValue")}
                </label>
                <input
                  type="number"
                  className={baseInput}
                  value={formData.max_value}
                  onChange={(e) =>
                    setFormData({ ...formData, max_value: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {isEdit ? t("common.update") : t("common.create")}
          </button>
        </div>

      </div>
    </div>
  );
};


export default QuestionManagementPage;
