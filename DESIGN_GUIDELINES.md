# Design Guidelines - Career Recommendation Platform

## Design Philosophy

**Professional. Clean. Purposeful.**

Thiết kế của chúng ta tập trung vào:
- **Clarity**: Mọi element đều có mục đích rõ ràng
- **Consistency**: Sử dụng patterns nhất quán
- **Simplicity**: Loại bỏ những gì không cần thiết
- **Accessibility**: Dễ sử dụng cho mọi người

---

## Color Palette

### Primary Colors
```
Forest Green: #2D5F4C (Primary actions, CTAs)
Light Green: #3A7A5F (Hover states)
Dark Green: #1F4435 (Active states)
```

### Neutral Colors
```
Stone 50:  #FAFAF9 (Background)
Stone 100: #F5F5F4 (Secondary background)
Stone 200: #E7E5E4 (Borders, dividers)
Stone 800: #292524 (Dark mode background)
Stone 900: #1C1917 (Dark mode primary)
```

### Semantic Colors
```
Success: #16A34A (Green)
Warning: #EA580C (Orange)
Error:   #DC2626 (Red)
Info:    #0284C7 (Blue)
```

**Quy tắc:**
- Chỉ dùng màu primary cho CTAs quan trọng
- Semantic colors chỉ dùng cho status/feedback
- Tránh dùng quá 3 màu trong 1 screen

---

## Typography

### Font Stack
```css
Sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'
Mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono'
```

### Scale
```
Heading 1: 2.25rem (36px) - Page titles
Heading 2: 1.875rem (30px) - Section titles
Heading 3: 1.5rem (24px) - Subsections
Body Large: 1.125rem (18px) - Intro text
Body: 1rem (16px) - Default
Body Small: 0.875rem (14px) - Secondary info
Caption: 0.75rem (12px) - Labels, metadata
```

**Quy tắc:**
- Line height: 1.5 cho body, 1.2 cho headings
- Letter spacing: -0.025em cho headings
- Font weight: 400 (regular), 500 (medium), 700 (bold)

---

## Spacing System

**8px base unit**

```
XS:  4px  (0.25rem)
SM:  8px  (0.5rem)
MD:  16px (1rem)
LG:  24px (1.5rem)
XL:  32px (2rem)
2XL: 48px (3rem)
3XL: 64px (4rem)
```

**Quy tắc:**
- Luôn dùng multiples of 8
- Padding: 16px-24px cho cards
- Margin: 24px-48px giữa sections
- Gap: 16px cho grids

---

## Components

### Buttons

**Primary Button**
```tsx
<button className="px-5 py-2.5 bg-[#2D5F4C] text-white rounded-lg font-medium hover:bg-[#1F4435] transition-all">
  Action
</button>
```

**Secondary Button**
```tsx
<button className="px-5 py-2.5 bg-stone-100 text-stone-900 rounded-lg font-medium hover:bg-stone-200 border border-stone-300 transition-all">
  Action
</button>
```

**Ghost Button**
```tsx
<button className="px-5 py-2.5 text-stone-700 rounded-lg font-medium hover:bg-stone-100 transition-all">
  Action
</button>
```

### Cards

**Standard Card**
```tsx
<div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all">
  Content
</div>
```

**Interactive Card**
```tsx
<div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm hover:shadow-lg hover:border-[#2D5F4C] transition-all cursor-pointer">
  Content
</div>
```

### Forms

**Input Field**
```tsx
<input className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#2D5F4C] focus:border-transparent transition-all" />
```

**Label**
```tsx
<label className="block text-sm font-medium text-stone-700 mb-2">
  Field Name
</label>
```

---

## Layout Patterns

### Container Widths
```
Max Width: 1280px (80rem)
Content Width: 768px (48rem) for reading
Sidebar: 256px (16rem)
```

### Grid System
```tsx
// 2 columns
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 4 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

### Page Structure
```
1. Header (fixed, 64px height)
2. Hero/Title Section (padding-top: 80px)
3. Content Sections (padding: 48px 0)
4. Footer
```

---

## Animations

### Transitions
```css
Fast: 150ms (hover states)
Base: 200ms (default)
Slow: 300ms (page transitions)
```

### Easing
```css
cubic-bezier(0.4, 0, 0.2, 1) - Standard
cubic-bezier(0.4, 0, 1, 1) - Decelerate
cubic-bezier(0, 0, 0.2, 1) - Accelerate
```

**Quy tắc:**
- Chỉ animate transform và opacity (performance)
- Tránh animate width/height
- Dùng will-change cho complex animations

---

## Shadows

```css
SM: 0 1px 2px rgba(0,0,0,0.05)
MD: 0 4px 6px rgba(0,0,0,0.1)
LG: 0 10px 15px rgba(0,0,0,0.1)
XL: 0 20px 25px rgba(0,0,0,0.1)
```

**Usage:**
- SM: Default cards
- MD: Hover states
- LG: Modals, dropdowns
- XL: Hero sections

---

## Border Radius

```
SM: 6px  - Small elements
MD: 8px  - Buttons, inputs
LG: 12px - Cards
XL: 16px - Large containers
```

---

## Icons

**Size Scale**
```
XS: 16px
SM: 20px
MD: 24px
LG: 32px
XL: 48px
```

**Style:**
- Outline style (stroke-width: 2)
- Consistent with Heroicons
- Always include aria-label

---

## Responsive Breakpoints

```
SM: 640px  (Mobile landscape)
MD: 768px  (Tablet)
LG: 1024px (Desktop)
XL: 1280px (Large desktop)
```

**Mobile-first approach:**
```tsx
// Base: Mobile
// md: Tablet and up
// lg: Desktop and up
<div className="p-4 md:p-6 lg:p-8">
```

---

## Accessibility

### Checklist
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Focus states visible
- [ ] Keyboard navigation works
- [ ] ARIA labels on icons
- [ ] Alt text on images
- [ ] Semantic HTML
- [ ] Skip to content link

### Focus States
```tsx
focus:ring-2 focus:ring-[#2D5F4C] focus:ring-offset-2
```

---

## Dark Mode

**Strategy:**
- Use Tailwind's dark: prefix
- Test all components in both modes
- Ensure sufficient contrast

**Colors:**
```
Background: stone-900
Cards: stone-800
Text: stone-50
Borders: stone-700
```

---

## Performance

### Best Practices
- Lazy load images
- Code split routes
- Minimize bundle size
- Use CSS instead of JS animations
- Optimize images (WebP)

### Loading States
```tsx
<div className="animate-pulse bg-stone-200 rounded-lg h-20" />
```

---

## Common Mistakes to Avoid

❌ **Don't:**
- Mix different border radius values randomly
- Use too many colors
- Inconsistent spacing
- Overly complex animations
- Tiny touch targets (<44px)

✅ **Do:**
- Follow the spacing system
- Use semantic HTML
- Keep it simple
- Test on real devices
- Maintain consistency

---

## Implementation Checklist

### For Each Page:
- [ ] Consistent header/footer
- [ ] Proper spacing (multiples of 8)
- [ ] Responsive design tested
- [ ] Dark mode works
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Accessibility checked
- [ ] Performance optimized

---

## Resources

- [Tailwind CSS Docs](https://tailwindcss.com)
- [Heroicons](https://heroicons.com)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Can I Use](https://caniuse.com)

---

**Remember:** Good design is invisible. Users should focus on their goals, not on the interface.
