# Blog Interaction Section

A unified, production-ready component for blog post interactions including reactions (like/dislike) and comments with real-time updates.

## Components

### BlogInteractionSection

Main component that combines reaction bar and comments section in a clean, professional layout.

**Location:** `src/components/blog/BlogInteractionSection.tsx`

**Features:**
- Like/Dislike reactions with toggle functionality
- Share button with native share API fallback
- Real-time reaction count updates from API
- Seamless integration with comments section
- Responsive design with smooth animations
- Authentication-aware (redirects to login if needed)

**Props:**
```typescript
interface BlogInteractionSectionProps {
    postId: string;           // Blog post ID
    postSlug: string;         // Blog post slug
    initialLikes?: number;    // Initial like count
    initialDislikes?: number; // Initial dislike count
    initialUserReaction?: 'like' | 'dislike' | null; // User's current reaction
}
```

**Usage:**
```tsx
import BlogInteractionSection from '../components/blog/BlogInteractionSection';

<BlogInteractionSection
    postId={post.id}
    postSlug={post.slug}
    initialLikes={post.like_count}
    initialDislikes={post.dislike_count}
/>
```

### CommentsSection

Handles the complete comment system with nested replies and real-time updates.

**Location:** `src/components/blog/CommentsSection.tsx`

**Features:**
- Paginated comment loading
- Real-time updates via WebSocket
- Nested replies (max 3 levels)
- Like comments
- Edit/delete own comments
- Empty state messaging
- Connection status indicator
- Load more functionality

**Props:**
```typescript
interface CommentsSectionProps {
    postId: number;    // Blog post ID
    postSlug?: string; // Blog post slug (optional)
}
```

### CommentForm

Reusable form for creating comments and replies.

**Location:** `src/components/blog/CommentForm.tsx`

**Features:**
- User avatar display
- Character count (max 5000)
- Validation and error handling
- Loading states
- Authentication check
- Reply mode support

**Props:**
```typescript
interface CommentFormProps {
    postId: number;
    parentId?: number;           // For replies
    onSubmit: (content: string) => Promise<void>;
    onCancel?: () => void;       // For reply forms
    placeholder?: string;
    submitText?: string;
    isReply?: boolean;
    isLoading?: boolean;
}
```

### CommentItem

Individual comment display with actions and nested replies.

**Location:** `src/components/blog/CommentItem.tsx`

**Features:**
- User avatar and metadata
- Like button with count
- Reply functionality
- Edit/delete for owners
- Nested reply display (max 3 levels)
- Show/hide replies toggle
- Time ago formatting
- Deleted comment handling

**Props:**
```typescript
interface CommentItemProps {
    comment: Comment;
    onReply: (parentId: number, content: string) => Promise<void>;
    onEdit: (commentId: number, content: string) => Promise<void>;
    onDelete: (commentId: number) => Promise<void>;
    onLike: (commentId: number) => Promise<void>;
    isLoading?: boolean;
    depth?: number;  // Current nesting level
}
```

### ReactionBar

Standalone reaction bar component (can be used independently).

**Location:** `src/components/blog/ReactionBar.tsx`

**Features:**
- Like/dislike buttons with counts
- Share functionality
- Animated reactions
- Mutually exclusive reactions
- API-driven count updates

## API Integration

### Reaction Endpoints

**Like a post:**
```
POST /api/blog/{postId}/like
Response: { like_count, dislike_count, user_reaction }
```

**Dislike a post:**
```
POST /api/blog/{postId}/dislike
Response: { like_count, dislike_count, user_reaction }
```

**Get reactions (optional):**
```
GET /api/blog/{postId}/reactions
Response: { like_count, dislike_count, user_reaction }
```

### Comment Endpoints

**Get comments:**
```
GET /api/comments/posts/{postId}?page=1&page_size=10
Response: { comments, total, page, page_size, has_next }
```

**Create comment:**
```
POST /api/comments
Body: { post_id, content, parent_id? }
Response: Comment
```

**Update comment:**
```
PUT /api/comments/{commentId}
Body: { content }
Response: Comment
```

**Delete comment:**
```
DELETE /api/comments/{commentId}
```

**Like comment:**
```
POST /api/comments/{commentId}/like
Response: { id, like_count, is_liked, user_id }
```

## WebSocket Integration

Real-time comment updates via WebSocket connection.

**Connection URL:**
```
ws://localhost:8000/ws/comments/{postId}?token={accessToken}
```

**Message Types:**
- `connected` - Connection established
- `comment_created` - New comment added
- `comment_updated` - Comment edited
- `comment_deleted` - Comment removed
- `comment_liked` - Comment liked/unliked
- `pong` - Keep-alive response

**Hook Usage:**
```typescript
import { useCommentWebSocket } from '../../hooks/useCommentWebSocket';

useCommentWebSocket({
    postId,
    token,
    onCommentCreated: (comment) => { /* handle */ },
    onCommentUpdated: (comment) => { /* handle */ },
    onCommentDeleted: (commentId) => { /* handle */ },
    onCommentLiked: (data) => { /* handle */ },
    onConnected: () => { /* handle */ },
    onDisconnected: () => { /* handle */ },
    onError: (error) => { /* handle */ }
});
```

## Styling

All components use Tailwind CSS with dark mode support:

- **Container:** White background with subtle shadow
- **Spacing:** Consistent padding and margins
- **Borders:** Rounded corners (16px for main containers)
- **Colors:** Green for primary actions, red for likes, blue for shares
- **Animations:** Smooth transitions (250ms duration)
- **Responsive:** Mobile-first design with breakpoints

## Behavior Rules

### Reactions
1. User can only select ONE reaction (like OR dislike)
2. Clicking the same reaction toggles it off
3. Switching reactions automatically removes the previous one
4. Counts are ALWAYS updated from API responses (source of truth)
5. Unauthenticated users are redirected to login

### Comments
1. Maximum 3 levels of nesting for replies
2. Comments can be edited/deleted by owners only
3. Deleted comments show "[deleted]" but preserve replies
4. Real-time updates for all users viewing the post
5. Pagination with "Load more" button
6. Character limit: 5000 characters per comment

### Empty States
- **No comments:** "No comments yet. Be the first to share your thoughts!"
- **Deleted comment:** "This comment has been deleted"
- **Not authenticated:** Sign-in prompt with button

## Integration Example

```tsx
import BlogInteractionSection from '../components/blog/BlogInteractionSection';

const BlogDetailPage = () => {
    const { post } = useBlogPost();

    return (
        <article>
            {/* Blog content */}
            <div className="prose">
                {post.content}
            </div>

            {/* Tags */}
            <div className="tags">
                {post.tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>

            {/* Interaction Section */}
            <BlogInteractionSection
                postId={post.id}
                postSlug={post.slug}
                initialLikes={post.like_count}
                initialDislikes={post.dislike_count}
            />
        </article>
    );
};
```

## Testing Checklist

- [ ] Like button toggles correctly
- [ ] Dislike button toggles correctly
- [ ] Switching from like to dislike works
- [ ] Share button copies link or opens native share
- [ ] Comment form validates empty input
- [ ] Comment form shows character count
- [ ] Comments load with pagination
- [ ] Reply form appears when clicking Reply
- [ ] Nested replies display correctly (max 3 levels)
- [ ] Edit comment works for owner
- [ ] Delete comment works for owner
- [ ] Like comment updates count
- [ ] WebSocket connection establishes
- [ ] Real-time updates appear for new comments
- [ ] Real-time updates appear for likes
- [ ] Unauthenticated users see login prompt
- [ ] Dark mode styling works correctly
- [ ] Mobile responsive layout works
- [ ] Empty state displays when no comments

## Performance Considerations

1. **Optimistic Updates:** UI updates immediately, then syncs with server
2. **WebSocket Reconnection:** Automatic retry with exponential backoff
3. **Pagination:** Load comments in chunks to reduce initial load time
4. **Lazy Loading:** Replies are collapsed by default for deeply nested threads
5. **Debouncing:** Character count updates are debounced
6. **Memoization:** Comment items use React.memo for performance

## Accessibility

- Semantic HTML elements
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus management for forms
- Screen reader friendly time formatting
- Color contrast meets WCAG AA standards

## Future Enhancements

- [ ] Markdown support in comments
- [ ] @mentions for users
- [ ] Comment sorting (newest, oldest, most liked)
- [ ] Comment search/filter
- [ ] Report inappropriate comments
- [ ] Pin important comments
- [ ] Reaction emojis beyond like/dislike
- [ ] Comment notifications
- [ ] Draft comment auto-save
- [ ] Rich text editor for comments
