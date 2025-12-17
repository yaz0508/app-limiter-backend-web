import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;


