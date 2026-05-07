import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import api from '../../lib/api';
import { isAuthenticated } from '../../utils/auth';
import CommentsSection from './CommentsSection';

interface BlogInteractionSectionProps {
    postId: string;
    postSlug: string;
    initialLikes?: number;
    initialDislikes?: number;
    initialUserReaction?: 'like' | 'dislike' | null;
    onReactionUpdate?: () => void;
}

const BlogInteractionSection: React.FC<BlogInteractionSectionProps> = ({
    postId,
    postSlug,
    initialLikes = 0,
    initialDislikes = 0,
    initialUserReaction = null,
    onReactionUpdate
}) => {
    const navigate = useNavigate();
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [dislikeCount, setDislikeCount] = useState(initialDislikes);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(initialUserReaction);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isDislikeAnimating, setIsDislikeAnimating] = useState(false);

    // Fetch reaction data on mount to ensure consistency
    useEffect(() => {
        const fetchReactionData = async () => {
            if (!isAuthenticated()) return;

            try {
                const response = await api.get(`/api/blog/${postSlug}`);
                const data = response.data;

                // ALWAYS use API response as source of truth
                setLikeCount(data.like_count || 0);
                setDislikeCount(data.dislike_count || 0);
                setUserReaction(data.user_reaction || null);
            } catch (error) {
                console.error('Failed to fetch reaction data:', error);
            }
        };

        fetchReactionData();
    }, [postSlug]);

    const handleLike = async () => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            const response = await api.post(`/api/blog/${postId}/like`);
            const data = response.data;

            // ALWAYS use API response as source of truth - NO manual updates
            setLikeCount(data.like_count);
            setDislikeCount(data.dislike_count);
            setUserReaction(data.user_reaction);

            // Trigger animation if liked
            if (data.user_reaction === 'like') {
                setIsAnimating(true);
                setTimeout(() => setIsAnimating(false), 600);
            }

            // Notify parent to refresh data if needed
            onReactionUpdate?.();
        } catch (error: any) {
            console.error('Failed to like post:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleDislike = async () => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            const response = await api.post(`/api/blog/${postId}/dislike`);
            const data = response.data;

            // ALWAYS use API response as source of truth - NO manual updates
            setLikeCount(data.like_count);
            setDislikeCount(data.dislike_count);
            setUserReaction(data.user_reaction);

            // Trigger animation if disliked
            if (data.user_reaction === 'dislike') {
                setIsDislikeAnimating(true);
                setTimeout(() => setIsDislikeAnimating(false), 600);
            }

            // Notify parent to refresh data if needed
            onReactionUpdate?.();
        } catch (error: any) {
            console.error('Failed to dislike post:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: document.title,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const isLiked = userReaction === 'like';
    const isDisliked = userReaction === 'dislike';

    return (
        <div className="mt-10 space-y-6">
            {/* Reaction Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        {/* Like Button */}
                        <button
                            onClick={handleLike}
                            className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-250 text-sm ${isLiked
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-800'
                                }`}
                        >
                            <ThumbsUp
                                className={`w-4 h-4 transition-transform duration-250 ${isAnimating ? 'scale-125' : 'scale-100'
                                    } ${isLiked ? 'fill-current' : ''}`}
                            />
                            <span>{likeCount}</span>
                        </button>

                        {/* Dislike Button */}
                        <button
                            onClick={handleDislike}
                            className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-250 text-sm ${isDisliked
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800'
                                }`}
                        >
                            <ThumbsDown
                                className={`w-4 h-4 transition-transform duration-250 ${isDislikeAnimating ? 'scale-125' : 'scale-100'
                                    } ${isDisliked ? 'fill-current' : ''}`}
                            />
                            <span>{dislikeCount}</span>
                        </button>
                    </div>

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-250 font-semibold text-sm"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            <CommentsSection postId={parseInt(postId)} postSlug={postSlug} onCommentUpdate={onReactionUpdate} />
        </div>
    );
};

export default BlogInteractionSection;
