import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface CommentFormProps {
    postId: number;
    parentId?: number;
    onSubmit: (content: string) => Promise<void>;
    onCancel?: () => void;
    placeholder?: string;
    submitText?: string;
    isReply?: boolean;
    isLoading?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
    postId,
    parentId,
    onSubmit,
    onCancel,
    placeholder = "Write a comment...",
    submitText = "Post Comment",
    isReply = false,
    isLoading = false
}) => {
    const { user, isAuthenticated } = useAuth();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            setError('Comment cannot be empty');
            return;
        }

        if (content.length > 5000) {
            setError('Comment is too long (maximum 5000 characters)');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(content.trim());
            setContent('');
            if (onCancel) {
                onCancel(); // Close reply form after successful submission
            }
        } catch (err: any) {
            setError(err.message || 'Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setContent('');
        setError(null);
        if (onCancel) {
            onCancel();
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Join the Discussion
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Sign in to share your thoughts and engage with the community.
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In to Comment
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={`${isReply ? 'mt-4' : ''}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* User Info Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                    <img
                        src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=10b981&color=fff`}
                        alt={user?.full_name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isReply ? 'Replying to comment' : 'Commenting as'}
                        </p>
                    </div>
                </div>

                {/* Comment Input */}
                <div className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={placeholder}
                        rows={isReply ? 3 : 4}
                        className="w-full resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0"
                        disabled={isSubmitting || isLoading}
                    />

                    {/* Character Count */}
                    <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {content.length}/5000 characters
                        </div>
                        {content.length > 4500 && (
                            <div className="text-xs text-orange-500">
                                {5000 - content.length} characters remaining
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="px-4 pb-2">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Be respectful and constructive
                    </div>

                    <div className="flex items-center gap-2">
                        {isReply && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSubmitting || isLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={!content.trim() || isSubmitting || isLoading || content.length > 5000}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Posting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    {submitText}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default CommentForm;