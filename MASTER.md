# Design System - Career Recommendation Platform
## MASTER Design System Documentation

**Dự án:** AI-Based Career Recommendation System (CareerBridge)  
**Phiên bản:** 1.0  
**Ngày phân tích:** 26/01/2026  
**Công nghệ:** React + TypeScript + Tailwind CSS  

---

## 📋 Tổng quan

Design System này được trích xuất từ codebase hiện tại của dự án CareerBridge. Hệ thống thiết kế tập trung vào sự chuyên nghiệp, sạch sẽ và nhất quán, với màu sắc chủ đạo là xanh lá (green) thể hiện sự phát triển và định hướng nghề nghiệp.

---

## 🎨 Bảng màu (Color Palette)

### Màu chính (Primary Colors)

```css
--color-primary: #2D5F4C        /* Green chính - Nút CTA, liên kết quan trọng */
--color-primary-light: #3A7A5F  /* Green nhạt - Hover states */
--color-primary-dark: #1F4435   /* Green đậm - Active states */
```

**Sử dụng trong code:**
- `bg-[#4A7C59]` - Nút CTA chính (HomeCTA)
- `bg-[#5D8468]` - Avatar background (ProfileSummaryCard)
- `bg-green-600` - Nút action, badges
- `text-green-600` - Text accent, logo highlight

### Màu nền (Background Colors)

#### Light Mode
```css
--color-bg-primary: #FAFAF9      /* Nền chính */
--color-bg-secondary: #F5F5F4    /* Nền phụ - Cards, sections */
--color-bg-tertiary: #E7E5E4     /* Nền tertiary - Hover states */
```

#### Dark Mode
```css
--color-bg-primary: #1C1917      /* Nền chính dark */
--color-bg-secondary: #292524    /* Nền phụ dark */
--color-bg-tertiary: #44403C     /* Nền tertiary dark */
```

**Pattern phát hiện:**
- Sử dụng `bg-white dark:bg-gray-800` rất phổ biến cho cards
- Background decorative: `bg-[#E8DCC8]` đến `bg-[#D4C4B0]` (beige/cream tones)

### Màu văn bản (Text Colors)

#### Light Mode
```css
--color-text-primary: #1C1917    /* Text chính - Headings, body */
--color-text-secondary: #57534E  /* Text phụ - Descriptions */
--color-text-tertiary: #78716C   /* Text muted - Labels, hints */
```

#### Dark Mode
```css
--color-text-primary: #FAFAF9    /* Text chính dark */
--color-text-secondary: #D6D3D1  /* Text phụ dark */
--color-text-tertiary: #A8A29E   /* Text muted dark */
```

**Pattern phát hiện:**
- `text-gray-900 dark:text-white` - Headings
- `text-gray-700 dark:text-gray-300` - Body text
- `text-gray-500 dark:text-gray-400` - Secondary text
- `text-gray-400` - Muted text, placeholders

### Màu viền (Border Colors)

```css
--color-border-light: #E7E5E4    /* Viền nhẹ */
--color-border-medium: #D6D3D1   /* Viền trung bình */
```

**Pattern phát hiện:**
- `border-gray-100 dark:border-gray-700` - Card borders (phổ biến nhất)
- `border-gray-200 dark:border-gray-600` - Input borders
- `border-gray-300 dark:border-gray-600` - Button borders

### Màu ngữ nghĩa (Semantic Colors)

```css
--color-success: #16A34A   /* Green - Success states */
--color-warning: #EA580C   /* Orange - Warning states */
--color-error: #DC2626     /* Red - Error states */
--color-info: #0284C7      /* Blue - Info states */
```

**Sử dụng trong code:**
- Success: `bg-green-500`, `text-green-600`
- Warning: `bg-orange-500`, `text-orange-600`
- Error: `bg-red-500`, `text-red-600`
- Info: `bg-blue-500`, `text-blue-600`

### Màu gradient (Gradients)

**Gradient chính:**
```css
/* Primary gradient - CTA buttons */
from-green-600 via-emerald-600 to-teal-600

/* Premium gradients */
from-purple-500 via-pink-500 to-purple-600  /* Pro plan */
from-green-500 via-emerald-500 to-green-600 /* Premium plan */
from-blue-500 via-cyan-500 to-blue-600      /* Basic plan */

/* Background gradients */
from-[#E8DCC8] to-[#D4C4B0]  /* Beige/cream - CTA sections */
```

---

## 📐 Spacing Scale

```css
--space-xs: 0.25rem    /* 4px - Tight spacing */
--space-sm: 0.5rem     /* 8px - Small gaps */
--space-md: 1rem       /* 16px - Default spacing */
--space-lg: 1.5rem     /* 24px - Section spacing */
--space-xl: 2rem       /* 32px - Large spacing */
--space-2xl: 3rem      /* 48px - Extra large spacing */
```

**Pattern phát hiện trong code:**
- `p-4` (16px) - Card padding nhỏ
- `p-6` (24px) - Card padding trung bình (phổ biến nhất)
- `p-8` (32px) - Card padding lớn
- `p-12` (48px) - Section padding
- `gap-2` (8px), `gap-4` (16px), `gap-6` (24px) - Flex/Grid gaps

---

## 🔤 Typography

### Font Families

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace
```

**Font đặc biệt:**
- `font-['Plus_Jakarta_Sans']` - Logo font (AppLogo component)

### Font Sizes & Weights

**Headings:**
```css
/* H1 - Page titles */
text-4xl md:text-5xl font-bold  /* 36px/48px mobile/desktop */

/* H2 - Section titles */
text-3xl font-bold              /* 30px */
text-2xl font-bold              /* 24px */

/* H3 - Card titles */
text-xl font-bold               /* 20px */
text-lg font-bold               /* 18px */
```

**Body text:**
```css
text-base    /* 16px - Default */
text-sm      /* 14px - Secondary text */
text-xs      /* 12px - Labels, badges */
```

**Font weights:**
- `font-extrabold` (800) - Logo, hero text
- `font-bold` (700) - Headings, buttons
- `font-semibold` (600) - Sub-headings
- `font-medium` (500) - Emphasized text
- `font-normal` (400) - Body text

### Line Heights

```css
leading-none      /* 1 - Tight headings */
leading-tight     /* 1.25 - Headings */
leading-snug      /* 1.375 - Card titles */
leading-normal    /* 1.5 - Body text */
leading-relaxed   /* 1.625 - Descriptions */
```

### Letter Spacing

```css
tracking-tight    /* -0.025em - Large headings */
tracking-wide     /* 0.025em - Uppercase labels */
tracking-wider    /* 0.05em - Badges, tags */
```

---

## 🎯 Border Radius

```css
--radius-sm: 0.375rem   /* 6px - Small elements */
--radius-md: 0.5rem     /* 8px - Buttons, inputs */
--radius-lg: 0.75rem    /* 12px - Cards */
--radius-xl: 1rem       /* 16px - Large cards */
```

**Pattern phát hiện:**
- `rounded-lg` (12px) - Card borders phổ biến
- `rounded-xl` (16px) - Large cards, modals
- `rounded-2xl` (24px) - Feature cards, CTA sections
- `rounded-3xl` (32px) - Hero sections
- `rounded-[24px]` (24px) - Custom rounded cho career cards
- `rounded-[28px]` (28px) - Custom rounded cho special sections
- `rounded-[32px]` (32px) - Custom rounded cho assessment cards
- `rounded-full` - Circular elements (avatars, badges, buttons)

**Anti-pattern phát hiện:**
- Sử dụng cả `rounded-2xl` và `rounded-[24px]` cho cùng mục đích → Nên chuẩn hóa

---

## 🌑 Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

**Pattern phát hiện:**
- `shadow-sm` - Default card shadow
- `shadow-md` - Hover state
- `shadow-lg` - Elevated cards
- `shadow-xl` - Modals, important elements
- `shadow-2xl` - Hero sections, assessment cards
- `shadow-green-900/10` - Colored shadows cho green theme
- `shadow-green-600/30` - Colored shadows cho buttons
- `dark:shadow-none` - Remove shadows in dark mode (common pattern)

---

## ⚡ Transitions & Animations

### Transition Speeds

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

**Pattern phát hiện:**
- `transition-all duration-200` - Default transitions
- `transition-all duration-300` - Smooth transitions
- `transition-colors` - Color-only transitions
- `transition-transform` - Transform-only transitions

### Animations

**Keyframe animations:**
```css
@keyframes bounce-in {
  0% { opacity: 0; transform: translateY(20px) scale(0.9); }
  50% { opacity: 0.8; transform: translateY(-5px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Tailwind animations:**
- `animate-bounce` - Floating icons, badges
- `animate-spin` - Loading spinners
- `animate-pulse` - Glow effects, online indicators
- `animate-ping` - Notification dots
- `animate-bounce-in` - Custom entrance animation
- `animate-fade-in` - Custom fade animation

---

## 🧩 Component Patterns

### Cards

**Standard Card:**
```tsx
className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all duration-200"
```

**Feature Card (Career Suggestion):**
```tsx
className="bg-white dark:bg-gray-800 rounded-[24px] border border-gray-100 dark:border-gray-700 p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-green-900/10 transition-all duration-300 cursor-pointer"
```

**Elevated Card:**
```tsx
className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
```

### Buttons

**Primary Button:**
```tsx
className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors duration-200"
```

**Secondary Button:**
```tsx
className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
```

**CTA Button (Large):**
```tsx
className="px-10 py-5 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-green-600/30 hover:shadow-green-600/50 hover:-translate-y-2 transition-all duration-300"
```

**Icon Button:**
```tsx
className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all duration-300"
```

### Badges

**Status Badge:**
```tsx
className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide"
```

**Premium Badge:**
```tsx
className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-xs font-bold"
```

### Progress Bars

```tsx
<div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
  <div className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-1000" 
       style={{ width: `${percentage}%` }} />
</div>
```

### Avatars

**Standard Avatar:**
```tsx
className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-2xl"
```

**Premium Avatar:**
```tsx
className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 ring-4 ring-purple-500/50 shadow-lg shadow-purple-500/25"
```

### Input Fields

```tsx
className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
```

---

## 🎭 Dark Mode Strategy

**Approach:** Class-based dark mode với `dark:` prefix

**Pattern nhất quán:**
```tsx
// Background
bg-white dark:bg-gray-800

// Text
text-gray-900 dark:text-white
text-gray-700 dark:text-gray-300
text-gray-500 dark:text-gray-400

// Borders
border-gray-100 dark:border-gray-700
border-gray-200 dark:border-gray-600

// Shadows
shadow-sm dark:shadow-none  // Remove shadows in dark mode
```

---

## ♿ Accessibility

### Focus States

```css
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Pattern phát hiện:**
- `focus:ring-2 focus:ring-blue-500` - Input focus
- `focus:ring-2 focus:ring-green-500` - Button focus

### Semantic HTML

- Sử dụng `<button>` cho clickable elements
- Proper heading hierarchy (h1, h2, h3)
- Alt text cho images (phát hiện trong AppLogo)

---

## 🚨 Anti-Patterns & Vấn đề phát hiện

### 1. Border Radius không nhất quán

**Vấn đề:**
- Sử dụng cả `rounded-2xl` (24px) và `rounded-[24px]` cho cùng mục đích
- Sử dụng `rounded-[28px]`, `rounded-[32px]` thay vì Tailwind standard

**Khuyến nghị:**
- Chuẩn hóa: Sử dụng `rounded-2xl` (24px) thay vì `rounded-[24px]`
- Sử dụng `rounded-3xl` (32px) thay vì `rounded-[32px]`
- Tạo custom config nếu cần `rounded-[28px]`

### 2. Color values hardcoded

**Vấn đề:**
- `bg-[#4A7C59]`, `bg-[#5D8468]`, `bg-[#E8DCC8]` - Hardcoded colors
- Không sử dụng CSS variables hoặc Tailwind config

**Khuyến nghị:**
- Thêm vào `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#2D5F4C',
        light: '#3A7A5F',
        dark: '#1F4435',
        50: '#F0FDF4',
        // ... thêm các shades
      },
      beige: {
        light: '#E8DCC8',
        DEFAULT: '#D4C4B0',
      }
    }
  }
}
```

### 3. Shadow patterns không nhất quán

**Vấn đề:**
- Một số components dùng `shadow-sm`, một số dùng `shadow-lg`
- Dark mode: Một số remove shadows (`dark:shadow-none`), một số giữ nguyên

**Khuyến nghị:**
- Chuẩn hóa shadow strategy cho dark mode
- Document rõ khi nào dùng shadow level nào

### 4. Spacing không theo scale

**Vấn đề:**
- Sử dụng `p-6` (24px), `p-8` (32px), `p-12` (48px) nhưng không theo scale nhất quán
- Một số nơi dùng `md:p-8`, một số dùng `md:p-12`

**Khuyến nghị:**
- Tạo component variants rõ ràng: `card-sm`, `card-md`, `card-lg`
- Document responsive padding strategy

### 5. Gradient colors không reusable

**Vấn đề:**
- Gradient được define inline: `from-green-600 via-emerald-600 to-teal-600`
- Khó maintain và reuse

**Khuyến nghị:**
- Tạo utility classes:
```css
.gradient-primary {
  @apply bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600;
}
.gradient-premium {
  @apply bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600;
}
```

### 6. Font family không nhất quán

**Vấn đề:**
- Logo dùng `font-['Plus_Jakarta_Sans']`
- Body text dùng system fonts
- Không có fallback strategy rõ ràng

**Khuyến nghị:**
- Import Google Font properly trong `index.html`
- Define trong Tailwind config
- Document khi nào dùng custom font

### 7. Transition duration không nhất quán

**Vấn đề:**
- Một số dùng `duration-200`, một số `duration-300`, một số `duration-1000`
- Không có guideline rõ ràng

**Khuyến nghị:**
- Fast: 150ms - Hover states, color changes
- Base: 200ms - Default transitions
- Slow: 300ms - Complex animations
- Extra slow: 500ms+ - Special effects only

---

## 📊 Component Inventory

### Đã phân tích:
- ✅ AppLogo
- ✅ CareerSuggestionCard
- ✅ Pagination
- ✅ PaymentButton
- ✅ ProfileAvatar
- ✅ HomeCTA
- ✅ NoAssessmentPrompt
- ✅ ProfileSummaryCard

### Patterns chung:
- Card-based layout
- Gradient accents
- Hover effects với transform
- Dark mode support
- Responsive design (mobile-first)
- Icon-driven UI

---

## 🔄 Khuyến nghị Refactoring

### Priority 1 (High)
1. **Chuẩn hóa colors** - Move hardcoded colors vào Tailwind config
2. **Tạo component library** - Extract common patterns thành reusable components
3. **Standardize border radius** - Loại bỏ custom values, dùng Tailwind standard

### Priority 2 (Medium)
4. **Shadow strategy** - Document và chuẩn hóa shadow usage
5. **Gradient utilities** - Tạo reusable gradient classes
6. **Spacing scale** - Document responsive spacing strategy

### Priority 3 (Low)
7. **Font loading** - Optimize custom font loading
8. **Animation library** - Tạo animation utility classes
9. **Documentation** - Tạo Storybook cho components

---

## 📝 Notes

- Design system hiện tại đã khá nhất quán về mặt visual
- Cần refactor để improve maintainability
- Dark mode support tốt nhưng cần chuẩn hóa shadow strategy
- Responsive design được implement tốt với mobile-first approach
- Accessibility cần improve: thêm ARIA labels, keyboard navigation

---

**Phân tích bởi:** UI/UX Engineer  
**Methodology:** ui-ux-pro-max  
**Ngày:** 26/01/2026
