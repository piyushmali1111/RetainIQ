"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Inbox,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { api } from "../lib/api";
import { Brand, Avatar, Loading, Notice } from "./ui";
const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/tickets", "Support Tickets", Ticket],
  ["/customers", "Customers", Users],
  ["/approvals", "Offer Approvals", Inbox],
  ["/settings", "Settings", Settings],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    router = useRouter(),
    publicPage = pathname === "/" || pathname === "/login";
  const [user, setUser] = useState<{ name: string; email: string } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (!publicPage)
      api
        .me()
        .then(setUser)
        .catch((e) => {
          if (e.message.includes("sign in")) router.replace("/login");
          else
            setError(
              "Cannot connect to the backend. Start the local API and reload.",
            );
        });
  }, [publicPage, router]);
  if (publicPage) return <>{children}</>;
  if (error)
    return (
      <main className="standalone">
        <Notice message={error} error />
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Retry connection
        </button>
      </main>
    );
  if (!user) return <Loading />;
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="sidebar-brand">
          <Brand />
          <button
            aria-label="Close navigation"
            className="icon-button mobile-only"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">C</span>
          <div>
            My workspace<small>Customer success</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobile(false)}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
              className={pathname.startsWith(href) ? "active" : ""}
            >
              <Icon size={18} />
              {label}
              {pathname.startsWith(href) && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-footer">
            <span className="status-dot" />
            Local workspace <span>v1.0</span>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/customers?q=" + encodeURIComponent(query));
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search customers"
              placeholder="Search customers by name, email or ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-right">
            <span className="environment-label">
              <span className="status-dot" />
              Local environment
            </span>
            <Link
              className="icon-button notification"
              href="/approvals"
              aria-label="Open pending approvals"
            >
              <Bell size={20} />
              <i />
            </Link>
            <div className="profile-area">
              <button
                className="profile-button"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
              >
                <Avatar name="Manager" />
                <span>
                  Manager<small>Operations Manager</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {menu && (
                <div className="profile-menu">
                  <small>{user.email}</small>
                  <Link href="/settings" onClick={() => setMenu(false)}>
                    <Settings size={16} />
                    Account settings
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        await api.logout();
                        setUser(null);
                        router.push("/login");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main" key={pathname} className="page-content">
          {children}
        </main>
        <footer className="app-footer">
          ChurnGuardAI <span>Thoughtful retention. Human control.</span>
        </footer>
      </div>
    </div>
  );
}
