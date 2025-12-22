import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { createDevice, getDevices } from "../lib/api";
import { Device } from "../types";

const Devices = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState({ name: "", os: "", deviceIdentifier: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDevices = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp = await getDevices(token);
      setDevices(resp.devices);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await createDevice(token, form);
      setForm({ name: "", os: "", deviceIdentifier: "" });
      await loadDevices();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Devices</h1>
      </div>

      {/* Info banner about automatic registration */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 shrink-0 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">Automatic Device Registration</h3>
            <p className="mt-1 text-sm text-blue-800">
              Devices are automatically registered when users log in or register on the Android app.
              The manual form below is for admin use only (e.g., testing or edge cases).
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table
            headers={["Name", "User", "Identifier", "OS"]}
            rows={devices.map((d) => [
              d.name,
              d.user ? (
                <Link
                  key="user"
                  to={`/users/${d.userId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {d.user.name}
                </Link>
              ) : (
                <span key="user" className="text-sm text-slate-500">
                  Unknown
                </span>
              ),
              <span className="font-mono text-xs" key="id">
                {d.deviceIdentifier}
              </span>,
              d.os ?? "—",
            ])}
            emptyMessage={loading ? "Loading..." : "No devices registered yet"}
          />
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Manually Add Device</h2>
          <p className="mt-1 text-sm text-slate-500">
            Admin only: Manually register a device for testing or edge cases. Devices are normally
            registered automatically when users log in on the Android app.
          </p>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">OS</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.os}
                onChange={(e) => setForm({ ...form, os: e.target.value })}
                placeholder="iOS / Android"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Device Identifier</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.deviceIdentifier}
                onChange={(e) => setForm({ ...form, deviceIdentifier: e.target.value })}
                required
              />
            </div>
            {error && <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <button className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
              Save device
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Devices;


