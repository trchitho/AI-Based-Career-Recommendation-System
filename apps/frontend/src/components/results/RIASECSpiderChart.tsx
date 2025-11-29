import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { RIASECScores } from '../../types/results';

interface RIASECSpiderChartProps {
  scores: RIASECScores;
}

const RIASECSpiderChart = ({ scores }: RIASECSpiderChartProps) => {
  const data = [
    { dimension: 'Realistic', score: scores.realistic, fullName: 'Realistic (Doers)' },
    { dimension: 'Investigative', score: scores.investigative, fullName: 'Investigative (Thinkers)' },
    { dimension: 'Artistic', score: scores.artistic, fullName: 'Artistic (Creators)' },
    { dimension: 'Social', score: scores.social, fullName: 'Social (Helpers)' },
    { dimension: 'Enterprising', score: scores.enterprising, fullName: 'Enterprising (Persuaders)' },
    { dimension: 'Conventional', score: scores.conventional, fullName: 'Conventional (Organizers)' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white">{payload[0].payload.fullName}</p>
          <p className="text-[#4A7C59] dark:text-green-400 font-bold">{payload[0].value.toFixed(1)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">RIASEC Career Interest Profile</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Your scores across six career interest dimensions. Higher scores indicate stronger alignment.
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="dimension" 
            tick={{ fill: '#374151', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#4A7C59"
            fill="#4A7C59"
            fillOpacity={0.6}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item) => (
          <div key={item.dimension} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.fullName}</span>
            <span className="text-sm font-bold text-[#4A7C59] dark:text-green-400">{item.score.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RIASECSpiderChart;
