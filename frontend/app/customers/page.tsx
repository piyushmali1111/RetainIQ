"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerSummary } from "../../lib/types";
import {
  PageHeader,
  Notice,
  Avatar,
  Badge,
  Empty,
  Loading,
} from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/formatters";
export default function Customers() {
  return (
    <Suspense fallback={<Loading />}>
      <Directory />
    </Suspense>
  );
}
function Directory() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? ""),
    [risk, setRisk] = useState(params.get("risk") ?? ""),
    [sort, setSort] = useState("risk_desc"),
    [page, setPage] = useState(1),
    [data, setData] = useState<CustomerSummary[]>([]),
    [total, setTotal] = useState(0),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const size = 10;
  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setRisk(params.get("risk") ?? "");
    setPage(1);
  }, [params]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      api
        .getCustomers(
          { page, page_size: size, search: query, risk_level: risk, sort },
          controller.signal,
        )
        .then((r) => {
          setData(r.items);
          setTotal(r.total);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, risk, sort, page]);
  const pages = Math.max(1, Math.ceil(total / size));
  function exportPage() {
    const quote = (s: string | number) =>
      '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [
      [
        "ID",
        "Name",
        "Email",
        "Risk",
        "Status",
        "Total spent",
        "Orders",
        "Last order",
      ],
      ...data.map((c) => [
        c.id,
        c.name,
        c.email,
        c.churn_risk_score,
        c.churn_status,
        c.total_spent,
        c.order_count,
        c.last_order_date,
      ]),
    ];
    const blob = new Blob(
      [rows.map((r) => r.map(quote).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "churnguard-customers-page-" + page + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeader
        title="Customers"
        description="Know your customers better. Build relationships that last."
      >
        <button
          className="button"
          disabled={!data.length || busy}
          onClick={exportPage}
        >
          <Download size={14} />
          Export this page
        </button>
      </PageHeader>
      <Notice message={error} error />
      <section className="panel">
        <div className="toolbar">
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label="Search customer directory"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email or customer ID…"
            />
          </label>
          <select
            aria-label="Filter by risk level"
            value={risk}
            onChange={(e) => {
              setRisk(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Risk Levels</option>
            <option>High Risk</option>
            <option>Watching</option>
            <option>Safe</option>
          </select>
          <select
            aria-label="Sort customers"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="risk_desc">Highest risk first</option>
            <option value="risk_asc">Lowest risk first</option>
            <option value="spent_desc">Highest spending</option>
            <option value="date_desc">Most recent order</option>
          </select>
        </div>
        {busy ? (
          <Loading />
        ) : data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>
                    <button
                      className="text-button"
                      style={{ display: "flex", gap: 5 }}
                      onClick={() => {
                        setSort(
                          sort === "risk_desc" ? "risk_asc" : "risk_desc",
                        );
                        setPage(1);
                      }}
                    >
                      Risk Score <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th>Risk Level</th>
                  <th>Total Spending</th>
                  <th>Orders</th>
                  <th>Last Order</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link className="person" href={"/customers/" + c.id}>
                        <Avatar name={c.name} />
                        <span>
                          <strong>{c.name}</strong>
                          <small>{c.id}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Badge
                        tone={
                          c.churn_status === "High Risk"
                            ? "red"
                            : c.churn_status === "Safe"
                              ? "green"
                              : "orange"
                        }
                      >
                        {c.churn_risk_score.toFixed(1)}%
                      </Badge>
                    </td>
                    <td>
                      <Badge>{c.churn_status}</Badge>
                    </td>
                    <td>{formatCurrency(c.total_spent)}</td>
                    <td>{c.order_count}</td>
                    <td>{formatDate(c.last_order_date)}</td>
                    <td>
                      <Link
                        href={"/customers/" + c.id}
                        className="table-action"
                        aria-label={"View " + c.name}
                      >
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={error ? "Customers unavailable" : "No customers found"}
            description="Try a different name or risk level."
          />
        )}
        <div className="pagination">
          <button
            className="page-button"
            aria-label="Previous page"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from(
            { length: Math.min(5, pages) },
            (_, i) =>
              Math.min(Math.max(page - 2, 1), Math.max(1, pages - 4)) + i,
          ).map((p) => (
            <button
              key={p}
              className={"page-button " + (page === p ? "active" : "")}
              onClick={() => setPage(p)}
              disabled={busy}
              aria-label={"Page " + p}
            >
              {p}
            </button>
          ))}
          {pages > 5 && page < pages - 2 && (
            <>
              …
              <button
                className="page-button"
                disabled={busy}
                onClick={() => setPage(pages)}
              >
                {pages}
              </button>
            </>
          )}
          <button
            className="page-button"
            aria-label="Next page"
            disabled={page >= pages || busy}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={14} />
          </button>
          <span>
            {total
              ? (page - 1) * size + 1 + "–" + Math.min(page * size, total)
              : 0}{" "}
            of {total.toLocaleString()} customers
          </span>
        </div>
      </section>
    </>
  );
}
