# Quick Refactor Guide - Copy & Paste Ready

## 🎨 Color Palette

```tsx
// Primary Green
bg-[#4A7C59] dark:bg-green-600        // Buttons, icons
hover:bg-[#3d6449] dark:hover:bg-green-700

// Backgrounds
bg-[#F5EFE7] dark:bg-gray-900         // Page background
bg-white dark:bg-gray-800              // Cards
bg-[#E8DCC8] dark:bg-gray-800         // Decorative circles

// Text
text-gray-900 dark:text-white          // Headings
text-gray-700 dark:text-gray-300       // Body
text-gray-600 dark:text-gray-400       // Secondary
```

## 🔄 Find & Replace

### Step 1: Update Backgrounds
```
Find:    bg-gray-50
Replace: bg-[#F5EFE7] dark:bg-gray-900

Find:    bg-purple-600
Replace: bg-[#4A7C59] dark:bg-green-600

Find:    hover:bg-purple-700
Replace: hover:bg-[#3d6449] dark:hover:bg-green-700
```

### Step 2: Update Borders & Rings
```
Find:    border-purple-500
Replace: border-[#4A7C59] dark:border-green-600

Find:    ring-purple-500
Replace: ring-[#4A7C59] dark:ring-green-600

Find:    focus:ring-purple-500
Replace: focus:ring-[#4A7C59] dark:focus:ring-green-600
```

### Step 3: Update Text Colors
```
Find:    text-purple-600
Replace: text-[#4A7C59] dark:text-green-500

Find:    text-purple-700
Replace: text-[#4A7C59] dark:text-green-600
```

## 📦 Ready-to-Use Components

### Page Wrapper
```tsx
<div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
  {/* Your content */}
</div>
```

### Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
  {/* Card content */}
</div>
```

### Primary Button
```tsx
<button className="px-6 py-3 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg font-medium hover:bg-[#3d6449] dark:hover:bg-green-700 transition-all">
  Click Me
</button>
```

### Input
```tsx
<input
  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A7C59] dark:focus:ring-green-600 outline-none"
/>
```

### Loading Spinner
```tsx
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7C59] dark:border-green-600"></div>
```

### Badge
```tsx
<span className="px-4 py-2 bg-[#E8F5E9] dark:bg-green-900/30 text-[#4A7C59] dark:text-green-400 rounded-full text-sm font-medium">
  Badge
</span>
```

## ⚡ 5-Minute Refactor Checklist

1. **Background**: Change page bg to `bg-[#F5EFE7] dark:bg-gray-900`
2. **Buttons**: Replace purple with green (`bg-[#4A7C59] dark:bg-green-600`)
3. **Cards**: Update to `rounded-2xl` and `shadow-lg`
4. **Inputs**: Add `rounded-xl` and green focus ring
5. **Test**: Check dark mode works

## 🎯 Priority Pages

### Must Do First
1. ✅ HomePage (done)
2. ✅ LoginPage (done)
3. ✅ ResultsPage (done)
4. ⏳ AssessmentPage
5. ⏳ DashboardPage

### Do Next
6. PricingPage
7. BlogPage
8. CareersPage
9. ProfilePage
10. RoadmapPage

## 💡 Pro Tips

- Use VS Code Find & Replace (Ctrl+H) for bulk changes
- Test dark mode after each change
- Keep rounded corners consistent (xl or 2xl)
- Add `transition-all` to interactive elements
- Use `shadow-lg` for cards, `shadow-xl` for important elements

## 🚀 Example: Before → After

### Before (Purple)
```tsx
<button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
  Click
</button>
```

### After (Green)
```tsx
<button className="bg-[#4A7C59] dark:bg-green-600 hover:bg-[#3d6449] dark:hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all">
  Click
</button>
```

---

**Need help?** Check `REFACTOR_PATTERN.md` for detailed patterns and examples.
