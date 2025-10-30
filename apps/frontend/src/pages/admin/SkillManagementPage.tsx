import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";
import { Skill, SkillFormData, LearningResource } from "../../types/admin";

const SkillManagementPage = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
      console.error("Error loading skills:", error);
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
      console.error("Error deleting skill:", error);
      alert("Failed to delete skill");
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

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Skill Management</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Skill
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search Skills
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, description, or category..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Skill List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading skills...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proficiency Levels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resources
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSkills.map((skill) => (
                <tr key={skill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {skill.name}
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-2">
                      {skill.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {skill.category || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {skill.proficiency_levels?.length || 0} levels
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {skill.learning_resources?.length || 0} resources
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(skill)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    {deleteConfirm === skill.id ? (
                      <span className="space-x-2">
                        <button
                          onClick={() => handleDelete(skill.id)}
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
                        onClick={() => setDeleteConfirm(skill.id)}
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
          {filteredSkills.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No skills found</p>
            </div>
          )}
        </div>
      )}

      {/* Skill Form Modal */}
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

const SkillFormModal: React.FC<SkillFormModalProps> = ({
  skill,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SkillFormData>({
    name: skill?.name || "",
    description: skill?.description || "",
    category: skill?.category || "",
    proficiencyLevels: skill?.proficiency_levels || [],
    learningResources: skill?.learning_resources || [],
  });
  const [levelInput, setLevelInput] = useState("");
  const [resourceInput, setResourceInput] = useState<LearningResource>({
    title: "",
    url: "",
    type: "course",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (skill) {
        await adminService.updateSkill(skill.id, formData);
      } else {
        await adminService.createSkill(formData);
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving skill:", error);
      alert("Failed to save skill");
    } finally {
      setSubmitting(false);
    }
  };

  const addLevel = () => {
    if (
      levelInput.trim() &&
      !formData.proficiencyLevels.includes(levelInput.trim())
    ) {
      setFormData({
        ...formData,
        proficiencyLevels: [...formData.proficiencyLevels, levelInput.trim()],
      });
      setLevelInput("");
    }
  };

  const removeLevel = (level: string) => {
    setFormData({
      ...formData,
      proficiencyLevels: formData.proficiencyLevels.filter((l) => l !== level),
    });
  };

  const addResource = () => {
    if (resourceInput.title.trim() && resourceInput.url.trim()) {
      setFormData({
        ...formData,
        learningResources: [...formData.learningResources, resourceInput],
      });
      setResourceInput({ title: "", url: "", type: "course" });
    }
  };

  const removeResource = (index: number) => {
    setFormData({
      ...formData,
      learningResources: formData.learningResources.filter(
        (_, i) => i !== index,
      ),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {skill ? "Edit Skill" : "Add Skill"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proficiency Levels
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={levelInput}
                  onChange={(e) => setLevelInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addLevel())
                  }
                  placeholder="e.g., Beginner, Intermediate, Advanced"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addLevel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.proficiencyLevels.map((level) => (
                  <span
                    key={level}
                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {level}
                    <button
                      type="button"
                      onClick={() => removeLevel(level)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Resources
              </label>
              <div className="space-y-2 mb-2">
                <input
                  type="text"
                  value={resourceInput.title}
                  onChange={(e) =>
                    setResourceInput({
                      ...resourceInput,
                      title: e.target.value,
                    })
                  }
                  placeholder="Resource title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="url"
                  value={resourceInput.url}
                  onChange={(e) =>
                    setResourceInput({ ...resourceInput, url: e.target.value })
                  }
                  placeholder="Resource URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <select
                    value={resourceInput.type}
                    onChange={(e) =>
                      setResourceInput({
                        ...resourceInput,
                        type: e.target.value as any,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="course">Course</option>
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="book">Book</option>
                  </select>
                  <button
                    type="button"
                    onClick={addResource}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Add Resource
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {formData.learningResources.map((resource, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {resource.title}
                      </p>
                      <p className="text-xs text-gray-500">{resource.url}</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {resource.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeResource(index)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
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
                {submitting ? "Saving..." : skill ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SkillManagementPage;
