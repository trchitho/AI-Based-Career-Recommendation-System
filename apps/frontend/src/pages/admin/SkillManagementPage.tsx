import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Skill, SkillFormData, LearningResource } from '../../types/admin';
import { useTranslation } from "react-i18next";

/* ===================== THEME ===================== */
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

/* ===================== MAIN PAGE ===================== */

const SkillManagementPage = () => {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllSkills();
      setSkills(data);
    } catch (error) {
      console.error(t("skill.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSkill(null);
    setShowForm(true);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setShowForm(true);
  };

  const handleDelete = async (skillId: string) => {
    try {
      await adminService.deleteSkill(skillId);
      await loadSkills();
      setDeleteConfirm(null);
    } catch (error) {
      console.error(t("skill.errorDelete"));
      alert(t("skill.errorDelete"));
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSkill(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSkill(null);
    loadSkills();
  };

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          {t("skill.management")}
        </h1>

        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {t("skill.add")}
        </button>
      </div>

      {/* SEARCH BOX */}
      <div className={cardClass}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("skill.search")}
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("skill.searchPlaceholder")}
          className={baseInput}
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </div>
      ) : (
        <div className="rounded-lg shadow overflow-hidden bg-white dark:bg-[#0f172a] border border-[#d0d7e2] dark:border-[#2b3a55]">

          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={tableHead}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("skill.name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("skill.category")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("skill.levels")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {t("skill.resources")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSkills.map((skill) => (
                <tr
                  key={skill.id}
                  className="hover:bg-gray-50 dark:hover:bg-[#1e293b]"
                >
                  {/* NAME */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {skill.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {skill.description}
                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {skill.category}
                  </td>

                  {/* LEVELS */}
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {skill.proficiency_levels?.length || 0} {t("skill.levelCount")}
                  </td>

                  {/* RESOURCES */}
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {skill.learning_resources?.length || 0} {t("skill.resourceCount")}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-4">

                      {/* EDIT */}
                      <button
                        onClick={() => handleEdit(skill)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t("common.edit")}
                      </button>

                      {/* DELETE & CONFIRM */}
                      {deleteConfirm === skill.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(skill.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            {t("common.confirm")}
                          </button>

                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-300"
                          >
                            {t("common.cancel")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(skill.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
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

          {filteredSkills.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {t("common.noData")}
            </div>
          )}
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <SkillFormModal
          skill={editingSkill}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

/* ===================== FORM MODAL ===================== */

const SkillFormModal = ({ skill, onClose, onSuccess }: any) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<SkillFormData>({
    name: skill?.name || '',
    description: skill?.description || '',
    category: skill?.category || '',
    proficiencyLevels: skill?.proficiency_levels || [],
    learningResources: skill?.learning_resources || [],
  });

  const [levelInput, setLevelInput] = useState('');
  const [resourceInput, setResourceInput] = useState<LearningResource>({
    title: '',
    url: '',
    type: 'course',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (skill) await adminService.updateSkill(skill.id, formData);
      else await adminService.createSkill(formData);
      onSuccess();
    } catch (error: any) {
      alert(t("skill.errorSave"));
    } finally {
      setSubmitting(false);
    }
  };

  const addLevel = () => {
    if (levelInput.trim() && !formData.proficiencyLevels.includes(levelInput.trim())) {
      setFormData({
        ...formData,
        proficiencyLevels: [...formData.proficiencyLevels, levelInput.trim()],
      });
      setLevelInput('');
    }
  };

  const removeLevel = (level: string) => {
    setFormData({
      ...formData,
      proficiencyLevels: formData.proficiencyLevels.filter((l) => l !== level),
    });
  };

  const addResource = () => {
    if (resourceInput.title && resourceInput.url) {
      setFormData({
        ...formData,
        learningResources: [...formData.learningResources, resourceInput],
      });
      setResourceInput({ title: '', url: '', type: 'course' });
    }
  };

  const removeResource = (i: number) => {
    setFormData({
      ...formData,
      learningResources: formData.learningResources.filter((_, idx) => idx !== i),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-300 dark:border-[#2b3a55] p-6">

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {skill ? t("skill.edit") : t("skill.add")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
              {t("skill.name")} *
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={baseInput}
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
              {t("skill.description")} *
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={baseInput}
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
              {t("skill.category")} *
            </label>
            <input
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={baseInput}
            />
          </div>

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
              {t("skill.levels")}
            </label>

            <div className="flex gap-2 mb-2">
              <input
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLevel())}
                placeholder={t("skill.levelPlaceholder")}
                className={baseInput}
              />

              <button
                type="button"
                onClick={addLevel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t("common.add")}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {formData.proficiencyLevels.map((level) => (
                <span
                  key={level}
                  className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center"
                >
                  {level}
                  <button
                    type="button"
                    onClick={() => removeLevel(level)}
                    className="ml-2 text-blue-600 dark:text-blue-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("skill.resources")}
            </label>

            <input
              type="text"
              value={resourceInput.title}
              onChange={(e) =>
                setResourceInput({ ...resourceInput, title: e.target.value })
              }
              placeholder={t("skill.resourceTitle")}
              className={`${baseInput} mb-2`}
            />

            <input
              type="url"
              value={resourceInput.url}
              onChange={(e) =>
                setResourceInput({ ...resourceInput, url: e.target.value })
              }
              placeholder={t("skill.resourceURL")}
              className={`${baseInput} mb-2`}
            />

            <div className="flex gap-2 mb-2">
              <select
                value={resourceInput.type}
                onChange={(e) =>
                  setResourceInput({ ...resourceInput, type: e.target.value as any })
                }
                className={baseInput}
              >
                <option value="course">{t("skill.resourceType.course")}</option>
                <option value="article">{t("skill.resourceType.article")}</option>
                <option value="video">{t("skill.resourceType.video")}</option>
                <option value="book">{t("skill.resourceType.book")}</option>
              </select>

              <button
                type="button"
                onClick={addResource}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t("skill.addResource")}
              </button>
            </div>

            <div className="space-y-2">
              {formData.learningResources.map((resource, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {resource.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {resource.url}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {t(`skill.resourceType.${resource.type}`)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeResource(index)}
                    className="text-red-600 dark:text-red-400"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={onClose}
            >
              {t("common.cancel")}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? t("common.saving") : skill ? t("common.update") : t("common.create")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default SkillManagementPage;
