/**
 * CAREER MANAGEMENT PAGE - Vietnamese UI, RIASEC Categories
 */

import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Career, CareerFormData } from '../../types/admin';

// RIASEC category labels
const RIASEC_CATEGORIES = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'R', label: 'Thực tế (R)' },
  { value: 'I', label: 'Nghiên cứu (I)' },
  { value: 'A', label: 'Nghệ thuật (A)' },
  { value: 'S', label: 'Xã hội (S)' },
  { value: 'E', label: 'Doanh nghiệp (E)' },
  { value: 'C', label: 'Quy ước (C)' },
];

const CareerManagementPage = () => {
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
      const q = searchTerm.trim();
      const data = await adminService.getAllCareers(
        filterCategory || undefined,
        { page, pageSize, ...(q ? { q } : {}) }
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
      alert('Không thể xóa nghề nghiệp');
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

  // Get dominant RIASEC code from career (now from backend)
  const getDominantRIASEC = (career: Career): string => {
    // Use dominant_code from backend if available
    if ((career as any).dominant_code) {
      return (career as any).dominant_code;
    }
    const profile = career.riasec_profile;
    if (!profile) return 'N/A';

    const codes = [
      { code: 'R', value: profile.realistic || 0 },
      { code: 'I', value: profile.investigative || 0 },
      { code: 'A', value: profile.artistic || 0 },
      { code: 'S', value: profile.social || 0 },
      { code: 'E', value: profile.enterprising || 0 },
      { code: 'C', value: profile.conventional || 0 },
    ];

    const sorted = codes.sort((a, b) => b.value - a.value);
    if (!sorted[0] || sorted[0].value === 0) return 'N/A';

    return sorted[0].code;
  };

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Quản lý nghề nghiệp
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quản lý {total} nghề nghiệp trong hệ thống</p>
        </div>
        <button onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-semibold rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Thêm nghề nghiệp
        </button>
      </div>

      {/* Search + Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tìm kiếm</label>
            <input value={searchTerm} onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }} placeholder="Tìm kiếm nghề nghiệp..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Lọc theo danh mục</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600">
              {RIASEC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Đang tải...
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  {['Tiêu đề', 'RIASEC', 'Mức lương', 'Kỹ năng', 'Hành động'].map((col) => (
                    <th key={col} className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {careers.map((career) => (
                  <tr key={career.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{career.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{career.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400">
                        {getDominantRIASEC(career)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {career.salary_range?.min && career.salary_range?.max
                        ? `${career.salary_range.currency || '$'}${career.salary_range.min.toLocaleString()} – ${career.salary_range.currency || '$'}${career.salary_range.max.toLocaleString()}`
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{career.required_skills?.length || 0} kỹ năng</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(career)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors">
                          Sửa
                        </button>
                        {deleteConfirm === career.id ? (
                          <>
                            <button onClick={() => handleDelete(career.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Xác nhận</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition-colors">Hủy</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(career.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors">Xóa</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {careers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <p className="text-sm">Không tìm thấy nghề nghiệp nào</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && Math.ceil(total / pageSize) > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))} — {total} nghề nghiệp</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              ← Trước
            </button>
            <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Sau →
            </button>
          </div>
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
   FORM MODAL — Only Title, Description, Skills editable
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
      alert("Không thể lưu nghề nghiệp");
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
      <div className="bg-white dark:bg-[0F1629] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {career ? "Sửa nghề nghiệp" : "Thêm nghề nghiệp"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* TITLE - Editable */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                Tiêu đề *
              </label>
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* DESCRIPTION - Editable */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                Mô tả *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SKILLS - Editable */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                Kỹ năng yêu cầu
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Thêm kỹ năng..."
                  className="flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Thêm
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {formData.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm flex items-center"
                  >
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="ml-2 text-blue-600 dark:text-blue-300">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
              >
                {submitting ? "Đang lưu..." : career ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CareerManagementPage;
