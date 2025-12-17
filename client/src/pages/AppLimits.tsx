import { FormEvent, useEffect, useState } from "react";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { deleteLimit, getDevices, getLimits, upsertLimit } from "../lib/api";
import { Device, Limit } from "../types";

const AppLimits = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [limits, setLimits] = useState<Limit[]>([]);
  const [form, setForm] = useState({ appPackage: "", appName: "", dailyLimitMinutes: 30 });
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
    const loadLimits = async () => {
      if (!token || !selectedDevice) return;
      const resp = await getLimits(token, selectedDevice);
      setLimits(resp.limits);
    };
    loadLimits().catch((err) => setError((err as Error).message));
  }, [token, selectedDevice]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDevice) return;
    setError(null);
    try {
      await upsertLimit(token, { ...form, deviceId: selectedDevice });
      setForm({ appPackage: "", appName: "", dailyLimitMinutes: 30 });
      const resp = await getLimits(token, selectedDevice);
      setLimits(resp.limits);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (deviceId: string, appId: string) => {
    if (!token) return;
    await deleteLimit(token, deviceId, appId);
    const resp = await getLimits(token, deviceId);
    setLimits(resp.limits);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">App Limits</h1>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table
            headers={["App", "Daily Limit (mins)", "Actions"]}
            rows={limits.map((limit) => [
              <div key="app">
                <div className="font-semibold">{limit.app.name}</div>
                <div className="text-xs text-slate-500">{limit.app.packageName}</div>
              </div>,
              `${limit.dailyLimitMinutes} mins`,
              <button
                key="delete"
                className="text-sm text-red-600 hover:underline"
                onClick={() => handleDelete(limit.deviceId, limit.appId)}
              >
                Remove
              </button>,
            ])}
            emptyMessage="No limits yet"
          />
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add / Update Limit</h2>
          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">App package</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.appPackage}
                onChange={(e) => setForm({ ...form, appPackage: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Display name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.appName}
                onChange={(e) => setForm({ ...form, appName: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Daily limit (minutes)</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.dailyLimitMinutes}
                onChange={(e) =>
                  setForm({ ...form, dailyLimitMinutes: Number(e.target.value) })
                }
                required
              />
            </div>
            <button className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
              Save limit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppLimits;


