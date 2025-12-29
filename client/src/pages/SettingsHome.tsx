import { Link } from "react-router-dom";

const cards = [
  { to: "/devices", title: "Devices", desc: "Manage student devices and assignments" },
  { to: "/limits", title: "App Limits", desc: "Set daily app limits (max 5 hours)" },
  { to: "/users", title: "Users", desc: "Manage accounts" },
];

const SettingsHome = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Settings</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow"
          >
            <div className="text-base font-semibold text-slate-900">{c.title}</div>
            <div className="mt-1 text-sm text-slate-600">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SettingsHome;


