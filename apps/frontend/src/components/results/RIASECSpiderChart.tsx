import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { RIASECScores } from '../../types/results';

interface RIASECSpiderChartProps {
  scores: RIASECScores;
}

const DIMENSIONS = [
  { key: 'realistic',     label: 'Realistic',     sub: 'Doers',      color: '#EF4444' },
  { key: 'investigative', label: 'Investigative',  sub: 'Thinkers',   color: '#F59E0B' },
  { key: 'artistic',      label: 'Artistic',       sub: 'Creators',   color: '#10B981' },
  { key: 'social',        label: 'Social',         sub: 'Helpers',    color: '#3B82F6' },
  { key: 'enterprising',  label: 'Enterprising',   sub: 'Persuaders', color: '#8B5CF6' },
  { key: 'conventional',  label: 'Conventional',   sub: 'Organizers', color: '#EC4899' },
];

const RIASECSpiderChart = ({ scores }: RIASECSpiderChartProps) => {
  const hasRealData = scores && Object.values(scores).some(v => v > 0);

  const fallback = [65, 78, 72, 85, 58, 63];
  const data = DIMENSIONS.map((d, i) => ({
    dimension: d.label,
    score: (scores as any)?.[d.key] ?? (hasRealData ? 0 : fallback[i]),
    color: d.color,
    sub: d.sub,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-bold text-gray-800 mb-1">{item.dimension}</p>
        <p className="text-gray-500">{item.sub}</p>
        <p className="text-xl font-extrabold mt-1" style={{ color: item.color }}>
          {item.score.toFixed(0)}<span className="text-xs font-normal text-gray-400 ml-1">/100</span>
        </p>
      </div>
    );
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return (
      <circle cx={cx} cy={cy} r={5} fill={payload.color} stroke="#fff" strokeWidth={2} />
    );
  };

  return (
    <div className="w-full">
      {!hasRealData && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
          Dữ liệu mẫu — hoàn thành bài test để xem kết quả thực tế.
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-6">

        {/* Radar chart */}
        <div className="w-full md:w-[340px] h-[300px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%" cy="50%"
              outerRadius="55%"
              margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
              data={data}
            >
              <PolarGrid gridType="polygon" stroke="#d1d5db" strokeWidth={1} />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fill="#6366f1"
                fillOpacity={0.4}
                dot={<CustomDot />}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score list */}
        <div className="flex-1 w-full flex flex-col gap-2">
          {[...data]
            .sort((a, b) => b.score - a.score)
            .map(item => (
              <div key={item.dimension} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: item.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      {item.dimension}
                      <span className="text-xs font-normal text-gray-400 ml-1">({item.sub})</span>
                    </span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>
                      {item.score.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.score}%`, background: item.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default RIASECSpiderChart;
