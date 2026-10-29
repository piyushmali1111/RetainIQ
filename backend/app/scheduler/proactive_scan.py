import uuid
import asyncio
from datetime import datetime, timedelta
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler
from app.db.session import SessionLocal
from app.db.models import Customer, Offer
from app.ml.features import FEATURE_COLS
from app.ml.churn_predictor import predict_churn_risk_batch, score_to_status
from app.ml.shap_explainer import explain_churn_risk
from app.agents.orchestrator import run_agent_pipeline
from app.services.settings_service import get_system_settings
from app.services.metrics import get_total_customers, get_high_risk_count
from app.websocket.agent_activity import broadcaster

_scheduler = None


def compute_days_inactive(last_order_str: str) -> int:
    try:
        today = datetime.utcnow().date()
        order_date = datetime.strptime(last_order_str[:10], "%Y-%m-%d").date()
        return max(0, (today - order_date).days)
    except Exception:
        return 30


def run_proactive_scan_job():
    from app.api.routes.scan import run_proactive_scan
    with SessionLocal() as db:
        try:
            run_proactive_scan(db)
        except Exception as exc:
            broadcaster.emit("Scheduler", f"Scheduled scan failed: {exc}", "alert")

def reschedule(frequency):
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.start()
    _scheduler.remove_all_jobs()
    if frequency == "disabled":
        return
    options = dict(day_of_week="sun", hour=2) if frequency == "weekly" else dict(hour=3)
    _scheduler.add_job(run_proactive_scan_job, "cron", id="proactive", **options)

def next_scan_time():
    job = _scheduler.get_job("proactive") if _scheduler else None
    return job.next_run_time.isoformat() if job and job.next_run_time else None

def start_scheduler():
    with SessionLocal() as db:
        reschedule(get_system_settings(db).scan_frequency)

def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
    _scheduler = None
