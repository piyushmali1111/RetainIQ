"use client";
import { useEffect, useState } from "react";
import {
  Save,
  ShieldCheck,
  Clock,
  MessagesSquare,
  Gift,
  Mail,
  RotateCcw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Settings } from "../../lib/types";
import { PageHeader, Notice, Loading } from "../../components/ui";
import { formatLiveDateTime } from "../../lib/formatters";
export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null),
    [saved, setSaved] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    api
      .getSettings()
      .then((v) => {
        setS(v);
        setSaved(v);
      })
      .catch((e) => setError(e.message));
  }, []);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  if (!s) return error ? <Notice message={error} error /> : <Loading />;
  function update(p: Partial<Settings>) {
    setS((v) => (v ? { ...v, ...p } : v));
    setMessage("");
  }
  return (
    <>
      <PageHeader
        title="Agent Rules & Settings"
        description="Your business. Your rules. Give your AI the right boundaries."
      >
        <span className="badge neutral">
          <ShieldCheck size={12} />
          Policy-controlled automation
        </span>
      </PageHeader>
      <Notice message={error} error />
      <Notice message={message} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api.updateSettings(s);
            setS(r);
            setSaved(r);
            setMessage(
              "Settings saved. Your agents and scan schedule now use these rules.",
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="settings-grid">
          <section className="panel">
            <div className="setting-section">
              <h2>Risk Detection</h2>
              <p>Minimum customer risk score for retention offer generation.</p>
              <div className="range-row">
                <input
                  aria-label="Risk threshold"
                  type="range"
                  min={20}
                  max={95}
                  value={s.risk_threshold}
                  onChange={(e) =>
                    update({ risk_threshold: Number(e.target.value) })
                  }
                />
                <strong>{s.risk_threshold}%</strong>
              </div>
              <div className="range-labels">
                <span>20% · More proactive</span>
                <span>95% · Highest risk only</span>
              </div>
            </div>
            <div className="setting-section">
              <h2>Proactive Scan</h2>
              <p>Automatically scan your customer base for signs of churn.</p>
              <div className="setting-row">
                <span>Scan frequency</span>
                <select
                  aria-label="Scan frequency"
                  value={s.scan_frequency}
                  onChange={(e) => update({ scan_frequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="disabled">Paused</option>
                </select>
              </div>
              <div
                className="notice"
                style={{ marginTop: 14, marginBottom: 0, fontSize: 10 }}
              >
                <Clock size={14} />
                {dirty
                  ? "Save changes to update the schedule."
                  : s.next_scan
                    ? "Next scan: " + formatLiveDateTime(s.next_scan)
                    : "Automatic scanning is paused."}
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="setting-section">
              <h2>Discount Policy</h2>
              <p>Maximum discount your team and AI can offer.</p>
              <div className="range-row">
                <input
                  aria-label="Maximum discount"
                  type="range"
                  min={0}
                  max={50}
                  value={s.max_discount_percent}
                  onChange={(e) =>
                    update({ max_discount_percent: Number(e.target.value) })
                  }
                />
                <strong>{s.max_discount_percent}%</strong>
              </div>
              <div className="range-labels">
                <span>0%</span>
                <span>50%</span>
              </div>
              <p style={{ marginBottom: 0, fontSize: 10 }}>
                Every offer is checked again against this policy when you
                approve it.
              </p>
            </div>
            <div className="setting-section">
              <h2>AI Agent Settings</h2>
              <div className="setting-row">
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <MessagesSquare size={15} />
                  Enable support ticket monitoring
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Support ticket monitoring"
                  aria-checked={s.ticket_monitoring}
                  className="switch"
                  onClick={() =>
                    update({ ticket_monitoring: !s.ticket_monitoring })
                  }
                >
                  <span />
                </button>
              </div>
              <div className="setting-row">
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Gift size={15} />
                  Enable automated offer generation
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Automated offer generation"
                  aria-checked={s.automated_offers}
                  className="switch"
                  onClick={() =>
                    update({ automated_offers: !s.automated_offers })
                  }
                >
                  <span />
                </button>
              </div>
              <div className="setting-row">
                <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <Mail size={15} />
                  Send email after approval
                </span>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-label="Email delivery unavailable"
                  aria-checked={false}
                  disabled
                >
                  <span />
                </button>
              </div>
              <p style={{ fontSize: 10, marginBottom: 0 }}>
                Email delivery is not connected. Approved offers are saved
                locally for review.
              </p>
            </div>
          </section>
        </div>
        <div className="offer-actions" style={{ border: 0 }}>
          <span className="muted" style={{ marginRight: "auto", fontSize: 11 }}>
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </span>
          <button
            type="button"
            className="button"
            disabled={!dirty || busy}
            onClick={() => {
              setS(saved);
              setMessage("");
            }}
          >
            <RotateCcw size={14} />
            Discard changes
          </button>
          <button className="button primary" disabled={!dirty || busy}>
            <Save size={14} />
            {busy ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </>
  );
}
