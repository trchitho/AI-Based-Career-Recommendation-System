import { Link } from 'react-router-dom';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import AppLogo from '../common/AppLogo';

export interface FooterItem { label: string; href?: string }
export interface FooterColumn { title: string; items: FooterItem[] }
export interface FooterConfig {
    brand_desc?: string;
    columns?: FooterColumn[];
    social_links?: FooterItem[];
    copyright?: string;
}

export function parseFooterConfig(footer_html: string | null | undefined): FooterConfig | null {
    if (!footer_html) return null;
    const s = footer_html.indexOf('<!--layout:');
    const e = footer_html.indexOf(':layout-->');
    if (s >= 0 && e > s) {
        try { return JSON.parse(footer_html.substring(s + 11, e)); } catch { }
    }
    return null;
}

const AppFooter = () => {
    const app = useAppSettings();
    const config = parseFooterConfig(app.footer_html);

    const brand_desc = config?.brand_desc || 'CareerBridge AI giúp bạn xây dựng CV chuyên nghiệp, phân tích kỹ năng và tìm con đường sự nghiệp hoàn hảo bằng trí tuệ nhân tạo tiên tiến.';
    const columns = config?.columns || [
        { title: 'Sản phẩm', items: [{ label: 'Tính năng', href: '/features' }, { label: 'Bảng giá', href: '/pricing' }, { label: 'Đánh giá', href: '/assessment' }] },
        { title: 'Tài nguyên', items: [{ label: 'Bài viết', href: '/blog' }, { label: 'Hướng dẫn nghề nghiệp', href: '/guide' }, { label: 'Trung tâm trợ giúp', href: '/help' }] },
        { title: 'Pháp lý', items: [{ label: 'Chính sách bảo mật', href: '/privacy' }, { label: 'Điều khoản', href: '/terms' }] },
    ];
    const social_links = config?.social_links || [
        { label: 'Twitter', href: '' },
        { label: 'GitHub', href: '' },
        { label: 'LinkedIn', href: '' },
        { label: 'Discord', href: '' },
    ];
    const copyright = config?.copyright || `© ${new Date().getFullYear()} CareerBridge AI. Bảo lưu mọi quyền.`;

    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Top grid */}
                <div className={`grid grid-cols-2 gap-8 mb-12 ${columns.length === 1 ? 'md:grid-cols-2' : columns.length === 2 ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-4 lg:grid-cols-5'}`}>
                    {/* Brand */}
                    <div className="col-span-2 lg:col-span-2">
                        <AppLogo linkTo="/" />
                        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                            {brand_desc}
                        </p>
                    </div>

                    {/* Nav columns */}
                    {columns.map((col, i) => (
                        <div key={i}>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">{col.title}</h4>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                {(col.items || []).map((item, j) => (
                                    <li key={j}>
                                        {item.href && item.href !== '' && !item.href.startsWith('http') ? (
                                            <Link to={item.href} className="hover:text-indigo-700 transition-colors">
                                                {item.label}
                                            </Link>
                                        ) : item.href ? (
                                            <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-700 transition-colors">
                                                {item.label}
                                            </a>
                                        ) : (
                                            <span>{item.label}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">{copyright}</p>
                    {social_links.length > 0 && (
                        <div className="flex gap-6">
                            {social_links.map((s, i) => (
                                <a
                                    key={i}
                                    href={s.href || ''}
                                    target={s.href && s.href !== '' ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-indigo-700 hover:scale-110 transition-all text-sm font-medium"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
