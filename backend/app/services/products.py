"""Catalog context and shared response metadata."""
from fastapi import HTTPException
from app.db.models import Product
from app.services.pricing_engine import effective_ceiling, message_matches_discount

def resolve_product(db, customer, product_id=None):
    if product_id:
        product = db.get(Product, product_id)
        if product is None:
            raise HTTPException(404, "Product not found")
        return product
    return customer.product

def product_metadata(product):
    return {
        "product_id": product.id if product else None,
        "product_name": product.name if product else None,
        "product_price": product.price if product else None,
        "product_margin": product.gross_margin_percent if product else None,
        "product_ceiling": product.max_allowed_discount if product else None,
    }

def offer_economics(offer, policy_cap):
    ceiling = effective_ceiling(offer.product, policy_cap)
    valid = bool(offer.product) and 0 <= offer.discount_percent <= ceiling and message_matches_discount(offer.drafted_message, offer.discount_percent)
    return {
        **product_metadata(offer.product),
        "effective_ceiling": ceiling,
        "pricing_rationale": offer.pricing_rationale,
        "ltv_factor": offer.ltv_factor,
        "calculated_discount": offer.calculated_discount,
        "guardrails_valid": valid,
    }

def pricing_fields(draft):
    return {key: draft.get(key) for key in ("product_id", "pricing_rationale", "ltv_factor", "calculated_discount")}
