import json
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, inspect
from app.db.models import Product, Customer, Offer
from app.db.catalog import SAMPLE_PRODUCTS
from app.db.migrations import migrate_database
from app.services.pricing_engine import calculate_optimal_retention_discount as price, effective_ceiling
from app.agents.retention_agent import run_retention_agent
from app.agents.verifier_agent import run_verifier_agent
from app.agents.orchestrator import run_agent_pipeline
from app.config import settings
from app.main import app
from app.db.session import SessionLocal

@pytest.mark.parametrize("values,cap", zip(SAMPLE_PRODUCTS, [9,6,8,25,25,14]))
def test_catalog_caps(values, cap):
    product = Product(**values)
    assert product.max_allowed_discount == cap
    # Discount cost cannot exceed half the unit gross profit.
    assert Decimal(str(product.price)) * cap / 100 <= (Decimal(str(product.price)) - Decimal(str(product.cost_price))) / 2

@pytest.mark.parametrize("retail,cost,cap", [(100,90.01,4),(100,99,0),(100,100,0),(100,110,0),(0,10,0),(100,-5,0)])
def test_no_minimum_floor_or_rounded_margin_leak(retail,cost,cap):
    assert Product(price=retail, cost_price=cost).max_allowed_discount == cap

def test_pricing_threshold_ltv_and_bounds():
    assert price(59, 10000, 25)["discount_percent"] == 0
    assert price(60, 10000, 25)["discount_percent"] == 5
    assert [price(100, spend, 25)["discount_percent"] for spend in (100,400,1000)] == [19,22,25]
    for cap in range(26):
        for risk in (0,59,60,89,100,150):
            for spend in (0,400,1000):
                result = price(risk,spend,cap)
                assert 0 <= result["discount_percent"] <= cap
    with pytest.raises(ValueError):
        price(100,1000,25,100)
    with pytest.raises(ValueError):
        price(float("nan"),1000,25)

@pytest.mark.parametrize("index,risk,expected", [(0,89,8),(3,89,20),(3,100,25)])
def test_pipeline_product_pricing(index,risk,expected):
    product = Product(**SAMPLE_PRODUCTS[index])
    result = run_agent_pipeline("TEST", "Elena Rostova", risk, [], 2000,
        ticket_text="I am furious about my broken product.", sentiment_urgency=risk,
        product=product, risk_threshold=60, max_discount_ceiling=25)
    offer = result["verified_offer"]
    assert offer["discount_percent"] == expected
    assert offer["product_id"] == product.id
    assert f"{expected}%" in offer["drafted_message"]
    assert f"RETAIN{expected}-ELENA" in offer["drafted_message"]
    assert product.name in offer["drafted_message"]
    assert offer["pricing_rationale"]

def test_stricter_business_cap_and_unknown_product():
    product = Product(**SAMPLE_PRODUCTS[0])
    assert effective_ceiling(product, 5) == 5
    assert effective_ceiling(product, 50) == 9
    assert effective_ceiling(None, 25) == 0
    offer = run_retention_agent("Elena", 100, [], total_spent=2000, product=product, max_discount=5)
    assert offer["discount_percent"] == 5
    assert run_retention_agent("Elena", 100, [], total_spent=2000)["discount_percent"] == 0

def test_verifier_repairs_message_and_recomputes_money():
    product = Product(**SAMPLE_PRODUCTS[0])
    draft = run_retention_agent("Elena", 89, [], total_spent=2000, product=product)
    draft.update(discount_percent=25, drafted_message="Please enjoy 25% off with code RETAIN25-ELENA.")
    result = run_verifier_agent(draft, 25, product)
    assert result["is_valid"]
    assert result["status"] == "COMPLIANT_MODIFIED"
    assert result["verified_offer"]["discount_percent"] == 8
    assert "25%" not in result["verified_offer"]["drafted_message"]
    assert "RETAIN8-ELENA" in result["verified_offer"]["drafted_message"]
    draft = dict(discount_percent=25, drafted_message="Enjoy 25% off your purchase.")
    assert run_verifier_agent(draft, 25, product)["verified_offer"]["discount_percent"] == 9

def test_llm_cannot_change_financial_sentence(monkeypatch):
    monkeypatch.setattr(settings,"ENABLE_LIVE_LLM",True)
    monkeypatch.setattr(settings,"GEMINI_API_KEY","test-not-a-real-key")
    product = Product(**SAMPLE_PRODUCTS[0])
    with patch("google.genai.Client") as factory:
        factory.return_value.models.generate_content.return_value = SimpleNamespace(text=json.dumps({
            "apology": "We are sorry. Enjoy a twenty five percent discount and free shipping.",
            "discount_percent": 25,
        }))
        result = run_retention_agent("Elena",89,[],total_spent=2000,product=product)
    assert result["discount_percent"] == 8
    assert "twenty five" not in result["drafted_message"]
    assert "8%" in result["drafted_message"]

def test_additive_migration_preserves_rows_and_is_repeatable(tmp_path):
    engine = create_engine("sqlite:///" + str(tmp_path / "legacy.db"))
    with engine.begin() as conn:
        for table in ("customers","tickets","offers"):
            conn.execute(text(f"CREATE TABLE {table} (id TEXT PRIMARY KEY, note TEXT)"))
            conn.execute(text(f"INSERT INTO {table} VALUES ('existing', 'preserve me')"))
    migrate_database(engine)
    migrate_database(engine)
    with engine.connect() as conn:
        for table in ("customers","tickets","offers"):
            assert conn.execute(text(f"SELECT note FROM {table}")).scalar() == "preserve me"
            assert "product_id" in {c["name"] for c in inspect(conn).get_columns(table)}
    engine.dispose()

def test_api_product_selection_persistence_and_approval_guardrails():
    with TestClient(app) as client:
        assert client.post("/api/auth/login",json={"email":"manager@churnguard.ai","password":"ChurnGuard@2026"}).status_code == 200
        catalog = client.get("/api/products").json()
        assert len(catalog) >= 6
        customer = client.get("/api/customers?page_size=1").json()["items"][0]
        cid = customer["id"]
        with SessionLocal() as db:
            cust = db.get(Customer,cid)
            original = (cust.baseline_score,cust.churn_risk_score,cust.total_spent)
            cust.baseline_score=100
            cust.churn_risk_score=100
            cust.total_spent=2000
            db.commit()
        try:
            bad = client.post("/api/tickets",json={"customer_id":cid,"product_id":"missing","message":"I am angry."})
            assert bad.status_code == 404
            for pid,cap in (("PROD-101",9),("PROD-201",25)):
                response = client.post("/api/tickets",json={"customer_id":cid,"product_id":pid,"message":"I am furious. Terrible broken item, completely unacceptable!"})
                assert response.status_code == 200, response.text
                data=response.json()
                assert data["ticket"]["product_id"] == pid
                offer=data["offer"]
                assert offer["product_id"] == pid
                assert offer["product_ceiling"] == cap
                assert offer["discount_percent"] <= cap
                assert offer["guardrails_valid"]
                if pid == "PROD-101":
                    url="/api/offers/"+offer["id"]
                    assert client.patch(url,json={"discount_percent":20,"drafted_message":"Please enjoy 20% off."}).status_code == 422
                    # Lower cost margin after generation: approve must recheck live catalog.
                    with SessionLocal() as db:
                        product=db.get(Product,pid)
                        original_cost=product.cost_price
                        product.cost_price=149
                        db.commit()
                    try:
                        assert client.post(url+"/approve").status_code == 422
                        current = next(o for o in client.get("/api/offers").json() if o["id"]==offer["id"])
                        assert current["guardrails_valid"] is False
                    finally:
                        with SessionLocal() as db:
                            db.get(Product,pid).cost_price=original_cost
                            db.commit()
                    assert client.post(url+"/approve").status_code == 200
            detail = client.get("/api/customers/"+cid).json()
            assert detail["ticket_history"][0]["product_id"]=="PROD-201"
            assert detail["offers"][0]["pricing_rationale"]
        finally:
            with SessionLocal() as db:
                cust=db.get(Customer,cid)
                cust.baseline_score,cust.churn_risk_score,cust.total_spent=original
                db.commit()

def test_manual_generation_uses_latest_fused_risk():
    with TestClient(app) as client:
        client.post('/api/auth/login',json={'email':'manager@churnguard.ai','password':'ChurnGuard@2026'})
        with SessionLocal() as db:
            cust=Customer(id='PRICING-FUSED', name='Pricing Test', email='pricing@example.test',
                signup_date='2026-01-01', last_order_date='2026-10-01', order_count=5,
                total_spent=2000, complaint_count=1, satisfaction_score=3,
                churn_risk_score=20, baseline_score=20, fused_score=100, product_id='PROD-201')
            db.add(cust)
            db.commit()
        try:
            response=client.post('/api/offers/generate',json={'customer_id':'PRICING-FUSED'})
            assert response.status_code==200, response.text
            offer=response.json()
            assert offer['discount_percent']==25
            assert offer['fused_score']==100
            with SessionLocal() as db:
                db.get(Offer,offer['id']).product_id=None
                db.commit()
            assert client.post('/api/offers/'+offer['id']+'/approve').status_code==422
        finally:
            with SessionLocal() as db:
                db.delete(db.get(Customer,'PRICING-FUSED'))
                db.commit()
