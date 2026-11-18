"""Pure financial policy. LLM output never determines a monetary value."""
import math
import re
from decimal import Decimal, ROUND_FLOOR

PLATFORM_CAP = 25

def margin_ceiling(price, cost_price):
    price, cost = Decimal(str(price)), Decimal(str(cost_price))
    if not price.is_finite() or not cost.is_finite() or price <= 0 or cost < 0:
        return 0
    # Use unrounded margin: rounding the display value can violate unit profit.
    half_margin = (price - cost) / price * 50
    return max(0, int(min(Decimal(PLATFORM_CAP), half_margin).to_integral_value(rounding=ROUND_FLOOR)))

def effective_ceiling(product, policy_cap):
    return max(0, min(PLATFORM_CAP, int(policy_cap), product.max_allowed_discount if product else 0))

def calculate_optimal_retention_discount(fused_risk, total_spent, product_ceiling, risk_threshold=60):
    if not all(math.isfinite(float(v)) for v in (fused_risk, total_spent, product_ceiling, risk_threshold)):
        raise ValueError("Pricing inputs must be finite.")
    if not 0 <= risk_threshold < 100:
        raise ValueError("Risk threshold must be in [0, 100).")
    ceiling = max(0, min(PLATFORM_CAP, int(product_ceiling)))
    factor = 1.0 if total_spent >= 1000 else 0.85 if total_spent >= 400 else 0.70
    if fused_risk < risk_threshold:
        discount = 0
        rationale = f"Fused risk ({fused_risk}%) is below threshold ({risk_threshold}%). No discount to avoid margin cannibalization."
    else:
        ratio = min(1.0, max(0.0, (fused_risk - risk_threshold) / (100 - risk_threshold)))
        minimum = min(5, ceiling)
        discount = int(round(min(ceiling, minimum + (ceiling - minimum) * ratio * factor)))
        rationale = f"Risk: {fused_risk}%, effective product ceiling: {ceiling}%, LTV factor: {factor}. Calculated discount: {discount}%."
    return dict(discount_percent=discount, product_ceiling=ceiling, ltv_factor=factor, rationale=rationale)

def coupon_code(name, discount):
    first = re.sub(r"[^A-Z0-9]", "", (name or "Customer").split()[0].upper()) or "CUSTOMER"
    return f"RETAIN{discount}-{first}"

def financial_sentence(discount, product_name, name):
    if discount <= 0:
        return "No discount is available under the current risk and margin policy (0%)."
    return f"Please enjoy {discount}% off {product_name} only, with code {coupon_code(name, discount)}."

def message_matches_discount(message, discount):
    percentages = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)\s*(?:%|percent\b)", message, re.I)]
    codes = [int(x) for x in re.findall(r"RETAIN(\d+)-", message)]
    return bool(percentages) and all(x == discount for x in percentages + codes)
