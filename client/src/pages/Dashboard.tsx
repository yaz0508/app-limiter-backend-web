import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import UsageChart from "../components/UsageChart";
import { useAuth } from "../context/AuthContext";
import { getDevices, getWeeklyUsage } from "../lib/api";
import { Device, WeeklyUsageSummary } from "../types";

const Dashboard = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [summary, setSummary] = useState<WeeklyUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      if (!token) return;
      const resp = await getDevices(token);
      setDevices(resp.devices);
      if (resp.devices.length > 0) {
        setSelectedDevice(resp.devices[0].id);
      }
    };
    fetchDevices().catch((err) => setError((err as Error).message));
  }, [token]);

  useEffect(() => {
    const loadUsage = async () => {
      if (!token || !selectedDevice) return;
      setLoading(true);
      setError(null);
      try {
        const weekly = await getWeeklyUsage(token, selectedDevice);
        setSummary(weekly);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadUsage();
  }, [token, selectedDevice]);

  const totalMinutes = useMemo(() => {
    if (!summary) return 0;
    return Math.round(summary.totalSeconds / 60);
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.deviceIdentifier})
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Weekly total" value={`${totalMinutes} mins`} />
        <StatCard
          label="Tracked apps"
          value={`${summary?.byApp.length ?? 0}`}
          helper="Apps reported in the selected window"
        />
        <StatCard
          label="Sessions"
          value={`${summary?.byApp.reduce((acc, item) => acc + item.sessions, 0) ?? 0}`}
        />
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Weekly Usage</h2>
          {summary && (
            <span className="text-xs text-slate-500">
              {new Date(summary.start).toLocaleDateString()} -{" "}
              {new Date(summary.end).toLocaleDateString()}
            </span>
          )}
        </div>
        {loading && <div className="py-10 text-center text-slate-500">Loading usage...</div>}
        {!loading && summary && summary.byApp.length > 0 && (
          <UsageChart data={summary.byApp.slice(0, 8)} />
        )}
        {!loading && summary && summary.byApp.length === 0 && (
          <div className="py-10 text-center text-slate-500">No usage reported yet.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;


