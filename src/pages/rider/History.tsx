import { useLive } from "../../hooks/useLive";
import { getOrders } from "../../services/orders";
import { RIDER_ID } from "../../services/tracking";
import { fmtDate, inr } from "../../lib/format";
import StatusBadge from "../../components/shared/StatusBadge";

export default function History() {
  const done = useLive(getOrders)
    .filter((o) => o.rider_id === RIDER_ID && o.status === "delivered")
    .sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? ""));

  return (
    <>
      <header className="page-head"><div><h1>Delivery history</h1><p className="muted">{done.length} completed deliveries</p></div></header>
      <div className="card table-wrap">
        {done.length === 0 ? <p className="empty">Completed deliveries will show up here.</p> : (
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Delivered</th><th>Distance</th><th>Status</th><th>Payout</th></tr></thead>
            <tbody>
              {done.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong><br /><span className="muted">{o.items_summary}</span></td>
                  <td>{o.customer_name}</td>
                  <td>{o.delivered_at && fmtDate(o.delivered_at)}</td>
                  <td>{o.distance_km} km</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><strong>{inr(o.payout)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
