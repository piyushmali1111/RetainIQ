import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p style={{ margin: "15px 0" }}>
        This page may have moved. Let’s get you back to your workspace.
      </p>
      <Link className="button primary" href="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}
