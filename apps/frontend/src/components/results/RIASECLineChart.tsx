import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface RIASECLineChartProps {
  scores: {
    realistic?: number;
    investigative?: number;
    artistic?: number;
    social?: number;
    enterprising?: number;
    conventional?: number;
  };
}

const RIASECLineChart = ({ scores }: RIASECLineChartProps) => {
  const data = [
    { name: 'R', fullName: 'Realistic', score: scores?.realistic || 0, color: '#EF4444' },
    { name: 'I', fullName: 'Investigative', score: scores?.investigative || 0, color: '#F59E0B' },
    { name: 'A', fullName: 'Artistic', score: scores?.artistic || 0, color: '#10B981' },
    { name: 'S', fullName: 'Social', score: scores?.social || 0, color: '#3B82F6' },
    { name: 'E', fullName: 'Enterprising', score: scores?.enterprising || 0, color: '#8B5CF6' },
    { name: 'C', fullName: 'Conventional', score: scores?.conventional || 0, color: '#EC4899' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 z-50">
          <p className="font-semibold text-gray-800">{item.fullName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Score:</span>
            <span className="text-lg font-bold text-blue-600">{item.score.toFixed(0)}/100</span>
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
            <linearGradient id="riasecGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
            stroke="#3B82F6"
            strokeWidth={3}
            fill="url(#riasecGradient)"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5, stroke: '#fff' }}
            activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RIASECLineChart;
