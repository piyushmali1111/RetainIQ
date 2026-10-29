import asyncio
import json
import uuid
from collections import deque
from datetime import datetime, timezone
from fastapi import WebSocket

class AgentActivityBroadcaster:
    def __init__(self):
        self.active_connections = []
        self.events = deque(maxlen=100)
        self.loop = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def emit(self, agent, message, type_label='info', chip=None, run_id=None):
        event = dict(id=uuid.uuid4().hex, agent=agent, message=message,
            timestamp=datetime.now(timezone.utc).strftime('%H:%M UTC'), type=type_label, chip=chip, run_id=run_id)
        self.events.appendleft(event)
        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(self._send(event), self.loop)

    async def _send(self, event):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(event))
            except Exception:
                self.disconnect(connection)

    async def broadcast_event(self, agent, message, type_label='info', chip=None, run_id=None):
        self.emit(agent, message, type_label, chip, run_id)

broadcaster = AgentActivityBroadcaster()
