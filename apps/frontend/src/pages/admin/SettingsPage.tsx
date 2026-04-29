import { useEffect, useState } from 'react';
import {
  Settings, Image, Type, FileText, Save, CheckCircle,
  AlertCircle, RefreshCw, Globe, Layout, Eye, EyeOff,
  Plus, Trash2, Link as LinkIcon, AlignLeft, Share2
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import AppFooter from '../../components/layout/AppFooter';
import type { FooterConfig, FooterItem, FooterColumn } from '../../components/layout/AppFooter';

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition";

const Section = ({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <span className="text-indigo-800">{icon}</span>
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</h3>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
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

const defaultFooter: FooterConfig = {
  brand_desc: 'CareerBridge AI giúp bạn xây dựng CV chuyên nghiệp, phân tích kỹ năng và tìm con đường sự nghiệp hoàn hảo bằng trí tuệ nhân tạo tiên tiến.',
  columns: [
    { title: 'Sản phẩm', items: [{ label: 'Tính năng', href: '/features' }, { label: 'Bảng giá', href: '/pricing' }, { label: 'Đánh giá', href: '/assessment' }] },
    { title: 'Tài nguyên', items: [{ label: 'Bài viết', href: '/blog' }, { label: 'Hướng dẫn nghề nghiệp', href: '/guide' }, { label: 'Trung tâm trợ giúp', href: '/help' }] },
    { title: 'Pháp lý', items: [{ label: 'Chính sách bảo mật', href: '/privacy' }, { label: 'Điều khoản', href: '/terms' }] },
  ],
  social_links: [
    { label: 'Twitter', href: '' },
    { label: 'GitHub', href: '' },
    { label: 'LinkedIn', href: '' },
    { label: 'Discord', href: '' },
  ],
  copyright: `© ${new Date().getFullYear()} CareerBridge AI. Bảo lưu mọi quyền.`,
};

const SettingsPage = () => {
  const [form, setForm] = useState({ logo_url: '', app_title: '', app_name: '', footer_html: '' });
  const [footer, setFooter] = useState<FooterConfig>(defaultFooter);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getSettings();
      setForm(data || { logo_url: '', app_title: '', app_name: '', footer_html: '' });
      const html: string = data?.footer_html || '';
      const s = html.indexOf('<!--layout:');
      const e = html.indexOf(':layout-->');
      if (s >= 0 && e > s) {
        try {
          const parsed = JSON.parse(html.substring(s + 11, e));
          setFooter({ ...defaultFooter, ...parsed });
        } catch { }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const buildFooterHtml = (cfg: FooterConfig) =>
    `<!--layout:${JSON.stringify(cfg)}:layout-->`;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const payload = { ...form, footer_html: buildFooterHtml(footer) };
      await adminService.updateSettings(payload);
      setForm(f => ({ ...f, footer_html: payload.footer_html }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Column helpers
  const addColumn = () => setFooter(f => ({ ...f, columns: [...(f.columns || []), { title: 'Tiêu đề mới', items: [] }] }));
  const removeColumn = (i: number) => setFooter(f => ({ ...f, columns: (f.columns || []).filter((_, j) => j !== i) }));
  const updateColTitle = (i: number, title: string) =>
    setFooter(f => ({ ...f, columns: (f.columns || []).map((c, j) => j === i ? { ...c, title } : c) }));
  const addItem = (ci: number) =>
    setFooter(f => ({ ...f, columns: (f.columns || []).map((c, j) => j === ci ? { ...c, items: [...c.items, { label: 'Link mới', href: '' }] } : c) }));
  const removeItem = (ci: number, ii: number) =>
    setFooter(f => ({ ...f, columns: (f.columns || []).map((c, j) => j === ci ? { ...c, items: c.items.filter((_, k) => k !== ii) } : c) }));
  const updateItem = (ci: number, ii: number, patch: Partial<FooterItem>) =>
    setFooter(f => ({ ...f, columns: (f.columns || []).map((c, j) => j === ci ? { ...c, items: c.items.map((it, k) => k === ii ? { ...it, ...patch } : it) } : c) }));

  // Social helpers
  const addSocial = () => setFooter(f => ({ ...f, social_links: [...(f.social_links || []), { label: '', href: '' }] }));
  const removeSocial = (i: number) => setFooter(f => ({ ...f, social_links: (f.social_links || []).filter((_, j) => j !== i) }));
  const updateSocial = (i: number, patch: Partial<FooterItem>) =>
    setFooter(f => ({ ...f, social_links: (f.social_links || []).map((s, j) => j === i ? { ...s, ...patch } : s) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-[F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={24} className="text-indigo-800" />
            Cài đặt hệ thống
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý logo, tên ứng dụng và footer toàn trang
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={14} /> Tải lại
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-800 hover:bg-indigo-900 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</> : <><Save size={15} /> Lưu thay đổi</>}
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-900 dark:text-indigo-400 text-sm">
          <CheckCircle size={16} /> Đã lưu thành công! Footer đã được cập nhật trên toàn trang.
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
                <input className={inputCls + " pl-9"} placeholder="VD: CareerBridge AI System"
                  value={form.app_title || ''} onChange={e => setForm(f => ({ ...f, app_title: e.target.value }))} />
              </div>
            </Field>
            <Field label="Tên ngắn (App Name)">
              <div className="relative">
                <Type size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className={inputCls + " pl-9"} placeholder="VD: CareerBridge"
                  value={form.app_name || ''} onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))} />
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
                  <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className={inputCls + " pl-9"} placeholder="https://... hoặc upload file"
                    value={form.logo_url || ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
                </div>
                <label className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                  <input type="file" accept="image/*" hidden onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setUploading(true);
                    try { const res = await adminService.uploadMedia(f); setForm(s => ({ ...s, logo_url: res.url })); }
                    catch (err: any) { setError(err?.message || 'Upload thất bại'); }
                    finally { setUploading(false); }
                  }} />
                  {uploading ? <><div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" /> Uploading</> : <><Image size={14} /> Chọn file</>}
                </label>
              </div>
            </Field>
            {form.logo_url && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <img src={form.logo_url} alt="logo" className="h-10 w-auto rounded object-contain bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-600" />
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{form.logo_url}</span>
                <button onClick={() => setForm(f => ({ ...f, logo_url: '' }))} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        </Section>

        {/* Footer config */}
        <Section icon={<Layout size={16} />} title="Cấu hình Footer" desc="Áp dụng cho tất cả trang kể cả trang chủ">
          <div className="space-y-5">
            {/* Brand desc */}
            <Field label="Mô tả thương hiệu (dưới logo)">
              <div className="relative">
                <AlignLeft size={14} className="absolute left-3 top-3 text-gray-400" />
                <textarea className={inputCls + " pl-9 h-20 resize-none"} placeholder="Mô tả ngắn về sản phẩm/dịch vụ..."
                  value={footer.brand_desc || ''} onChange={e => setFooter(f => ({ ...f, brand_desc: e.target.value }))} />
              </div>
            </Field>

            {/* Copyright */}
            <Field label="Bản quyền (copyright)">
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className={inputCls + " pl-9"} placeholder={`© ${new Date().getFullYear()} CareerBridge AI. Bảo lưu mọi quyền.`}
                  value={footer.copyright || ''} onChange={e => setFooter(f => ({ ...f, copyright: e.target.value }))} />
              </div>
            </Field>

            {/* Social links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mạng xã hội</label>
                <button onClick={addSocial} className="flex items-center gap-1 text-xs text-indigo-800 dark:text-indigo-400 hover:text-indigo-900 font-medium">
                  <Plus size={12} /> Thêm
                </button>
              </div>
              <div className="space-y-2">
                {(footer.social_links || []).map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className={inputCls + " w-28 flex-shrink-0"} placeholder="Tên (Twitter...)" value={s.label}
                      onChange={e => updateSocial(i, { label: e.target.value })} />
                    <input className={inputCls + " flex-1"} placeholder="URL" value={s.href || ''}
                      onChange={e => updateSocial(i, { href: e.target.value })} />
                    <button onClick={() => removeSocial(i)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
                  </div>
                ))}
                {(footer.social_links || []).length === 0 && (
                  <p className="text-xs text-gray-400 italic">Chưa có link mạng xã hội.</p>
                )}
              </div>
            </div>

            {/* Nav columns */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cột điều hướng</label>
                <button onClick={addColumn} className="flex items-center gap-1 text-xs text-indigo-800 dark:text-indigo-400 hover:text-indigo-900 font-medium">
                  <Plus size={12} /> Thêm cột
                </button>
              </div>

              {(footer.columns || []).length === 0 && (
                <div className="text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 text-sm">
                  Chưa có cột nào
                </div>
              )}

              <div className="space-y-3">
                {(footer.columns || []).map((col, ci) => (
                  <div key={ci} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <input className={inputCls + " flex-1"} placeholder="Tiêu đề cột" value={col.title}
                        onChange={e => updateColTitle(ci, e.target.value)} />
                      <button onClick={() => removeColumn(ci)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
                    </div>
                    <div className="space-y-2">
                      {col.items.map((it, ii) => (
                        <div key={ii} className="flex gap-2 items-center">
                          <input className={inputCls + " flex-1"} placeholder="Tên link" value={it.label}
                            onChange={e => updateItem(ci, ii, { label: e.target.value })} />
                          <input className={inputCls + " flex-1"} placeholder="URL (/path hoặc https://...)" value={it.href || ''}
                            onChange={e => updateItem(ci, ii, { href: e.target.value })} />
                          <button onClick={() => removeItem(ci, ii)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <button onClick={() => addItem(ci)} className="flex items-center gap-1 text-xs text-indigo-800 dark:text-indigo-400 hover:text-indigo-900 font-medium mt-1">
                        <Plus size={12} /> Thêm liên kết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="flex items-center gap-2"><Eye size={16} className="text-indigo-800" /> Xem trước Footer</span>
            {showPreview ? <EyeOff size={15} className="text-gray-400" /> : <Eye size={15} className="text-gray-400" />}
          </button>
          {showPreview && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              {/* Mock the AppSettingsContext with current config */}
              <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-10 pb-6">
                <div className="max-w-4xl mx-auto px-6">
                  <div className={`grid grid-cols-2 gap-6 mb-8 ${(footer.columns || []).length <= 2 ? 'md:grid-cols-3' : 'md:grid-cols-5'}`}>
                    <div className="col-span-2">
                      <span className="font-extrabold text-xl text-gray-900 dark:text-white">career<span className="text-indigo-800">bridge</span><span className="text-indigo-800 text-2xl">.</span></span>
                      <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">{footer.brand_desc}</p>
                    </div>
                    {(footer.columns || []).map((col, i) => (
                      <div key={i}>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">{col.title}</h4>
                        <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                          {col.items.map((it, j) => <li key={j}>{it.label}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-5 flex flex-col md:flex-row justify-between items-center gap-3">
                    <p className="text-sm text-gray-400">{footer.copyright}</p>
                    <div className="flex gap-5">
                      {(footer.social_links || []).map((s, i) => (
                        <span key={i} className="text-gray-400 text-sm font-medium">{s.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save bottom */}
        <div className="flex justify-end pt-2 pb-10">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-800 hover:bg-indigo-900 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang lưu...</> : <><Save size={16} /> Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
