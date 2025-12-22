import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;


