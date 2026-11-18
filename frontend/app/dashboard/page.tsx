"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ArrowRight } from "lucide-react";
import { api } from "../../lib/api";
import type { DashboardSummary, Offer } from "../../lib/types";
import { TopMetricsStrip } from "../../components/TopMetricsStrip";
import { AgentActivityWidget } from "../../components/AgentActivityWidget";
import { PageHeader, Notice, Avatar, Badge, Empty } from "../../components/ui";
import { formatRelativeTime } from "../../lib/formatters";
export default function Dashboard() {
  const [s, setS] = useState<DashboardSummary | null>(null),
    [offers, setOffers] = useState<Offer[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const bands = s?.risk_distribution ?? [];
  const scored = bands.reduce((total, band) => total + band.customers, 0);
  async function load() {
    try {
      const [a, b] = await Promise.all([
        api.getDashboardSummary(),
        api.getPendingOffers(),
      ]);
      setS(a);
      setOffers(b);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here’s what’s happening with your customers today."
      >
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            setError("");
            try {
              const r = await api.runScan();
              setMessage(
                "Scan complete. " +
                  r.scanned_customers.toLocaleString() +
                  " customers reviewed and " +
                  r.new_offers_count +
                  " new offers created.",
              );
              await load();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={14} className={busy ? "progress-spin" : ""} />
          {busy ? "Scanning customers…" : "Run AI Scan"}
        </button>
      </PageHeader>
      <Notice message={error} error />
      <Notice message={message} />
      <TopMetricsStrip summary={s} loading={loading} />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Customer churn risk distribution</h2>
              <p>Latest model score for each customer in the demo dataset.</p>
            </div>
          </div>
          {scored ? (
            <div className="risk-distribution">
              <table>
                <caption>{scored.toLocaleString()} scored customers</caption>
                <thead><tr><th scope="col">Risk score</th><th scope="col">Share of customers</th><th scope="col">Customers</th></tr></thead>
                <tbody>
                  {bands.map(({ lower, upper, customers }) => {
                    const share = (customers / scored) * 100;
                    return (
                      <tr key={lower}>
                        <th scope="row">{lower}{upper === 100 ? " to " : " to <"}{upper}</th>
                        <td><div className="risk-share">
                          <span className="risk-track" aria-hidden="true"><span style={{ width: share + "%" }} /></span>
                          <span>{share.toFixed(1)}%</span>
                        </div></td>
                        <td>{customers.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={loading ? "Loading risk scores..." : error ? "Chart unavailable" : "No scored customers"} description={error ? "Reload the dashboard to try again." : ""} />
          )}
        </section>
        <AgentActivityWidget />
      </div>
      <section className="panel section-gap">
        <div className="panel-head">
          <div>
            <h2>A little attention goes a long way</h2>
            <p>Personalized offers waiting for your review</p>
          </div>
          <Link href="/approvals" className="text-link">
            View all offers <ArrowRight size={14} />
          </Link>
        </div>
        {offers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Offer</th>
                  <th>Risk score</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offers.slice(0, 4).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        href={"/customers/" + o.customer_id}
                        className="person"
                      >
                        <Avatar name={o.customer_name} />
                        <span>
                          <strong>{o.customer_name}</strong>
                          <small>{o.customer_id}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{o.discount_percent}% discount</td>
                    <td>
                      <Badge tone="red">
                        {o.fused_score ?? o.baseline_score ?? "—"}%
                      </Badge>
                    </td>
                    <td>
                      <Badge>{o.status}</Badge>
                    </td>
                    <td className="muted">
                      {formatRelativeTime(o.created_at)}
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={"/approvals?offer=" + o.id}
                      >
                        Review <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="You’re all caught up"
            description="Run an AI scan to discover new retention opportunities."
          />
        )}
      </section>
    </>
  );
}
