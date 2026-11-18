import type {
  CustomerDetail,
  CustomerSummary,
  DashboardSummary,
  Offer,
  Settings,
  Ticket,
  Activity,
  Product,
} from "./types";
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (
      response.status === 401 &&
      !path.startsWith("/auth/") &&
      typeof window !== "undefined"
    )
      window.location.assign("/login");
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : response.status === 422
          ? "Please check the entered values."
          : "Request failed (" + response.status + "). Please try again.",
    );
  }
  return response.json();
}
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const api = {
  login: (email: string, password: string, remember: boolean) =>
    post("/auth/login", { email, password, remember }),
  me: () => request<{ name: string; email: string }>("/auth/me"),
  logout: () => post("/auth/logout"),
  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),
  getCustomers: (
    params: Record<string, string | number> = {},
    signal?: AbortSignal,
  ) =>
    request<{
      items: CustomerSummary[];
      total: number;
      page: number;
      page_size: number;
    }>(
      "/customers?" +
        new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ),
      { signal },
    ),
  getCustomerById: (id: string) =>
    request<CustomerDetail>("/customers/" + encodeURIComponent(id)),
  getTickets: () => request<Ticket[]>("/tickets?limit=10000"),
  getProducts: () => request<Product[]>("/products"),
  createTicket: (customer_id: string, message: string, product_id?: string) =>
    post<{ ticket: Ticket; offer: Offer | null }>("/tickets", {
      customer_id,
      message,
      product_id,
    }),
  getOffers: () => request<Offer[]>("/offers"),
  getPendingOffers: () => request<Offer[]>("/offers/pending"),
  approveOffer: (id: string) => post<Offer>("/offers/" + id + "/approve"),
  rejectOffer: (id: string) => post<Offer>("/offers/" + id + "/reject"),
  updateOffer: (
    id: string,
    data: { drafted_message: string; discount_percent: number },
  ) =>
    request<Offer>("/offers/" + id, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createOffer: (customer_id: string, product_id?: string) =>
    post<Offer>("/offers/generate", { customer_id, product_id }),
  getSettings: () => request<Settings>("/settings"),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  runScan: () =>
    post<{
      new_offers_count: number;
      scanned_customers: number;
      high_risk_flagged: number;
    }>("/scan/run"),
  getActivity: () => request<Activity[]>("/activity"),
};
