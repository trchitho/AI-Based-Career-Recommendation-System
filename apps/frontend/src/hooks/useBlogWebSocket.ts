import { useEffect, useRef, useCallback } from 'react';

interface BlogWebSocketMessage {
    type: 'connected' | 'blog_updated' | 'blog_liked' | 'blog_commented' | 'pong';
    data?: any;
    message?: string;
}

interface UseBlogWebSocketProps {
    postIds: string[];
    onBlogUpdate?: (postId: string, data: any) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: string) => void;
}

export const useBlogWebSocket = ({
    postIds,
    onBlogUpdate,
    onConnected,
    onDisconnected,
    onError
}: UseBlogWebSocketProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (postIds.length === 0) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        disconnect();

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const hostname = window.location.hostname;
            const postIdsParam = postIds.join(',');
            const wsUrl = `${protocol}//${hostname}:8000/ws/blog?post_ids=${encodeURIComponent(postIdsParam)}`;

            console.log('Connecting to Blog WebSocket:', wsUrl);
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log(`Connected to blog WebSocket for posts: ${postIds.join(', ')}`);
                reconnectAttempts.current = 0;
                onConnected?.();
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message: BlogWebSocketMessage = JSON.parse(event.data);

                    switch (message.type) {
                        case 'connected':
                            console.log('Blog WebSocket connected:', message.message);
                            break;

                        case 'blog_updated':
                        case 'blog_liked':
                        case 'blog_commented':
                            if (message.data) {
                                onBlogUpdate?.(message.data.post_id, message.data);
                            }
                            break;

                        case 'pong':
                            // Keep-alive response
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
                console.log('Blog WebSocket connection closed:', event.code, event.reason);
                onDisconnected?.();

                // Attempt reconnection with exponential backoff
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
                    console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('Blog WebSocket error:', error);
                onError?.('Connection error occurred');
            };

        } catch (error) {
            console.error('Failed to create Blog WebSocket connection:', error);
            onError?.('Failed to connect to real-time updates');
        }
    }, [postIds, onBlogUpdate, onConnected, onDisconnected, onError, disconnect]);

    const sendPing = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
    }, []);

    useEffect(() => {
        connect();

        // Set up ping interval to keep connection alive
        const pingInterval = setInterval(sendPing, 30000);

        return () => {
            clearInterval(pingInterval);
            disconnect();
        };
    }, [connect, disconnect, sendPing]);

    return {
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        connect,
        disconnect,
        sendPing
    };
};
