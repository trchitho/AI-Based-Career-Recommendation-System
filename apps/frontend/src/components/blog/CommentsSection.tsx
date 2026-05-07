import React, { useState, useEffect, useCallback } from 'react';
import { commentService, Comment, CommentListResponse } from '../../services/commentService';
import { useCommentWebSocket } from '../../hooks/useCommentWebSocket';
import { getAccessToken } from '../../utils/auth';
import { useAuth } from '../../contexts/AuthContext';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentsSectionProps {
    postId: number;
    postSlug?: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalComments, setTotalComments] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const pageSize = 10;
    const token = getAccessToken();

    // Load comments from API
    const loadComments = useCallback(async (page: number = 1, append: boolean = false) => {
        try {
            if (!append) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const response: CommentListResponse = await commentService.getComments(postId, page, pageSize);

            if (append) {
                setComments(prev => [...prev, ...response.comments]);
            } else {
                setComments(response.comments);
            }

            setTotalComments(response.total);
            setHasNextPage(response.has_next);
            setCurrentPage(page);
        } catch (err: any) {
            setError(err.message);
            console.error('Failed to load comments:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [postId, pageSize]);

    // WebSocket event handlers
    const handleCommentCreated = useCallback((newComment: Comment) => {
        if (newComment.parent_id) {
            // Handle reply - find parent and add to its replies
            setComments(prev => {
                const updateCommentReplies = (comments: Comment[]): Comment[] => {
                    return comments.map(comment => {
                        if (comment.id === newComment.parent_id) {
                            return {
                                ...comment,
                                replies: [...comment.replies, newComment]
                            };
                        } else if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateCommentReplies(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateCommentReplies(prev);
            });
        } else {
            // Handle top-level comment
            setComments(prev => [newComment, ...prev]);
            setTotalComments(prev => prev + 1);
        }
    }, []);

    const handleCommentUpdated = useCallback((updatedComment: Comment) => {
        setComments(prev => {
            const updateComment = (comments: Comment[]): Comment[] => {
                return comments.map(comment => {
                    if (comment.id === updatedComment.id) {
                        return { ...updatedComment, replies: comment.replies };
                    } else if (comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateComment(comment.replies)
                        };
                    }
                    return comment;
                });
            };
            return updateComment(prev);
        });
    }, []);

    const handleCommentDeleted = useCallback((commentId: number) => {
        setComments(prev => {
            const markAsDeleted = (comments: Comment[]): Comment[] => {
                return comments.map(comment => {
                    if (comment.id === commentId) {
                        return { ...comment, is_deleted: true, content: '[deleted]' };
                    } else if (comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: markAsDeleted(comment.replies)
                        };
                    }
                    return comment;
                });
            };
            return markAsDeleted(prev);
        });
    }, []);

    const handleCommentLiked = useCallback((likeData: { id: number; like_count: number; is_liked: boolean; user_id: number }) => {
        // Only update if the like was from another user
        const currentUserId = user?.id ? parseInt(user.id) : 0;
        if (likeData.user_id !== currentUserId) {
            setComments(prev => {
                const updateLikes = (comments: Comment[]): Comment[] => {
                    return comments.map(comment => {
                        if (comment.id === likeData.id) {
                            return {
                                ...comment,
                                like_count: likeData.like_count
                                // Don't update is_liked for other users' actions
                            };
                        } else if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateLikes(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateLikes(prev);
            });
        }
    }, [user]);

    // WebSocket connection
    useCommentWebSocket({
        postId,
        token,
        onCommentCreated: handleCommentCreated,
        onCommentUpdated: handleCommentUpdated,
        onCommentDeleted: handleCommentDeleted,
        onCommentLiked: handleCommentLiked,
        onConnected: () => setIsConnected(true),
        onDisconnected: () => setIsConnected(false),
        onError: (error) => console.error('WebSocket error:', error)
    });

    // Load initial comments
    useEffect(() => {
        loadComments(1, false);
    }, [loadComments]);

    // Comment actions
    const handleCreateComment = async (content: string) => {
        try {
            const newComment = await commentService.createComment({
                post_id: postId,
                content
            });

            // Add optimistically (will be updated by WebSocket)
            setComments(prev => [newComment, ...prev]);
            setTotalComments(prev => prev + 1);
        } catch (error: any) {
            throw error; // Let the form handle the error
        }
    };

    const handleReply = async (parentId: number, content: string) => {
        try {
            const reply = await commentService.createComment({
                post_id: postId,
                content,
                parent_id: parentId
            });

            // Add optimistically (will be updated by WebSocket)
            setComments(prev => {
                const updateReplies = (comments: Comment[]): Comment[] => {
                    return comments.map(comment => {
                        if (comment.id === parentId) {
                            return {
                                ...comment,
                                replies: [...comment.replies, reply]
                            };
                        } else if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateReplies(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateReplies(prev);
            });
        } catch (error: any) {
            throw error;
        }
    };

    const handleEdit = async (commentId: number, content: string) => {
        try {
            const updatedComment = await commentService.updateComment(commentId, { content });

            // Update optimistically (will be updated by WebSocket)
            setComments(prev => {
                const updateComment = (comments: Comment[]): Comment[] => {
                    return comments.map(comment => {
                        if (comment.id === commentId) {
                            return { ...updatedComment, replies: comment.replies };
                        } else if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateComment(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateComment(prev);
            });
        } catch (error: any) {
            throw error;
        }
    };

    const handleDelete = async (commentId: number) => {
        try {
            await commentService.deleteComment(commentId);

            // Update optimistically (will be updated by WebSocket)
            setComments(prev => {
                const markAsDeleted = (comments: Comment[]): Comment[] => {
                    return comments.map(comment => {
                        if (comment.id === commentId) {
                            return { ...comment, is_deleted: true, content: '[deleted]' };
                        } else if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: markAsDeleted(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return markAsDeleted(prev);
            });
        } catch (error: any) {
            throw error;
        }
    };

    const handleLike = async (commentId: number) => {
        try {
            const likeData = await commentService.toggleLike(commentId);

            // Only update from API response - WebSocket will handle other users
            setComments(prev => {
                const updateLikes = (comments: Comment[]): Comment[] => {
                    return comments.map(comment => {
                        if (comment.id === commentId) {
                            return {
                                ...comment,
                                like_count: likeData.like_count,
                                is_liked: likeData.is_liked
                            };
                        } else if (comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateLikes(comment.replies)
                            };
                        }
                        return comment;
                    });
                };
                return updateLikes(prev);
            });
        } catch (error: any) {
            throw error;
        }
    };

    const handleLoadMore = () => {
        if (hasNextPage && !loadingMore) {
            loadComments(currentPage + 1, true);
        }
    };

    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <svg className="w-7 h-7 text-indigo-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Comments ({totalComments})
                    </h3>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-indigo-700' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {isConnected ? 'Live updates' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Comment Form */}
            <div className="mb-8">
                <CommentForm
                    postId={postId}
                    onSubmit={handleCreateComment}
                    placeholder="Share your thoughts on this article..."
                />
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    </div>
                    <button
                        onClick={() => loadComments(1, false)}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                </div>
            )}

            {/* Comments List */}
            {!loading && (
                <>
                    {comments.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                No comments yet
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                Be the first to share your thoughts on this article!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {comments.map((comment) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onReply={handleReply}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onLike={handleLike}
                                />
                            ))}
                        </div>
                    )}

                    {/* Load More Button */}
                    {hasNextPage && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        Loading more comments...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        Load more comments
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default CommentsSection;