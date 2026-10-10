import type { OrderStatus } from "../../types";

const STEPS = ["Accepted", "Picked up", "On the way", "Delivered"];
const INDEX: Record<OrderStatus, number> = {
  placed: 0, accepted: 0, packing: 0, ready_for_pickup: 0, picked_up: 1, on_the_way: 2, delivered: 3, cancelled: 0,
};

export default function Stepper({ status }: { status: OrderStatus }) {
  const now = INDEX[status];
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => (
        <li key={s} className={i <= now ? "done" : ""}>
          <span className="dot" />
          {s}
        </li>
      ))}
    </ol>
  );
}
