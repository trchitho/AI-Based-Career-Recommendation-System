import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsDown } from 'lucide-react';
import api from '../../lib/api';
import { isAuthenticated } from '../../utils/auth';

interface ReactionBarProps {
    postId: string;
    initialLikes?: number;
    initialDislikes?: number;
    initialUserReaction?: 'like' | 'dislike' | null;
}

const ReactionBar = ({ postId, initialLikes = 0, initialDislikes = 0, initialUserReaction = null }: ReactionBarProps) => {
    const navigate = useNavigate();
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [dislikeCount, setDislikeCount] = useState(initialDislikes);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(initialUserReaction);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isDislikeAnimating, setIsDislikeAnimating] = useState(false);

    const handleLike = async () => {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            // Call backend API using centralized API client
            const response = await api.post(`/api/blog/${postId}/like`);
            const data = response.data;

            // Update with actual counts from server (source of truth)
            setLikeCount(data.like_count);
            setDislikeCount(data.dislike_count);
            setUserReaction(data.user_reaction);

            // Trigger animation if liked
            if (data.user_reaction === 'like') {
                setIsAnimating(true);
                setTimeout(() => setIsAnimating(false), 600);
            }

        } catch (error: any) {
            console.error('Failed to like post:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleDislike = async () => {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        try {
            // Call backend API using centralized API client
            const response = await api.post(`/api/blog/${postId}/dislike`);
            const data = response.data;

            // Update with actual counts from server (source of truth)
            setLikeCount(data.like_count);
            setDislikeCount(data.dislike_count);
            setUserReaction(data.user_reaction);

            // Trigger animation if disliked
            if (data.user_reaction === 'dislike') {
                setIsDislikeAnimating(true);
                setTimeout(() => setIsDislikeAnimating(false), 600);
            }

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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${isLiked
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800'
                            }`}
                    >
                        <svg
                            className={`w-6 h-6 transition-transform ${isAnimating ? 'scale-125' : 'scale-100'
                                } ${isLiked ? 'fill-current' : 'fill-none'}`}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                        <span className="text-sm">{likeCount}</span>
                    </button>

                    {/* Dislike Button */}
                    <button
                        onClick={handleDislike}
                        className={`group flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${isDisliked
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800'
                            }`}
                    >
                        <ThumbsDown
                            className={`w-6 h-6 transition-transform ${isDislikeAnimating ? 'scale-125' : 'scale-100'
                                } ${isDisliked ? 'fill-current' : ''}`}
                        />
                        <span className="text-sm">{dislikeCount}</span>
                    </button>
                </div>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all font-semibold"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                    </svg>
                    <span className="hidden sm:inline text-sm">Chia sẻ</span>
                </button>
            </div>
        </div>
    );
};

export default ReactionBar;
