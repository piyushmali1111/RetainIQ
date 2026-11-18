import json
from app.config import settings
from app.services.pricing_engine import effective_ceiling, financial_sentence, message_matches_discount, calculate_optimal_retention_discount

BANNED_UNGROUNDED_WORDS = ["cart", "checkout", "promo code", "tracking"]

def run_verifier_agent(offer_draft: dict, max_discount_ceiling=None, product=None):
    draft = dict(offer_draft)
    ceiling = effective_ceiling(product, max_discount_ceiling if max_discount_ceiling is not None else settings.MAX_DISCOUNT_PERCENT)
    discount = draft.get("discount_percent", 0)
    message = draft.get("drafted_message", "")
    facts = draft.get("allowed_facts", {})
    def reject(status, reason):
        return dict(status=status, is_valid=False, reason=reason, verified_offer=None)
    if not isinstance(discount, int) or discount < 0:
        return reject("REJECTED_INVALID_DISCOUNT", "Discount must be a nonnegative integer.")
    if not message or len(message.strip()) < 10:
        return reject("REJECTED_INVALID_MESSAGE", "Drafted message too short or empty.")
    allowed = json.dumps(facts).lower()
    for word in BANNED_UNGROUNDED_WORDS:
        if word in (message + " " + draft.get("reasoning", "")).lower() and word not in allowed:
            return reject("REJECTED_UNGROUNDED_FACT", f"Ungrounded term: {word}")
    expected = min(discount, ceiling)
    pricing = draft.get("pricing_inputs")
    if pricing:
        result = calculate_optimal_retention_discount(pricing["fused_risk"], pricing["total_spent"], ceiling, pricing["risk_threshold"])
        expected = result["discount_percent"]
        draft.update(calculated_discount=expected, pricing_rationale=result["rationale"], ltv_factor=result["ltv_factor"])
    modified = expected != discount or not message_matches_discount(message, expected)
    if modified:
        # Replace inconsistent financial language as well as the numeric field.
        message = "We appreciate your patience and are sorry for your experience. " + financial_sentence(expected, product.name if product else "the selected product", facts.get("customer_name", "Customer"))
    draft.update(discount_percent=expected, drafted_message=message, effective_ceiling=ceiling)
    return dict(
        status="COMPLIANT_MODIFIED" if modified else "VERIFIED_APPROVED",
        is_valid=True,
        reason=f"Discount {expected}% is within the effective product ceiling {ceiling}%.",
        verified_offer=draft,
    )
