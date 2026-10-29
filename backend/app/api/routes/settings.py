from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.schemas import SettingsResponse, SettingsUpdateRequest
from app.services.settings_service import get_system_settings, update_system_settings
from app.services.preferences import get_preferences
from app.config import settings as app_settings

router = APIRouter()

def serialize(db):
    from app.scheduler.proactive_scan import next_scan_time
    curr = get_system_settings(db)
    prefs = get_preferences(db)
    return SettingsResponse(risk_threshold=curr.risk_threshold, max_discount_percent=curr.max_discount_percent,
        scan_frequency=curr.scan_frequency, fusion_alpha=app_settings.FUSION_ALPHA,
        ticket_monitoring=prefs.ticket_monitoring, automated_offers=prefs.automated_offers,
        email_configured=False, next_scan=next_scan_time())

@router.get('', response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return serialize(db)

@router.put('', response_model=SettingsResponse)
def update_settings(payload: SettingsUpdateRequest, db: Session = Depends(get_db)):
    curr = update_system_settings(db, risk_threshold=payload.risk_threshold,
        max_discount_percent=payload.max_discount_percent, scan_frequency=payload.scan_frequency)
    prefs = get_preferences(db)
    for key in ('ticket_monitoring', 'automated_offers'):
        val = getattr(payload, key)
        if val is not None:
            setattr(prefs, key, val)
    db.commit()
    if payload.scan_frequency is not None:
        from app.scheduler.proactive_scan import reschedule
        reschedule(curr.scan_frequency)
    return serialize(db)
