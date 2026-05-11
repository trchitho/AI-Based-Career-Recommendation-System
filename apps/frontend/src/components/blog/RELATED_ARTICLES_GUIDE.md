# Related Articles Component - Modern SaaS UI

## Overview
The Related Articles section has been redesigned with a modern SaaS UI inspired by CareerLink and Medium, featuring real-time WebSocket updates for engagement metrics.

## Features

### 1. Modern Layout
- **Featured Large Card (Left)**: 2/3 width on desktop
  - Full-width image with gradient overlay
  - Category badge overlay
  - Title (max 2 lines)
  - Metadata: likes, comments, read time
  - Hover zoom effect on image

- **Small Cards (Right)**: 1/3 width on desktop
  - Horizontal layout (image left, content right)
  - Compact title display
  - Like and comment counts
  - Hover effects

### 2. Real-Time Updates
- WebSocket integration via `useBlogWebSocket` hook
- Automatic sync of `like_count` and `comment_count`
- No page refresh needed
- Graceful fallback if WebSocket unavailable

### 3. Responsive Design
- Desktop: 2-column layout (featured + small cards)
- Tablet: Stacked layout
- Mobile: Single column, full-width cards

### 4. Visual Design
- `rounded-2xl` for featured card, `rounded-xl` for small cards
- Gradient overlays on featured image
- Shadow effects: `shadow-lg` → `shadow-2xl` on hover
- Smooth transitions (300-700ms)
- Dark mode support

### 5. Performance
- Loading skeleton states
- Optimized image loading with fallbacks
- Lazy WebSocket connection
- Efficient re-renders with React state

## Components

### RelatedArticles.tsx
Main component for blog detail pages with modern layout.

**Props:**
```typescript
interface RelatedArticlesProps {
    posts: BlogPost[];
}
```

**Usage:**
```tsx
import RelatedArticles from '../components/blog/RelatedArticles';

<RelatedArticles posts={relatedPosts} />
```

### RelatedPosts.tsx
Alternative component for sidebar or other contexts (2-column grid).

**Props:**
```typescript
interface RelatedPostsProps {
    posts: BlogPost[];
    title?: string;
}
```

**Usage:**
```tsx
import RelatedPosts from '../components/blog/RelatedPosts';

<RelatedPosts posts={posts} title="You May Also Like" />
```

## WebSocket Hook

### useBlogWebSocket.ts
Custom hook for real-time blog post updates.

**Features:**
- Connects to multiple post IDs simultaneously
- Auto-reconnection with exponential backoff
- Keep-alive ping mechanism
- Error handling and callbacks

**Usage:**
```typescript
import { useBlogWebSocket } from '../../hooks/useBlogWebSocket';

const postIds = posts.map(p => p.id);
useBlogWebSocket({
    postIds,
    onBlogUpdate: (postId, data) => {
        // Update local state
        setLocalPosts(prev => prev.map(post => 
            post.id === postId 
                ? { ...post, like_count: data.like_count }
                : post
        ));
    },
    onConnected: () => console.log('Connected'),
    onDisconnected: () => console.log('Disconnected'),
    onError: (error) => console.error(error)
});
```

## Backend Requirements

### WebSocket Endpoint
The component expects a WebSocket endpoint at:
```
ws://localhost:8000/ws/blog?post_ids=id1,id2,id3
```

### Message Format
```typescript
interface BlogWebSocketMessage {
    type: 'connected' | 'blog_updated' | 'blog_liked' | 'blog_commented' | 'pong';
    data?: {
        post_id: string;
        like_count?: number;
        comment_count?: number;
        view_count?: number;
    };
    message?: string;
}
```

### Example Backend Implementation (FastAPI)
```python
from fastapi import WebSocket

@app.websocket("/ws/blog")
async def blog_websocket(websocket: WebSocket, post_ids: str):
    await websocket.accept()
    await websocket.send_json({
        "type": "connected",
        "message": "Connected to blog updates"
    })
    
    # Listen for blog updates and broadcast
    while True:
        # When a blog is liked/commented
        await websocket.send_json({
            "type": "blog_liked",
            "data": {
                "post_id": "123",
                "like_count": 42,
                "comment_count": 15
            }
        })
```

## Styling Details

### Featured Card
- Height: `h-80` (320px)
- Gradient: `bg-gradient-to-t from-black/80 via-black/40 to-transparent`
- Title: `text-3xl font-bold`
- Badge: `bg-white/95 backdrop-blur-sm`

### Small Cards
- Image width: `w-40` (160px)
- Horizontal flex layout
- Compact padding: `p-5`
- Metadata icons: `w-4 h-4`

### Hover Effects
- Image scale: `scale-110` (700ms duration)
- Shadow: `shadow-md` → `shadow-xl`
- Title color: `text-gray-900` → `text-green-600`

## Accessibility

- Semantic HTML (`<article>`, `<section>`)
- Alt text on all images
- Keyboard navigation support
- ARIA labels where needed
- Focus states on interactive elements

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- WebSocket support required for real-time updates
- Graceful degradation without WebSocket

## Performance Optimization

1. **Image Loading**
   - Fallback images on error
   - Optimized image sizes
   - Lazy loading ready

2. **WebSocket**
   - Connection pooling
   - Auto-reconnection
   - Debounced updates

3. **React Optimization**
   - Memoized callbacks
   - Efficient state updates
   - Minimal re-renders

## Testing

### Manual Testing Checklist
- [ ] Featured card displays correctly
- [ ] Small cards layout properly
- [ ] Images load with fallbacks
- [ ] Hover effects work smoothly
- [ ] Click navigation works
- [ ] WebSocket updates in real-time
- [ ] Dark mode renders correctly
- [ ] Responsive on mobile/tablet
- [ ] Loading skeleton appears
- [ ] Metadata displays accurately

### WebSocket Testing
```bash
# Test WebSocket connection
wscat -c "ws://localhost:8000/ws/blog?post_ids=1,2,3"

# Send test message
{"type": "blog_liked", "data": {"post_id": "1", "like_count": 100}}
```

## Troubleshooting

### WebSocket Not Connecting
1. Check backend is running on port 8000
2. Verify WebSocket endpoint exists
3. Check browser console for errors
4. Ensure CORS is configured

### Real-Time Updates Not Working
1. Verify WebSocket connection status
2. Check message format matches interface
3. Ensure post IDs are correct
4. Check browser console logs

### Images Not Loading
1. Verify image URLs are correct
2. Check CORS headers
3. Ensure fallback images work
4. Test with different image sources

## Future Enhancements

- [ ] Infinite scroll for more articles
- [ ] Bookmark/save functionality
- [ ] Share buttons on cards
- [ ] Reading progress indicator
- [ ] Personalized recommendations
- [ ] A/B testing different layouts
- [ ] Analytics tracking
- [ ] Social proof indicators

## Migration Guide

### From Old to New Component

**Before:**
```tsx
{relatedPosts.length > 0 && (
    <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
            <h2>Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map(post => (
                    <article key={post.slug}>...</article>
                ))}
            </div>
        </div>
    </section>
)}
```

**After:**
```tsx
import RelatedArticles from '../components/blog/RelatedArticles';

{relatedPosts.length > 0 && (
    <RelatedArticles posts={relatedPosts} />
)}
```

## Credits

Design inspired by:
- Medium's article recommendations
- CareerLink's content discovery
- Modern SaaS UI patterns

Built with:
- React 18
- TypeScript
- Tailwind CSS
- WebSocket API
- Lucide Icons
