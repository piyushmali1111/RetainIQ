"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ShieldCheck,
  Pencil,
  Send,
  X,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Offer } from "../../lib/types";
import {
  PageHeader,
  Avatar,
  Badge,
  Loading,
  Notice,
  Empty,
  Modal,
} from "../../components/ui";
import { formatRelativeTime, formatDate } from "../../lib/formatters";
export default function Approvals() {
  return (
    <Suspense fallback={<Loading />}>
      <Inbox />
    </Suspense>
  );
}
function Inbox() {
  const params = useSearchParams();
  const [offers, setOffers] = useState<Offer[]>([]),
    [tab, setTab] = useState("Pending"),
    [selectedId, setSelectedId] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(false),
    [draft, setDraft] = useState(""),
    [discount, setDiscount] = useState(0),
    [ceiling, setCeiling] = useState(25),
    [editError, setEditError] = useState(""),
    [reject, setReject] = useState(false);
  async function load() {
    const [rows, settings] = await Promise.all([
      api.getOffers(),
      api.getSettings(),
    ]);
    setOffers(rows);
    setCeiling(settings.max_discount_percent);
    return rows;
  }
  useEffect(() => {
    load()
      .then((rows) => {
        const target = rows.find((o) => o.id === params.get("offer"));
        if (target) {
          setSelectedId(target.id);
          setTab(target.status === "Edited" ? "Pending" : target.status);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params]);
  const filtered = offers.filter(
    (o) => o.status === tab || (tab === "Pending" && o.status === "Edited"),
  );
  const selected = filtered.find((o) => o.id === selectedId) ?? filtered[0];
  const pending =
    selected && (selected.status === "Pending" || selected.status === "Edited");
  const verified = selected && selected.discount_percent <= ceiling;
  async function decide(action: "approve" | "reject") {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await (action === "approve"
        ? api.approveOffer(selected.id)
        : api.rejectOffer(selected.id));
      setMessage(
        action === "approve"
          ? "Offer approved and saved. No email was sent; delivery is not configured."
          : "Offer rejected. Your decision has been saved.",
      );
      setReject(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Retention Offer Approval Inbox"
        description="A personal touch, powered by AI. Review every offer before it goes further."
      >
        <span className="badge green">
          <ShieldCheck size={13} />
          Human approval required
        </span>
      </PageHeader>
      <Notice message={error} error />
      <Notice message={message} />
      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Offer status">
          {["Pending", "Approved", "Rejected"].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={t === tab}
              className={t === tab ? "active" : ""}
              onClick={() => {
                setTab(t);
                setSelectedId("");
              }}
            >
              {t}
              <span>
                (
                {
                  offers.filter(
                    (o) =>
                      o.status === t ||
                      (t === "Pending" && o.status === "Edited"),
                  ).length
                }
                )
              </span>
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : !filtered.length ? (
          <Empty
            title={"No " + tab.toLowerCase() + " offers"}
            description={
              tab === "Pending"
                ? "You’re all caught up. Run a scan or create an offer from a customer profile."
                : "Reviewed offers will appear here."
            }
          />
        ) : (
          <div className="offer-layout">
            <div className="offer-list">
              {filtered.map((o) => (
                <button
                  key={o.id}
                  className={
                    "offer-item " + (selected?.id === o.id ? "selected" : "")
                  }
                  onClick={() => {
                    setSelectedId(o.id);
                    setError("");
                  }}
                >
                  <div className="person">
                    <Avatar name={o.customer_name} />
                    <span>
                      <strong>{o.customer_name}</strong>
                      <small>{o.customer_id}</small>
                      <small>{formatRelativeTime(o.created_at)}</small>
                    </span>
                  </div>
                  <Badge tone="red">
                    {o.fused_score ?? o.baseline_score ?? "—"}% risk
                  </Badge>
                </button>
              ))}
            </div>
            {selected && (
              <article className="offer-detail">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <h2>AI Generated Offer</h2>
                  <div className="actions">
                    {pending && (
                      <button
                        className="button small"
                        onClick={() => {
                          setDraft(selected.drafted_message);
                          setDiscount(selected.discount_percent);
                          setEditError("");
                          setEdit(true);
                        }}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                    <Badge tone={verified ? "green" : "red"}>
                      <ShieldCheck size={12} />
                      {verified
                        ? "Within discount policy"
                        : "Exceeds current policy"}
                    </Badge>
                  </div>
                </div>
                <div className="offer-columns">
                  <div>
                    <p className="eyebrow">
                      A PERSONAL OFFER FOR{" "}
                      {selected.customer_name.toUpperCase()}
                    </p>
                    <div className="offer-message">
                      {selected.drafted_message}
                    </div>
                    <h3
                      style={{ fontSize: 11, marginTop: 22, marginBottom: 8 }}
                    >
                      Why this offer?
                    </h3>
                    <p
                      className="muted"
                      style={{ fontSize: 12, lineHeight: 1.8 }}
                    >
                      {selected.reasoning}
                    </p>
                    <Link
                      href={"/customers/" + selected.customer_id}
                      className="text-link"
                      style={{ marginTop: 16 }}
                    >
                      View customer context <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <aside className="offer-facts">
                    <h3 style={{ fontSize: 12 }}>Offer Details</h3>
                    <dl>
                      <div>
                        <dt>Discount</dt>
                        <dd className="blue" style={{ fontSize: 27 }}>
                          {selected.discount_percent}%
                        </dd>
                        <small className="muted">Max allowed: {ceiling}%</small>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          <Badge>{selected.status}</Badge>
                        </dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd style={{ fontSize: 12 }}>
                          {formatDate(selected.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt>Source</dt>
                        <dd style={{ fontSize: 11 }}>
                          {selected.ticket_id ?? "Proactive retention"}
                        </dd>
                      </div>
                      <div>
                        <dt>Delivery</dt>
                        <dd style={{ fontSize: 11, color: "#8491a7" }}>
                          Not configured
                        </dd>
                      </div>
                    </dl>
                  </aside>
                </div>
                {pending ? (
                  <div className="offer-actions">
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => setReject(true)}
                    >
                      <X size={14} />
                      Reject
                    </button>
                    <button
                      className="button primary"
                      disabled={busy || !verified}
                      onClick={() => decide("approve")}
                    >
                      <Check size={15} />
                      {busy ? "Saving…" : "Approve Offer"}
                    </button>
                  </div>
                ) : (
                  <div className="offer-actions">
                    <Badge>{selected.status}</Badge>
                    <span className="muted" style={{ fontSize: 11 }}>
                      Decision saved{" "}
                      {selected.decided_at
                        ? formatDate(selected.decided_at)
                        : ""}
                    </span>
                  </div>
                )}
              </article>
            )}
          </div>
        )}
      </section>
      {edit && selected && (
        <Modal
          title="Edit retention offer"
          onClose={() => {
            if (!busy) setEdit(false);
          }}
        >
          <Notice message={editError} error />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setEditError("");
              try {
                await api.updateOffer(selected.id, {
                  drafted_message: draft,
                  discount_percent: discount,
                });
                await load();
                setEdit(false);
                setMessage(
                  "Changes saved. The offer remains pending your approval.",
                );
              } catch (e) {
                setEditError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>Discount percentage · maximum {ceiling}%</span>
              <input
                type="number"
                min={0}
                max={ceiling}
                required
                value={discount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDiscount(v);
                  setDraft(draft.replace(/\d+(?:\.\d+)?\s*%/g, v + "%"));
                }}
              />
            </label>
            <label className="field">
              <span>Customer message</span>
              <textarea
                rows={8}
                required
                minLength={10}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <div className="actions">
              <button
                className="button"
                type="button"
                onClick={() => setEdit(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                <Send size={13} />
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {reject && selected && (
        <Modal
          title="Reject this offer?"
          onClose={() => {
            if (!busy) setReject(false);
          }}
        >
          <p className="muted">
            This will move the offer for {selected.customer_name} to the
            rejected list. No message will be sent to the customer.
          </p>
          <div className="actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => setReject(false)}
            >
              Keep pending
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => decide("reject")}
            >
              {busy ? "Saving…" : "Reject Offer"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
