import type { OrderStatus } from "../../types";

const LABEL: Record<OrderStatus, string> = {
  placed: "Placed", accepted: "Accepted", packing: "Packing", ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up", on_the_way: "On the way", delivered: "Delivered", cancelled: "Cancelled",
};
const TONE: Record<OrderStatus, string> = {
  placed: "violet", accepted: "violet", packing: "violet", ready_for_pickup: "amber",
  picked_up: "amber", on_the_way: "amber", delivered: "green", cancelled: "red",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${TONE[status]}`}>{LABEL[status]}</span>;
}
