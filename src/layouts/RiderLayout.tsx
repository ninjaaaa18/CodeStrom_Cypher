import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Bike, History, IndianRupee, LayoutDashboard, Navigation as NavIcon, Package } from "lucide-react";
import { useLive } from "../hooks/useLive";
import { getRider, startLocationSharing } from "../services/tracking";

const LINKS = [
  { to: "/rider", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/rider/orders", label: "Orders", icon: Package },
  { to: "/rider/navigation", label: "Navigate", icon: NavIcon },
  { to: "/rider/history", label: "History", icon: History },
  { to: "/rider/earnings", label: "Earnings", icon: IndianRupee },
];

export default function RiderLayout() {
  const rider = useLive(getRider);

  // Share the rider's GPS location with the customer for as long as they're online.
  useEffect(() => (rider.online ? startLocationSharing() : undefined), [rider.online]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><img src="/swiftora-logo.jpeg" alt="Swiftora" className="swiftora-logo" /> SWIFTORA <small>Rider</small></div>
        <nav>
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon size={18} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="profile">
          <div className="avatar light">{rider.name[0]}</div>
          <div><strong>{rider.name}</strong><span>{rider.online ? "Receiving orders" : "Not receiving orders"}</span></div>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
