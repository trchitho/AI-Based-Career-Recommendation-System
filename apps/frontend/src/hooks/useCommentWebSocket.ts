import { useEffect, useRef, useCallback } from 'react';
import { Comment } from '../services/commentService';

interface CommentWebSocketMessage {
    type: 'connected' | 'comment_created' | 'comment_updated' | 'comment_deleted' | 'comment_liked' | 'pong';
    data?: any;
    message?: string;
    user_id?: number;
    post_id?: number;
}

interface UseCommentWebSocketProps {
    postId: number;
    token?: string | null;
    onCommentCreated?: (comment: Comment) => void;
    onCommentUpdated?: (comment: Comment) => void;
    onCommentDeleted?: (commentId: number) => void;
    onCommentLiked?: (data: { id: number; like_count: number; is_liked: boolean; user_id: number }) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: string) => void;
}

export const useCommentWebSocket = ({
    postId,
    token,
    onCommentCreated,
    onCommentUpdated,
    onCommentDeleted,
    onCommentLiked,
    onConnected,
    onDisconnected,
    onError
}: UseCommentWebSocketProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const connect = useCallback(() => {
        if (!token || !postId) {
            return;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            // Use backend port 8000 for WebSocket connections
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const hostname = window.location.hostname;
            const wsUrl = `${protocol}//${hostname}:8000/ws/comments/${postId}?token=${encodeURIComponent(token)}`;

            console.log('Connecting to WebSocket:', wsUrl);
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log(`Connected to comment WebSocket for post ${postId}`);
                reconnectAttempts.current = 0;
                onConnected?.();
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message: CommentWebSocketMessage = JSON.parse(event.data);

                    switch (message.type) {
                        case 'connected':
                            console.log('WebSocket connected:', message.message);
                            break;

                        case 'comment_created':
                            if (message.data && onCommentCreated) {
                                onCommentCreated(message.data as Comment);
                            }
                            break;

                        case 'comment_updated':
                            if (message.data && onCommentUpdated) {
                                onCommentUpdated(message.data as Comment);
                            }
                            break;

                        case 'comment_deleted':
                            if (message.data?.id && onCommentDeleted) {
                                onCommentDeleted(message.data.id);
                            }
                            break;

                        case 'comment_liked':
                            if (message.data && onCommentLiked) {
                                onCommentLiked(message.data);
                            }
                            break;

                        case 'pong':
                            // Handle ping/pong for keep-alive
                            break;

                        default:
                            console.log('Unknown WebSocket message type:', message.type);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    onError?.('Failed to parse WebSocket message');
                }
            };

            wsRef.current.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);
                onDisconnected?.();

                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectDelay * reconnectAttempts.current);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    onError?.('Failed to reconnect to comment updates. Please refresh the page.');
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                onError?.('Connection error occurred');
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            onError?.('Failed to connect to real-time updates');
        }
    }, [postId, token, onCommentCreated, onCommentUpdated, onCommentDeleted, onCommentLiked, onConnected, onDisconnected, onError]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'Component unmounting');
            wsRef.current = null;
        }
    }, []);

    const sendPing = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
    }, []);

    // Connect on mount and when dependencies change
    useEffect(() => {
        connect();
        return disconnect;
    }, [connect, disconnect]);

    // Set up ping interval to keep connection alive
    useEffect(() => {
        const pingInterval = setInterval(sendPing, 30000); // Ping every 30 seconds
        return () => clearInterval(pingInterval);
    }, [sendPing]);

    return {
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        connect,
        disconnect,
        sendPing
    };
};