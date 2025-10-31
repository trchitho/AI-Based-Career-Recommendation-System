import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Career, CareerFormData } from '../../types/admin';

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
      const data = await adminService.getAllCareers(filterCategory || undefined, { page, pageSize, q: searchTerm.trim() || undefined });
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
      alert('Failed to delete career');
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

  const filteredCareers = careers; // server-side filter by q
  const categories = Array.from(new Set(careers.map((c) => c.industry_category).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Career Management</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Career
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
              placeholder="Search careers..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Career List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading careers...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCareers.map((career) => (
                <tr key={career.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{career.title}</div>
                    <div className="text-sm text-gray-500 line-clamp-2">{career.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {career.industry_category || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {career.salary_range?.min && career.salary_range?.max
                      ? `${career.salary_range.currency || '$'}${career.salary_range.min.toLocaleString()} - ${career.salary_range.currency || '$'}${career.salary_range.max.toLocaleString()}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {career.required_skills?.length || 0} skills
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(career)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    {deleteConfirm === career.id ? (
                      <span className="space-x-2">
                        <button
                          onClick={() => handleDelete(career.id)}
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
                        onClick={() => setDeleteConfirm(career.id)}
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
          {filteredCareers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No careers found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            className="px-3 py-2 rounded border bg-white/80 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Prev</button>
          <span className="text-sm text-gray-600">Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button
            className="px-3 py-2 rounded border bg-white/80 disabled:opacity-50"
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
          >Next</button>
        </div>
      )}

      {/* Career Form Modal */}
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

interface CareerFormModalProps {
  career: Career | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CareerFormModal: React.FC<CareerFormModalProps> = ({ career, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CareerFormData>({
    title: career?.title || '',
    description: career?.description || '',
    requiredSkills: career?.required_skills || [],
    salaryRange: career?.salary_range || { min: 0, max: 0, currency: 'USD' },
    industryCategory: career?.industry_category || '',
    riasecProfile: career?.riasec_profile || {
      realistic: 0,
      investigative: 0,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 0,
    },
  });
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (career) {
        await adminService.updateCareer(career.id, formData);
      } else {
        await adminService.createCareer(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving career:', error);
      alert('Failed to save career');
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.requiredSkills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter((s) => s !== skill),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {career ? 'Edit Career' : 'Add Career'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry Category
              </label>
              <input
                type="text"
                value={formData.industryCategory}
                onChange={(e) => setFormData({ ...formData, industryCategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={formData.salaryRange.min}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryRange: { ...formData.salaryRange, min: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={formData.salaryRange.max}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryRange: { ...formData.salaryRange, max: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={formData.salaryRange.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryRange: { ...formData.salaryRange, currency: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RIASEC Profile (0-100)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(formData.riasecProfile).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-600 mb-1 capitalize">
                      {key}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          riasecProfile: {
                            ...formData.riasecProfile,
                            [key]: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

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
                {submitting ? 'Saving...' : career ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CareerManagementPage;
