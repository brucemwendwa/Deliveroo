import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./routes/AppLayout";
import LandingPage from "./routes/LandingPage";
import BookPage from "./routes/BookPage";
import Confirmation from "./routes/Confirmation";
import TrackLookup from "./routes/TrackLookup";
import TrackOrder from "./routes/TrackOrder";
import OrderDetails from "./routes/OrderDetails";
import MyOrders from "./routes/MyOrders";
import AdminPortal from "./routes/admin/AdminPortal";
import AdminOverview from "./routes/admin/AdminOverview";
import AdminDeliveries from "./routes/admin/AdminDeliveries";
import AdminCouriers from "./routes/admin/AdminCouriers";
import AdminCapacity from "./routes/admin/AdminCapacity";
import AdminAccounts from "./routes/admin/AdminAccounts";
import AdminReports from "./routes/admin/AdminReports";
import AdminNotifications from "./routes/admin/AdminNotifications";
import AdminAudit from "./routes/admin/AdminAudit";
import AdminSettings from "./routes/admin/AdminSettings";
import NotFound from "./routes/NotFound";

/** Split out so tests can mount the same route table inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/book" element={<BookPage />} />
        <Route path="/track" element={<TrackLookup />} />
        <Route path="/track/:id" element={<TrackOrder />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route path="/orders/:id/confirmation" element={<Confirmation />} />
        {/* §27 — the admin portal: one gated shell, one section per job. */}
        <Route path="/admin" element={<AdminPortal />}>
          <Route index element={<AdminOverview />} />
          <Route path="deliveries" element={<AdminDeliveries />} />
          <Route path="couriers" element={<AdminCouriers />} />
          <Route path="capacity" element={<AdminCapacity />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
