import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-elevated via-surface to-surface-elevated">
      <NavBar />
      <main className="pb-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;


