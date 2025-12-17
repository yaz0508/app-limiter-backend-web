import { FormEvent, useEffect, useState } from "react";
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
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table
            headers={["Name", "Identifier", "OS"]}
            rows={devices.map((d) => [
              d.name,
              <span className="font-mono text-xs" key="id">
                {d.deviceIdentifier}
              </span>,
              d.os ?? "—",
            ])}
            emptyMessage={loading ? "Loading..." : "No devices yet"}
          />
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add device</h2>
          <p className="text-sm text-slate-500">
            Register a device identifier to bind usage logs.
          </p>
          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
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


