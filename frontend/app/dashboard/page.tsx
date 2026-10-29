"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ArrowRight, CalendarDays } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
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
    [message, setMessage] = useState(""),
    [weeks, setWeeks] = useState(8);
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
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <CalendarDays size={15} className="muted" />
          <select
            aria-label="Chart time range"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          >
            <option value={8}>Last 8 weeks</option>
            <option value={4}>Last 4 weeks</option>
          </select>
        </div>
      </PageHeader>
      <Notice message={error} error />
      <Notice message={message} />
      <TopMetricsStrip summary={s} loading={loading} />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Retention vs Churn Trend</h2>
              <p>A clearer view of your customer relationships</p>
            </div>
            <span className="badge neutral">Weekly cohorts</span>
          </div>
          <div className="chart-legend">
            <span>
              <i style={{ background: "#0cb795" }} />
              Retained Customers
            </span>
            <span>
              <i style={{ background: "#f8667c" }} />
              Churned Customers
            </span>
          </div>
          <div className="chart-wrap">
            {s ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={s.weekly_trend.slice(-weeks)}
                  margin={{ top: 10, right: 10, bottom: 0, left: -15 }}
                >
                  <defs>
                    <linearGradient
                      id="retainedFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#0cb795"
                        stopOpacity={0.16}
                      />
                      <stop offset="100%" stopColor="#0cb795" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="churnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#f8667c"
                        stopOpacity={0.09}
                      />
                      <stop offset="100%" stopColor="#f8667c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#edf2fa" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#8c9bb3" }}
                    dy={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#8c9bb3" }}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e5ecf6",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Area
                    name="Retained Customers"
                    type="monotone"
                    dataKey="retained"
                    stroke="#0cb795"
                    strokeWidth={2.4}
                    fill="url(#retainedFill)"
                    dot={{
                      r: 3,
                      fill: "#0cb795",
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                  />
                  <Area
                    name="Churned Customers"
                    type="monotone"
                    dataKey="churned"
                    stroke="#f8667c"
                    strokeWidth={2}
                    fill="url(#churnFill)"
                    dot={{
                      r: 3,
                      fill: "#f8667c",
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                title={error ? "Chart unavailable" : "Loading retention trend…"}
                description={
                  error
                    ? "Use Run AI Scan or reload once the API is available."
                    : ""
                }
              />
            )}
          </div>
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
