"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Mail, CalendarDays, ArrowRight } from "lucide-react";
import { api } from "../../../lib/api";
import type { CustomerDetail } from "../../../lib/types";
import { Avatar, Badge, Notice, Loading, Empty } from "../../../components/ui";
import { ShapExplainerBar } from "../../../components/ShapExplainerBar";
import { formatCurrency, formatDate } from "../../../lib/formatters";
export default function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    router = useRouter();
  const [c, setC] = useState<CustomerDetail | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Overview"),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .getCustomerById(id)
      .then(setC)
      .catch((e) => setError(e.message));
  }, [id]);
  if (!c)
    return error ? (
      <>
        <Notice message={error} error />
        <Link className="text-link" href="/customers">
          Back to customers
        </Link>
      </>
    ) : (
      <Loading />
    );
  const color =
    c.churn_status === "High Risk"
      ? "#f5677b"
      : c.churn_status === "Safe"
        ? "#19b695"
        : "#edb34c";
  const score = c.fused_score ?? c.churn_risk_score;
  return (
    <>
      <Link href="/customers" className="text-link">
        <ArrowLeft size={13} />
        Back to Customers
      </Link>
      <div className="customer-heading">
        <Avatar name={c.name} large />
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1>{c.name}</h1>
            <span className="badge neutral">{c.id}</span>
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
            <Badge>{c.churn_status}</Badge>
            <Badge tone="red">Churn risk: {c.churn_risk_score}%</Badge>
          </div>
          <div className="customer-meta">
            <span style={{ display: "flex", gap: 6 }}>
              <Mail size={12} />
              {c.email}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              <CalendarDays size={12} />
              Member since {formatDate(c.signup_date)}
            </span>
          </div>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const o = await api.createOffer(c.id);
              router.push("/approvals?offer=" + o.id);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Plus size={15} />
          {busy ? "Creating offer…" : "Create Offer"}
        </button>
      </div>
      <Notice message={error} error />
      <div className="detail-tabs">
        <div className="tabs" role="tablist" aria-label="Customer details">
          {[
            "Overview",
            "Risk Analysis",
            "Purchase Summary",
            "Support Tickets",
            "Retention Offers",
          ].map((t) => (
            <button
              role="tab"
              aria-selected={t === tab}
              className={t === tab ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {(tab === "Overview" ||
        tab === "Risk Analysis" ||
        tab === "Purchase Summary") && (
        <div className="detail-grid">
          <section className="panel">
            <div className="panel-head">
              <h2>Customer Overview</h2>
            </div>
            <div className="panel-body" style={{ paddingTop: 0 }}>
              <dl className="stats-mini">
                {[
                  ["Total Spending", formatCurrency(c.total_spent)],
                  ["Total Orders", c.order_count],
                  [
                    "Avg. Order Value",
                    formatCurrency(
                      c.order_count ? c.total_spent / c.order_count : 0,
                    ),
                  ],
                  ["Last Order", formatDate(c.last_order_date)],
                  ["Satisfaction", c.satisfaction_score + " / 5"],
                  ["Days Inactive", c.days_inactive ?? "—"],
                ].map(([label, v]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {tab === "Purchase Summary" && (
                <p className="muted" style={{ marginTop: 25, fontSize: 11 }}>
                  The connected dataset contains purchase totals and the most
                  recent order date. Individual order records are not available.
                </p>
              )}
            </div>
          </section>
          {tab !== "Purchase Summary" && (
            <section className="panel">
              <div className="panel-head">
                <h2>Churn Risk Analysis</h2>
                <span className="badge neutral">Explainable AI</span>
              </div>
              <div className="panel-body" style={{ paddingTop: 5 }}>
                <div className="risk-content">
                  <div
                    className="risk-ring"
                    style={{
                      background:
                        "conic-gradient(" +
                        color +
                        " " +
                        Math.min(100, Math.max(0, score)) +
                        "%, #eff3fa 0)",
                    }}
                  >
                    <div>
                      <strong>{score}%</strong>
                      <small>
                        {c.fused_score != null ? "Fused risk" : "Baseline risk"}
                      </small>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 11, marginBottom: 17 }}>
                      Top Risk Factors (SHAP)
                    </h3>
                    <ShapExplainerBar factors={c.shap_factors} />
                  </div>
                </div>
                {tab === "Risk Analysis" && (
                  <p className="muted" style={{ fontSize: 11, marginTop: 24 }}>
                    Behavioral baseline:{" "}
                    {c.baseline_score ?? c.churn_risk_score}%. Latest support
                    urgency: {c.urgency_score ?? "Not available"}. SHAP factors
                    explain the behavioral score; positive contributions
                    increase risk.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
      {(tab === "Overview" ||
        tab === "Support Tickets" ||
        tab === "Retention Offers") && (
        <div className={tab === "Overview" ? "two-col section-gap" : ""}>
          {tab !== "Retention Offers" && (
            <section className="panel">
              <div className="panel-head">
                <h2>
                  {tab === "Overview"
                    ? "Recent Support Tickets"
                    : "Support Tickets"}
                </h2>
                {tab === "Overview" && (
                  <button
                    className="text-button text-link"
                    onClick={() => setTab("Support Tickets")}
                  >
                    View all
                  </button>
                )}
              </div>
              {c.ticket_history.length ? (
                c.ticket_history
                  .slice(0, tab === "Overview" ? 2 : undefined)
                  .map((t) => (
                    <div className="history-row" key={t.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <Badge>{t.sentiment_label}</Badge>
                        <small>{formatDate(t.created_at)}</small>
                      </div>
                      <p>{t.message}</p>
                      {tab === "Support Tickets" && t.agent_reply && (
                        <div className="conversation-bubble reply">
                          <strong>AI support response</strong>
                          <p>{t.agent_reply}</p>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <Empty
                  title="No support tickets"
                  description="No conversations recorded for this customer."
                />
              )}
            </section>
          )}
          {tab !== "Support Tickets" && (
            <section className="panel">
              <div className="panel-head">
                <h2>Retention Offers</h2>
                {tab === "Overview" && (
                  <button
                    className="text-button text-link"
                    onClick={() => setTab("Retention Offers")}
                  >
                    View all
                  </button>
                )}
              </div>
              {c.offers.length ? (
                c.offers
                  .slice(0, tab === "Overview" ? 2 : undefined)
                  .map((o) => (
                    <div className="history-row" key={o.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <strong>{o.discount_percent}% Discount Offer</strong>
                        <Badge>{o.status}</Badge>
                      </div>
                      <p>{o.reasoning}</p>
                      <Link
                        className="text-link"
                        href={"/approvals?offer=" + o.id}
                      >
                        View offer <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))
              ) : (
                <Empty
                  title="No offers yet"
                  description="Create a personalized offer when this customer needs one."
                />
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
