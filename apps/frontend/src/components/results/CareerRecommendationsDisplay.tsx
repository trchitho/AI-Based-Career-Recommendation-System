import { useNavigate } from 'react-router-dom';
import { CareerRecommendation } from '../../types/results';

interface CareerRecommendationsDisplayProps {
  recommendations: CareerRecommendation[];
}

const CareerRecommendationsDisplay = ({ recommendations }: CareerRecommendationsDisplayProps) => {
  const navigate = useNavigate();

  const handleViewRoadmap = (careerId: string, slug?: string) => {
    const key = slug || careerId;
    navigate(`/careers/${key}/roadmap`);
  };

  const prettify = (s?: string) => (s ? s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : '');

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return { text: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' };
    if (percentage >= 60) return { text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' };
    return { text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 font-['Plus_Jakarta_Sans']">

      <div className="mb-8">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <span className="w-2 h-6 bg-green-500 rounded-full"></span>
          Your Top Career Matches
        </h3>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl">
          Based on your assessment results, these careers align best with your personality, interests, and strengths.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Analyzing...</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Career recommendations are being generated. Please check back shortly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {recommendations.map((career, index) => {
            const style = getMatchColor(career.matchPercentage);

            return (
              <div
                key={career.id}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[24px] p-6 hover:border-green-200 dark:hover:border-green-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-100 dark:bg-gray-700 group-hover:bg-green-500 transition-colors"></div>

                <div className="pl-4 flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                        {career.matchPercentage}% Match
                      </span>
                      <span className="text-xs font-bold text-gray-400">#{index + 1} Recommendation</span>
                    </div>

                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {career.title || prettify(career.slug)}
                    </h4>

                    {career.industry_category && (
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {career.industry_category}
                      </p>
                    )}

                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2 mb-4">
                      {career.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {career.salary_range && (
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="font-bold">{career.salary_range}</span>
                        </div>
                      )}
                    </div>

                    {career.required_skills && career.required_skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {career.required_skills.slice(0, 4).map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300">
                            {skill}
                          </span>
                        ))}
                        {career.required_skills.length > 4 && (
                          <span className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-400">+{career.required_skills.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-end items-end min-w-[160px]">
                    <button
                      onClick={() => handleViewRoadmap(career.id, career.slug)}
                      className="w-full sm:w-auto px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:bg-green-600 dark:hover:bg-green-400 hover:text-white dark:hover:text-gray-900 transition-all shadow-lg flex items-center justify-center gap-2 group/btn"
                    >
                      View Roadmap
                      <svg className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default CareerRecommendationsDisplay;