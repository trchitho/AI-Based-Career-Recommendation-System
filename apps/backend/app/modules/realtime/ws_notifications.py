from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
from ...core.jwt import decode_token

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        conns = self.active.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)

    async def send(self, user_id: int, message: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id, ws)


manager = ConnectionManager()


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    # Expect query token=? as JWT
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        data = decode_token(token)
        uid = int(data.get("sub"))
    except Exception:
        await websocket.close(code=4401)
        return
    await manager.connect(uid, websocket)
    try:
        while True:
            # Keep alive; we don't expect messages from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(uid, websocket)
