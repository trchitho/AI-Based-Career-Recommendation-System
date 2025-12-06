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

const RIASECSpiderChart = ({ scores }: RIASECSpiderChartProps) => {
  const data = [
    { dimension: 'Realistic', score: scores.realistic, fullName: 'Realistic (Doers)', color: '#EF4444' },
    { dimension: 'Investigative', score: scores.investigative, fullName: 'Investigative (Thinkers)', color: '#F59E0B' },
    { dimension: 'Artistic', score: scores.artistic, fullName: 'Artistic (Creators)', color: '#10B981' },
    { dimension: 'Social', score: scores.social, fullName: 'Social (Helpers)', color: '#3B82F6' },
    { dimension: 'Enterprising', score: scores.enterprising, fullName: 'Enterprising (Persuaders)', color: '#8B5CF6' },
    { dimension: 'Conventional', score: scores.conventional, fullName: 'Conventional (Organizers)', color: '#EC4899' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 z-50">
          <p className="font-semibold text-gray-800">{payload[0].payload.fullName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Score:</span>
            <span className="text-lg font-bold text-indigo-600">{payload[0].value.toFixed(1)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    // THAY ĐỔI QUAN TRỌNG:
    // Xóa bỏ: bg-white, shadow-md, border, p-6, rounded-xl
    // Chỉ giữ lại w-full để nó chiếm hết chiều rộng của khung cha
    <div className="w-full h-auto">

      {/* Lưu ý: Nếu ở khung cha (Parent Component) ĐÃ CÓ tiêu đề "RIASEC Interest Profile" rồi 
         thì bạn nên xóa hoặc ẩn thẻ div dưới đây đi để tránh bị lặp lại 2 tiêu đề.
         Nếu chưa có thì giữ lại.
      */}
      {/* <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">RIASEC Interest Profile</h3>
        <p className="text-sm text-gray-500">Biểu đồ thể hiện mức độ phù hợp...</p>
      </div> */}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">

        {/* Phần biểu đồ */}
        <div className="w-full md:w-1/2 h-[300px] relative flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            {/* outerRadius="70%" để cân đối trong khung mới */}
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid gridType="polygon" stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }}
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
                stroke="#4F46E5"
                strokeWidth={3}
                fill="#6366f1"
                fillOpacity={0.4}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeWidth: 2 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Phần danh sách điểm */}
        <div className="w-full md:w-1/2 flex flex-col gap-3 pb-4 md:pb-0">
          {data.map((item) => (
            <div
              key={item.dimension}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700 leading-tight">
                    {item.dimension}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {item.fullName.split('(')[1].replace(')', '')}
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-md flex-shrink-0">
                <span className="text-sm font-bold text-gray-800">
                  {item.score.toFixed(0)}
                </span>
                <span className="text-[10px] text-gray-500 ml-1">/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RIASECSpiderChart;