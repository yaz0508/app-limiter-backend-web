import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import UsageChart from "../components/UsageChart";
import DateRangePicker from "../components/DateRangePicker";
import { useAuth } from "../context/AuthContext";
import { getCustomRangeUsage, getDevices, getWeeklyUsage } from "../lib/api";
import { Device, WeeklyUsageSummary } from "../types";
import { exportUsageToCSV } from "../utils/export";
import { useToast } from "../context/ToastContext";

const Dashboard = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [summary, setSummary] = useState<WeeklyUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

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
        let weekly: WeeklyUsageSummary;
        if (dateRange) {
          weekly = await getCustomRangeUsage(token, selectedDevice, dateRange.start, dateRange.end);
        } else {
          weekly = await getWeeklyUsage(token, selectedDevice);
        }
        setSummary(weekly);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadUsage();
    
    // Real-time updates: refresh every 30 seconds
    const interval = setInterval(() => {
      if (token && selectedDevice && !dateRange) {
        loadUsage();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [token, selectedDevice, dateRange]);

  const totalMinutes = useMemo(() => {
    if (!summary) return 0;
    return Math.round(summary.totalSeconds / 60);
  }, [summary]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Overview</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm sm:w-auto"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.deviceIdentifier})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <DateRangePicker
              onRangeChange={(start, end) => setDateRange({ start, end })}
              defaultStart={dateRange?.start}
              defaultEnd={dateRange?.end}
            />
            {dateRange && (
              <button
                onClick={() => setDateRange(null)}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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

      <div className="rounded-lg border bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {dateRange ? "Custom Range Usage" : "Weekly Usage"}
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {summary && (
              <span className="text-xs text-slate-500">
                {new Date(summary.start).toLocaleDateString()} -{" "}
                {new Date(summary.end).toLocaleDateString()}
              </span>
            )}
            {summary && summary.byApp.length > 0 && (
              <button
                onClick={() => {
                  exportUsageToCSV(summary);
                  showToast("Usage data exported to CSV", "success");
                }}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </button>
            )}
          </div>
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


