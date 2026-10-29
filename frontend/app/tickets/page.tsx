"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpRight,
  Send,
  Bot,
  User,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Ticket, CustomerSummary } from "../../lib/types";
import {
  PageHeader,
  Notice,
  Avatar,
  Badge,
  Empty,
  Loading,
  Modal,
} from "../../components/ui";
import { formatRelativeTime, formatLiveDateTime } from "../../lib/formatters";
export default function Tickets() {
  const [items, setItems] = useState<Ticket[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("All Tickets"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Ticket | null>(null),
    [create, setCreate] = useState(false),
    [customers, setCustomers] = useState<CustomerSummary[]>([]),
    [customerId, setCustomerId] = useState(""),
    [customerQuery, setCustomerQuery] = useState(""),
    [message, setMessage] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [formError, setFormError] = useState("");
  async function load() {
    setBusy(true);
    try {
      setItems(await api.getTickets());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!create) return;
    const c = new AbortController();
    const timer = setTimeout(
      () =>
        api
          .getCustomers({ page_size: 20, search: customerQuery }, c.signal)
          .then((r) => setCustomers(r.items))
          .catch((e) => {
            if (e.name !== "AbortError") setFormError(e.message);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [create, customerQuery]);
  const filtered = items.filter(
    (t) =>
      (filter === "All Tickets" || t.sentiment_label === filter) &&
      (t.customer_name + " " + t.customer_id + " " + t.message)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Listen to your customers. Turn every conversation into an opportunity."
      >
        <button className="button" aria-label="Refresh tickets" onClick={load}>
          <RefreshCw size={14} />
        </button>
        <button
          className="button primary"
          onClick={() => {
            setFormError("");
            setCreate(true);
          }}
        >
          <Plus size={15} />
          Simulate Ticket
        </button>
      </PageHeader>
      <Notice message={error} error />
      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Ticket sentiment">
          {["All Tickets", "Angry", "Neutral", "Happy"].map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? "active" : ""}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {f}
              <span>
                (
                {
                  items.filter(
                    (t) => f === "All Tickets" || t.sentiment_label === f,
                  ).length
                }
                )
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-input">
            <Search size={15} />
            <input
              aria-label="Search tickets"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tickets, customers or conversations…"
            />
          </label>
          <span className="badge neutral">
            Sentiment analyzed automatically
          </span>
        </div>
        {busy ? (
          <Loading />
        ) : filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Conversation</th>
                  <th>Sentiment</th>
                  <th>Urgency</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 10, page * 10).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        className="person"
                        href={"/customers/" + t.customer_id}
                      >
                        <Avatar name={t.customer_name} />
                        <span>
                          <strong>{t.customer_name}</strong>
                          <small>{t.customer_id}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <button
                        className="text-button ticket-subject"
                        onClick={() => setSelected(t)}
                      >
                        {t.message}
                        <small>
                          {t.id} ·{" "}
                          {t.agent_reply
                            ? "AI response available"
                            : "Awaiting response"}
                        </small>
                      </button>
                    </td>
                    <td>
                      <Badge>{t.sentiment_label}</Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          (t.urgency_score ?? t.sentiment_score) >= 65
                            ? "red"
                            : (t.urgency_score ?? t.sentiment_score) < 40
                              ? "green"
                              : "orange"
                        }
                      >
                        {t.urgency_score ?? t.sentiment_score}
                      </Badge>
                    </td>
                    <td className="muted">
                      {formatRelativeTime(t.created_at)}
                    </td>
                    <td>
                      <button
                        className="table-action"
                        aria-label={"Open ticket " + t.id}
                        onClick={() => setSelected(t)}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No matching conversations"
            description="Adjust your filters or simulate a new customer ticket."
          />
        )}
        {!busy && filtered.length > 0 && (
          <div className="pagination">
            <button
              className="page-button"
              aria-label="Previous ticket page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ marginLeft: 0 }}>
              Page {page} of {Math.ceil(filtered.length / 10)}
            </span>
            <button
              className="page-button"
              aria-label="Next ticket page"
              disabled={page * 10 >= filtered.length}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </button>
            <span>
              {(page - 1) * 10 + 1} - {Math.min(page * 10, filtered.length)} of{" "}
              {filtered.length} tickets
            </span>
          </div>
        )}
      </section>
      {selected && (
        <Modal title="Customer conversation" onClose={() => setSelected(null)}>
          <div className="person">
            <Avatar name={selected.customer_name} />
            <span>
              <strong>{selected.customer_name}</strong>
              <small>
                {selected.id} · {formatLiveDateTime(selected.created_at)}
              </small>
            </span>
          </div>
          <div className="conversation-bubble">
            <div
              className="setting-row"
              style={{ padding: 0, marginBottom: 10 }}
            >
              <span style={{ display: "flex", gap: 7 }}>
                <User size={16} />
                Customer
              </span>
              <Badge>{selected.sentiment_label}</Badge>
            </div>
            {selected.message}
          </div>
          {selected.agent_reply && (
            <div className="conversation-bubble reply">
              <p
                style={{
                  display: "flex",
                  gap: 7,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                <Bot size={17} />
                ChurnGuardAI Support
              </p>
              {selected.agent_reply}
            </div>
          )}
          <div
            className="stats-mini"
            style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 22 }}
          >
            {[
              ["Baseline", selected.baseline_score],
              ["Urgency", selected.urgency_score ?? selected.sentiment_score],
              ["Fused Risk", selected.fused_score],
            ].map(([k, v]) => (
              <dl key={k}>
                <dt>{k}</dt>
                <dd>
                  {v ?? "—"}
                  {v != null ? "%" : ""}
                </dd>
              </dl>
            ))}
          </div>
          <div className="actions">
            <Link
              className="button"
              href={"/customers/" + selected.customer_id}
            >
              Customer profile
            </Link>
            <Link className="button primary" href="/approvals">
              Review offers <ArrowUpRight size={14} />
            </Link>
          </div>
        </Modal>
      )}
      {create && (
        <Modal
          title="Simulate a support ticket"
          onClose={() => {
            if (!submitting) setCreate(false);
          }}
        >
          <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
            Create a local ticket to analyze sentiment and generate a relevant
            response.
          </p>
          <Notice message={formError} error />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setFormError("");
              try {
                const r = await api.createTicket(customerId, message);
                setCreate(false);
                setMessage("");
                await load();
                setSelected(r.ticket);
              } catch (e) {
                setFormError((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label className="field">
              <span>Find a customer</span>
              <input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search by name or ID"
              />
            </label>
            <label className="field">
              <span>Customer</span>
              <select
                style={{ width: "100%" }}
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Choose a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.id} · {c.churn_status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Message</span>
              <textarea
                required
                minLength={3}
                maxLength={5000}
                rows={4}
                placeholder="Tell us about the customer’s experience…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <div className="actions">
              <button
                type="button"
                className="button"
                disabled={submitting}
                onClick={() => setCreate(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={submitting || !customerId || !message.trim()}
              >
                <Send size={14} />
                {submitting ? "Analyzing conversation…" : "Submit Ticket"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
