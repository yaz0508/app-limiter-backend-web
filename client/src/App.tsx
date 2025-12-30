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
import Users from "./pages/Users";
import type { Role } from "./types";
import UserDetail from "./pages/UserDetail";
import SettingsHome from "./pages/SettingsHome";
import Sessions from "./pages/Sessions";
import Categories from "./pages/Categories";
import OverrideRequests from "./pages/OverrideRequests";
import Goals from "./pages/Goals";

const App = () => {
  const { user } = useAuth();

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path="/login"
          element={!user || user.role !== "ADMIN" ? <Login /> : <Navigate to="/" replace />}
        />
        <Route element={<ProtectedRoute allowed={["ADMIN" as Role]} />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="devices" element={<Devices />} />
            <Route path="limits" element={<AppLimits />} />
            <Route path="usage" element={<UsageAnalytics />} />
            <Route path="categories" element={<Categories />} />
            <Route path="overrides" element={<OverrideRequests />} />
            <Route path="goals" element={<Goals />} />
            <Route path="settings" element={<SettingsHome />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </>
    )
  );

  return <RouterProvider router={router} />;
};

export default App;


