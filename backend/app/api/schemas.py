from typing import List, Optional, Any, Literal
from pydantic import BaseModel, Field

class WeeklyTrendPoint(BaseModel):
    week: str
    retained: int
    churned: int
    retention_rate: Optional[float] = None

class DashboardSummaryResponse(BaseModel):
    total_customers: int
    high_risk_today: int
    high_risk_total: Optional[int] = None
    high_risk_new_today: Optional[int] = None
    retention_rate_30d: float
    retention_delta_vs_last_month: float
    pending_offers_count: int
    risk_threshold: Optional[int] = 60
    weekly_trend: List[WeeklyTrendPoint]

class ShapFactorSchema(BaseModel):
    feature: str
    label: str
    value: str
    points: float
    factor: Optional[str] = None
    impact: Optional[int] = None
    description: Optional[str] = None

class CustomerSummaryResponse(BaseModel):
    id: str
    name: str
    email: str
    churn_risk_score: float
    baseline_score: Optional[float] = None
    urgency_score: Optional[int] = None
    fused_score: Optional[float] = None
    churn_status: str
    last_order_date: str
    days_inactive: Optional[int] = None
    total_spent: float
    order_count: int

class PaginatedCustomersResponse(BaseModel):
    items: List[CustomerSummaryResponse]
    total: int
    page: int
    page_size: int

class ProductContext(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_price: Optional[float] = None
    product_margin: Optional[float] = None
    product_ceiling: Optional[int] = None

class TicketResponse(ProductContext):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    message: str
    sentiment_label: str
    sentiment_score: int
    urgency_score: Optional[int] = None
    baseline_score: Optional[float] = None
    fused_score: Optional[float] = None
    agent_reply: Optional[str] = None
    created_at: str

class OfferResponse(ProductContext):
    effective_ceiling: int = 0
    pricing_rationale: Optional[str] = None
    ltv_factor: Optional[float] = None
    calculated_discount: Optional[int] = None
    guardrails_valid: bool = False
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    ticket_id: Optional[str] = None
    drafted_message: str
    discount_percent: int
    reasoning: str
    baseline_score: Optional[float] = None
    urgency_score: Optional[int] = None
    fused_score: Optional[float] = None
    status: str
    created_at: str
    decided_at: Optional[str] = None

class CustomerDetailResponse(CustomerSummaryResponse):
    signup_date: str
    complaint_count: int
    satisfaction_score: float
    base_score: Optional[float] = None
    shap_factors: List[ShapFactorSchema]
    ticket_history: List[TicketResponse]
    offers: List[OfferResponse]

class TicketCreateRequest(BaseModel):
    product_id: Optional[str] = None
    customer_id: str
    message: str = Field(min_length=3, max_length=5000, pattern=r"\S")

class OfferPatchRequest(BaseModel):
    drafted_message: Optional[str] = Field(None, min_length=3, max_length=5000, pattern=r"\S")
    discount_percent: Optional[int] = Field(None, ge=0, le=100)

class ScanRunResponse(BaseModel):
    scanned_customers: Optional[int] = None
    high_risk_flagged: Optional[int] = None
    new_offers_count: int
    scan_timestamp: str

class SettingsResponse(BaseModel):
    risk_threshold: int
    max_discount_percent: int
    scan_frequency: str
    fusion_alpha: float = 0.7
    ticket_monitoring: bool = True
    automated_offers: bool = True
    email_configured: bool = False
    next_scan: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    risk_threshold: Optional[int] = Field(None, ge=20, le=95)
    max_discount_percent: Optional[int] = Field(None, ge=0, le=50)
    scan_frequency: Optional[Literal["daily", "weekly", "disabled"]] = None
    ticket_monitoring: Optional[bool] = None
    automated_offers: Optional[bool] = None
