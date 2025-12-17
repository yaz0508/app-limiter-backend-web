import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/devices", label: "Devices" },
  { to: "/limits", label: "App Limits" },
  { to: "/usage", label: "Usage" },
];

const NavBar = () => {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
      <div className="text-lg font-semibold text-primary">Digital Wellbeing</div>
      <nav className="flex gap-4 text-sm font-medium text-slate-600">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `px-2 py-1 rounded ${isActive ? "text-primary" : "hover:text-primary"}`
            }
            end={link.to === "/"}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <div className="text-right">
          <div className="font-semibold">{user?.name}</div>
          <div className="text-xs text-slate-500">{user?.role}</div>
        </div>
        <button
          className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default NavBar;


