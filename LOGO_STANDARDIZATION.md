# Logo Standardization - AppLogo Component

## 🎯 Mục tiêu

Đồng bộ logo "CareerBridge AI" cho tất cả các trang bằng cách tạo một **reusable component**.

## ✨ AppLogo Component

### Tạo Component
**File**: `src/components/common/AppLogo.tsx`

### Features
- ✅ 3 sizes: `sm`, `md`, `lg`
- ✅ Có thể hiện/ẩn text
- ✅ Có thể là link hoặc static
- ✅ Support custom logo từ admin
- ✅ Fallback icon (green checkmark)
- ✅ Dark mode support
- ✅ Consistent styling

### Props
```tsx
interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';      // Kích thước
  showText?: boolean;              // Hiện text hay không
  linkTo?: string | null;          // Link đến đâu (null = không link)
  className?: string;              // Custom classes
}
```

### Size Configuration
```tsx
sm: {
  container: 'w-8 h-8',
  icon: 'w-5 h-5',
  text: 'text-base',
}

md: {
  container: 'w-10 h-10',
  icon: 'w-6 h-6',
  text: 'text-lg',
}

lg: {
  container: 'w-16 h-16',
  icon: 'w-10 h-10',
  text: 'text-2xl',
}
```

## 📄 Pages Updated

### 1. MainLayout ✅
**Usage**: Navigation bar
```tsx
<AppLogo size="sm" showText={true} linkTo="/home" className="flex-shrink-0" />
```

### 2. HomePage ✅
**Usage**: Navigation bar
```tsx
<AppLogo size="sm" showText={true} linkTo="/home" />
```

### 3. LoginPage ✅
**Usage**: 
- Navbar: `<AppLogo size="md" showText={true} linkTo="/home" />`
- Center: `<AppLogo size="lg" showText={false} linkTo={null} />`

### 4. RegisterPage ✅
**Usage**:
- Navbar: `<AppLogo size="md" showText={true} linkTo="/home" />`
- Center: `<AppLogo size="lg" showText={false} linkTo={null} />`

### 5. ResultsPage ✅
**Usage**: Navigation bar
```tsx
<AppLogo size="sm" showText={true} linkTo="/dashboard" />
```

## 🎨 Visual Consistency

### Before
- ❌ Mỗi trang có code riêng
- ❌ Inconsistent sizes
- ❌ Duplicate code
- ❌ Hard to maintain
- ❌ Some pages had "CareerPath", others "CareerBridge AI"

### After
- ✅ Single source of truth
- ✅ Consistent sizes
- ✅ DRY principle
- ✅ Easy to maintain
- ✅ All pages show "CareerBridge AI" (or custom from admin)

## 🔧 How to Use

### Basic Usage
```tsx
import AppLogo from '../components/common/AppLogo';

// Small logo with text, clickable
<AppLogo size="sm" showText={true} linkTo="/home" />

// Medium logo with text, clickable
<AppLogo size="md" showText={true} linkTo="/home" />

// Large logo without text, not clickable
<AppLogo size="lg" showText={false} linkTo={null} />
```

### Custom Styling
```tsx
<AppLogo 
  size="md" 
  showText={true} 
  linkTo="/home" 
  className="my-custom-class"
/>
```

## 📦 Benefits

### 1. Maintainability
- Chỉ cần sửa 1 file để update logo cho tất cả trang
- Dễ dàng thêm features mới

### 2. Consistency
- Logo giống nhau trên mọi trang
- Sizes chuẩn hóa
- Colors đồng bộ

### 3. Flexibility
- Support custom logo từ admin
- 3 sizes khác nhau
- Có thể hiện/ẩn text
- Có thể là link hoặc static

### 4. Performance
- Component nhỏ gọn
- Không duplicate code
- Easy to tree-shake

## 🎯 Logo Behavior

### With Custom Logo (from Admin)
```tsx
// Shows uploaded logo image
<img src={app.logo_url} alt={app.app_title} />
```

### Without Custom Logo (Default)
```tsx
// Shows green checkmark icon
<div className="bg-[#4A7C59] dark:bg-green-600">
  <svg>
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
</div>
```

### Text Display
```tsx
// Shows app title from admin or default
{app.app_title || 'CareerBridge AI'}
```

## 🚀 Future Enhancements

Có thể thêm:
- [ ] Animation on hover
- [ ] Loading state
- [ ] Error fallback
- [ ] Multiple icon variants
- [ ] Custom colors per page
- [ ] Badge/notification dot

## 📝 Migration Guide

### Old Code
```tsx
<Link to="/home" className="flex items-center space-x-2">
  <div className="w-8 h-8 bg-[#4A7C59] rounded-lg">
    <svg className="w-5 h-5 text-white">...</svg>
  </div>
  <span className="text-lg font-semibold">CareerPath</span>
</Link>
```

### New Code
```tsx
<AppLogo size="sm" showText={true} linkTo="/home" />
```

## ✅ Checklist

- ✅ Created AppLogo component
- ✅ Updated MainLayout
- ✅ Updated HomePage
- ✅ Updated LoginPage
- ✅ Updated RegisterPage
- ✅ Updated ResultsPage
- ✅ All pages use "CareerBridge AI"
- ✅ Green checkmark icon everywhere
- ✅ Dark mode support
- ✅ Responsive design

## 🎉 Result

**Tất cả các trang giờ đây có logo đồng bộ:**
- ✅ Cùng màu xanh lá (#4A7C59)
- ✅ Cùng icon (checkmark)
- ✅ Cùng text "CareerBridge AI"
- ✅ Cùng styling
- ✅ Easy to maintain

---

**Status**: ✅ COMPLETED  
**Date**: 2025-01-29  
**Component**: `AppLogo.tsx`  
**Pages Updated**: 5+ pages
