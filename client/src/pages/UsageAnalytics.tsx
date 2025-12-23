import { useEffect, useState } from "react";
import Table from "../components/Table";
import UsageChart from "../components/UsageChart";
import DateRangePicker from "../components/DateRangePicker";
import { useAuth } from "../context/AuthContext";
import { getCustomRangeUsage, getDailyUsage, getDevices, getWeeklyUsage } from "../lib/api";
import { DailyUsageSummary, Device, WeeklyUsageSummary } from "../types";

const UsageAnalytics = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [daily, setDaily] = useState<DailyUsageSummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        setError(null);
        const resp = await getDevices(token);
        setDevices(resp.devices);
        if (resp.devices.length > 0) {
          setSelectedDevice(resp.devices[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    const load = async () => {
      if (!token || !selectedDevice) return;
      setError(null);
      setLoading(true);
      try {
        const [d, w] = await Promise.all([
          getDailyUsage(token, selectedDevice),
          dateRange
            ? getCustomRangeUsage(token, selectedDevice, dateRange.start, dateRange.end)
            : getWeeklyUsage(token, selectedDevice),
        ]);
        setDaily(d);
        setWeekly(w);
      } catch (err) {
        setError((err as Error).message);
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, selectedDevice, dateRange]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Usage Analytics</h1>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm sm:w-auto"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            Reset to Weekly
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Today</h2>
              {daily && (
                <span className="text-xs text-slate-500">
                  {new Date(daily.date).toLocaleDateString()}
                </span>
              )}
            </div>
            {daily && daily.byApp.length > 0 ? (
              <>
                <div className="mb-2 text-sm text-slate-600">
                  Total: {Math.round(daily.totalSeconds / 60)} minutes
                </div>
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
              </>
            ) : (
              <div className="py-6 text-center text-slate-500">No usage reported today.</div>
            )}
          </div>

          <div className="rounded-lg border bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                {dateRange ? "Custom Range Trend" : "Weekly Trend"}
              </h2>
              {weekly && (
                <span className="text-xs text-slate-500">
                  {new Date(weekly.start).toLocaleDateString()} -{" "}
                  {new Date(weekly.end).toLocaleDateString()}
                </span>
              )}
            </div>
            {weekly && weekly.byApp.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-slate-600">
                  Total: {Math.round(weekly.totalSeconds / 60)} minutes across {weekly.byApp.length} apps
                </div>
                <UsageChart data={weekly.byApp.slice(0, 10)} />
              </>
            ) : (
              <div className="py-6 text-center text-slate-500">No usage yet.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UsageAnalytics;


