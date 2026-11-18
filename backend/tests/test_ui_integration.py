"""Integration checks against a disposable copy of the repository database."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Offer, Outcome
from app.services.metrics import compute_window_counts
from datetime import datetime

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        assert c.post("/api/auth/login", json={"email":"manager@churnguard.ai","password":"ChurnGuard@2026"}).status_code == 200
        yield c

def test_authentication_required(client):
    with TestClient(app) as guest:
        assert guest.get("/api/customers").status_code == 401
        assert guest.post("/api/auth/login", json={"email":"invalid@example.com","password":"wrong"}).status_code == 401
        assert guest.post("/api/auth/login", json={"email":"manager@churnguard.ai","password":"ChurnGuard@2026","remember":True}).status_code == 200
        assert guest.get("/api/auth/me").status_code == 200
        assert guest.post("/api/auth/logout").status_code == 200
        assert guest.get("/api/auth/me").status_code == 401

def test_dashboard_real_counts(client):
    summary = client.get("/api/dashboard/summary")
    assert summary.status_code == 200, summary.text
    data = summary.json()
    assert data["total_customers"] == client.get("/api/customers").json()["total"]
    assert len(data["weekly_trend"]) == 8
    assert data["weekly_trend"][-1]["retention_rate"] == data["retention_rate_30d"]

def test_customer_search_sort_pagination(client):
    data = client.get("/api/customers?page_size=5").json()
    assert len(data["items"]) == 5
    scores = [x["churn_risk_score"] for x in data["items"]]
    assert scores == sorted(scores, reverse=True)
    cid = data["items"][0]["id"]
    result = client.get("/api/customers", params={"search":cid}).json()
    assert any(c["id"] == cid for c in result["items"])
    assert client.get("/api/customers?search=nonexistent-xyz-123").json()["total"] == 0
    assert client.get("/api/customers?page=0").status_code == 422
    second = client.get("/api/customers?page=2&page_size=5").json()["items"]
    assert not set(c["id"] for c in second) & set(c["id"] for c in data["items"])

def test_customer_detail_and_shap(client):
    customer = client.get("/api/customers?page_size=1").json()["items"][0]
    detail = client.get("/api/customers/" + customer["id"])
    assert detail.status_code == 200, detail.text
    detail = detail.json()
    assert detail["shap_factors"]
    assert all(isinstance(f["points"], (int,float)) for f in detail["shap_factors"])
    assert client.get("/api/customers/nonexistent").status_code == 404

def test_settings_validation_and_persistence(client):
    original = client.get("/api/settings").json()
    assert client.put("/api/settings", json={"risk_threshold":-1}).status_code == 422
    assert client.put("/api/settings", json={"max_discount_percent":101}).status_code == 422
    assert client.put("/api/settings", json={"scan_frequency":"every second"}).status_code == 422
    updated = client.put("/api/settings", json={"risk_threshold":65,"scan_frequency":"weekly"})
    assert updated.status_code == 200, updated.text
    assert client.get("/api/settings").json()["risk_threshold"] == 65
    assert updated.json()["next_scan"] is not None
    assert client.put("/api/settings", json={"scan_frequency":"disabled"}).json()["next_scan"] is None
    assert client.put("/api/settings", json=original).status_code == 200

def test_ticket_pipeline_and_activity(client):
    customer = client.get("/api/customers?page_size=1").json()["items"][0]
    response = client.post("/api/tickets", json={"customer_id":customer["id"],"message":"My order is broken. This is terrible and unacceptable! I am very disappointed."})
    assert response.status_code == 200, response.text
    ticket = response.json()["ticket"]
    assert ticket["sentiment_label"] == "Angry"
    assert ticket["agent_reply"]
    assert 0 <= ticket["urgency_score"] <= 100
    assert any(t["id"] == ticket["id"] for t in client.get("/api/tickets").json())
    assert client.get("/api/activity").json()
    assert client.post("/api/tickets", json={"customer_id":customer["id"],"message":"   "}).status_code == 422

def test_monitoring_toggle_has_effect(client):
    cid = client.get("/api/customers?page_size=1").json()["items"][0]["id"]
    assert client.put("/api/settings", json={"ticket_monitoring":False}).status_code == 200
    assert client.post("/api/tickets",json={"customer_id":cid,"message":"Please help with an order"}).status_code == 409
    client.put("/api/settings",json={"ticket_monitoring":True})

def test_automated_offer_toggle_has_effect(client):
    cid = client.get("/api/customers?page_size=1").json()["items"][0]["id"]
    client.put("/api/settings",json={"automated_offers":False})
    result = client.post("/api/tickets",json={"customer_id":cid,"message":"I am furious about this terrible broken product."})
    assert result.status_code == 200, result.text
    assert result.json()["offer"] is None
    client.put("/api/settings",json={"automated_offers":True})

def get_pending(client):
    offers = client.get("/api/offers/pending").json()
    assert offers
    return offers[0]

def test_offer_edit_stays_pending_and_policy_is_enforced(client):
    o = next(o for o in client.get("/api/offers/pending").json() if o["effective_ceiling"] >= 10)
    assert client.patch("/api/offers/"+o["id"],json={"discount_percent":99}).status_code == 422
    updated = client.patch("/api/offers/"+o["id"],json={"discount_percent":10,"drafted_message":"Thank you for being our customer. Enjoy 10% off your next purchase."})
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "Pending"
    assert o["id"] in [p["id"] for p in client.get("/api/offers/pending").json()]
    assert client.patch("/api/offers/"+o["id"],json={"discount_percent":15,"drafted_message":"Enjoy 40% off your next order."}).status_code == 422
    client.put("/api/settings",json={"max_discount_percent":5})
    assert client.post("/api/offers/"+o["id"]+"/approve").status_code == 422
    client.put("/api/settings",json={"max_discount_percent":25})
    assert client.post("/api/offers/"+o["id"]+"/approve").status_code == 200
    assert client.post("/api/offers/"+o["id"]+"/reject").status_code == 409
    assert client.patch("/api/offers/"+o["id"],json={"discount_percent":5}).status_code == 409

def test_reject_and_pending_count(client):
    o = get_pending(client)
    assert client.post("/api/offers/"+o["id"]+"/reject").status_code == 200
    assert o["id"] not in [p["id"] for p in client.get("/api/offers/pending").json()]
    assert client.get("/api/dashboard/summary").json()["pending_offers_count"] == len(client.get("/api/offers/pending").json())

def test_generate_customer_offer_and_deduplicate(client):
    cid = client.get("/api/customers?page_size=1").json()["items"][0]["id"]
    first = client.post("/api/offers/generate",json={"customer_id":cid})
    assert first.status_code == 200, first.text
    second = client.post("/api/offers/generate",json={"customer_id":cid})
    assert second.json()["id"] == first.json()["id"]
    assert client.post("/api/offers/generate",json={"customer_id":"missing"}).status_code == 404

def test_scan_runs_real_model_and_prevents_repeat_offers(client):
    response = client.post("/api/scan/run")
    assert response.status_code == 200, response.text
    assert response.json()["scanned_customers"] == client.get("/api/customers").json()["total"]
    assert response.json()["new_offers_count"] <= 25
    for endpoint in ("/api/offers", "/api/offers/pending", "/api/dashboard/summary", "/api/tickets"):
        check = client.get(endpoint)
        assert check.status_code == 200, f"{endpoint}: {check.text}"
    with SessionLocal() as db:
        offers = db.query(Offer).filter(Offer.status == "Pending").all()
        # Existing source tickets may have multiple historical drafts; scan must never duplicate a pending customer.
        assert all(o.discount_percent <= 25 for o in offers)

def test_approval_does_not_inflate_retention(client):
    with SessionLocal() as db:
        before = compute_window_counts(db,30,0,60)["retained"]
        offer = db.query(Offer).first()
        offer.status = "Approved"
        offer.decided_at = datetime.utcnow()
        db.commit()
        assert compute_window_counts(db,30,0,60)["retained"] == before


def test_support_does_not_infer_late_delivery_from_latest():
    from app.agents.support_agent import run_support_agent
    reply = run_support_agent("My latest experience was disappointing.", "Test Customer")
    assert "shipping delay" not in reply.lower()
    assert "courier" not in reply.lower()


def test_small_discount_ceiling_matches_generated_message():
    from app.agents.retention_agent import run_retention_agent
    from app.db.models import Product
    product = Product(id="test", name="Hoodie", price=100, cost_price=40)
    for ceiling in (0, 5, 9, 25):
        result = run_retention_agent("Test", 90, [], total_spent=2000, max_discount=ceiling, product=product)
        assert 0 <= result["discount_percent"] <= ceiling
        assert str(result["discount_percent"]) + "%" in result["drafted_message"]


def test_dashboard_risk_bands_count_each_scored_customer_once(client):
    from app.db.models import Customer
    bands = client.get("/api/dashboard/summary").json()["risk_distribution"]
    with SessionLocal() as db:
        scores = [score for (score,) in db.query(Customer.churn_risk_score) if score is not None]
    assert [band["lower"] for band in bands] == [0, 20, 40, 60, 80]
    for band in bands:
        low, high = band["lower"], band["upper"]
        expected = sum(low <= score < high or score == high == 100 for score in scores)
        assert band["customers"] == expected
    assert sum(band["customers"] for band in bands) == sum(0 <= score <= 100 for score in scores)
