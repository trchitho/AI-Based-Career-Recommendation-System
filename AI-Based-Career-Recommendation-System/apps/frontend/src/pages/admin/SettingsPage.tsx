import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

const SettingsPage = () => {
  const [form, setForm] = useState<any>({ logo_url: '', app_title: '', app_name: '', footer_html: '' });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await adminService.getSettings();
      setForm(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaved(null); setError(null);
    try {
      await adminService.updateSettings(form);
      setSaved('Saved');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">App Settings</h2>
      {loading ? <div>Loading...</div> : (
        <form onSubmit={save} className="space-y-4 max-w-xl">
          <input className="w-full border rounded px-3 py-2" placeholder="Logo URL" value={form.logo_url || ''} onChange={(e)=>setForm({...form, logo_url:e.target.value})} />
          <input className="w-full border rounded px-3 py-2" placeholder="App Title" value={form.app_title || ''} onChange={(e)=>setForm({...form, app_title:e.target.value})} />
          <input className="w-full border rounded px-3 py-2" placeholder="App Name" value={form.app_name || ''} onChange={(e)=>setForm({...form, app_name:e.target.value})} />
          <textarea className="w-full border rounded px-3 py-2 h-32" placeholder="Footer HTML" value={form.footer_html || ''} onChange={(e)=>setForm({...form, footer_html:e.target.value})} />
          <button className="px-4 py-2 bg-purple-600 text-white rounded">Save</button>
          {saved && <span className="ml-3 text-green-700">{saved}</span>}
          {error && <div className="text-red-700">{error}</div>}
        </form>
      )}
    </div>
  );
};

export default SettingsPage;

