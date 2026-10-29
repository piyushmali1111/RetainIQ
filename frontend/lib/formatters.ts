export const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
export const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const formatLiveDateTime = (v: string) =>
  new Date(v).toLocaleString("en-IN");
export function formatRelativeTime(v: string) {
  const m = Math.max(
    0,
    Math.floor((Date.now() - new Date(v).getTime()) / 60000),
  );
  return m < 1
    ? "Just now"
    : m < 60
      ? m + " min ago"
      : m < 1440
        ? Math.floor(m / 60) + " hr ago"
        : formatDate(v);
}
