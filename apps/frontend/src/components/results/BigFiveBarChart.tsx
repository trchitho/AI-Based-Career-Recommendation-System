import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BigFiveScores } from '../../types/results';

interface BigFiveBarChartProps {
  scores: BigFiveScores;
}

const BigFiveBarChart = ({ scores }: BigFiveBarChartProps) => {
  const data = [
    { trait: 'Openness', score: scores.openness, color: '#8B5CF6' }, // Violet
    { trait: 'Conscientiousness', score: scores.conscientiousness, color: '#3B82F6' }, // Blue
    { trait: 'Extraversion', score: scores.extraversion, color: '#10B981' }, // Emerald
    { trait: 'Agreeableness', score: scores.agreeableness, color: '#F59E0B' }, // Amber
    { trait: 'Neuroticism', score: scores.neuroticism, color: '#EF4444' }, // Red
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 z-50">
          <p className="font-semibold text-gray-800 mb-1">{data.trait}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></div>
            <span className="font-bold text-lg" style={{ color: data.color }}>
              {data.score.toFixed(0)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    // Xóa bỏ background, shadow, padding của khung bao
    <div className="w-full h-auto flex flex-col">

      {/* Nếu component cha chưa có tiêu đề, bạn có thể uncomment phần dưới. 
          Nếu cha đã có tiêu đề "Big Five..." rồi thì nên ẩn đi để tránh lặp. */}
      {/* <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">Big Five Personality Traits</h3>
        <p className="text-sm text-gray-500">Your personality profile across five key dimensions.</p>
      </div> */}

      <div className="flex flex-col md:flex-row items-center gap-6 mt-2">

        {/* Phần Chart - Bên trái */}
        <div className="w-full md:w-3/5 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              barSize={24} // Độ dày của thanh
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#E5E7EB" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="trait"
                width={120} // Tăng độ rộng để tên Trait không bị cắt
                tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />

              {/* Thanh Background màu xám nhạt */}
              <Bar
                dataKey="score"
                radius={4}
                background={{ fill: '#F3F4F6', radius: 4 }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Phần List chi tiết - Bên phải */}
        <div className="w-full md:w-2/5 flex flex-col gap-3">
          {data.map((item) => (
            <div
              key={item.trait}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              <div className="flex items-center gap-3">
                {/* Dấu chấm màu */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>

                <span className="text-sm font-semibold text-gray-700">
                  {item.trait}
                </span>
              </div>

              {/* Điểm số */}
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-md flex-shrink-0">
                <span
                  className="text-sm font-bold"
                  style={{ color: item.color }}
                >
                  {item.score.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BigFiveBarChart;