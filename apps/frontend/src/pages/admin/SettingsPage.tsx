import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/adminService';

type FooterItem = { label: string; href?: string };
type FooterColumn = { title: string; items: FooterItem[] };
type FooterLayout = { columns: FooterColumn[]; note?: string };

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function layoutToHtml(layout: FooterLayout): string {
  const cols = layout.columns.length || 1;
  const gridTemplate = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:16px;`;
  const colHtml = layout.columns
    .map((col) => {
      const items = (col.items || [])
        .map((it) => {
          const label = escapeHtml(it.label || '');
          if (it.href) {
            const href = escapeHtml(it.href);
            return `<li style=\"margin:6px 0;\"><a href=\"${href}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:inherit;text-decoration:underline;opacity:.95;\">${label}</a></li>`;
          }
          return `<li style=\"margin:6px 0;\">${label}</li>`;
        })
        .join('');
      return `
        <div>
          <div style=\"font-weight:600;margin-bottom:8px;\">${escapeHtml(col.title || '')}</div>
          <ul style=\"list-style:none;padding:0;margin:0;\">${items}</ul>
        </div>`;
    })
    .join('');

  const noteHtml = layout.note
    ? `<div style=\"margin-top:16px;font-size:12px;opacity:.85;\">${escapeHtml(layout.note)}</div>`
    : '';

  return `
    <div class=\"app-footer\" style=\"max-width:1200px;margin:0 auto;padding:16px;text-align:left;\">
      <div style=\"${gridTemplate}\">${colHtml}</div>
      ${noteHtml}
    </div>
  `;
}

const SettingsPage = () => {
  const [form, setForm] = useState<any>({ logo_url: '', app_title: '', app_name: '', footer_html: '' });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [footer, setFooter] = useState<FooterLayout>({ columns: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await adminService.getSettings();
      setForm(data);
       // Attempt to parse a layout snapshot if footer_html was generated previously
      try {
        const markerStart = '<!--layout:';
        const markerEnd = ':layout-->';
        const html: string = data?.footer_html || '';
        const start = html.indexOf(markerStart);
        const end = html.indexOf(markerEnd);
        if (start >= 0 && end > start) {
          const json = html.substring(start + markerStart.length, end);
          const parsed = JSON.parse(json);
          setFooter(parsed);
        }
      } catch {
        // ignore if not found or invalid
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doSave = async () => {
    setSaved(null); setError(null);
    try {
      await adminService.updateSettings(form);
      setSaved('Saved');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed');
    }
  };

  const save = async (e: React.FormEvent) => { e.preventDefault(); await doSave(); };

  const generatedHtml = useMemo(() => {
    if (!footer || !footer.columns?.length) return '';
    const html = layoutToHtml(footer);
    // Embed the layout JSON as an HTML comment for later editing
    return `<!--layout:${JSON.stringify(footer)}:layout-->` + html;
  }, [footer]);

  const addColumn = () => setFooter((f) => ({ ...f, columns: [...f.columns, { title: 'New Column', items: [] }] }));
  const removeColumn = (idx: number) => setFooter((f) => ({ ...f, columns: f.columns.filter((_, i) => i !== idx) }));
  const updateColumnTitle = (idx: number, title: string) => setFooter((f) => ({ ...f, columns: f.columns.map((c, i) => i === idx ? { ...c, title } : c) }));
  const addItem = (cIdx: number) => setFooter((f) => ({ ...f, columns: f.columns.map((c, i) => i === cIdx ? { ...c, items: [...c.items, { label: 'Item', href: '' }] } : c) }));
  const removeItem = (cIdx: number, iIdx: number) => setFooter((f) => ({ ...f, columns: f.columns.map((c, i) => i === cIdx ? { ...c, items: c.items.filter((_, j) => j !== iIdx) } : c) }));
  const updateItem = (cIdx: number, iIdx: number, patch: Partial<FooterItem>) => setFooter((f) => ({ ...f, columns: f.columns.map((c, i) => i === cIdx ? { ...c, items: c.items.map((it, j) => j === iIdx ? { ...it, ...patch } : it) } : c) }));

  const applyGeneratedToForm = () => {
    if (!generatedHtml) return;
    setForm((s: any) => ({ ...s, footer_html: generatedHtml }));
    setShowPreview(true);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">App Settings</h2>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-10">
          <form onSubmit={save} className="space-y-4 max-w-3xl">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input className="w-full border rounded px-3 py-2" placeholder="Logo URL" value={form.logo_url || ''} onChange={(e)=>setForm({...form, logo_url:e.target.value})} />
                <label className="px-3 py-2 bg-gray-100 rounded cursor-pointer whitespace-nowrap">
                  <input type="file" accept="image/*" hidden onChange={async (e)=>{
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      const res = await adminService.uploadMedia(f);
                      setForm((s:any)=>({ ...s, logo_url: res.url }));
                    } catch (err:any) {
                      setError(err?.response?.data?.detail || err?.message || 'Upload failed');
                    } finally {
                      setUploading(false);
                    }
                  }} />
                  {uploading ? 'Uploading…' : 'Browse…'}
                </label>
              </div>
              {form.logo_url && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <img src={form.logo_url} alt="logo" className="h-10 rounded" />
                  <span className="truncate">{form.logo_url}</span>
                </div>
              )}
            </div>
            <input className="w-full border rounded px-3 py-2" placeholder="App Title" value={form.app_title || ''} onChange={(e)=>setForm({...form, app_title:e.target.value})} />
            <input className="w-full border rounded px-3 py-2" placeholder="App Name" value={form.app_name || ''} onChange={(e)=>setForm({...form, app_name:e.target.value})} />
            <label className="block text-sm font-medium text-gray-700">Footer HTML (tùy chọn, sẽ được ghi đè khi dùng Footer Builder)</label>
            <textarea className="w-full border rounded px-3 py-2 h-32" placeholder="Footer HTML" value={form.footer_html || ''} onChange={(e)=>setForm({...form, footer_html:e.target.value})} />
            {/* Save button moved to bottom section */}
          </form>

          <div className="max-w-5xl">
            <h3 className="text-lg font-semibold mb-3">Footer Builder</h3>
            <p className="text-sm text-gray-600 mb-3">Tạo footer dạng cột (links). Nhấn “Áp dụng vào Footer HTML” để render HTML và lưu như phần Footer HTML.</p>
            <div className="space-y-6">
              {(footer.columns || []).map((col, cIdx) => (
                <div key={cIdx} className="border rounded p-3">
                  <div className="flex items-center gap-3">
                    <input className="flex-1 border rounded px-3 py-2" placeholder="Column title" value={col.title} onChange={(e)=>updateColumnTitle(cIdx, e.target.value)} />
                    <button className="text-red-600" onClick={()=>removeColumn(cIdx)} type="button">Remove</button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {col.items.map((it, iIdx) => (
                      <div key={iIdx} className="grid grid-cols-2 gap-2">
                        <input className="border rounded px-2 py-1" placeholder="Label" value={it.label} onChange={(e)=>updateItem(cIdx, iIdx, { label: e.target.value })} />
                        <div className="flex gap-2">
                          <input className="flex-1 border rounded px-2 py-1" placeholder="URL (optional)" value={it.href || ''} onChange={(e)=>updateItem(cIdx, iIdx, { href: e.target.value })} />
                          <button className="text-red-600" onClick={()=>removeItem(cIdx, iIdx)} type="button">X</button>
                        </div>
                      </div>
                    ))}
                    <button className="text-purple-700" onClick={()=>addItem(cIdx)} type="button">+ Thêm item</button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <button className="px-3 py-2 bg-gray-100 rounded" onClick={addColumn} type="button">+ Thêm cột</button>
                <button className="px-3 py-2 bg-purple-600 text-white rounded" onClick={applyGeneratedToForm} type="button" disabled={!generatedHtml}>Áp dụng vào Footer HTML</button>
                <button className="px-3 py-2 bg-gray-200 rounded" onClick={()=>setShowPreview((v)=>!v)} type="button">{showPreview ? 'Ẩn' : 'Xem'} preview</button>
              </div>
              {showPreview && (
                <div className="border rounded p-4 bg-white">
                  {generatedHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                  ) : (
                    <div className="text-sm text-gray-600">Chưa có layout để preview.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Bottom actions: Save aligned end */}
          <div className="flex justify-end items-center gap-3 pt-4">
            <button className="px-4 py-2 bg-purple-600 text-white rounded" onClick={doSave} type="button">Save</button>
            {saved && <span className="text-green-700">{saved}</span>}
            {error && <div className="text-red-700">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

