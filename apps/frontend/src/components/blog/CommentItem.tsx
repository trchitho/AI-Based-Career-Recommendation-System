import React, { useState } from 'react';
import { Comment } from '../../services/commentService';
import { useAuth } from '../../contexts/AuthContext';
import CommentForm from './CommentForm';

interface CommentItemProps {
    comment: Comment;
    onReply: (parentId: number, content: string) => Promise<void>;
    onEdit: (commentId: number, content: string) => Promise<void>;
    onDelete: (commentId: number) => Promise<void>;
    onLike: (commentId: number) => Promise<void>;
    isLoading?: boolean;
    depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    onReply,
    onEdit,
    onDelete,
    onLike,
    isLoading = false,
    depth = 0
}) => {
    const { user } = useAuth();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReplies, setShowReplies] = useState(true);

    const isOwner = Number(user?.id) === comment.user_id;
    const canReply = depth < 3; // Limit nesting to 3 levels
    const hasReplies = comment.replies && comment.replies.length > 0;

    const handleReply = async (content: string) => {
        setIsSubmitting(true);
        try {
            await onReply(comment.id, content);
            setShowReplyForm(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!editContent.trim() || editContent === comment.content) {
            setIsEditing(false);
            return;
        }

        setIsSubmitting(true);
        try {
            await onEdit(comment.id, editContent.trim());
            setIsEditing(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            await onDelete(comment.id);
        }
    };

    const handleLike = async () => {
        await onLike(comment.id);
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    };

    if (comment.is_deleted) {
        return (
            <div className={`${depth > 0 ? 'ml-12' : ''} py-4`}>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="text-sm italic">This comment has been deleted</span>
                    </div>
                </div>

                {/* Show replies even if parent is deleted */}
                {hasReplies && (
                    <div className="mt-4">
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                onReply={onReply}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onLike={onLike}
                                isLoading={isLoading}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`${depth > 0 ? 'ml-12' : ''} py-4`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Comment Header */}
                <div className="flex items-start gap-3 p-4">
                    <img
                        src={comment.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_name)}&background=10b981&color=fff`}
                        alt={comment.user_name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {comment.user_name}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(comment.created_at)}
                            </span>
                            {comment.updated_at !== comment.created_at && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                    (edited)
                                </span>
                            )}
                        </div>

                        {/* Comment Content */}
                        {isEditing ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                                    rows={3}
                                    disabled={isSubmitting}
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleEdit}
                                        disabled={isSubmitting || !editContent.trim()}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditContent(comment.content);
                                        }}
                                        disabled={isSubmitting}
                                        className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Comment Actions */}
                {!isEditing && (
                    <div className="flex items-center justify-between px-4 pb-4">
                        <div className="flex items-center gap-4">
                            {/* Like Button */}
                            <button
                                onClick={handleLike}
                                disabled={isLoading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${comment.is_liked
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    } disabled:opacity-50`}
                            >
                                <svg className={`w-4 h-4 ${comment.is_liked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span>{comment.like_count}</span>
                            </button>

                            {/* Reply Button */}
                            {canReply && (
                                <button
                                    onClick={() => setShowReplyForm(!showReplyForm)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    Reply
                                </button>
                            )}

                            {/* Show/Hide Replies */}
                            {hasReplies && (
                                <button
                                    onClick={() => setShowReplies(!showReplies)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-all"
                                >
                                    <svg className={`w-4 h-4 transition-transform ${showReplies ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </button>
                            )}
                        </div>

                        {/* Owner Actions */}
                        {isOwner && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    disabled={isLoading}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                                    title="Edit comment"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                    title="Delete comment"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
                <div className="mt-4">
                    <CommentForm
                        postId={comment.post_id}
                        parentId={comment.id}
                        onSubmit={handleReply}
                        onCancel={() => setShowReplyForm(false)}
                        placeholder={`Reply to ${comment.user_name}...`}
                        submitText="Post Reply"
                        isReply={true}
                        isLoading={isSubmitting}
                    />
                </div>
            )}

            {/* Nested Replies */}
            {hasReplies && showReplies && (
                <div className="mt-4 space-y-4">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onLike={onLike}
                            isLoading={isLoading}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentItem;