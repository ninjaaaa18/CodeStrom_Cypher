import { acceptOrder, rejectOrder } from "../../services/orders";
import { RIDER_ID } from "../../services/tracking";

export default function OfferActions({ orderId }: { orderId: string }) {
  return (
    <div className="actions">
      <button className="btn ghost" onClick={() => rejectOrder(orderId, RIDER_ID)}>Reject</button>
      <button className="btn" onClick={() => acceptOrder(orderId, RIDER_ID).catch((e) => alert(e.message))}>Accept</button>
    </div>
  );
}
