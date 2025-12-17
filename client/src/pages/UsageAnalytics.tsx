import { useEffect, useState } from "react";
import Table from "../components/Table";
import UsageChart from "../components/UsageChart";
import { useAuth } from "../context/AuthContext";
import { getDailyUsage, getDevices, getWeeklyUsage } from "../lib/api";
import { DailyUsageSummary, Device, WeeklyUsageSummary } from "../types";

const UsageAnalytics = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [daily, setDaily] = useState<DailyUsageSummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      const resp = await getDevices(token);
      setDevices(resp.devices);
      if (resp.devices.length > 0) {
        setSelectedDevice(resp.devices[0].id);
      }
    };
    init().catch((err) => setError((err as Error).message));
  }, [token]);

  useEffect(() => {
    const load = async () => {
      if (!token || !selectedDevice) return;
      setError(null);
      try {
        const [d, w] = await Promise.all([
          getDailyUsage(token, selectedDevice),
          getWeeklyUsage(token, selectedDevice),
        ]);
        setDaily(d);
        setWeekly(w);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, [token, selectedDevice]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Usage Analytics</h1>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Today</h2>
          {daily && (
            <span className="text-xs text-slate-500">
              {new Date(daily.date).toLocaleDateString()}
            </span>
          )}
        </div>
        {daily && daily.byApp.length > 0 ? (
          <Table
            headers={["App", "Minutes", "Sessions"]}
            rows={daily.byApp.map((item) => [
              <div key="app">
                <div className="font-semibold">{item.appName}</div>
                <div className="text-xs text-slate-500">{item.packageName}</div>
              </div>,
              `${item.totalMinutes.toFixed(1)} mins`,
              item.sessions,
            ])}
            emptyMessage="No data yet"
          />
        ) : (
          <div className="py-6 text-center text-slate-500">No usage reported today.</div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Weekly trend</h2>
          {weekly && (
            <span className="text-xs text-slate-500">
              {new Date(weekly.start).toLocaleDateString()} -{" "}
              {new Date(weekly.end).toLocaleDateString()}
            </span>
          )}
        </div>
        {weekly && weekly.byApp.length > 0 ? (
          <UsageChart data={weekly.byApp.slice(0, 10)} />
        ) : (
          <div className="py-6 text-center text-slate-500">No usage yet.</div>
        )}
      </div>
    </div>
  );
};

export default UsageAnalytics;


