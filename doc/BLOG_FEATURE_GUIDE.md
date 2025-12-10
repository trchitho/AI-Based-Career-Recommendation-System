# Blog Feature Guide

## Overview
Tính năng Blog cho phép người dùng tạo và quản lý các bài viết cá nhân.

## Features Implemented

### 1. Backend API
- **Endpoint**: `/api/essays`
- **Methods**:
  - `POST /api/essays` - Tạo bài viết mới
  - `GET /api/essays/me` - Lấy danh sách bài viết của user

### 2. Frontend Components

#### BlogPage (`apps/frontend/src/pages/BlogPage.tsx`)
- Hiển thị danh sách bài viết
- Modal tạo bài viết mới
- Responsive design
- Dark mode support

#### Features:
- ✅ Danh sách bài viết với timestamp
- ✅ Modal tạo bài viết mới
- ✅ Loading states
- ✅ Error handling
- ✅ Empty state với CTA
- ✅ Centered layout giống CV page

### 3. Services & Types

#### blogService (`apps/frontend/src/services/blogService.ts`)
```typescript
- getMyPosts(): Promise<BlogPost[]>
- createPost(post: BlogPostCreate): Promise<BlogPost>
```

#### Types (`apps/frontend/src/types/blog.ts`)
```typescript
interface BlogPost {
    id: number;
    user_id: number;
    content: string;
    lang?: string;
    created_at: string;
}
```

## Usage

### Accessing Blog Page
1. Login to the application
2. Click "Blog" in navigation menu
3. Click "Create New Post" button

### Creating a Post
1. Click "Create New Post"
2. Enter content in textarea
3. Click "Create Post"
4. Post will appear in the list

## Navigation
- Blog link is available in MainLayout navigation
- Route: `/blog`
- Protected route (requires authentication)

## Styling
- Centered layout (max-w-4xl)
- Card-based design
- Consistent with CV Builder styling
- Smooth transitions and hover effects

## Future Enhancements
- [ ] Edit post functionality
- [ ] Delete post functionality
- [ ] Rich text editor
- [ ] Image upload
- [ ] Categories/Tags
- [ ] Search functionality
- [ ] Pagination
- [ ] Share functionality
- [ ] Comments system
