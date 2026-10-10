import type { Order, OrderStatus, Place } from "../types";
import { load, save } from "./db";

const KEY = "swiftora_orders";
const REJECTED = "swiftora_rejected";

const STORE: Place = { name: "SWIFTORA Dark Store", address: "80 Feet Rd, Koramangala, Bengaluru", lat: 12.9352, lng: 77.6245 };
const P = (name: string, address: string, lat: number, lng: number): Place => ({ name, address, lat, lng });
const ago = (d: number, h = 0) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(t.getHours() - h); return t.toISOString(); };
const mk = (n: number, who: string, items: string, status: OrderStatus, total: number, payout: number, km: number,
  drop: Place, rider: string | null, d = 0, h = 0): Order => ({
  id: `SW-${n}`, customer_id: `cust-${n}`, customer_name: who, items_summary: items, rider_id: rider, status,
  total_amount: total, payout, eta_minutes: Math.round(km * 4 + 5), distance_km: km, store: STORE, drop,
  created_at: ago(d, h + 1), delivered_at: status === "delivered" ? ago(d, h) : null,
});

const seed: Order[] = [
  mk(2051, "Ananya Rao", "Men's Cotton Oxford Shirt", "ready_for_pickup", 320, 55, 5.2, P("Home", "12th Main, Indiranagar", 12.9784, 77.6408), null),
  mk(2052, "Rohan Mehta", "Men's Straight-Fit Indigo Jeans", "packing", 540, 62, 4.1, P("Home", "27th Main, HSR Layout", 12.9116, 77.6474), null),
  mk(2053, "Meera Nair", "Women's Wide-Leg Trousers", "placed", 410, 48, 6.0, P("Home", "4th Block, Jayanagar", 12.9308, 77.5838), null),
  mk(2040, "Arjun Shah", "Women's Cotton Wrap Blouse", "delivered", 980, 70, 3.8, P("Home", "BTM 2nd Stage", 12.9166, 77.6101), "rider-1", 0, 2),
  mk(2041, "Kavya Iyer", "Handloom Cotton Saree", "delivered", 150, 45, 2.4, P("Home", "Ejipura", 12.9453, 77.6309), "rider-1", 0, 5),
  mk(2035, "Dev Patel", "Chanderi Straight Kurta", "delivered", 760, 66, 4.9, P("Home", "Domlur", 12.9609, 77.6387), "rider-1", 1, 3),
  mk(2030, "Isha Reddy", "Textured Linen-Blend Fabric", "delivered", 330, 52, 3.1, P("Home", "Madiwala", 12.9226, 77.6174), "rider-1", 2, 4),
  mk(2026, "Sana Khan", "Handwoven Khadi Cotton", "delivered", 270, 50, 3.5, P("Home", "Richmond Town", 12.9634, 77.5995), "rider-1", 3, 2),
  mk(2019, "Vikram Das", "Canvas Everyday Tote", "delivered", 1120, 78, 6.4, P("Home", "Whitefield Rd", 12.9698, 77.75), "rider-1", 4, 6),
  mk(2011, "Neha Joshi", "Printed Silk-Blend Scarf", "delivered", 190, 42, 2.0, P("Home", "Koramangala 6th Block", 12.9352, 77.6245), "rider-1", 5, 3),
  mk(2004, "Rahul Menon", "Cotton Rib Crew Socks", "delivered", 410, 58, 4.4, P("Home", "Bellandur", 12.9304, 77.6784), "rider-1", 6, 2),
];

export const getOrders = (): Order[] => load<Order[]>(KEY, seed);

export async function getOrder(id: string): Promise<Order> {
  const o = getOrders().find((x) => x.id === id);
  if (!o) throw new Error("Order not found");
  return o;
}

const rejectedIds = (): string[] => load<string[]>(REJECTED, []);

export const isActive = (o: Order, riderId: string) =>
  o.rider_id === riderId && o.status !== "delivered" && o.status !== "cancelled";

export function getOffers(riderId: string): Order[] {
  const rej = rejectedIds();
  return getOrders().filter(
    (o) => o.rider_id === null && !["delivered", "cancelled"].includes(o.status) && !rej.includes(o.id + riderId)
  );
}

export async function acceptOrder(id: string, riderId: string) {
  const all = getOrders();
  if (all.some((o) => isActive(o, riderId))) throw new Error("Finish your current delivery before accepting another.");
  const o = all.find((x) => x.id === id);
  if (!o || o.rider_id) throw new Error("This order was already taken.");
  save(KEY, all.map((x) => (x.id === id ? { ...x, rider_id: riderId, status: x.status === "placed" ? ("accepted" as const) : x.status } : x)));
}

export function rejectOrder(id: string, riderId: string) {
  save(REJECTED, [...rejectedIds(), id + riderId]);
}

// Riders may only move an order forward along this path (backend should enforce the same rule).
const RIDER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  accepted: "picked_up", packing: "picked_up", ready_for_pickup: "picked_up",
  picked_up: "on_the_way", on_the_way: "delivered",
};
export const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  picked_up: "Confirm pickup", on_the_way: "Start delivery", delivered: "Mark delivered",
};
export const nextStatus = (o: Order) => RIDER_NEXT[o.status];

export async function updateOrderStatus(id: string, status: OrderStatus, riderId: string) {
  const all = getOrders();
  const o = all.find((x) => x.id === id);
  if (!o || o.rider_id !== riderId) throw new Error("Not your order.");
  if (RIDER_NEXT[o.status] !== status) throw new Error("That status change isn't allowed.");
  save(KEY, all.map((x) => x.id === id ? { ...x, status, eta_minutes: status === "delivered" ? 0 : x.eta_minutes,
    delivered_at: status === "delivered" ? new Date().toISOString() : null } : x));
}

export function resetDemoData() {
  localStorage.removeItem(KEY); localStorage.removeItem(REJECTED);
  window.dispatchEvent(new Event("swiftora-update"));
}
