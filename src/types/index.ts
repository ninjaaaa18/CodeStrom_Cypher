// SHARED CONTRACT - owned by Person 4. Do not change fields without telling the team.
export type OrderStatus =
  | "placed" | "accepted" | "packing" | "ready_for_pickup"
  | "picked_up" | "on_the_way" | "delivered" | "cancelled";

export interface LatLng { lat: number; lng: number }
export interface Place extends LatLng { name: string; address: string }

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  items_summary: string;
  rider_id: string | null;
  status: OrderStatus;
  total_amount: number;
  payout: number;            // what the rider earns for this delivery
  eta_minutes: number | null;
  distance_km: number;
  store: Place;
  drop: Place;
  created_at: string;
  delivered_at: string | null;
}

export interface Rider {
  id: string;
  name: string;
  online: boolean;
  location: LatLng | null;
  updated_at: string;
}
