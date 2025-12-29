import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Home/Dashboard" },
  { to: "/sessions", label: "Sessions" },
  { to: "/usage", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

const NavBar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="text-base font-semibold text-primary sm:text-lg">Digital Wellbeing</div>
        
        {/* Desktop Navigation */}
        <nav className="hidden gap-4 text-sm font-medium text-slate-600 md:flex">
          {links.map((link) => {
            const isActive = link.to === "/" 
              ? location.pathname === "/"
              : location.pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`px-2 py-1 rounded ${isActive ? "text-primary" : "hover:text-primary"}`}
                end={link.to === "/"}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop User Info */}
        <div className="hidden items-center gap-3 text-sm md:flex">
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

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6 text-slate-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <nav className="flex flex-col px-4 py-3">
            {links.map((link) => {
              const isActive = link.to === "/" 
                ? location.pathname === "/"
                : location.pathname.startsWith(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                  }`}
                  end={link.to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              );
            })}
            <div className="mt-3 border-t pt-3">
              <div className="px-3 py-2">
                <div className="font-semibold text-slate-900">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.role}</div>
              </div>
              <button
                className="mt-2 w-full rounded bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default NavBar;


