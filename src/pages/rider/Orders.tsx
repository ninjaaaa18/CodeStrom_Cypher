import { Link } from "react-router-dom";
import { useLive } from "../../hooks/useLive";
import { getOffers, getOrders, isActive, resetDemoData } from "../../services/orders";
import { RIDER_ID, getRider } from "../../services/tracking";
import OrderCard from "../../components/shared/OrderCard";
import OfferActions from "../../components/shared/OfferActions";
import NextAction from "../../components/shared/NextAction";
import Stepper from "../../components/shared/Stepper";

export default function Orders() {
  const rider = useLive(getRider);
  const orders = useLive(getOrders);
  const active = orders.find((o) => isActive(o, RIDER_ID));
  const offers = rider.online ? getOffers(RIDER_ID) : [];

  return (
    <>
      <header className="page-head"><div><h1>Orders</h1><p className="muted">Your active delivery and new offers.</p></div></header>

      <div className="card">
        <h2>Active delivery</h2>
        {active ? (
          <>
            <OrderCard order={active}><NextAction order={active} /></OrderCard>
            <Stepper status={active.status} />
            <div className="actions left">
              <Link className="btn ghost" to="/rider/navigation">Open navigation</Link>
              <Link className="btn ghost" to={`/track/${active.id}`} target="_blank">Customer tracking link</Link>
            </div>
          </>
        ) : <p className="empty">No active delivery. Accept an offer below.</p>}
      </div>

      <div className="card">
        <h2>Available orders</h2>
        {!rider.online && <p className="empty">You are offline. Switch to online from the dashboard to see offers.</p>}
        {offers.map((o) => <OrderCard key={o.id} order={o}><OfferActions orderId={o.id} /></OrderCard>)}
        {rider.online && offers.length === 0 && <p className="empty">No offers right now.</p>}
      </div>
      <button className="btn ghost small" onClick={resetDemoData}>Reset demo data</button>
    </>
  );
}
