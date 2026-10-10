import { Navigate, Route, Routes } from "react-router-dom";
import RiderLayout from "./layouts/RiderLayout";
import Dashboard from "./pages/rider/Dashboard";
import Orders from "./pages/rider/Orders";
import Navigation from "./pages/rider/Navigation";
import History from "./pages/rider/History";
import Earnings from "./pages/rider/Earnings";
import Tracking from "./pages/customer/Tracking";

// When merging with the team repo, keep these /rider routes and add the others next to them.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/rider" replace />} />
      <Route path="/rider" element={<RiderLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="navigation" element={<Navigation />} />
        <Route path="history" element={<History />} />
        <Route path="earnings" element={<Earnings />} />
      </Route>
      <Route path="/track/:orderId" element={<Tracking />} />
    </Routes>
  );
}
