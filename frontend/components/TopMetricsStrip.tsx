"use client";
import { Users, ShieldAlert, HeartHandshake, Gift } from "lucide-react";
import type { DashboardSummary } from "../lib/types";
export function TopMetricsStrip({
  summary,
  loading,
}: {
  summary: DashboardSummary | null;
  loading: boolean;
}) {
  const s = summary;
  const cards = [
    {
      label: "Total Customers",
      value: s?.total_customers.toLocaleString("en-IN"),
      Icon: Users,
      color: "#2463ff",
      foot: "Across your customer base",
    },
    {
      label: "High-Risk Customers",
      value: s?.high_risk_total.toLocaleString("en-IN"),
      Icon: ShieldAlert,
      color: "#ee5366",
      foot: "Above " + (s?.risk_threshold ?? 60) + "% risk threshold",
    },
    {
      label: "30-Day Retention Rate",
      value: s ? s.retention_rate_30d + "%" : undefined,
      Icon: HeartHandshake,
      color: "#00aa88",
      foot: "Rolling 30-day window",
    },
    {
      label: "Pending Offers",
      value: s?.pending_offers_count.toLocaleString("en-IN"),
      Icon: Gift,
      color: "#e19b33",
      foot: "Ready for your review",
    },
  ];
  return (
    <div className="metric-grid">
      {cards.map(({ label, value, Icon, color, foot }) => (
        <div className="panel metric" key={label}>
          <div className="metric-label">
            {label}
            <span
              className="metric-icon"
              style={{ color, background: color + "10" }}
            >
              <Icon size={17} />
            </span>
          </div>
          <div
            className="metric-value"
            style={{
              color: label === "Total Customers" ? "var(--ink)" : color,
            }}
          >
            {loading ? "—" : (value ?? "—")}
          </div>
          <div className="metric-foot">
            {label === "30-Day Retention Rate" && s && (
              <span>
                {s.retention_delta_vs_last_month > 0 ? "+" : ""}
                {s.retention_delta_vs_last_month} pp
              </span>
            )}
            {foot}
          </div>
        </div>
      ))}
    </div>
  );
}
