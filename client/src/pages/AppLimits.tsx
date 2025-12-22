import { FormEvent, useEffect, useState } from "react";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { deleteLimit, getDevices, getDeviceApps, getLimits, upsertLimit } from "../lib/api";
import { App, Device, Limit } from "../types";

const AppLimits = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [limits, setLimits] = useState<Limit[]>([]);
  const [deviceApps, setDeviceApps] = useState<App[]>([]);
  const [form, setForm] = useState({ appPackage: "", appName: "", dailyLimitMinutes: 30 });
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

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
      try {
        const [limitsResp, appsResp] = await Promise.all([
          getLimits(token, selectedDevice),
          getDeviceApps(token, selectedDevice),
        ]);
        setLimits(limitsResp.limits);
        setDeviceApps(appsResp.apps);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    loadLimits();
  }, [token, selectedDevice]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDevice) return;
    setError(null);
    try {
      await upsertLimit(token, { ...form, deviceId: selectedDevice });
      setForm({ appPackage: "", appName: "", dailyLimitMinutes: 30 });
      setShowManualEntry(false);
      const [limitsResp, appsResp] = await Promise.all([
        getLimits(token, selectedDevice),
        getDeviceApps(token, selectedDevice),
      ]);
      setLimits(limitsResp.limits);
      setDeviceApps(appsResp.apps);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAppSelect = (app: App) => {
    setForm({
      appPackage: app.packageName,
      appName: app.name,
      dailyLimitMinutes: 30,
    });
    setShowManualEntry(false);
  };

  const handleDelete = async (deviceId: string, appId: string) => {
    if (!token) return;
    await deleteLimit(token, deviceId, appId);
    const resp = await getLimits(token, deviceId);
    setLimits(resp.limits);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">App Limits</h1>
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

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="order-2 lg:order-1 lg:col-span-2">
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
        <div className="order-1 rounded-lg border bg-white p-4 shadow-sm lg:order-2">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Add / Update Limit</h2>
          
          {!showManualEntry && deviceApps.length > 0 && (
            <div className="mt-3 space-y-2">
              <label className="text-sm font-medium text-slate-700">Select from apps used on device</label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
                {deviceApps.map((app) => {
                  const existingLimit = limits.find((l) => l.appId === app.id);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleAppSelect(app)}
                      className="w-full rounded border border-slate-200 bg-white p-2 text-left text-sm hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">{app.name}</div>
                      <div className="text-xs text-slate-500">{app.packageName}</div>
                      {existingLimit && (
                        <div className="mt-1 text-xs text-primary">
                          Current limit: {existingLimit.dailyLimitMinutes} mins
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowManualEntry(true)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Or enter manually
              </button>
            </div>
          )}

          {(showManualEntry || deviceApps.length === 0) && (
            <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
              {deviceApps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowManualEntry(false)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  ← Select from apps used on device
                </button>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700">App package</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={form.appPackage}
                  onChange={(e) => setForm({ ...form, appPackage: e.target.value })}
                  placeholder="com.example.app"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Display name</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={form.appName}
                  onChange={(e) => setForm({ ...form, appName: e.target.value })}
                  placeholder="App Name (optional, will use package name if not provided)"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AppLimits;


