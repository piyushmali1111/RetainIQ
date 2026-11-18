"""Synthetic demo catalog. Never overwrite existing catalog or commercial data."""
import re
from app.db.models import Product, Customer, Ticket, Offer

SAMPLE_PRODUCTS = [
    dict(id="PROD-101", sku="ELE-EARB-01", name="Wireless ANC Earbuds", category="Electronics", price=150.0, cost_price=123.0),
    dict(id="PROD-102", sku="ELE-CHRG-02", name="Fast GaN Wall Charger", category="Electronics", price=40.0, cost_price=35.0),
    dict(id="PROD-103", sku="ELE-WATC-03", name="Smart Fitness Watch", category="Electronics", price=200.0, cost_price=166.0),
    dict(id="PROD-201", sku="APP-HOOD-01", name="Classic Fleece Hoodie", category="Apparel", price=85.0, cost_price=34.0),
    dict(id="PROD-202", sku="ACC-LEAT-02", name="Minimalist Leather Wallet", category="Accessories", price=50.0, cost_price=20.0),
    dict(id="PROD-301", sku="SHO-RUNN-01", name="Pro Trail Running Shoes", category="Footwear", price=140.0, cost_price=100.0),
]

def seed_catalog(db):
    for values in SAMPLE_PRODUCTS:
        if db.get(Product, values["id"]) is None and not db.query(Product).filter_by(sku=values["sku"]).first():
            db.add(Product(**values))
    db.flush()
    available = {p.id for p in db.query(Product).all()}
    for customer in db.query(Customer).filter(Customer.product_id.is_(None)).all():
        if not re.fullmatch(r"CUST-\d+", customer.id):
            continue
        pid = SAMPLE_PRODUCTS[(int(customer.id.split("-")[1]) - 1000) % len(SAMPLE_PRODUCTS)]["id"]
        if customer.name == "Elena Rostova":
            pid = "PROD-101"
        if pid in available:
            customer.product_id = pid
    db.flush()
    demo = {c.id: c.product_id for c in db.query(Customer).all()}
    for ticket in db.query(Ticket).filter(Ticket.product_id.is_(None), Ticket.id.like("TCK-CUST-%")).all():
        ticket.product_id = demo.get(ticket.customer_id)
    for offer in db.query(Offer).filter(Offer.product_id.is_(None), Offer.id.like("OFF-CUST-%")).all():
        offer.product_id = demo.get(offer.customer_id)
    # Existing discounts and decisions are preserved; approval revalidates current caps.
    db.commit()
