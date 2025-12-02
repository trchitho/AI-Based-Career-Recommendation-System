/**  -------------------------------
 *  CAREER MANAGEMENT PAGE (UI FIXED, i18n READY)
 *  Logic giữ nguyên 100%
 *  Dark/Light theme đồng nhất
 *  --------------------------------
 */

import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Career, CareerFormData } from '../../types/admin';
import { useTranslation } from 'react-i18next';

const CareerManagementPage = () => {
  const { t } = useTranslation();

  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCareers();
  }, [filterCategory, page, pageSize, searchTerm]);

  const loadCareers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllCareers(
        filterCategory || undefined,
        { page, pageSize, q: searchTerm.trim() || undefined }
      );
      setCareers(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading careers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCareer(null);
    setShowForm(true);
  };

  const handleEdit = (career: Career) => {
    setEditingCareer(career);
    setShowForm(true);
  };

  const handleDelete = async (careerId: string) => {
    try {
      await adminService.deleteCareer(careerId);
      await loadCareers();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting career:', error);
      alert(t("career.deleteFailed"));
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCareer(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCareer(null);
    loadCareers();
  };

  const filteredCareers = careers;
  const categories = Array.from(
    new Set(careers.map((c) => c.industry_category).filter(Boolean))
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">
          {t("career.managementTitle")}
        </h1>

        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {t("career.addCareer")}
        </button>
      </div>

      {/* Search + Filter */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              {t("common.search")}
            </label>
            <input
              value={searchTerm}
              onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
              placeholder={t("career.searchPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border 
                bg-white dark:bg-gray-800 
                text-black dark:text-white
                border-gray-300 dark:border-gray-700
                focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
              {t("career.filterByCategory")}
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border
                bg-white dark:bg-gray-800
                text-black dark:text-white
                border-gray-300 dark:border-gray-700
                focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("common.allCategories")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">
          {t("career.loading")}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F1629] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow">

          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {[
                  t("career.title"),
                  t("career.category"),
                  t("career.salaryRange"),
                  t("career.skills"),
                  t("common.actions"),
                ].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium 
                      text-gray-600 dark:text-gray-300 uppercase"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCareers.map((career) => (
                <tr
                  key={career.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                      {career.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {career.description}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {career.industry_category || t("common.notAvailable")}
                  </td>

                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {career.salary_range?.min && career.salary_range?.max
                      ? `${career.salary_range.currency || '$'}${career.salary_range.min.toLocaleString()} - ${career.salary_range.currency || '$'}${career.salary_range.max.toLocaleString()}`
                      : t("common.notAvailable")}
                  </td>

                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {`${career.required_skills?.length || 0} ${t("career.skillsCount")}`}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-4 whitespace-nowrap">

                      <button
                        onClick={() => handleEdit(career)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t("common.edit")}
                      </button>

                      <a
                        href={`/admin/roadmaps/${career.id}`}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        {t("career.roadmap")}
                      </a>

                      {deleteConfirm === career.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(career.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {t("common.confirm")}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                          >
                            {t("common.cancel")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(career.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {t("common.delete")}
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>

          {filteredCareers.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {t("career.noResults")}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-center gap-4 text-gray-700 dark:text-gray-300">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-gray-100 dark:bg-gray-800 disabled:opacity-40"
          >
            {t("pagination.prev")}
          </button>

          <span>
            {t("pagination.page")} {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>

          <button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-gray-100 dark:bg-gray-800 disabled:opacity-40"
          >
            {t("pagination.next")}
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <CareerFormModal
          career={editingCareer}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

    </div>
  );
};

/* ----------------------------------------------------
   FORM MODAL — i18n + giữ nguyên logic
----------------------------------------------------- */

interface CareerFormModalProps {
  career: Career | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CareerFormModal: React.FC<CareerFormModalProps> = ({
  career,
  onClose,
  onSuccess,
}) => {

  const { t } = useTranslation();

  const [formData, setFormData] = useState<CareerFormData>({
    title: career?.title || "",
    description: career?.description || "",
    requiredSkills: career?.required_skills || [],
    salaryRange: career?.salary_range || { min: 0, max: 0, currency: "USD" },
    industryCategory: career?.industry_category || "",
    riasecProfile: career?.riasec_profile || {
      realistic: 0,
      investigative: 0,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 0,
    },
  });

  const [skillInput, setSkillInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (career) await adminService.updateCareer(career.id, formData);
      else await adminService.createCareer(formData);
      onSuccess();
    } catch (err) {
      console.error("Error saving career:", err);
      alert(t("career.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    if (formData.requiredSkills.includes(skillInput.trim())) return;

    setFormData({
      ...formData,
      requiredSkills: [...formData.requiredSkills, skillInput.trim()],
    });
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter((s) => s !== skill),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0F1629] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {career ? t("career.editCareer") : t("career.addCareer")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* TITLE */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                {t("career.title")} *
              </label>
              <input
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border
                  bg-white dark:bg-gray-800
                  text-black dark:text-white
                  border-gray-300 dark:border-gray-700
                  focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                {t("career.description")} *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border
                  bg-white dark:bg-gray-800
                  text-black dark:text-white
                  border-gray-300 dark:border-gray-700
                  focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                {t("career.category")}
              </label>
              <input
                value={formData.industryCategory}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    industryCategory: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border
                  bg-white dark:bg-gray-800
                  text-black dark:text-white
                  border-gray-300 dark:border-gray-700
                  focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SALARY */}
            <div className="grid grid-cols-3 gap-4">
              {["min", "max", "currency"].map((field) => (
                <div key={field}>
                  <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                    {field === "min"
                      ? t("career.minSalary")
                      : field === "max"
                        ? t("career.maxSalary")
                        : t("career.currency")}
                  </label>

                  <input
                    type={field === "currency" ? "text" : "number"}
                    value={(formData.salaryRange as any)[field]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryRange: {
                          ...formData.salaryRange,
                          [field]:
                            field === "currency"
                              ? e.target.value
                              : Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border
                      bg-white dark:bg-gray-800
                      text-black dark:text-white
                      border-gray-300 dark:border-gray-700
                      focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            {/* SKILLS */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                {t("career.requiredSkills")}
              </label>

              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder={t("career.addSkillPlaceholder")}
                  className="flex-1 px-3 py-2 rounded-lg border
                    bg-white dark:bg-gray-800
                    text-black dark:text-white
                    border-gray-300 dark:border-gray-700
                    focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  {t("common.add")}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {formData.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-600 dark:text-blue-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* RIASEC */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                {t("career.riasec")}
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(formData.riasecProfile).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block capitalize">
                      {t(`career.riasec.${key}`)}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          riasecProfile: {
                            ...formData.riasecProfile,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border
                        bg-white dark:bg-gray-800
                        text-black dark:text-white
                        border-gray-300 dark:border-gray-700
                        focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
              >
                {t("common.cancel")}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
              >
                {submitting ? t("common.saving") : career ? t("common.update") : t("common.create")}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CareerManagementPage;
