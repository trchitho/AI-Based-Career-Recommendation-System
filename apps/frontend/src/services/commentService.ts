import api from '../lib/api';

export interface Comment {
    id: number;
    post_id: number;
    user_id: number;
    parent_id?: number;
    content: string;
    like_count: number;
    is_deleted: boolean;
    is_liked: boolean;
    user_name: string;
    user_avatar?: string;
    created_at: string;
    updated_at: string;
    replies: Comment[];
}

export interface CommentListResponse {
    comments: Comment[];
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
}

export interface CreateCommentData {
    post_id: number;
    content: string;
    parent_id?: number;
}

export interface UpdateCommentData {
    content: string;
}

export interface CommentLikeResponse {
    id: number;
    like_count: number;
    is_liked: boolean;
    user_id: number;
}

class CommentService {
    private baseUrl = '/api/comments';

    // Create a new comment or reply
    async createComment(data: CreateCommentData): Promise<Comment> {
        try {
            const response = await api.post(this.baseUrl, data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please wait before posting another comment.');
            }
            if (error.response?.status === 401) {
                throw new Error('You must be logged in to comment.');
            }
            throw new Error(error.response?.data?.detail || 'Failed to create comment');
        }
    }

    // Get paginated comments for a post
    async getComments(postId: number, page: number = 1, pageSize: number = 20): Promise<CommentListResponse> {
        try {
            const response = await api.get(`${this.baseUrl}/posts/${postId}`, {
                params: { page, page_size: pageSize }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.detail || 'Failed to load comments');
        }
    }

    // Update a comment
    async updateComment(commentId: number, data: UpdateCommentData): Promise<Comment> {
        try {
            const response = await api.put(`${this.baseUrl}/${commentId}`, data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                throw new Error('You can only edit your own comments');
            }
            if (error.response?.status === 401) {
                throw new Error('You must be logged in to edit comments.');
            }
            throw new Error(error.response?.data?.detail || 'Failed to update comment');
        }
    }

    // Delete a comment (soft delete)
    async deleteComment(commentId: number): Promise<void> {
        try {
            await api.delete(`${this.baseUrl}/${commentId}`);
        } catch (error: any) {
            if (error.response?.status === 403) {
                throw new Error('You can only delete your own comments');
            }
            if (error.response?.status === 401) {
                throw new Error('You must be logged in to delete comments.');
            }
            throw new Error(error.response?.data?.detail || 'Failed to delete comment');
        }
    }

    // Like or unlike a comment
    async toggleLike(commentId: number): Promise<CommentLikeResponse> {
        try {
            const response = await api.post(`${this.baseUrl}/${commentId}/like`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                throw new Error('You must be logged in to like comments.');
            }
            throw new Error(error.response?.data?.detail || 'Failed to toggle like');
        }
    }
}

export const commentService = new CommentService();