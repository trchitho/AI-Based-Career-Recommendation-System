from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ...core.jwt import decode_token
import json

router = APIRouter()


class CommentConnectionManager:
    def __init__(self):
        # Map of post_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Map of websocket -> (user_id, post_id)
        self.connection_info: Dict[WebSocket, tuple] = {}

    async def connect(self, websocket: WebSocket, user_id: int, post_id: int):
        """Connect a user to a specific post's comment stream"""
        await websocket.accept()
        
        if post_id not in self.active_connections:
            self.active_connections[post_id] = set()
        
        self.active_connections[post_id].add(websocket)
        self.connection_info[websocket] = (user_id, post_id)

    def disconnect(self, websocket: WebSocket):
        """Disconnect a websocket"""
        if websocket in self.connection_info:
            user_id, post_id = self.connection_info[websocket]
            
            if post_id in self.active_connections:
                self.active_connections[post_id].discard(websocket)
                
                # Clean up empty post connections
                if not self.active_connections[post_id]:
                    del self.active_connections[post_id]
            
            del self.connection_info[websocket]

    async def broadcast_to_post(self, post_id: int, message: dict):
        """Broadcast a message to all users watching a specific post"""
        if post_id not in self.active_connections:
            return
        
        # Create a copy of the set to avoid modification during iteration
        connections = list(self.active_connections[post_id])
        
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                # Remove failed connection
                self.disconnect(websocket)

    async def send_to_user(self, user_id: int, post_id: int, message: dict):
        """Send a message to a specific user watching a specific post"""
        if post_id not in self.active_connections:
            return
        
        connections = list(self.active_connections[post_id])
        
        for websocket in connections:
            if websocket in self.connection_info:
                ws_user_id, ws_post_id = self.connection_info[websocket]
                if ws_user_id == user_id and ws_post_id == post_id:
                    try:
                        await websocket.send_json(message)
                    except Exception:
                        self.disconnect(websocket)


comment_manager = CommentConnectionManager()


@router.websocket("/ws/comments/{post_id}")
async def websocket_comments(websocket: WebSocket, post_id: int):
    """WebSocket endpoint for real-time comment updates on a specific post"""
    
    # Get token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401, reason="Authentication required")
        return
    
    try:
        # Decode JWT token to get user ID
        token_data = decode_token(token)
        user_id = int(token_data.get("sub"))
    except Exception:
        await websocket.close(code=4401, reason="Invalid token")
        return
    
    # Connect user to post comment stream
    await comment_manager.connect(websocket, user_id, post_id)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected to comments for post {post_id}",
            "user_id": user_id,
            "post_id": post_id
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            # We don't expect messages from client, but keep connection alive
            data = await websocket.receive_text()
            
            # Optional: Handle client messages (like typing indicators)
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        comment_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        comment_manager.disconnect(websocket)


# Helper functions to broadcast comment events
async def broadcast_comment_created(post_id: int, comment_data: dict):
    """Broadcast when a new comment is created"""
    await comment_manager.broadcast_to_post(post_id, {
        "type": "comment_created",
        "data": comment_data
    })


async def broadcast_comment_updated(post_id: int, comment_data: dict):
    """Broadcast when a comment is updated"""
    await comment_manager.broadcast_to_post(post_id, {
        "type": "comment_updated", 
        "data": comment_data
    })


async def broadcast_comment_deleted(post_id: int, comment_id: int):
    """Broadcast when a comment is deleted"""
    await comment_manager.broadcast_to_post(post_id, {
        "type": "comment_deleted",
        "data": {"id": comment_id}
    })


async def broadcast_comment_liked(post_id: int, like_data: dict):
    """Broadcast when a comment is liked/unliked"""
    await comment_manager.broadcast_to_post(post_id, {
        "type": "comment_liked",
        "data": like_data
    })