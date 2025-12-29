import { useEffect, useState } from "react";
import Table from "../components/Table";
import UsageChart from "../components/UsageChart";
import DateRangePicker from "../components/DateRangePicker";
import { useAuth } from "../context/AuthContext";
import { getCustomRangeUsage, getDailyUsage, getDevices, getWeeklyUsage, getUsageInsights } from "../lib/api";
import { DailyUsageSummary, Device, UsageInsight, WeeklyUsageSummary } from "../types";

const UsageAnalytics = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [daily, setDaily] = useState<DailyUsageSummary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyUsageSummary | null>(null);
  const [insights, setInsights] = useState<UsageInsight[]>([]);
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
        const [d, w, insightsResp] = await Promise.all([
          getDailyUsage(token, selectedDevice),
          dateRange
            ? getCustomRangeUsage(token, selectedDevice, dateRange.start, dateRange.end)
            : getWeeklyUsage(token, selectedDevice),
          getUsageInsights(token, selectedDevice, 30),
        ]);
        console.log("Daily summary:", d);
        console.log("Weekly summary:", w);
        setDaily(d);
        setWeekly(w);
        setInsights(insightsResp.insights);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        console.error("Error loading analytics:", err);
        // Clear data on error
        setDaily(null);
        setWeekly(null);
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // Real-time updates: refresh every 30 seconds
    const interval = setInterval(() => {
      if (token && selectedDevice && !dateRange) {
        load();
      }
    }, 30000);
    
    return () => clearInterval(interval);
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
            {daily ? (
              daily.byApp.length > 0 ? (
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
                <div className="py-6 text-center text-slate-500">
                  <p className="mb-2">No usage reported today.</p>
                  <p className="text-xs text-slate-400">
                    Usage data will appear here after apps with limits are used and synced to the server.
                  </p>
                </div>
              )
            ) : (
              <div className="py-6 text-center text-slate-500">Loading today's data...</div>
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
            {weekly ? (
              weekly.byApp.length > 0 ? (
                <>
                  <div className="mb-4 text-sm text-slate-600">
                    Total: {Math.round(weekly.totalSeconds / 60)} minutes across {weekly.byApp.length} apps
                  </div>
                  <UsageChart data={weekly.byApp.slice(0, 10)} />
                </>
              ) : (
                <div className="py-6 text-center text-slate-500">
                  <p className="mb-2">No usage data for this period.</p>
                  <p className="text-xs text-slate-400">
                    Usage data will appear here after apps with limits are used and synced to the server.
                  </p>
                </div>
              )
            ) : (
              <div className="py-6 text-center text-slate-500">Loading weekly data...</div>
            )}
          </div>

          {/* Usage Insights */}
          {insights.length > 0 && (
            <div className="rounded-lg border bg-white p-3 shadow-sm sm:p-4">
              <h2 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">Usage Insights</h2>
              <div className="space-y-3">
                {insights.map((insight, idx) => {
                  const severityColors = {
                    info: "bg-blue-50 border-blue-200 text-blue-800",
                    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
                    success: "bg-green-50 border-green-200 text-green-800",
                  };
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${severityColors[insight.severity]}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="font-semibold">{insight.title}</div>
                          <div className="mt-1 text-sm">{insight.description}</div>
                        </div>
                        <span className="rounded bg-white/50 px-2 py-1 text-xs font-medium">
                          {insight.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsageAnalytics;


