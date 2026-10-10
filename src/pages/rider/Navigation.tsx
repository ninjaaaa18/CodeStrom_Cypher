import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLive } from "../../hooks/useLive";
import { getOrders, isActive } from "../../services/orders";
import { RIDER_ID, getRider, simulateMove } from "../../services/tracking";
import MapView, { type RouteInfo } from "../../components/shared/MapView";
import NextAction from "../../components/shared/NextAction";
import Stepper from "../../components/shared/Stepper";
import StatusBadge from "../../components/shared/StatusBadge";

export default function Navigation() {
  const rider = useLive(getRider);
  const order = useLive(getOrders).find((o) => isActive(o, RIDER_ID));
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [simulating, setSimulating] = useState(false);
  const stopSim = useRef<(() => void) | null>(null);
  useEffect(() => () => stopSim.current?.(), []);

  if (!order) {
    return (
      <div className="card"><h2>Navigation</h2>
        <p className="empty">No active delivery to navigate. <Link to="/rider/orders">Find an order</Link></p></div>
    );
  }

  const toStore = ["placed", "accepted", "packing", "ready_for_pickup"].includes(order.status);
  const target = toStore ? order.store : order.drop;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`;

  const toggleSim = () => {
    if (simulating) { stopSim.current?.(); setSimulating(false); return; }
    setSimulating(true);
    const stop = simulateMove(target);
    stopSim.current = () => { stop(); setSimulating(false); };
    setTimeout(() => setSimulating(false), 31000);
  };

  return (
    <>
      <header className="page-head"><div><h1>Navigation</h1><p className="muted">{toStore ? "Heading to the store" : "Heading to the customer"}</p></div></header>
      <section className="grid-2 nav-grid">
        <MapView rider={rider.location} target={target} store={order.store} drop={order.drop} onRoute={setRoute} />
        <div className="card">
          <h2>#{order.id} <StatusBadge status={order.status} /></h2>
          <p><strong>{target.name === "Home" ? order.customer_name : target.name}</strong></p>
          <p className="muted">{target.address}</p>
          <div className="route-info">
            <div><span className="label">Distance</span><b>{route?.distance ?? "…"}</b></div>
            <div><span className="label">Time</span><b>{route?.duration ?? "…"}</b></div>
          </div>
          <Stepper status={order.status} />
          <p className="notice">Your location is shared live with the customer.</p>
          <div className="actions left wrap">
            <NextAction order={order} />
            <a className="btn ghost" href={mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>
            <button className="btn ghost" onClick={toggleSim}>{simulating ? "Stop demo ride" : "Start demo ride"}</button>
          </div>
        </div>
      </section>
    </>
  );
}
