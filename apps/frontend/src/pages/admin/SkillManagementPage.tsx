import { useEffect, useState, useCallback } from 'react';
import Pagination from '../../components/common/Pagination';
import api from '../../lib/api';

interface Skill {
  id: number;
  onet_code: string;
  ksa_type: string;
  name: string;
  category?: string;
  level?: number;
  importance?: number;
  source?: string;
  fetched_at?: string;
}

interface SkillsResponse {
  items: Skill[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface SkillFormData {
  onet_code: string;
  ksa_type: string;
  name: string;
  category?: string;
  level?: number;
  importance?: number;
  source?: string;
}

const SkillManagementPage = () => {
  const [skillsData, setSkillsData] = useState<SkillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ksaTypeFilter, setKsaTypeFilter] = useState('');

  const loadSkills = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const query = searchQuery !== undefined ? searchQuery : searchTerm;
      if (query) params.append('search', query);
      if (ksaTypeFilter) params.append('ksa_type', ksaTypeFilter);

      const response = await api.get(`/api/content/skills?${params}`);
      setSkillsData(response.data);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, sortBy, sortOrder, ksaTypeFilter, searchTerm]);

  // Load skills when dependencies change
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleCreate = () => {
    setEditingSkill(null);
    setShowForm(true);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setShowForm(true);
  };

  const handleDelete = async (skillId: number) => {
    try {
      await api.delete(`/api/content/skills/${skillId}`);
      await loadSkills();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting skill:', error);
      alert('Không thể xóa kỹ năng');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadSkills(searchTerm);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Quản lý kỹ năng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý kỹ năng, kiến thức và năng lực
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-indigo-800 hover:bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm kỹ năng
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, danh mục hoặc mã ONET..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:bg-gray-800 dark:text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loại KSA
            </label>
            <select
              value={ksaTypeFilter}
              onChange={(e) => setKsaTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 dark:bg-gray-800 dark:text-white transition-colors"
            >
              <option value="">Tất cả loại</option>
              <option value="knowledge">Kiến thức</option>
              <option value="skill">Kỹ năng</option>
              <option value="ability">Năng lực</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sắp xếp theo
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 dark:bg-gray-800 dark:text-white transition-colors"
            >
              <option value="name">Tên</option>
              <option value="ksa_type">Loại KSA</option>
              <option value="category">Danh mục</option>
              <option value="onet_code">Mã ONET</option>
              <option value="level">Cấp độ</option>
              <option value="importance">Độ quan trọng</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-800 hover:bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold transition-colors text-sm"
              title={`Sắp xếp ${sortOrder === 'asc' ? 'giảm dần' : 'tăng dần'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </form>
      </div>

      {/* STATS */}
      {skillsData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>
              Hiển thị {((currentPage - 1) * perPage) + 1} đến {Math.min(currentPage * perPage, skillsData.total)} của {skillsData.total} kỹ năng
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Trang {currentPage} / {skillsData.total_pages}
            </span>
          </div>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          Đang tải...
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th
                  className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Tên
                    {sortBy === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('ksa_type')}
                >
                  <div className="flex items-center gap-1">
                    Loại KSA
                    {sortBy === 'ksa_type' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Danh mục
                    {sortBy === 'category' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('onet_code')}
                >
                  <div className="flex items-center gap-1">
                    Mã ONET
                    {sortBy === 'onet_code' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Cấp độ
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                  Độ quan trọng
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {skillsData?.items.map((skill, index) => (
                <tr
                  key={`skill-${skill.id}-${index}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {skill.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {skill.id}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${skill.ksa_type === 'Knowledge' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      skill.ksa_type === 'Skills' ? 'bg-indigo-50 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-200' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                      {skill.ksa_type}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {skill.category || '-'}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {skill.onet_code}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {skill.level ? skill.level.toFixed(1) : '-'}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {skill.importance ? skill.importance.toFixed(1) : '-'}
                  </td>

                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(skill)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Sửa
                      </button>

                      {deleteConfirm === skill.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(skill.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-300"
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(skill.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {skillsData?.items.length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
              Không tìm thấy kỹ năng nào
            </div>
          )}
        </div>
      )}

      {/* PAGINATION */}
      {skillsData && skillsData.total > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={skillsData.total_pages}
          totalItems={skillsData.total}
          itemsPerPage={perPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handlePerPageChange}
        />
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

interface SkillFormModalProps {
  skill: Skill | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SkillFormModal = ({ skill, onClose, onSuccess }: SkillFormModalProps) => {
  const [formData, setFormData] = useState<SkillFormData>({
    onet_code: skill?.onet_code || '',
    ksa_type: skill?.ksa_type || 'Knowledge',
    name: skill?.name || '',
    category: skill?.category || '',
    level: skill?.level || 0,
    importance: skill?.importance || 0,
    source: skill?.source || 'manual',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (skill) {
        await api.put(`/api/content/skills/${skill.id}`, formData);
      } else {
        await api.post('/api/content/skills', formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving skill:', error);
      alert('Không thể lưu kỹ năng');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 dark:bg-gray-800 dark:text-white transition-colors";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
          {skill ? 'Sửa kỹ năng' : 'Thêm kỹ năng'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mã ONET *
            </label>
            <input
              required
              value={formData.onet_code}
              onChange={(e) => setFormData({ ...formData, onet_code: e.target.value })}
              className={inputClass}
              placeholder="e.g., 11-1011.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loại KSA *
            </label>
            <select
              required
              value={formData.ksa_type}
              onChange={(e) => setFormData({ ...formData, ksa_type: e.target.value })}
              className={inputClass}
            >
              <option value="Knowledge">Kiến thức</option>
              <option value="Skills">Kỹ năng</option>
              <option value="Abilities">Năng lực</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tên *
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="Tên kỹ năng"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Danh mục
            </label>
            <input
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={inputClass}
              placeholder="Danh mục"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cấp độ (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.level || ''}
                onChange={(e) => setFormData({ ...formData, level: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Độ quan trọng (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.importance || ''}
                onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nguồn
            </label>
            <input
              value={formData.source || ''}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className={inputClass}
              placeholder="Nguồn dữ liệu"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 disabled:opacity-50 font-medium transition-colors"
            >
              {submitting ? 'Đang lưu...' : skill ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SkillManagementPage;
