import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/sessions", label: "Sessions" },
  { to: "/usage", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

const NavBar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-lg shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-md">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div className="text-lg font-bold gradient-text sm:text-xl">FocusGuard admin-dashboard</div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden gap-1 text-sm font-medium md:flex">
          {links.map((link) => {
            const isActive = link.to === "/" 
              ? location.pathname === "/"
              : location.pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? "bg-primary-50 text-primary-700 font-semibold" 
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                }`}
                end={link.to === "/"}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary-600" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop User Info */}
        <div className="hidden items-center gap-3 text-sm md:flex">
          <div className="text-right">
            <div className="font-semibold text-text-primary">{user?.name}</div>
            <div className="text-xs text-text-secondary capitalize">{user?.role}</div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
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
        <div className="border-t border-border bg-white md:hidden">
          <nav className="flex flex-col px-4 py-3">
            {links.map((link) => {
              const isActive = link.to === "/" 
                ? location.pathname === "/"
                : location.pathname.startsWith(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-primary-50 text-primary-700 font-semibold" 
                      : "text-text-secondary hover:bg-surface-elevated"
                  }`}
                  end={link.to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              );
            })}
            <div className="mt-3 border-t border-border pt-3">
              <div className="px-3 py-2">
                <div className="font-semibold text-text-primary">{user?.name}</div>
                <div className="text-xs text-text-secondary capitalize">{user?.role}</div>
              </div>
              <button
                className="btn btn-secondary btn-sm mt-2 w-full"
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


