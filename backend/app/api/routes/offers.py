from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Offer, Customer
from app.api.schemas import OfferResponse, OfferPatchRequest
from app.services.settings_service import get_system_settings
from app.websocket.agent_activity import broadcaster
from pydantic import BaseModel
import uuid
import re

router = APIRouter()

def _format_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def _serialize_offer(o: Offer, customer_name: str = None) -> dict:
    return {
        "id": o.id,
        "customer_id": o.customer_id,
        "customer_name": customer_name,
        "ticket_id": o.ticket_id,
        "drafted_message": o.drafted_message,
        "discount_percent": o.discount_percent,
        "reasoning": o.reasoning,
        "baseline_score": o.baseline_score,
        "urgency_score": o.urgency_score,
        "fused_score": o.fused_score,
        "status": o.status,
        "created_at": _format_iso_utc(o.created_at),
        "decided_at": _format_iso_utc(o.decided_at),
    }

@router.get("", response_model=List[OfferResponse])
@router.get("/", response_model=List[OfferResponse])
def get_all_offers(status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = (
        db.query(Offer, Customer.name)
        .outerjoin(Customer, Offer.customer_id == Customer.id)
    )
    if status and status.lower() != "all":
        query = query.filter(Offer.status.ilike(status.strip()))
    
    results = query.order_by(Offer.created_at.desc()).all()
    return [_serialize_offer(o, cust_name) for o, cust_name in results]

@router.get("/pending", response_model=List[OfferResponse])
def get_pending_offers(db: Session = Depends(get_db)):
    results = (
        db.query(Offer, Customer.name)
        .outerjoin(Customer, Offer.customer_id == Customer.id)
        .filter(Offer.status.in_(["Pending", "Edited"]))
        .order_by(Offer.created_at.desc())
        .all()
    )
    return [_serialize_offer(o, cust_name) for o, cust_name in results]

class GenerateOfferRequest(BaseModel):
    customer_id: str

def validate_policy(message, discount, ceiling):
    if not 0 <= discount <= ceiling:
        raise HTTPException(422, f"Discount must be between 0% and the current {ceiling}% policy limit.")
    if len(message.strip()) < 10:
        raise HTTPException(422, "Please write a message of at least 10 characters.")
    percentages = [float(v) for v in re.findall(r"(\d+(?:\.\d+)?)\s*%", message)]
    if any(v != discount for v in percentages):
        raise HTTPException(422, "The discount in the message must match the offer discount.")

@router.post("/generate", response_model=OfferResponse)
def generate_offer(payload: GenerateOfferRequest, db: Session = Depends(get_db)):
    from app.api.routes.customers import get_customer
    from app.agents.orchestrator import run_agent_pipeline
    cust = db.get(Customer, payload.customer_id)
    if not cust:
        raise HTTPException(404, "Customer not found")
    existing = db.query(Offer).filter(Offer.customer_id == cust.id, Offer.status.in_(["Pending", "Edited"])).first()
    if existing:
        return _serialize_offer(existing, cust.name)
    policy = get_system_settings(db)
    if cust.churn_risk_score < policy.risk_threshold:
        raise HTTPException(409, "This customer is below the risk threshold. No retention offer is needed.")
    detail = get_customer(cust.id, db)
    result = run_agent_pipeline(customer_id=cust.id, customer_name=cust.name,
        churn_risk_score=cust.churn_risk_score, shap_factors=[f.model_dump() for f in detail.shap_factors],
        total_spent=cust.total_spent, recency_days=detail.days_inactive, order_count=cust.order_count,
        complaint_count=cust.complaint_count, satisfaction_score=cust.satisfaction_score,
        risk_threshold=policy.risk_threshold, max_discount_ceiling=policy.max_discount_percent)
    draft = result.get("verified_offer")
    if not draft:
        raise HTTPException(422, "The generated offer did not pass policy verification.")
    offer = Offer(id="OFFER-"+uuid.uuid4().hex[:8].upper(), customer_id=cust.id,
        drafted_message=draft["drafted_message"], discount_percent=draft["discount_percent"],
        reasoning=draft["reasoning"], baseline_score=round(cust.churn_risk_score),
        fused_score=result["fused_score"], status="Pending", created_at=datetime.utcnow())
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return _serialize_offer(offer, cust.name)

@router.post("/{offer_id}/approve", response_model=OfferResponse)
def approve_offer(offer_id: str, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status not in ("Pending", "Edited"):
        raise HTTPException(409, "This offer has already been reviewed.")
    validate_policy(offer.drafted_message, offer.discount_percent, get_system_settings(db).max_discount_percent)
    offer.status = "Approved"
    broadcaster.emit("Manager", f"Offer {offer.id} approved. Email delivery is not configured.", "success")
    offer.decided_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)
    cust = db.query(Customer).filter(Customer.id == offer.customer_id).first()
    return _serialize_offer(offer, cust.name if cust else None)

@router.post("/{offer_id}/reject", response_model=OfferResponse)
def reject_offer(offer_id: str, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status not in ("Pending", "Edited"):
        raise HTTPException(409, "This offer has already been reviewed.")
    offer.status = "Rejected"
    offer.decided_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)
    cust = db.query(Customer).filter(Customer.id == offer.customer_id).first()
    return _serialize_offer(offer, cust.name if cust else None)

@router.patch("/{offer_id}", response_model=OfferResponse)
def patch_offer(offer_id: str, payload: OfferPatchRequest, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status not in ("Pending", "Edited"):
        raise HTTPException(409, "Reviewed offers cannot be edited.")
    validate_policy(payload.drafted_message if payload.drafted_message is not None else offer.drafted_message,
        payload.discount_percent if payload.discount_percent is not None else offer.discount_percent,
        get_system_settings(db).max_discount_percent)
    if payload.drafted_message is not None:
        offer.drafted_message = payload.drafted_message
    if payload.discount_percent is not None:
        offer.discount_percent = payload.discount_percent
    offer.status = "Pending"
    db.commit()
    db.refresh(offer)
    cust = db.query(Customer).filter(Customer.id == offer.customer_id).first()
    return _serialize_offer(offer, cust.name if cust else None)
