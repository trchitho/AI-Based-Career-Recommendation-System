# UI Refactor Pattern Guide

## Design System Colors

### Primary Colors
```css
/* Green Theme */
--primary: #4A7C59
--primary-dark: #3d6449
--primary-light: #E8F5E9

/* Beige/Neutral */
--bg-primary: #F5EFE7
--bg-secondary: #E8DCC8
--bg-tertiary: #D4C4B0

/* Accent Colors */
--accent-pink: #D4A5A5
--accent-blue: #7B9EA8
--accent-yellow: #E8B86D
```

### Dark Mode
```css
--dark-bg: #1F2937 (gray-800)
--dark-bg-light: #374151 (gray-700)
--dark-primary: #10B981 (green-600)
```

## Component Patterns

### 1. Page Container
```tsx
<div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
  {/* Decorative circles */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute w-64 h-64 -top-32 -left-32 bg-[#E8DCC8] dark:bg-gray-800 rounded-full opacity-50"></div>
    <div className="absolute w-96 h-96 top-20 right-10 bg-[#D4C4B0] dark:bg-gray-800 rounded-full opacity-30"></div>
  </div>
  
  {/* Content */}
</div>
```

### 2. Navigation Bar
```tsx
<nav className="fixed top-0 left-0 right-0 z-[999999] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16">
      {/* Logo */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-[#4A7C59] dark:bg-green-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">CareerPath</span>
      </div>
      
      {/* Nav items */}
    </div>
  </div>
</nav>
```

### 3. Card Component
```tsx
<div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
  {/* Card content */}
</div>
```

### 4. Primary Button
```tsx
<button className="px-6 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 transition-all duration-200 shadow-lg">
  Button Text
</button>
```

### 5. Secondary Button
```tsx
<button className="px-6 py-3 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all duration-200">
  Button Text
</button>
```

### 6. Input Field
```tsx
<input
  type="text"
  className="block w-full px-4 py-3 bg-white/70 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 outline-none transition"
  placeholder="Enter text..."
/>
```

### 7. Tab Navigation
```tsx
<nav className="flex space-x-1 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
  <button
    className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
      activeTab === 'tab1'
        ? 'bg-[#4A7C59] dark:bg-green-600 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    Tab 1
  </button>
</nav>
```

### 8. Badge/Tag
```tsx
<span className="px-4 py-2 bg-[#E8F5E9] dark:bg-green-900/30 text-[#4A7C59] dark:text-green-400 text-sm font-medium rounded-full border border-[#4A7C59]/30 dark:border-green-600/30">
  Tag Text
</span>
```

### 9. Alert/Error Message
```tsx
<div className="rounded-lg bg-red-100/60 dark:bg-red-500/10 border border-red-300 dark:border-red-500/50 p-4">
  <p className="text-sm text-red-600 dark:text-red-300">Error message</p>
</div>
```

### 10. Success Message
```tsx
<div className="rounded-lg bg-green-100/60 dark:bg-green-500/10 border border-green-300 dark:border-green-500/50 p-4">
  <p className="text-sm text-green-600 dark:text-green-300">Success message</p>
</div>
```

### 11. Loading Spinner
```tsx
<div className="flex justify-center items-center py-12">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7C59] dark:border-green-600"></div>
</div>
```

### 12. Icon Container
```tsx
<div className="w-14 h-14 bg-[#4A7C59] dark:bg-green-600 rounded-xl flex items-center justify-center">
  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* SVG path */}
  </svg>
</div>
```

### 13. Gradient CTA Section
```tsx
<div className="bg-gradient-to-br from-[#4A7C59] to-[#3d6449] dark:from-green-600 dark:to-green-700 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden">
  <div className="absolute inset-0 opacity-10">
    <div className="absolute w-64 h-64 -top-32 -left-32 bg-white rounded-full"></div>
    <div className="absolute w-96 h-96 top-20 right-10 bg-white rounded-full"></div>
  </div>
  <div className="relative z-10">
    {/* CTA content */}
  </div>
</div>
```

### 14. Statistics Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-lg">
  <div className="text-4xl font-bold text-[#4A7C59] dark:text-green-500 mb-2">500K+</div>
  <div className="text-gray-600 dark:text-gray-400">Description</div>
</div>
```

### 15. Testimonial Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
  {/* Star rating */}
  <div className="flex items-center mb-4">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-5 h-5 text-[#E8B86D] dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
  
  {/* Quote */}
  <p className="text-gray-700 dark:text-gray-300 mb-6">
    "Testimonial text here..."
  </p>
  
  {/* Author */}
  <div className="flex items-center">
    <div className="w-12 h-12 bg-[#4A7C59] dark:bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
      AB
    </div>
    <div className="ml-4">
      <div className="font-semibold text-gray-900 dark:text-white">Author Name</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">Job Title</div>
    </div>
  </div>
</div>
```

## Typography

### Headings
```tsx
<h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
<h2 className="text-4xl font-bold text-gray-900 dark:text-white">
<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
<h4 className="text-xl font-bold text-gray-900 dark:text-white">
```

### Body Text
```tsx
<p className="text-lg text-gray-700 dark:text-gray-300">
<p className="text-gray-600 dark:text-gray-400">
<p className="text-sm text-gray-500 dark:text-gray-400">
```

## Spacing & Layout

### Container
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Section Spacing
```tsx
<div className="mt-32"> {/* Large section gap */}
<div className="mt-20"> {/* Medium section gap */}
<div className="mt-8">  {/* Small section gap */}
```

### Grid Layouts
```tsx
{/* 3 columns */}
<div className="grid md:grid-cols-3 gap-8">

{/* 2 columns */}
<div className="grid md:grid-cols-2 gap-12">

{/* 4 columns */}
<div className="grid md:grid-cols-4 gap-8">
```

## Animation & Transitions

### Hover Effects
```tsx
hover:shadow-xl transition-shadow
hover:bg-[#3d6449] transition-all duration-200
hover:scale-105 transition-transform
```

### Fade In
```tsx
transition-colors duration-300
transition-all duration-200
```

## Responsive Design

### Mobile First
```tsx
{/* Mobile: stack, Desktop: side-by-side */}
<div className="flex flex-col sm:flex-row gap-4">

{/* Hide on mobile */}
<div className="hidden md:flex">

{/* Show only on mobile */}
<div className="md:hidden">
```

## Best Practices

1. **Always include dark mode** - Use `dark:` prefix for all colors
2. **Use backdrop blur** for overlays - `backdrop-blur-sm` or `backdrop-blur-xl`
3. **Add transitions** - Smooth hover and state changes
4. **Rounded corners** - Use `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`
5. **Shadow depth** - `shadow-sm`, `shadow-lg`, `shadow-xl`, `shadow-2xl`
6. **Consistent spacing** - Use Tailwind's spacing scale (4, 6, 8, 12, 16, 20, 32)
7. **Opacity for overlays** - Use `/90`, `/80`, `/50` for transparency
8. **Z-index hierarchy** - Navigation: `z-[999999]`, Overlays: `z-50`, Content: `z-10`

## Pages to Refactor

### Priority 1 (Already Done)
- ✅ HomePage
- ✅ LoginPage (mostly done)
- ✅ ResultsPage (mostly done)

### Priority 2 (Apply Pattern)
- [ ] AssessmentPage
- [ ] ProfilePage
- [ ] DashboardPage

### Priority 3 (Apply Pattern)
- [ ] PricingPage
- [ ] BlogPage
- [ ] BlogDetailPage
- [ ] CareersPage
- [ ] CareerDetailPage

### Priority 4 (Apply Pattern)
- [ ] RoadmapPage
- [ ] ChatPage
- [ ] ChatSummaryPage
- [ ] RegisterPage
- [ ] ForgotPasswordPage
- [ ] ResetPasswordPage
- [ ] VerifyEmailPage

## Quick Refactor Checklist

For each page:
1. [ ] Update background to `bg-[#F5EFE7] dark:bg-gray-900`
2. [ ] Add decorative circles if appropriate
3. [ ] Update primary buttons to green theme
4. [ ] Update cards to `rounded-2xl` with proper shadows
5. [ ] Ensure all colors have dark mode variants
6. [ ] Add smooth transitions to interactive elements
7. [ ] Update navigation bar styling
8. [ ] Test responsive behavior on mobile
9. [ ] Verify all icons and SVGs are visible
10. [ ] Check loading states and error messages
