"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  X,
  Inbox,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Heart,
  Gift,
} from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <ShieldCheck size={22} />
      </span>
      <span>
        ChurnGuard<span className="blue">AI</span>
      </span>
    </Link>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={"avatar " + (large ? "large" : "")}
      style={{
        background: "hsl(" + hue + " 65% 92%)",
        color: "hsl(" + hue + " 48% 34%)",
      }}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const text = String(children);
  const c =
    tone ??
    (/High|Angry|Rejected/.test(text)
      ? "red"
      : /Safe|Happy|Approved/.test(text)
        ? "green"
        : /Watching|Pending/.test(text)
          ? "orange"
          : "neutral");
  return <span className={"badge " + c}>{children}</span>;
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">YOUR RETENTION WORKSPACE</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "New activity will appear here.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <div
      role={error ? "alert" : "status"}
      className={"notice " + (error ? "error" : "")}
    >
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function RetentionArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={"retention-art " + (compact ? "compact" : "")}
      aria-hidden="true"
    >
      <div className="art-orbit" />
      <div className="art-chart">
        <TrendingUp size={34} />
        <div className="art-bars">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="art-shield">
        <ShieldCheck size={compact ? 34 : 64} />
      </div>
      <span className="art-heart">
        <Heart size={22} fill="currentColor" />
      </span>
      <span className="art-gift">
        <Gift size={25} />
      </span>
      <Sparkles className="art-spark" size={22} />
    </div>
  );
}
