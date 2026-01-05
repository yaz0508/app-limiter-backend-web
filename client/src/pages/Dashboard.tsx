import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import UsageChart from "../components/UsageChart";
import TrendChart from "../components/TrendChart";
import DateRangePicker from "../components/DateRangePicker";
import { useAuth } from "../context/AuthContext";
import { getAggregatedCustomRangeUsage, getAggregatedDailySeries, getAggregatedWeeklyUsage, getDevices } from "../lib/api";
import { Device, WeeklyUsageSummary } from "../types";
import { exportUsageToCSV } from "../utils/export";
import { useToast } from "../context/ToastContext";

const Dashboard = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [summary, setSummary] = useState<WeeklyUsageSummary | null>(null);
  const [series, setSeries] = useState<Array<{ date: string; totalMinutes: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      if (!token) return;
      try {
        const resp = await getDevices(token);
        setDevices(resp.devices);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    fetchDevices();
  }, [token]);

  useEffect(() => {
    const loadUsage = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        // Use aggregated endpoints - data across all devices
        let weekly: WeeklyUsageSummary;
        if (dateRange) {
          weekly = await getAggregatedCustomRangeUsage(token, dateRange.start, dateRange.end);
        } else {
          weekly = await getAggregatedWeeklyUsage(token);
        }
        setSummary(weekly);

        // Trend (daily series) - last 30 days aggregated across all devices
        const daily = await getAggregatedDailySeries(token, 30);
        setSeries(daily.series.map((p) => ({ date: p.date, totalMinutes: p.totalMinutes })));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadUsage();
    
    // Real-time updates: refresh every 30 seconds
    const interval = setInterval(() => {
      if (token && !dateRange) {
        loadUsage();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [token, dateRange]);

  const totalMinutes = useMemo(() => {
    if (!summary) return 0;
    return Math.round(summary.totalSeconds / 60);
  }, [summary]);


  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Overall Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">Aggregated usage across all {devices.length} device{devices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <DateRangePicker
              onRangeChange={(start, end) => setDateRange({ start, end })}
              defaultStart={dateRange?.start}
              defaultEnd={dateRange?.end}
            />
            {dateRange && (
              <button
                onClick={() => setDateRange(null)}
                className="btn btn-secondary btn-sm"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label={dateRange ? "Total Usage" : "Weekly Total"} 
          value={`${totalMinutes} mins`}
          helper={dateRange ? `Across all ${devices.length} device${devices.length !== 1 ? 's' : ''}` : `Across all ${devices.length} device${devices.length !== 1 ? 's' : ''}`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Devices"
          value={`${devices.length}`}
          helper="Devices registered in the system"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Tracked Apps"
          value={`${summary?.byApp.length ?? 0}`}
          helper="Unique apps across all devices"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Sessions"
          value={`${summary?.byApp.reduce((acc, item) => acc + item.sessions, 0) ?? 0}`}
          helper="App sessions across all devices"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Trend Chart Card */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">30-Day Trend</h2>
            <p className="mt-1 text-xs text-text-secondary">Usage patterns over time</p>
          </div>
          <span className="badge badge-primary">PH Timezone</span>
        </div>
        {loading && <div className="py-16 text-center text-text-tertiary">Loading trend…</div>}
        {!loading && series.length > 0 && <TrendChart data={series} />}
        {!loading && series.length === 0 && (
          <div className="py-16 text-center text-text-tertiary">No trend data yet.</div>
        )}
      </div>

      {/* Usage Chart Card */}
      <div className="card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              {dateRange ? "Custom Range Usage" : "Weekly Usage"}
            </h2>
            {summary && (
              <p className="mt-1 text-xs text-text-secondary">
                {new Date(summary.start).toLocaleDateString()} -{" "}
                {new Date(summary.end).toLocaleDateString()}
              </p>
            )}
          </div>
          {summary && summary.byApp.length > 0 && (
            <button
              onClick={() => {
                exportUsageToCSV(summary);
                showToast("Usage data exported to CSV", "success");
              }}
              className="btn btn-secondary btn-sm"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          )}
        </div>
        {loading && <div className="py-16 text-center text-text-tertiary">Loading usage...</div>}
        {!loading && summary && summary.byApp.length > 0 && (
          <UsageChart data={summary.byApp.slice(0, 8)} />
        )}
        {!loading && summary && summary.byApp.length === 0 && (
          <div className="py-16 text-center text-text-tertiary">No usage reported yet.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;


