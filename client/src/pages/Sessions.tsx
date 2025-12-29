import { FormEvent, useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import {
  createSession,
  deleteSession,
  getActiveSession,
  getDevices,
  getDeviceApps,
  getSessions,
  startSession,
  stopSession,
  updateSession,
} from "../lib/api";
import type { App, Device, FocusSession } from "../types";

type FormState = {
  name: string;
  durationMinutes: number;
  selectedPackages: Set<string>;
};

const Sessions = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeEndsAt, setActiveEndsAt] = useState<string | null>(null);

  const [deviceApps, setDeviceApps] = useState<App[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    durationMinutes: 60,
    selectedPackages: new Set(),
  });

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      const resp = await getDevices(token);
      setDevices(resp.devices);
      if (resp.devices.length > 0) setSelectedDevice(resp.devices[0].id);
    };
    init().catch((err) => setError((err as Error).message));
  }, [token]);

  const reload = async (deviceId: string) => {
    if (!token || !deviceId) return;
    setError(null);
    const [sResp, aResp, appsResp] = await Promise.all([
      getSessions(token, deviceId),
      getActiveSession(token, deviceId),
      getDeviceApps(token, deviceId),
    ]);
    setSessions(sResp.sessions);
    setActiveSessionId(aResp.active?.sessionId ?? null);
    setActiveEndsAt(aResp.active?.endsAt ?? null);
    setDeviceApps(appsResp.apps);
  };

  useEffect(() => {
    if (!token || !selectedDevice) return;
    reload(selectedDevice).catch((err) => setError((err as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedDevice]);

  const selectedApps = useMemo(() => {
    const set = form.selectedPackages;
    return deviceApps.filter((a) => set.has(a.packageName));
  }, [deviceApps, form.selectedPackages]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", durationMinutes: 60, selectedPackages: new Set() });
  };

  const beginEdit = (session: FocusSession) => {
    setEditingId(session.id);
    setForm({
      name: session.name,
      durationMinutes: session.durationMinutes,
      selectedPackages: new Set(session.apps.map((a) => a.packageName)),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePackage = (pkg: string) => {
    setForm((prev) => {
      const next = new Set(prev.selectedPackages);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return { ...prev, selectedPackages: next };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDevice) return;
    setError(null);
    if (!form.name.trim()) return setError("Session name is required");
    if (form.selectedPackages.size === 0) return setError("Select at least one app to block");

    const appsPayload = deviceApps
      .filter((a) => form.selectedPackages.has(a.packageName))
      .map((a) => ({ packageName: a.packageName, appName: a.name }));

    try {
      setBusy(true);
      if (editingId) {
        await updateSession(token, editingId, {
          name: form.name.trim(),
          durationMinutes: form.durationMinutes,
          apps: appsPayload,
        });
      } else {
        await createSession(token, {
          deviceId: selectedDevice,
          name: form.name.trim(),
          durationMinutes: form.durationMinutes,
          apps: appsPayload,
        });
      }
      await reload(selectedDevice);
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm("Delete this session?")) return;
    setError(null);
    try {
      setBusy(true);
      await deleteSession(token, id);
      await reload(selectedDevice);
      if (editingId === id) resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async (id: string) => {
    if (!token) return;
    setError(null);
    try {
      setBusy(true);
      await startSession(token, selectedDevice, id);
      await reload(selectedDevice);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (!token) return;
    setError(null);
    try {
      setBusy(true);
      await stopSession(token, selectedDevice);
      await reload(selectedDevice);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Sessions</h1>
          <div className="text-sm text-slate-600">
            Create sessions like Studying/Resting and block selected apps while the session runs.
          </div>
        </div>

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

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Active session</div>
            {activeSessionId ? (
              <div className="text-sm text-slate-600">
                Running • ends at <span className="font-medium">{activeEndsAt ? new Date(activeEndsAt).toLocaleTimeString() : "—"}</span>
              </div>
            ) : (
              <div className="text-sm text-slate-600">None</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => reload(selectedDevice)}
              disabled={!selectedDevice || busy}
            >
              Refresh
            </button>
            <button
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              onClick={handleStop}
              disabled={!activeSessionId || busy}
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="order-2 lg:order-1 lg:col-span-2">
          <Table
            headers={["Session", "Apps blocked", "Duration", "Actions"]}
            rows={sessions.map((s) => {
              const isActive = activeSessionId === s.id;
              return [
                <div key="name">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-500">{isActive ? "ACTIVE" : ""}</div>
                </div>,
                `${s.apps.length}`,
                `${s.durationMinutes} min`,
                <div key="actions" className="flex flex-wrap gap-2">
                  {!isActive ? (
                    <button
                      className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                      onClick={() => handleStart(s.id)}
                      disabled={busy}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      onClick={handleStop}
                      disabled={busy}
                    >
                      Stop
                    </button>
                  )}
                  <button
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    onClick={() => beginEdit(s)}
                    disabled={busy}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    onClick={() => handleDelete(s.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>,
              ];
            })}
            emptyMessage="No sessions yet"
          />
        </div>

        <div className="order-1 rounded-lg border bg-white p-4 shadow-sm lg:order-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {editingId ? "Edit session" : "Create session"}
            </h2>
            {editingId && (
              <button className="text-sm text-slate-600 hover:underline" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>

          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Session name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Studying"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Duration (minutes)</label>
              <input
                type="number"
                min={5}
                max={360}
                step={5}
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-slate-500">5–360 minutes (matches Android defaults)</p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Apps to block</label>
                <div className="text-xs text-slate-500">{selectedApps.length} selected</div>
              </div>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded border p-2">
                {deviceApps.map((app) => {
                  const checked = form.selectedPackages.has(app.packageName);
                  return (
                    <label key={app.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePackage(app.packageName)}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{app.name}</div>
                        <div className="truncate text-xs text-slate-500">{app.packageName}</div>
                      </div>
                    </label>
                  );
                })}
                {deviceApps.length === 0 && (
                  <div className="text-sm text-slate-600">No apps found for this device yet.</div>
                )}
              </div>
            </div>

            <button
              className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
              disabled={busy || !selectedDevice}
            >
              {busy ? "Saving..." : editingId ? "Save changes" : "Create session"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Sessions;


