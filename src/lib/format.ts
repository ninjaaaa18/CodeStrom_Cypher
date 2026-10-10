import type { LatLng, Order } from "../types";

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const isToday = (iso: string | null) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

export function distanceKm(a: LatLng, b: LatLng) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function weeklyEarnings(orders: Order[]) {
  return Array.from({ length: 7 }, (_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - k));
    const value = orders.filter((o) => o.delivered_at && new Date(o.delivered_at).toDateString() === d.toDateString())
      .reduce((s, o) => s + o.payout, 0);
    return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), value };
  });
}
