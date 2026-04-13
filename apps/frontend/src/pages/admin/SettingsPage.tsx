import { useEffect, useState } from 'react';
import {
  Settings, Image, Type, FileText, Save, CheckCircle,
  AlertCircle, RefreshCw, Globe, Layout, Eye, EyeOff,
  Plus, Trash2, Link, AlignLeft
} from 'lucide-react';
import { adminService } from '../../services/adminService';

interface FooterItem { label: string; href?: string }
interface FooterColumn { title: string; items: FooterItem[] }
interface FooterLayout { columns: FooterColumn[]; note?: string }

function layoutToHtml(layout: FooterLayout): string {
  const cols = layout.columns.length || 1;
  const colHtml = layout.columns.map((col) => {
    const items = (col.items || []).map((it) => {
      const label = it.label || '';
      if (it.href) {
        return `<li style="margin:6px 0;"><a href="${it.href}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;opacity:.9;">${label}</a></li>`;
      }
      return `<li style="margin:6px 0;">${label}</li>`;
    }).join('');
    return `<div><div style="font-weight:600;margin-bottom:8px;">${col.title || ''}</div><ul style="list-style:none;padding:0;margin:0;">${items}</ul></div>`;
  }).join('');

  const noteHtml = layout.note
    ? `<div style="margin-top:16px;font-size:12px;opacity:.8;">${layout.note}</div>`
    : '';

  return `<div class="app-footer" style="max-width:1200px;margin:0 auto;padding:16px;text-align:left;"><div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:16px;">${colHtml}</div>${noteHtml}</div>`;
}

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <span className="text-green-600">{icon}</span>
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition";

const SettingsPage = () => {
  const [form, setForm] = useState({ logo_url: '', app_title: '', app_name: '', footer_html: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [footer, setFooter] = useState<FooterLayout>({ columns: [] });
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getSettings();
      setForm(data || { logo_url: '', app_title: '', app_name: '', footer_html: '' });
      // Parse embedded layout JSON
      const html: string = data?.footer_html || '';
      const s = html.indexOf('<!--layout:');
      const e = html.indexOf(':layout-->');
      if (s >= 0 && e > s) {
        try { setFooter(JSON.parse(html.substring(s + 11, e))); } catch { }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await adminService.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const applyFooter = () => {
    if (!footer.columns.length) return;
    const html = `<!--layout:${JSON.stringify(footer)}:layout-->` + layoutToHtml(footer);
    setForm(f => ({ ...f, footer_html: html }));
    setShowPreview(true);
  };

  // Footer builder helpers
  const addColumn = () => setFooter(f => ({ ...f, columns: [...f.columns, { title: 'Tiêu đề', items: [] }] }));
  const removeColumn = (i: number) => setFooter(f => ({ ...f, columns: f.columns.filter((_, j) => j !== i) }));
  const updateColTitle = (i: number, title: string) =>
    setFooter(f => ({ ...f, columns: f.columns.map((c, j) => j === i ? { ...c, title } : c) }));
  const addItem = (ci: number) =>
    setFooter(f => ({ ...f, columns: f.columns.map((c, j) => j === ci ? { ...c, items: [...c.items, { label: 'Link', href: '' }] } : c) }));
  const removeItem = (ci: number, ii: number) =>
    setFooter(f => ({ ...f, columns: f.columns.map((c, j) => j === ci ? { ...c, items: c.items.filter((_, k) => k !== ii) } : c) }));
  const updateItem = (ci: number, ii: number, patch: Partial<FooterItem>) =>
    setFooter(f => ({
      ...f,
      columns: f.columns.map((c, j) => j === ci
        ? { ...c, items: c.items.map((it, k) => k === ii ? { ...it, ...patch } : it) }
        : c
      )
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={24} className="text-green-600" />
            Cài đặt hệ thống
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý logo, tên ứng dụng và footer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} /> Tải lại
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</>
              : <><Save size={15} /> Lưu thay đổi</>
            }
          </button>
        </div>
      </div>

      {/* Feedback */}
      {saved && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          <CheckCircle size={16} /> Đã lưu thành công!
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="space-y-5 max-w-3xl">
        {/* General */}
        <Section icon={<Globe size={16} />} title="Thông tin chung">
          <div className="space-y-4">
            <Field label="Tên đầy đủ (App Title)">
              <div className="relative">
                <Type size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className={inputCls + " pl-9"}
                  placeholder="VD: CareerBridge AI System"
                  value={form.app_title || ''}
                  onChange={e => setForm(f => ({ ...f, app_title: e.target.value }))}
                />
              </div>
            </Field>
            <Field label="Tên ngắn (App Name)">
              <div className="relative">
                <Type size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className={inputCls + " pl-9"}
                  placeholder="VD: CareerBridge"
                  value={form.app_name || ''}
                  onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* Logo */}
        <Section icon={<Image size={16} />} title="Logo">
          <div className="space-y-3">
            <Field label="URL logo">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className={inputCls + " pl-9"}
                    placeholder="https://... hoặc upload file"
                    value={form.logo_url || ''}
                    onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                  <input type="file" accept="image/*" hidden onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    try {
                      const res = await adminService.uploadMedia(f);
                      setForm(s => ({ ...s, logo_url: res.url }));
                    } catch (err: any) {
                      setError(err?.message || 'Upload thất bại');
                    } finally { setUploading(false); }
                  }} />
                  {uploading
                    ? <><div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" /> Đang upload</>
                    : <><Image size={14} /> Chọn file</>
                  }
                </label>
              </div>
            </Field>

            {form.logo_url && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <img src={form.logo_url} alt="logo preview" className="h-10 w-auto rounded object-contain bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-600" />
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{form.logo_url}</span>
                <button
                  onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                  className="text-red-500 hover:text-red-600 p-1"
                  title="Xóa logo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Footer HTML */}
        <Section icon={<FileText size={16} />} title="Footer HTML">
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nhập HTML tùy chỉnh cho footer, hoặc dùng trình tạo bên dưới.
            </p>
            <Field label="Nội dung HTML">
              <div className="relative">
                <AlignLeft size={14} className="absolute left-3 top-3 text-gray-400" />
                <textarea
                  className={inputCls + " pl-9 h-28 resize-none font-mono text-xs"}
                  placeholder="<div>© 2026 CareerBridge AI</div>"
                  value={form.footer_html || ''}
                  onChange={e => setForm(f => ({ ...f, footer_html: e.target.value }))}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* Footer Builder */}
        <Section icon={<Layout size={16} />} title="Trình tạo Footer">
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tạo footer nhiều cột với các liên kết. Nhấn "Áp dụng" để chuyển sang Footer HTML.
            </p>

            {/* Note */}
            <Field label="Ghi chú footer (tùy chọn)">
              <input
                className={inputCls}
                placeholder="VD: © 2026 CareerBridge AI. All rights reserved."
                value={footer.note || ''}
                onChange={e => setFooter(f => ({ ...f, note: e.target.value }))}
              />
            </Field>

            {/* Columns */}
            {footer.columns.length > 0 && (
              <div className="space-y-3">
                {footer.columns.map((col, ci) => (
                  <div key={ci} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        className={inputCls + " flex-1"}
                        placeholder="Tiêu đề cột"
                        value={col.title}
                        onChange={e => updateColTitle(ci, e.target.value)}
                      />
                      <button
                        onClick={() => removeColumn(ci)}
                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Xóa cột"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {col.items.map((it, ii) => (
                        <div key={ii} className="flex gap-2 items-center">
                          <input
                            className={inputCls + " flex-1"}
                            placeholder="Tên link"
                            value={it.label}
                            onChange={e => updateItem(ci, ii, { label: e.target.value })}
                          />
                          <input
                            className={inputCls + " flex-1"}
                            placeholder="URL (tùy chọn)"
                            value={it.href || ''}
                            onChange={e => updateItem(ci, ii, { href: e.target.value })}
                          />
                          <button
                            onClick={() => removeItem(ci, ii)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addItem(ci)}
                        className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 font-medium mt-1"
                      >
                        <Plus size={12} /> Thêm liên kết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {footer.columns.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 text-sm">
                Chưa có cột nào. Nhấn "Thêm cột" để bắt đầu.
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={addColumn}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus size={14} /> Thêm cột
              </button>
              <button
                onClick={applyFooter}
                disabled={!footer.columns.length}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
              >
                <CheckCircle size={14} /> Áp dụng vào Footer HTML
              </button>
              <button
                onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {showPreview ? <><EyeOff size={14} /> Ẩn xem trước</> : <><Eye size={14} /> Xem trước</>}
              </button>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Xem trước footer</p>
                {footer.columns.length > 0
                  ? <div dangerouslySetInnerHTML={{ __html: layoutToHtml(footer) }} className="text-sm text-gray-700 dark:text-gray-200" />
                  : <p className="text-sm text-gray-400">Thêm cột để xem trước.</p>
                }
              </div>
            )}
          </div>
        </Section>

        {/* Save footer */}
        <div className="flex justify-end pt-2 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</>
              : <><Save size={16} /> Lưu thay đổi</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
