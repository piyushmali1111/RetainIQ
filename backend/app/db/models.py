from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class ManagerSession(Base):
    __tablename__ = "manager_sessions"
    token_hash = Column(String, primary_key=True)
    expires_at = Column(DateTime, nullable=False)

class AgentPreference(Base):
    __tablename__ = "agent_preferences"
    id = Column(Integer, primary_key=True, default=1)
    ticket_monitoring = Column(Boolean, default=True, nullable=False)
    automated_offers = Column(Boolean, default=True, nullable=False)

class SystemSetting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    risk_threshold = Column(Integer, default=60, nullable=False)
    max_discount_percent = Column(Integer, default=25, nullable=False)
    scan_frequency = Column(String, default="daily", nullable=False)

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)

    @property
    def gross_margin_percent(self):
        return round((self.price - self.cost_price) / self.price * 100, 1) if self.price > 0 else 0.0

    @property
    def max_allowed_discount(self):
        from app.services.pricing_engine import margin_ceiling
        return margin_ceiling(self.price, self.cost_price)

class Customer(Base):
    __tablename__ = "customers"
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    product = relationship("Product")

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    signup_date = Column(String, nullable=False, index=True)
    last_order_date = Column(String, nullable=False, index=True)
    order_count = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    complaint_count = Column(Integer, default=0)
    satisfaction_score = Column(Float, default=5.0)
    tenure_months = Column(Float, default=0.0)
    return_rate = Column(Float, default=0.0)
    discount_usage_rate = Column(Float, default=0.0)
    churn_risk_score = Column(Float, default=0.0, index=True)
    model_version = Column(String, default="v2-calibrated-xgb", nullable=True)
    scored_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    baseline_score = Column(Float, nullable=True)
    urgency_score = Column(Integer, nullable=True)
    fused_score = Column(Float, nullable=True)
    churn_status = Column(String, default="Safe", index=True) # Safe, Watching, High Risk

    tickets = relationship("Ticket", back_populates="customer", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="customer", cascade="all, delete-orphan")

class Ticket(Base):
    __tablename__ = "tickets"
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    product = relationship("Product")

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    sentiment_label = Column(String, nullable=False) # Angry, Neutral, Happy
    sentiment_score = Column(Integer, default=50) # 0-100 (urgency)
    urgency_score = Column(Integer, nullable=True)
    baseline_score = Column(Float, nullable=True)
    fused_score = Column(Float, nullable=True)
    agent_reply = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    customer = relationship("Customer", back_populates="tickets")
    offers = relationship("Offer", back_populates="ticket")

class Offer(Base):
    __tablename__ = "offers"
    product_id = Column(String, ForeignKey("products.id"), nullable=True, index=True)
    product = relationship("Product")

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    ticket_id = Column(String, ForeignKey("tickets.id"), nullable=True, index=True)
    drafted_message = Column(Text, nullable=False)
    discount_percent = Column(Integer, nullable=False)
    reasoning = Column(Text, nullable=False)
    baseline_score = Column(Float, nullable=True)
    urgency_score = Column(Integer, nullable=True)
    fused_score = Column(Float, nullable=True)
    status = Column(String, default="Pending", index=True) # Pending, Approved, Rejected, Edited
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    decided_at = Column(DateTime, nullable=True)
    pricing_rationale = Column(Text, nullable=True)
    ltv_factor = Column(Float, nullable=True)
    calculated_discount = Column(Integer, nullable=True)

    customer = relationship("Customer", back_populates="offers")
    ticket = relationship("Ticket", back_populates="offers")
    outcomes = relationship("Outcome", back_populates="offer", cascade="all, delete-orphan")

class Outcome(Base):
    __tablename__ = "outcomes"

    id = Column(String, primary_key=True, index=True)
    offer_id = Column(String, ForeignKey("offers.id"), nullable=False)
    customer_stayed = Column(Boolean, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    offer = relationship("Offer", back_populates="outcomes")
