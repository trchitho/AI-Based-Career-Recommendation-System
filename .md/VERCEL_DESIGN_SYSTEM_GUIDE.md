# Vercel Design System Implementation Guide

## Overview
Hướng dẫn áp dụng Vercel design system cho trang HomePage - phong cách minimalist, clean, professional.

## Design Principles

### 1. **Minimalism**
- Loại bỏ các hiệu ứng phức tạp
- Tập trung vào nội dung
- Spacing rộng rãi, thoáng đãng

### 2. **Typography**
- Font: **Inter** (Geist-like, hỗ trợ tiếng Việt)
- Font smoothing: antialiased
- Clear hierarchy với font sizes rõ ràng

### 3. **Colors**
- **Light mode**: Nền trắng (#ffffff), text đen (#000000)
- **Dark mode**: Nền đen (#000000), text trắng (#ffffff)
- Accent: Blue (#0070f3)
- Borders: Subtle gray (#eaeaea)

### 4. **Shadows**
- Rất nhẹ, subtle
- Không dùng colored shadows
- Chỉ dùng rgba(0,0,0) với opacity thấp

---

## Design Tokens

### Typography
```css
--font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-md: 16px;
--font-size-lg: 18px;
--font-size-xl: 24px;
--font-size-2xl: 32px;
--font-size-3xl: 48px;
--font-size-4xl: 64px;
```

### Colors
```css
/* Light Mode */
--color-text-primary: #000000;
--color-text-secondary: #666666;
--color-text-tertiary: #999999;
--color-surface-base: #ffffff;
--color-surface-muted: #fafafa;
--color-border: #eaeaea;
--color-accent: #0070f3;

/* Dark Mode */
--color-text-primary: #ffffff;
--color-text-secondary: #888888;
--color-text-tertiary: #666666;
--color-surface-base: #000000;
--color-surface-muted: #111111;
--color-border: #333333;
```

### Spacing
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
```

### Radius
```css
--radius-sm: 5px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Shadows
```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.04);
--shadow-md: 0 4px 8px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 16px rgba(0,0,0,0.12);
```

### Motion
```css
--motion-fast: 150ms;
--motion-normal: 200ms;
```

---

## Components

### Button Primary
```css
.vercel-btn-primary {
    background: var(--color-text-primary);
    color: var(--color-surface-base);
    font-weight: 500;
    font-size: var(--font-size-sm);
    padding: 0 var(--space-5);
    height: 40px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-text-primary);
    transition: all var(--motion-fast) ease;
}

.vercel-btn-primary:hover {
    background: var(--color-text-secondary);
    border-color: var(--color-text-secondary);
}
```

**States:**
- Default: Black background, white text
- Hover: Gray background
- Focus: Outline ring
- Disabled: Opacity 0.5

### Button Secondary
```css
.vercel-btn-secondary {
    background: transparent;
    color: var(--color-text-primary);
    font-weight: 500;
    font-size: var(--font-size-sm);
    padding: 0 var(--space-5);
    height: 40px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    transition: all var(--motion-fast) ease;
}

.vercel-btn-secondary:hover {
    border-color: var(--color-text-primary);
}
```

### Card
```css
.vercel-card {
    background: var(--color-surface-base);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    transition: all var(--motion-normal) ease;
}

.vercel-card:hover {
    border-color: var(--color-text-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}
```

**Anatomy:**
- Border: 1px solid, subtle
- Shadow: Very light
- Hover: Border darkens, shadow increases slightly
- No backdrop blur

### Gradient Text
```css
.vercel-gradient-text {
    background: linear-gradient(90deg, #000000 0%, #666666 50%, #000000 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-shift 3s ease infinite;
}
```

---

## Layout Guidelines

### Hero Section
```jsx
<section className="relative py-24">
    {/* Subtle gradient background */}
    <div className="vercel-gradient-bg absolute inset-0" />
    
    {/* Grid pattern - very subtle */}
    <div className="vercel-grid absolute inset-0" />
    
    <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Badge */}
        <span className="inline-flex items-center px-3 py-1 rounded-full border text-sm">
            Badge Text
        </span>
        
        {/* Heading - Large, bold */}
        <h1 className="text-6xl font-bold mt-6 mb-4">
            Main Heading
        </h1>
        
        {/* Subheading - Gray */}
        <p className="text-xl text-gray-600 mb-8">
            Subtitle text
        </p>
        
        {/* CTA Buttons */}
        <div className="flex gap-4">
            <button className="vercel-btn-primary">Primary Action</button>
            <button className="vercel-btn-secondary">Secondary Action</button>
        </div>
    </div>
</section>
```

### Feature Cards
```jsx
<div className="grid grid-cols-3 gap-6">
    {features.map(feature => (
        <div className="vercel-card p-6">
            {/* Icon - Simple, monochrome */}
            <div className="w-10 h-10 mb-4">
                {feature.icon}
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold mb-2">
                {feature.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-gray-600">
                {feature.description}
            </p>
        </div>
    ))}
</div>
```

---

## Anti-Patterns

### ❌ DON'T
1. **Colored shadows** - Vercel chỉ dùng black/white shadows
2. **Heavy gradients** - Tránh gradient quá rực rỡ
3. **Rounded corners quá lớn** - Max 12px
4. **Backdrop blur** - Không dùng glass morphism
5. **Complex animations** - Giữ animations đơn giản
6. **Colored borders** - Borders phải neutral (gray)

### ✅ DO
1. **Subtle shadows** - rgba(0,0,0,0.04-0.12)
2. **Clean borders** - 1px solid #eaeaea
3. **Simple hover states** - Border color change, slight lift
4. **Monochrome icons** - Black/white/gray only
5. **Clear typography hierarchy** - Bold headings, regular body
6. **Generous spacing** - Không cramped

---

## Accessibility

### Contrast
- Text on white: #000000 (21:1 ratio) ✅
- Secondary text: #666666 (5.74:1 ratio) ✅
- Tertiary text: #999999 (2.85:1 ratio) ⚠️ Use for non-essential text only

### Focus States
```css
button:focus-visible {
    outline: 2px solid #0070f3;
    outline-offset: 2px;
}
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Tab order must be logical
- Focus indicators must be visible

---

## Implementation Checklist

### Phase 1: Typography
- [ ] Replace font with Inter
- [ ] Apply font smoothing
- [ ] Update font sizes to Vercel scale
- [ ] Set proper line heights

### Phase 2: Colors
- [ ] Replace color palette
- [ ] Update button colors
- [ ] Change border colors to neutral
- [ ] Remove colored shadows

### Phase 3: Components
- [ ] Update button styles
- [ ] Redesign cards
- [ ] Simplify hover effects
- [ ] Remove backdrop blur

### Phase 4: Layout
- [ ] Increase spacing
- [ ] Simplify hero section
- [ ] Remove complex animations
- [ ] Add subtle grid pattern

### Phase 5: Polish
- [ ] Test dark mode
- [ ] Verify accessibility
- [ ] Check responsive behavior
- [ ] Optimize performance

---

## Code Example

### Complete Hero Section
```jsx
<section className="relative py-24 overflow-hidden">
    {/* Subtle gradient */}
    <div className="absolute inset-0 vercel-gradient-bg" />
    
    {/* Grid pattern */}
    <div className="absolute inset-0 vercel-grid opacity-50" />
    
    <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center">
            {/* Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 text-sm font-medium mb-6">
                🚀 Introducing Career AI
            </span>
            
            {/* Main heading */}
            <h1 className="text-6xl font-bold mb-6 tracking-tight">
                Định hướng nghề nghiệp với{' '}
                <span className="vercel-gradient-text">
                    độ chính xác
                </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                Khám phá con đường sự nghiệp phù hợp nhất với bạn thông qua AI và dữ liệu thị trường.
            </p>
            
            {/* CTA buttons */}
            <div className="flex gap-4 justify-center">
                <button className="vercel-btn-primary">
                    Bắt đầu đánh giá
                </button>
                <button className="vercel-btn-secondary">
                    Khám phá nghề nghiệp
                </button>
            </div>
        </div>
    </div>
</section>
```

---

## Resources

- **Vercel Design**: https://vercel.com/design
- **Inter Font**: https://rsms.me/inter/
- **Geist Font**: https://vercel.com/font
- **Vercel Components**: https://vercel.com/design/components

---

## Summary

Vercel design system tập trung vào:
1. **Minimalism** - Ít nhưng chất lượng
2. **Performance** - Nhanh, mượt
3. **Accessibility** - Dễ tiếp cận
4. **Clarity** - Rõ ràng, dễ hiểu

Kết quả: Giao diện professional, modern, và timeless.
