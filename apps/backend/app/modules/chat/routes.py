"""
Chat API — REST + WebSocket
REST:   /api/chat/...
WS:     /ws/chat/{room_id}?token=...
"""
import json
from datetime import datetime
from typing import Dict, Set

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.db import Base, engine, get_db
from app.core.auth_deps import get_current_user_from_token
from app.core.jwt import decode_token
from app.modules.auth.models import User

from .models import ChatMessage, make_room_id

router = APIRouter()

# ── auto-create table ──────────────────────────────────────────
try:
    Base.metadata.create_all(bind=engine, tables=[ChatMessage.__table__])
    print("[OK] Chat table ready")
except Exception as e:
    print(f"[WARN]  Chat table init: {e}")


# ── WebSocket connection manager ───────────────────────────────
class ChatManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.ws_user: Dict[WebSocket, int] = {}

    async def connect(self, room_id: str, user_id: int, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room_id, set()).add(ws)
        self.ws_user[ws] = user_id

    def disconnect(self, room_id: str, ws: WebSocket):
        self.rooms.get(room_id, set()).discard(ws)
        self.ws_user.pop(ws, None)

    async def broadcast(self, room_id: str, payload: dict):
        for ws in list(self.rooms.get(room_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(room_id, ws)


chat_manager = ChatManager()


# ── WebSocket endpoint ─────────────────────────────────────────
@router.websocket("/ws/chat/{room_id}")
async def ws_chat(room_id: str, websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        data = decode_token(token)
        user_id = int(data.get("sub"))
    except Exception:
        await websocket.close(code=4401)
        return

    await chat_manager.connect(room_id, user_id, websocket)
    try:
        await websocket.send_json({"type": "connected", "room_id": room_id})
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # actual messages are sent via REST so they're persisted first
    except WebSocketDisconnect:
        chat_manager.disconnect(room_id, websocket)
    except Exception:
        chat_manager.disconnect(room_id, websocket)


# ── REST: send message ─────────────────────────────────────────
@router.post("/api/chat/{other_user_id}/send")
async def send_message(
    other_user_id: int,
    body: dict,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    content = (body.get("content") or "").strip()
    if not content:
        from fastapi import HTTPException
        raise HTTPException(400, "content required")

    room_id = make_room_id(current_user.id, other_user_id)
    msg = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        receiver_id=other_user_id,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    payload = {
        "type": "message",
        "id": msg.id,
        "room_id": room_id,
        "sender_id": current_user.id,
        "receiver_id": other_user_id,
        "content": content,
        "created_at": msg.created_at.isoformat() if msg.created_at else datetime.utcnow().isoformat(),
    }
    # push to WS room
    await chat_manager.broadcast(room_id, payload)

    # push notification to receiver via existing notification WS
    try:
        from app.modules.realtime.ws_notifications import manager as notif_manager
        await notif_manager.send(other_user_id, {
            "type": "new_message",
            "from_user_id": current_user.id,
            "from_name": current_user.full_name or current_user.email,
            "room_id": room_id,
            "preview": content[:60],
        })
    except Exception:
        pass

    return payload


# ── REST: get history + mark as read ──────────────────────────
@router.get("/api/chat/{other_user_id}/messages")
def get_messages(
    other_user_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    room_id = make_room_id(current_user.id, other_user_id)
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room_id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
        .all()
    )
    rows.reverse()

    # Mark messages sent to current user as read
    db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id,
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()

    return [
        {
            "id": r.id,
            "room_id": r.room_id,
            "sender_id": r.sender_id,
            "receiver_id": r.receiver_id,
            "content": r.content,
            "is_read": r.is_read,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# ── REST: list conversations ───────────────────────────────────
@router.get("/api/chat/rooms")
def list_rooms(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    from sqlalchemy import or_, func as sqlfunc
    uid = current_user.id
    # latest message per room involving this user
    subq = (
        db.query(
            ChatMessage.room_id,
            sqlfunc.max(ChatMessage.id).label("max_id"),
        )
        .filter(
            or_(ChatMessage.sender_id == uid, ChatMessage.receiver_id == uid)
        )
        .group_by(ChatMessage.room_id)
        .subquery()
    )
    rows = (
        db.query(ChatMessage)
        .join(subq, ChatMessage.id == subq.c.max_id)
        .order_by(desc(ChatMessage.created_at))
        .all()
    )
    result = []
    for r in rows:
        other_id = r.receiver_id if r.sender_id == uid else r.sender_id
        other = db.query(User).filter(User.id == other_id).first()
        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.room_id == r.room_id,
                ChatMessage.receiver_id == uid,
                ChatMessage.is_read == False,  # noqa: E712
            )
            .count()
        )
        result.append({
            "room_id": r.room_id,
            "other_user_id": other_id,
            "other_name": (other.full_name or other.email) if other else str(other_id),
            "last_message": r.content,
            "last_at": r.created_at.isoformat() if r.created_at else None,
            "unread": unread,
        })
    return result
