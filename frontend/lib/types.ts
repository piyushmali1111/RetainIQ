export interface ProductContext {
  product_id?: string | null;
  product_name?: string | null;
  product_price?: number | null;
  product_margin?: number | null;
  product_ceiling?: number | null;
}
export interface Product extends ProductContext {
  sku: string;
  category: string;
}
export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  churn_risk_score: number;
  baseline_score?: number;
  urgency_score?: number;
  fused_score?: number;
  churn_status: string;
  last_order_date: string;
  days_inactive?: number;
  total_spent: number;
  order_count: number;
}
export interface Ticket extends ProductContext {
  id: string;
  customer_id: string;
  customer_name: string;
  message: string;
  sentiment_label: "Angry" | "Neutral" | "Happy";
  sentiment_score: number;
  urgency_score?: number;
  baseline_score?: number;
  fused_score?: number;
  agent_reply?: string;
  created_at: string;
}
export interface Offer extends ProductContext {
  effective_ceiling: number;
  guardrails_valid: boolean;
  pricing_rationale?: string | null;
  calculated_discount?: number | null;
  ltv_factor?: number | null;
  id: string;
  customer_id: string;
  customer_name: string;
  ticket_id?: string;
  drafted_message: string;
  discount_percent: number;
  reasoning: string;
  baseline_score?: number;
  urgency_score?: number;
  fused_score?: number;
  status: string;
  created_at: string;
  decided_at?: string;
}
export interface ShapFactor {
  feature: string;
  label: string;
  value: string;
  points: number;
  factor?: string;
  impact?: number;
  description?: string;
}
export interface CustomerDetail extends CustomerSummary {
  signup_date: string;
  complaint_count: number;
  satisfaction_score: number;
  base_score?: number;
  shap_factors: ShapFactor[];
  ticket_history: Ticket[];
  offers: Offer[];
}
export interface DashboardSummary {
  total_customers: number;
  high_risk_today: number;
  high_risk_total: number;
  retention_rate_30d: number;
  retention_delta_vs_last_month: number;
  pending_offers_count: number;
  risk_threshold: number;
  weekly_trend: {
    week: string;
    retained: number;
    churned: number;
    retention_rate: number;
  }[];
}
export interface Settings {
  risk_threshold: number;
  max_discount_percent: number;
  scan_frequency: string;
  fusion_alpha: number;
  ticket_monitoring: boolean;
  automated_offers: boolean;
  email_configured: boolean;
  next_scan?: string;
}
export interface Activity {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
  type: string;
  chip?: string;
}
