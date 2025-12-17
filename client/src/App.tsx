import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import AppLimits from "./pages/AppLimits";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import UsageAnalytics from "./pages/UsageAnalytics";

const App = () => {
  const { user } = useAuth();

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="devices" element={<Devices />} />
            <Route path="limits" element={<AppLimits />} />
            <Route path="usage" element={<UsageAnalytics />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </>
    )
  );

  return <RouterProvider router={router} />;
};

export default App;


