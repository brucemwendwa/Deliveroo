import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./routes/AppLayout";
import LandingPage from "./routes/LandingPage";
import BookPage from "./routes/BookPage";
import Confirmation from "./routes/Confirmation";
import TrackLookup from "./routes/TrackLookup";
import TrackOrder from "./routes/TrackOrder";
import OrderDetails from "./routes/OrderDetails";
import MyOrders from "./routes/MyOrders";
import AdminDashboard from "./routes/AdminDashboard";
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
        <Route path="/admin" element={<AdminDashboard />} />
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
