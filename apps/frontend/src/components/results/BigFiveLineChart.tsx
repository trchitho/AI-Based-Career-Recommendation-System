import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface BigFiveLineChartProps {
  scores: {
    openness?: number;
    conscientiousness?: number;
    extraversion?: number;
    agreeableness?: number;
    neuroticism?: number;
  };
}

const BigFiveLineChart = ({ scores }: BigFiveLineChartProps) => {
  const data = [
    { name: 'O', fullName: 'Openness', score: scores?.openness || 0, color: '#8B5CF6' },
    { name: 'C', fullName: 'Conscientiousness', score: scores?.conscientiousness || 0, color: '#3B82F6' },
    { name: 'E', fullName: 'Extraversion', score: scores?.extraversion || 0, color: '#10B981' },
    { name: 'A', fullName: 'Agreeableness', score: scores?.agreeableness || 0, color: '#F59E0B' },
    { name: 'N', fullName: 'Neuroticism', score: scores?.neuroticism || 0, color: '#EF4444' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 z-50">
          <p className="font-semibold text-gray-800">{item.fullName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Score:</span>
            <span className="text-lg font-bold text-purple-600">{item.score.toFixed(0)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="bigfiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#8B5CF6"
            strokeWidth={3}
            fill="url(#bigfiveGradient)"
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5, stroke: '#fff' }}
            activeDot={{ r: 7, stroke: '#8B5CF6', strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BigFiveLineChart;
