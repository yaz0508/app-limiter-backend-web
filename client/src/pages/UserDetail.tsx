import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UsageChart from "../components/UsageChart";
import { useAuth } from "../context/AuthContext";
import { getDevices, getUsers, getWeeklyUsage } from "../lib/api";
import { Device, User, WeeklyUsageSummary } from "../types";

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [weekly, setWeekly] = useState<WeeklyUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);
      try {
        const [u, d] = await Promise.all([getUsers(token), getDevices(token)]);
        setUsers(u.users);
        const userDevices = d.devices.filter((dev) => dev.userId === id);
        setDevices(userDevices);
        if (userDevices.length > 0) setSelectedDeviceId(userDevices[0].id);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, id]);

  useEffect(() => {
    const loadUsage = async () => {
      if (!token || !selectedDeviceId) return;
      setError(null);
      try {
        const summary = await getWeeklyUsage(token, selectedDeviceId);
        setWeekly(summary);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    loadUsage();
  }, [token, selectedDeviceId]);

  const user = useMemo(() => users.find((u) => u.id === id) ?? null, [users, id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-slate-500">
            <Link to="/users" className="hover:underline">
              Users
            </Link>{" "}
            / {user?.name ?? "User"}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {user?.name ?? "User details"}
          </h1>
          {user && (
            <div className="text-sm text-slate-600">
              {user.email} • <span className="font-semibold">{user.role}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Device</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            disabled={devices.length === 0}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.deviceIdentifier})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div className="rounded-lg border bg-white p-6 text-slate-700 shadow-sm">
          No devices registered for this user yet.
        </div>
      )}

      {devices.length > 0 && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Weekly Usage</h2>
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
            <div className="py-10 text-center text-slate-500">
              No usage reported yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDetail;

