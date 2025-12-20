import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';

interface MilestoneForm {
  order?: number;
  skillName: string;
  description?: string;
  estimatedDuration?: string;
  resources?: { title: string; url: string; type: 'course' | 'article' | 'video' | 'book' }[];
}

const RoadmapEditorPage = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [milestones, setMilestones] = useState<MilestoneForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expText, setExpText] = useState('');
  const [degreeText, setDegreeText] = useState('');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [salaryAvg, setSalaryAvg] = useState<string>('');
  const [salaryCurrency, setSalaryCurrency] = useState('VND');
  const [salaryBands, setSalaryBands] = useState<string>('[]');

  useEffect(() => {
    const load = async () => {
      if (!careerId) return;
      try {
        setLoading(true);
        const data = await adminService.getRoadmapByCareer(careerId);
        setTitle(data.title || '');
        setMilestones((data.milestones || []).map((m: any) => ({
          order: m.order,
          skillName: m.skillName,
          description: m.description,
          estimatedDuration: m.estimatedDuration,
          resources: m.resources || [],
        })));
        if (data.overview) {
          setExpText(data.overview.experienceText || '');
          setDegreeText(data.overview.degreeText || '');
          setSalaryMin(data.overview.salaryMin != null ? String(data.overview.salaryMin) : '');
          setSalaryMax(data.overview.salaryMax != null ? String(data.overview.salaryMax) : '');
          setSalaryAvg(data.overview.salaryAvg != null ? String(data.overview.salaryAvg) : '');
          setSalaryCurrency(data.overview.salaryCurrency || 'VND');
          try { setSalaryBands(JSON.stringify(data.overview.salaryBands || [], null, 0)); } catch { setSalaryBands('[]'); }
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Không tải được lộ trình');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [careerId]);

  const addMilestone = () => {
    const nextOrder = (milestones[milestones.length - 1]?.order || milestones.length) + 1;
    setMilestones([...milestones, { order: nextOrder, skillName: '', description: '', estimatedDuration: '', resources: [] }]);
  };

  const updateMilestone = (idx: number, patch: Partial<MilestoneForm>) => {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order: i + 1 })));
  };

  const save = async () => {
    if (!careerId) return;
    try {
      setSaving(true);
      setError(null);
      let bands: any[] = [];
      try { bands = JSON.parse(salaryBands || '[]'); } catch { bands = []; }
      const payload = { title, milestones, overview: {
        experienceText: expText,
        degreeText,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
        salaryAvg: salaryAvg ? Number(salaryAvg) : undefined,
        salaryCurrency,
        salaryBands: bands,
      } };
      await adminService.upsertRoadmap(careerId, payload as any);
      navigate('/admin/careers');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Lưu lộ trình thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Chỉnh sửa Lộ trình nghề nghiệp</h1>
          <Link to="/admin/careers" className="text-indigo-600 hover:text-indigo-800">Quay lại</Link>
        </div>

        {loading ? (
          <div>Đang tải...</div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded">{error}</div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề lộ trình</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Các mốc (Milestones)</h2>
                <button onClick={addMilestone} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">+ Thêm mốc</button>
              </div>

              <div className="space-y-4">
                {milestones.map((m, idx) => (
                  <div key={idx} className="border rounded p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Thứ tự</label>
                        <input type="number" value={m.order || idx + 1} onChange={(e) => updateMilestone(idx, { order: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium mb-1">Kỹ năng/Mốc</label>
                        <input value={m.skillName} onChange={(e) => updateMilestone(idx, { skillName: e.target.value })} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium mb-1">Mô tả</label>
                        <textarea value={m.description || ''} onChange={(e) => updateMilestone(idx, { description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Thời lượng ước tính</label>
                        <input value={m.estimatedDuration || ''} onChange={(e) => updateMilestone(idx, { estimatedDuration: e.target.value })} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Tài nguyên (JSON)</label>
                        <textarea
                          value={JSON.stringify(m.resources || [], null, 0)}
                          onChange={(e) => {
                            try {
                              const val = JSON.parse(e.target.value || '[]');
                              updateMilestone(idx, { resources: val });
                            } catch {
                              // ignore invalid json in typing
                            }
                          }}
                          className="w-full border rounded px-3 py-2 font-mono text-xs"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => removeMilestone(idx)} className="px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100">Xóa mốc</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overview fields */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kinh nghiệm yêu cầu</label>
                  <input value={expText} onChange={(e)=>setExpText(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bằng cấp</label>
                  <input value={degreeText} onChange={(e)=>setDegreeText(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lương tối thiểu (triệu)</label>
                  <input type="number" step="0.1" value={salaryMin} onChange={(e)=>setSalaryMin(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lương tối đa (triệu)</label>
                  <input type="number" step="0.1" value={salaryMax} onChange={(e)=>setSalaryMax(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lương trung bình (triệu)</label>
                  <input type="number" step="0.1" value={salaryAvg} onChange={(e)=>setSalaryAvg(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn vị tiền tệ</label>
                  <input value={salaryCurrency} onChange={(e)=>setSalaryCurrency(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Salary bands (JSON) - [{'{'}label, value{'}'}]</label>
                  <textarea value={salaryBands} onChange={(e)=>setSalaryBands(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 font-mono text-xs" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button disabled={saving} onClick={save} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Đang lưu...' : 'Lưu lộ trình'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default RoadmapEditorPage;
