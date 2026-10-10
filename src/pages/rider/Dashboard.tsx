import { Link } from "react-router-dom";
import { useLive } from "../../hooks/useLive";
import { getOffers, getOrders, isActive } from "../../services/orders";
import { RIDER_ID, getRider } from "../../services/tracking";
import { inr, isToday, weeklyEarnings } from "../../lib/format";
import EarningsChart from "../../components/shared/EarningsChart";
import OnlineToggle from "../../components/shared/OnlineToggle";
import OrderCard from "../../components/shared/OrderCard";
import OfferActions from "../../components/shared/OfferActions";

export default function Dashboard() {
  const rider = useLive(getRider);
  const orders = useLive(getOrders);
  const mine = orders.filter((o) => o.rider_id === RIDER_ID);
  const doneToday = mine.filter((o) => o.status === "delivered" && isToday(o.delivered_at));
  const active = mine.find((o) => isActive(o, RIDER_ID));
  const offers = rider.online ? getOffers(RIDER_ID) : [];
  const week = weeklyEarnings(mine);

  return (
    <>
      <header className="page-head">
        <div><h1>Hello, {rider.name}</h1><p className="muted">Here is your day at a glance.</p></div>
        <OnlineToggle />
      </header>

      <section className="stats">
        <div className="card stat accent"><span className="label">Earned today</span><b>{inr(doneToday.reduce((s, o) => s + o.payout, 0))}</b></div>
        <div className="card stat"><span className="label">Deliveries today</span><b>{doneToday.length}</b></div>
        <div className="card stat"><span className="label">Distance today</span><b>{doneToday.reduce((s, o) => s + o.distance_km, 0).toFixed(1)}<small> km</small></b></div>
        <div className="card stat"><span className="label">Active delivery</span><b>{active ? `#${active.id}` : "None"}</b></div>
      </section>

      <section className="grid-2">
        <div className="card">
          <h2>Earnings this week</h2>
          <p className="muted">Your payouts over the last 7 days</p>
          <div className="big-number">{inr(week.reduce((s, d) => s + d.value, 0))}<span className="label">last 7 days</span></div>
          <EarningsChart data={week} />
        </div>

        <div className="card">
          <h2>Incoming orders</h2>
          <p className="muted">{rider.online ? "Accept an order to start delivering." : "Go online to see new orders."}</p>
          {active && <p className="notice">You have an active delivery. <Link to="/rider/navigation">Open navigation</Link></p>}
          {offers.slice(0, 3).map((o) => (
            <OrderCard key={o.id} order={o}><OfferActions orderId={o.id} /></OrderCard>
          ))}
          {rider.online && offers.length === 0 && <p className="empty">No orders right now. New ones appear here instantly.</p>}
          <Link className="link" to="/rider/orders">See all orders</Link>
        </div>
      </section>

      <section className="banner">
        <div>
          <h2>Ready for the next ride?</h2>
          <p>Open the map for the fastest route to the store or your customer.</p>
          <Link className="btn" to="/rider/navigation">Open navigation</Link>
        </div>
      </section>
    </>
  );
}
