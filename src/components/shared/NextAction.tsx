import type { Order } from "../../types";
import { NEXT_LABEL, nextStatus, updateOrderStatus } from "../../services/orders";
import { RIDER_ID } from "../../services/tracking";

export default function NextAction({ order }: { order: Order }) {
  const next = nextStatus(order);
  if (!next) return null;
  return (
    <button className="btn" onClick={() => updateOrderStatus(order.id, next, RIDER_ID).catch((e) => alert(e.message))}>
      {NEXT_LABEL[next]}
    </button>
  );
}
