import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.models import Base
from app.db.session import engine, SessionLocal
from app.db.seed_data import seed_db
from app.api.routes import dashboard, customers, tickets, offers, scan, settings as settings_route
from app.websocket.agent_activity import broadcaster
from app.scheduler.proactive_scan import start_scheduler, stop_scheduler
from app.api.routes import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[*] ChurnGuardAI Backend starting up...")
    Base.metadata.create_all(bind=engine)
    seed_db()
    broadcaster.loop = asyncio.get_running_loop()
    start_scheduler()
    print("[+] API ready.")
    yield
    # Shutdown
    stop_scheduler()
    print("[*] ChurnGuardAI Backend shutting down.")

app = FastAPI(
    title="ChurnGuardAI API",
    description="Autonomous E-Commerce Churn Prevention — FastAPI backend with ML, LangGraph agents, and RAG.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

@app.middleware("http")
async def manager_session(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.url.path != "/api/auth/login" and request.method != "OPTIONS":
        with SessionLocal() as db:
            if not auth.valid_session(request.cookies.get(auth.COOKIE), db):
                return JSONResponse({"detail": "Please sign in to continue."}, status_code=401)
    return await call_next(request)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets"])
app.include_router(offers.router, prefix="/api/offers", tags=["Offers"])
app.include_router(scan.router, prefix="/api/scan", tags=["Scan"])
app.include_router(settings_route.router, prefix="/api/settings", tags=["Settings"])

# WebSocket endpoint for live agent activity stream
@app.websocket("/ws/agent-activity")
async def ws_agent_activity(websocket: WebSocket):
    with SessionLocal() as db:
        if not auth.valid_session(websocket.cookies.get(auth.COOKIE), db):
            await websocket.close(code=1008)
            return
    await broadcaster.connect(websocket)
    try:
        # Keep connection alive
        while True:
            await asyncio.sleep(30)
            await websocket.send_text('{"type":"ping"}')
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
    except Exception:
        broadcaster.disconnect(websocket)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ChurnGuardAI API"}


@app.get("/api/activity")
def activity_feed():
    return list(broadcaster.events)
