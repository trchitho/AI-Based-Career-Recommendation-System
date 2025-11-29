import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BigFiveScores } from '../../types/results';

interface BigFiveBarChartProps {
  scores: BigFiveScores;
}

const BigFiveBarChart = ({ scores }: BigFiveBarChartProps) => {
  const data = [
    { trait: 'Openness', score: scores.openness, color: '#8b5cf6' },
    { trait: 'Conscientiousness', score: scores.conscientiousness, color: '#3b82f6' },
    { trait: 'Extraversion', score: scores.extraversion, color: '#10b981' },
    { trait: 'Agreeableness', score: scores.agreeableness, color: '#f59e0b' },
    { trait: 'Neuroticism', score: scores.neuroticism, color: '#ef4444' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{payload[0].payload.trait}</p>
          <p className="font-bold" style={{ color: payload[0].payload.color }}>
            {payload[0].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Big Five Personality Traits</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Your personality profile across five key dimensions. Scores indicate the strength of each trait.
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis 
            type="category" 
            dataKey="trait"
            tick={{ fill: '#374151', fontSize: 13 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="score" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 space-y-3">
        {data.map((item) => (
          <div key={item.trait} className="flex items-center">
            <div 
              className="w-4 h-4 rounded mr-3" 
              style={{ backgroundColor: item.color }}
            ></div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.trait}</span>
              <span className="text-sm font-bold" style={{ color: item.color }}>
                {item.score.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BigFiveBarChart;
