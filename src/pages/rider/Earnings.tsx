import { useLive } from "../../hooks/useLive";
import { getOrders } from "../../services/orders";
import { RIDER_ID } from "../../services/tracking";
import { inr, isToday, weeklyEarnings } from "../../lib/format";
import EarningsChart from "../../components/shared/EarningsChart";

export default function Earnings() {
  const done = useLive(getOrders).filter((o) => o.rider_id === RIDER_ID && o.status === "delivered");
  const week = weeklyEarnings(done);
  const total = done.reduce((s, o) => s + o.payout, 0);
  const today = done.filter((o) => isToday(o.delivered_at)).reduce((s, o) => s + o.payout, 0);
  const weekTotal = week.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <header className="page-head"><div><h1>Earnings</h1><p className="muted">What you have earned from deliveries.</p></div></header>
      <section className="stats">
        <div className="card stat accent"><span className="label">Today</span><b>{inr(today)}</b></div>
        <div className="card stat"><span className="label">Last 7 days</span><b>{inr(weekTotal)}</b></div>
        <div className="card stat"><span className="label">Deliveries</span><b>{done.length}</b></div>
        <div className="card stat"><span className="label">Average per delivery</span><b>{inr(done.length ? total / done.length : 0)}</b></div>
      </section>
      <div className="card"><h2>Daily earnings</h2><EarningsChart data={week} /></div>
      <div className="card">
        <h2>Daily breakdown</h2>
        {week.slice().reverse().map((d, i) => (
          <div className="line-item" key={i}><span>{d.label}</span><strong>{inr(d.value)}</strong></div>
        ))}
      </div>
    </>
  );
}
