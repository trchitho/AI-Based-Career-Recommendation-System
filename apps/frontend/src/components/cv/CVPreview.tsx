import { CV } from '../../types/cv';

interface CVPreviewProps {
    cv: CV;
}

const CVPreview = ({ cv }: CVPreviewProps) => {
    const { personalInfo, education, experience, skills, projects, certifications, languages } = cv;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg p-12 max-w-4xl mx-auto" style={{ minHeight: '297mm' }}>
            {/* Header - Centered */}
            <div className="text-center pb-8 mb-8">
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-3">
                    {personalInfo.fullName || 'Your Name'}
                </h1>
                <p className="text-gray-400 dark:text-gray-500 uppercase tracking-widest text-sm mb-6">
                    {personalInfo.summary || 'ADD YOUR TITLE'}
                </p>

                {/* Contact Info - Centered */}
                <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    {personalInfo.phone ? (
                        <span className="flex items-center gap-1">
                            <span>📞</span> {personalInfo.phone}
                        </span>
                    ) : (
                        <span className="text-gray-400">📞 Add your phone number</span>
                    )}

                    {personalInfo.email && (
                        <span className="flex items-center gap-1">
                            <span>✉️</span> {personalInfo.email}
                        </span>
                    )}

                    {personalInfo.dateOfBirth ? (
                        <span className="flex items-center gap-1">
                            <span>🎂</span> {new Date(personalInfo.dateOfBirth).toLocaleDateString()}
                        </span>
                    ) : (
                        <span className="text-gray-400">🎂 Add your date of birth</span>
                    )}
                </div>

                {personalInfo.address && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center justify-center gap-1">
                            <span>📍</span> {personalInfo.address}
                        </span>
                    </div>
                )}

                {!personalInfo.address && (
                    <div className="mt-3 text-sm text-gray-400">
                        📍 Add your current location
                    </div>
                )}
            </div>

            {/* Experience */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-gray-900 dark:border-white uppercase tracking-wide">
                    WORK EXPERIENCE
                </h2>
                {experience.length > 0 ? (
                    <div className="space-y-4">
                        {experience.map((exp, idx) => (
                            <div key={idx} className="pl-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {exp.position}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 font-semibold">{exp.company}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                                </p>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                    {exp.description}
                                </p>
                                {exp.achievements && exp.achievements.length > 0 && (
                                    <ul className="list-disc list-inside mt-2 text-gray-700 dark:text-gray-300">
                                        {exp.achievements.map((achievement, i) => (
                                            <li key={i}>{achievement}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 dark:text-gray-500 italic">Update your work experience</p>
                )}
            </div>

            {/* Education */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-gray-900 dark:border-white uppercase tracking-wide">
                    EDUCATION
                </h2>
                {education.length > 0 ? (
                    <div className="space-y-4">
                        {education.map((edu, idx) => (
                            <div key={idx} className="pl-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {edu.degree} in {edu.field}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 font-semibold">{edu.school}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {edu.startDate} - {edu.endDate || 'Present'}
                                    {edu.gpa && ` • GPA: ${edu.gpa}`}
                                </p>
                                {edu.description && (
                                    <p className="text-gray-700 dark:text-gray-300 mt-2">{edu.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 dark:text-gray-500 italic">Update your education background</p>
                )}
            </div>

            {/* Skills */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-gray-900 dark:border-white uppercase tracking-wide">
                    SKILL
                </h2>
                {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-semibold"
                            >
                                {skill.name} • {skill.level}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 dark:text-gray-500 italic">Update your specialist skills</p>
                )}
            </div>

            {/* Projects */}
            {projects && projects.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-gray-900 dark:border-white uppercase tracking-wide">
                        PROJECTS
                    </h2>
                    <div className="space-y-4">
                        {projects.map((project, idx) => (
                            <div key={idx} className="pl-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {project.name}
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">{project.description}</p>
                                {project.technologies && (
                                    <div className="flex flex-wrap gap-2">
                                        {project.technologies.map((tech, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Certifications */}
            {certifications && certifications.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="text-green-600">🏆</span> Certifications
                    </h2>
                    <div className="space-y-2">
                        {certifications.map((cert, idx) => (
                            <div key={idx} className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{cert.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{cert.issuer}</p>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{cert.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Languages */}
            {languages && languages.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="text-green-600">🌍</span> Languages
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {languages.map((lang, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold"
                            >
                                {lang.name} • {lang.proficiency}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CVPreview;
