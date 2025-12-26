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
      alert('Failed to delete skill');
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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></span>
            Skill Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-5">
            Manage skills, knowledge and abilities
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
        >
          Add Skill
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, or ONET code..."
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              KSA Type
            </label>
            <select
              value={ksaTypeFilter}
              onChange={(e) => setKsaTypeFilter(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="">All Types</option>
              <option value="knowledge">Knowledge</option>
              <option value="skill">Skills</option>
              <option value="ability">Abilities</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="name">Name</option>
              <option value="ksa_type">KSA Type</option>
              <option value="category">Category</option>
              <option value="onet_code">ONET Code</option>
              <option value="level">Level</option>
              <option value="importance">Importance</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2.5 rounded-xl font-semibold transition-all"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </form>
      </div>

      {/* STATS */}
      {skillsData && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg p-4">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, skillsData.total)} of {skillsData.total} skills
            </span>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-medium">
              Page {currentPage} / {skillsData.total_pages}
            </span>
          </div>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortBy === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('ksa_type')}
                >
                  <div className="flex items-center gap-1">
                    KSA Type
                    {sortBy === 'ksa_type' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {sortBy === 'category' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('onet_code')}
                >
                  <div className="flex items-center gap-1">
                    ONET Code
                    {sortBy === 'onet_code' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Importance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {skillsData?.items.map((skill, index) => (
                <tr
                  key={`skill-${skill.id}-${index}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
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
                        skill.ksa_type === 'Skills' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
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
                        Edit
                      </button>

                      {deleteConfirm === skill.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(skill.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-300"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(skill.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {skillsData?.items.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No skills found
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
      alert('Failed to save skill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {skill ? 'Edit Skill' : 'Add Skill'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ONET Code *
            </label>
            <input
              required
              value={formData.onet_code}
              onChange={(e) => setFormData({ ...formData, onet_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., 11-1011.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              KSA Type *
            </label>
            <select
              required
              value={formData.ksa_type}
              onChange={(e) => setFormData({ ...formData, ksa_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="Knowledge">Knowledge</option>
              <option value="Skills">Skills</option>
              <option value="Abilities">Abilities</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Skill name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <input
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Category"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Level (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.level || ''}
                onChange={(e) => setFormData({ ...formData, level: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Importance (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.importance || ''}
                onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source
            </label>
            <input
              value={formData.source || ''}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Data source"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : skill ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SkillManagementPage;
