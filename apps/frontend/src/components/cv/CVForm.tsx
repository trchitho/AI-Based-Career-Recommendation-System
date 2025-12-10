import { useState, useEffect } from 'react';
import { CV, CVEducation, CVExperience, CVSkill, CVProject } from '../../types/cv';
import api from '../../lib/api';

interface CVFormProps {
    initialData?: CV;
    onSave: (cv: Partial<CV>) => void;
    onCancel: () => void;
    onChange?: (cv: Partial<CV>) => void;
}

const CVForm = ({ initialData, onSave, onCancel, onChange }: CVFormProps) => {
    const [cv, setCV] = useState<Partial<CV>>(
        initialData || {
            title: 'My CV',
            template: 'modern',
            personalInfo: {
                fullName: '',
                email: '',
                phone: '',
                address: '',
                summary: '',
            },
            education: [],
            experience: [],
            skills: [],
            projects: [],
            certifications: [],
            languages: [],
        }
    );

    const [activeSection, setActiveSection] = useState<string>('personal');
    const [importing, setImporting] = useState(false);

    // Sync with initialData when it changes (for auto-fill)
    useEffect(() => {
        if (initialData) {
            setCV(initialData);
        }
    }, [initialData]);

    // Helper to update CV and notify parent
    const updateCV = (newCV: Partial<CV>) => {
        setCV(newCV);
        onChange?.(newCV);
    };

    const importFromProfile = async () => {
        try {
            setImporting(true);

            // Get profile data
            const profileResponse = await api.get('/api/users/me');
            const profile = profileResponse.data;

            // Get assessment history to extract career recommendations
            let careerSummary = cv.personalInfo?.summary || '';
            try {
                const historyResponse = await api.get(`/api/users/${profile.id}/history`);
                const history = historyResponse.data;

                if (history && history.length > 0) {
                    const latestAssessment = history[0];
                    const riasecScores = latestAssessment.riasec_scores;

                    if (riasecScores) {
                        // Find top 3 RIASEC dimensions
                        const dimensions = Object.entries(riasecScores)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 3)
                            .map(([key]) => key);

                        // Map RIASEC to career interests
                        const careerMap: Record<string, string> = {
                            realistic: 'hands-on technical work and practical problem-solving',
                            investigative: 'research, analysis, and intellectual challenges',
                            artistic: 'creative expression and innovative design',
                            social: 'helping others and collaborative teamwork',
                            enterprising: 'leadership, business development, and strategic initiatives',
                            conventional: 'organization, data management, and systematic processes',
                        };

                        const interests = dimensions
                            .map(dim => careerMap[dim])
                            .filter(Boolean)
                            .join(', ');

                        if (interests) {
                            careerSummary = `Motivated professional with strong interests in ${interests}. Seeking opportunities to leverage my skills and passion to contribute to organizational success.`;
                        }
                    }
                }
            } catch (historyError) {
                console.log('Could not fetch assessment history:', historyError);
                // Continue without career summary
            }

            // Map profile data to CV format
            const updatedCV = {
                ...cv,
                personalInfo: {
                    ...cv.personalInfo,
                    fullName: profile.full_name || cv.personalInfo?.fullName || '',
                    email: profile.email || cv.personalInfo?.email || '',
                    dateOfBirth: profile.date_of_birth || cv.personalInfo?.dateOfBirth || '',
                    phone: cv.personalInfo?.phone || '',
                    address: cv.personalInfo?.address || '',
                    linkedin: cv.personalInfo?.linkedin || '',
                    github: cv.personalInfo?.github || '',
                    summary: careerSummary,
                },
            };
            updateCV(updatedCV);

            alert('Profile data imported successfully! Career interests have been added to your summary based on your assessment results.');
        } catch (error) {
            console.error('Error importing profile:', error);
            alert('Failed to import profile data. Please try again.');
        } finally {
            setImporting(false);
        }
    };

    const handlePersonalInfoChange = (field: string, value: string) => {
        updateCV({
            ...cv,
            personalInfo: {
                ...cv.personalInfo!,
                [field]: value,
            },
        });
    };

    const addEducation = () => {
        updateCV({
            ...cv,
            education: [
                ...(cv.education || []),
                { school: '', degree: '', field: '', startDate: '', endDate: '' },
            ],
        });
    };

    const updateEducation = (index: number, field: keyof CVEducation, value: string) => {
        const updated = [...(cv.education || [])];
        updated[index] = { ...updated[index], [field]: value };
        updateCV({ ...cv, education: updated });
    };

    const removeEducation = (index: number) => {
        updateCV({ ...cv, education: cv.education?.filter((_, i) => i !== index) });
    };

    const addExperience = () => {
        updateCV({
            ...cv,
            experience: [
                ...(cv.experience || []),
                { company: '', position: '', startDate: '', description: '', current: false },
            ],
        });
    };

    const updateExperience = (index: number, field: keyof CVExperience, value: any) => {
        const updated = [...(cv.experience || [])];
        updated[index] = { ...updated[index], [field]: value };
        updateCV({ ...cv, experience: updated });
    };

    const removeExperience = (index: number) => {
        updateCV({ ...cv, experience: cv.experience?.filter((_, i) => i !== index) });
    };

    const addSkill = () => {
        updateCV({
            ...cv,
            skills: [...(cv.skills || []), { name: '', level: 'Intermediate' as const }],
        });
    };

    const updateSkill = (index: number, field: keyof CVSkill, value: any) => {
        const updated = [...(cv.skills || [])];
        updated[index] = { ...updated[index], [field]: value };
        updateCV({ ...cv, skills: updated });
    };

    const removeSkill = (index: number) => {
        updateCV({ ...cv, skills: cv.skills?.filter((_, i) => i !== index) });
    };

    const addProject = () => {
        updateCV({
            ...cv,
            projects: [...(cv.projects || []), { name: '', description: '', technologies: [] }],
        });
    };

    const updateProject = (index: number, field: keyof CVProject, value: any) => {
        const updated = [...(cv.projects || [])];
        updated[index] = { ...updated[index], [field]: value };
        updateCV({ ...cv, projects: updated });
    };

    const removeProject = (index: number) => {
        updateCV({ ...cv, projects: cv.projects?.filter((_, i) => i !== index) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(cv);
    };

    const sections = [
        { id: 'personal', label: 'Personal Info', icon: '👤' },
        { id: 'experience', label: 'Experience', icon: '💼' },
        { id: 'education', label: 'Education', icon: '🎓' },
        { id: 'skills', label: 'Skills', icon: '⚡' },
        { id: 'projects', label: 'Projects', icon: '🚀' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* CV Title */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    CV Title
                </label>
                <input
                    type="text"
                    value={cv.title}
                    onChange={(e) => updateCV({ ...cv, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                    required
                />
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeSection === section.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        {section.icon} {section.label}
                    </button>
                ))}
            </div>

            {/* Personal Info Section */}
            {activeSection === 'personal' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personal Information</h3>
                        <button
                            type="button"
                            onClick={importFromProfile}
                            disabled={importing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Importing...
                                </>
                            ) : (
                                <>
                                    📥 Import from Profile
                                </>
                            )}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Full Name *"
                            value={cv.personalInfo?.fullName}
                            onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email *"
                            value={cv.personalInfo?.email}
                            onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                            required
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            value={cv.personalInfo?.phone}
                            onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                            type="date"
                            placeholder="Date of Birth"
                            value={cv.personalInfo?.dateOfBirth}
                            onChange={(e) => handlePersonalInfoChange('dateOfBirth', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                            type="text"
                            placeholder="Address"
                            value={cv.personalInfo?.address}
                            onChange={(e) => handlePersonalInfoChange('address', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                            type="url"
                            placeholder="LinkedIn URL"
                            value={cv.personalInfo?.linkedin}
                            onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                            type="url"
                            placeholder="GitHub URL"
                            value={cv.personalInfo?.github}
                            onChange={(e) => handlePersonalInfoChange('github', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                    <textarea
                        placeholder="Professional Summary"
                        value={cv.personalInfo?.summary}
                        onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                    />
                </div>
            )}

            {/* Experience Section */}
            {activeSection === 'experience' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Work Experience</h3>
                        <button
                            type="button"
                            onClick={addExperience}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                            + Add Experience
                        </button>
                    </div>
                    {cv.experience?.map((exp, index) => (
                        <div key={index} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
                            <div className="flex justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white">Experience #{index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeExperience(index)}
                                    className="text-red-600 hover:text-red-700 font-semibold"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Company *"
                                    value={exp.company}
                                    onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Position *"
                                    value={exp.position}
                                    onChange={(e) => updateExperience(index, 'position', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                    required
                                />
                                <input
                                    type="month"
                                    placeholder="Start Date"
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                />
                                <input
                                    type="month"
                                    placeholder="End Date"
                                    value={exp.endDate}
                                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                                    disabled={exp.current}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                                />
                            </div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={exp.current}
                                    onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Currently working here</span>
                            </label>
                            <textarea
                                placeholder="Description *"
                                value={exp.description}
                                onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                required
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Education Section */}
            {activeSection === 'education' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Education</h3>
                        <button
                            type="button"
                            onClick={addEducation}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                            + Add Education
                        </button>
                    </div>
                    {cv.education?.map((edu, index) => (
                        <div key={index} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
                            <div className="flex justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white">Education #{index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeEducation(index)}
                                    className="text-red-600 hover:text-red-700 font-semibold"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="School *"
                                    value={edu.school}
                                    onChange={(e) => updateEducation(index, 'school', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Degree *"
                                    value={edu.degree}
                                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Field of Study *"
                                    value={edu.field}
                                    onChange={(e) => updateEducation(index, 'field', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="GPA"
                                    value={edu.gpa}
                                    onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                />
                                <input
                                    type="month"
                                    placeholder="Start Date"
                                    value={edu.startDate}
                                    onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                />
                                <input
                                    type="month"
                                    placeholder="End Date"
                                    value={edu.endDate}
                                    onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Skills Section */}
            {activeSection === 'skills' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Skills</h3>
                        <button
                            type="button"
                            onClick={addSkill}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                            + Add Skill
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cv.skills?.map((skill, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Skill name *"
                                    value={skill.name}
                                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                    required
                                />
                                <select
                                    value={skill.level}
                                    onChange={(e) => updateSkill(index, 'level', e.target.value)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeSkill(index)}
                                    className="px-3 py-2 text-red-600 hover:text-red-700 font-semibold"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects Section */}
            {activeSection === 'projects' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Projects</h3>
                        <button
                            type="button"
                            onClick={addProject}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                            + Add Project
                        </button>
                    </div>
                    {cv.projects?.map((project, index) => (
                        <div key={index} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
                            <div className="flex justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white">Project #{index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeProject(index)}
                                    className="text-red-600 hover:text-red-700 font-semibold"
                                >
                                    Remove
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Project Name *"
                                value={project.name}
                                onChange={(e) => updateProject(index, 'name', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                required
                            />
                            <textarea
                                placeholder="Description *"
                                value={project.description}
                                onChange={(e) => updateProject(index, 'description', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Technologies (comma separated)"
                                value={project.technologies?.join(', ')}
                                onChange={(e) =>
                                    updateProject(
                                        index,
                                        'technologies',
                                        e.target.value.split(',').map((t) => t.trim())
                                    )
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all"
                >
                    Save CV
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default CVForm;
