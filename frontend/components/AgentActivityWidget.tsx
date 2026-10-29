"use client";
import { useEffect, useState } from "react";
import { Bot, ShieldCheck, TriangleAlert, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import type { Activity } from "../lib/types";
import { Empty } from "./ui";
export function AgentActivityWidget() {
  const [items, setItems] = useState<Activity[]>([]),
    [connected, setConnected] = useState(false);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await api.getActivity();
        if (active) {
          setItems(data);
          setConnected(true);
        }
      } catch {
        if (active) setConnected(false);
      }
    };
    poll();
    const timer = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>AI Agent Activity</h2>
        <span className="badge green" style={{ fontSize: 9 }}>
          {connected ? "Live updates" : "Connecting"}
        </span>
      </div>
      <div className="activity-list">
        {items.length ? (
          items.slice(0, 15).map((item) => (
            <div className="activity-row" key={item.id}>
              <span className="activity-icon">
                {item.type === "success" ? (
                  <ShieldCheck size={16} />
                ) : item.type === "alert" ? (
                  <TriangleAlert size={16} />
                ) : (
                  <Bot size={16} />
                )}
              </span>
              <div>
                <p>{item.message}</p>
                <small>
                  {item.agent} · {item.timestamp}
                </small>
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="Ready when you are"
            description="Run a scan or simulate a ticket to see your agents in action."
          />
        )}
      </div>
      <div
        style={{
          padding: "12px 22px",
          borderTop: "1px solid var(--line)",
          color: "var(--muted)",
          fontSize: 9,
          display: "flex",
          gap: 6,
        }}
      >
        <RefreshCw size={11} />
        Updates automatically every 4 seconds
      </div>
    </div>
  );
}
