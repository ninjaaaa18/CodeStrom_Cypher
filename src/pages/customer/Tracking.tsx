import { useParams } from "react-router-dom";
import { useLive } from "../../hooks/useLive";
import { getOrders } from "../../services/orders";
import { getRider } from "../../services/tracking";
import MapView from "../../components/shared/MapView";
import Stepper from "../../components/shared/Stepper";
import StatusBadge from "../../components/shared/StatusBadge";

export default function Tracking() {
  const { orderId } = useParams();
  const order = useLive(getOrders).find((o) => o.id === orderId);
  const rider = useLive(getRider);

  if (!order) return <div className="tracking-page"><div className="card"><p className="empty">Order not found.</p></div></div>;
  const beforePickup = ["placed", "accepted", "packing", "ready_for_pickup"].includes(order.status);

  return (
    <div className="tracking-page">
      <div className="card">
        <h1>Order #{order.id} <StatusBadge status={order.status} /></h1>
        <p className="muted">
          {order.status === "delivered" ? "Delivered. Enjoy!" :
            order.rider_id ? `${rider.name} is your delivery partner.` : "Finding a delivery partner for you…"}
        </p>
        <Stepper status={order.status} />
      </div>
      {order.rider_id && order.status !== "delivered" && (
        <MapView rider={rider.location} target={beforePickup ? order.store : order.drop} store={order.store} drop={order.drop} />
      )}
    </div>
  );
}
