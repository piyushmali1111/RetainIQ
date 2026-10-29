"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { Brand, RetentionArt, Notice, Modal } from "../../components/ui";
import { api } from "../../lib/api";
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [help, setHelp] = useState(false);
  return (
    <main className="login-page">
      <Link className="login-back text-link" href="/">
        <ArrowLeft size={14} />
        Back to home
      </Link>
      <div className="login-card">
        <Brand />
        <h1>Welcome Back</h1>
        <p className="login-subtitle">Sign in to your manager account</p>
        <Notice message={error} error />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              await api.login(email, password, remember);
              router.push("/dashboard");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="manager@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <button
              className="text-button blue"
              type="button"
              onClick={() => setHelp(true)}
            >
              Forgot password?
            </button>
          </div>
          <button className="button primary full" disabled={busy}>
            {busy ? "Signing in…" : "Sign In"}
            <ArrowRight size={15} />
          </button>
        </form>
        <div className="login-note">
          Trying the local development workspace?
          <button
            onClick={() => {
              setEmail("manager@churnguard.ai");
              setPassword("ChurnGuard@2026");
            }}
          >
            Use local demo credentials
          </button>
        </div>
      </div>
      <div className="login-feature">
        <span className="badge blue-badge" style={{ marginBottom: 17 }}>
          CUSTOMER SUCCESS, REIMAGINED
        </span>
        <h2>
          Keep more customers.
          <br />
          <span className="blue">With a little help from AI.</span>
        </h2>
        <ul>
          {[
            "Detect churn risk early",
            "Understand customer sentiment",
            "Get personalized retention offers",
            "Stay in control with approvals",
          ].map((t) => (
            <li key={t}>
              <CheckCircle2 size={18} />
              {t}
            </li>
          ))}
        </ul>
        <RetentionArt />
      </div>
      <p className="login-bottom">
        ChurnGuardAI · Your customer relationships, protected.
      </p>
      {help && (
        <Modal title="Recover workspace access" onClose={() => setHelp(false)}>
          <p className="muted">
            This local workspace uses a manager account configured by its
            administrator. Use the local demo credentials, or ask your
            administrator to update MANAGER_EMAIL and MANAGER_PASSWORD in the
            backend environment configuration.
          </p>
          <div className="actions">
            <button className="button primary" onClick={() => setHelp(false)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
