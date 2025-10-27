import { useNavigate } from 'react-router-dom';
import { CareerRecommendation } from '../../types/results';

interface CareerRecommendationsDisplayProps {
  recommendations: CareerRecommendation[];
}

const CareerRecommendationsDisplay = ({ recommendations }: CareerRecommendationsDisplayProps) => {
  const navigate = useNavigate();

  const handleViewRoadmap = (careerId: string) => {
    navigate(`/careers/${careerId}/roadmap`);
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-blue-600 bg-blue-100';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Your Top Career Matches
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Based on your assessment results, here are careers that align with your interests and personality.
      </p>

      {recommendations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Career recommendations are being generated. Please check back shortly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((career, index) => (
            <div
              key={career.id}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                    <span className="text-indigo-600 font-bold text-lg">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{career.title}</h4>
                    {career.industry_category && (
                      <p className="text-xs text-gray-500">{career.industry_category}</p>
                    )}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full font-semibold text-sm ${getMatchColor(career.matchPercentage)}`}>
                  {career.matchPercentage}% Match
                </div>
              </div>

              <p className="text-gray-700 mb-4">{career.description}</p>

              {career.salary_range && (
                <div className="mb-3">
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Salary Range:</span> {career.salary_range}
                  </span>
                </div>
              )}

              {career.required_skills && career.required_skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Key Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {career.required_skills.slice(0, 5).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                    {career.required_skills.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        +{career.required_skills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleViewRoadmap(career.id)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
              >
                View Learning Roadmap
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerRecommendationsDisplay;
