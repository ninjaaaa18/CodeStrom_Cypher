import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { Order } from "../../types";
import { initials, inr } from "../../lib/format";
import StatusBadge from "./StatusBadge";

export default function OrderCard({ order, children }: { order: Order; children?: ReactNode }) {
  return (
    <div className="order-row">
      <div className="avatar">{initials(order.customer_name)}</div>
      <div className="order-info">
        <div><strong>#{order.id}</strong> <StatusBadge status={order.status} /></div>
        <p>{order.customer_name} · {order.items_summary}</p>
        <p className="muted"><MapPin size={13} /> {order.drop.address} · {order.distance_km} km</p>
      </div>
      <div className="order-side">
        <strong>{inr(order.payout)}</strong>
        <span className="muted">your payout</span>
        {children}
      </div>
    </div>
  );
}
