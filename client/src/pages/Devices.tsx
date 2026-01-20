import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Table from "../components/Table";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createDevice, deleteDevice, getDevices, getUsers, updateDevice } from "../lib/api";
import { Device, User } from "../types";
import ReassignDeviceModal from "../components/ReassignDeviceModal";
import { exportDevicesToCSV } from "../utils/export";

const Devices = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", os: "", deviceIdentifier: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [osFilter, setOsFilter] = useState<string>("all");
  const [reassigningDevice, setReassigningDevice] = useState<Device | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  const loadDevices = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [d, u] = await Promise.all([getDevices(token), getUsers(token)]);
      setDevices(d.devices);
      setUsers(u.users);
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
      showToast("Device created successfully", "success");
      await loadDevices();
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleReassign = async (userId: string) => {
    if (!token || !reassigningDevice) return;
    await updateDevice(token, reassigningDevice.id, { userId });
    showToast("Device reassigned successfully", "success");
    await loadDevices();
  };

  const handleDelete = async () => {
    if (!token || !deletingDevice) return;
    try {
      await deleteDevice(token, deletingDevice.id);
      showToast("Device deleted successfully", "success");
      setDeletingDevice(null);
      await loadDevices();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const filteredDevices = useMemo(() => {
    let filtered = devices;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.deviceIdentifier.toLowerCase().includes(query) ||
          d.user?.name.toLowerCase().includes(query) ||
          d.user?.email.toLowerCase().includes(query)
      );
    }

    // OS filter
    if (osFilter !== "all") {
      filtered = filtered.filter((d) => (d.os || "").toLowerCase() === osFilter.toLowerCase());
    }

    return filtered;
  }, [devices, searchQuery, osFilter]);

  const formatLastSeen = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const isActive = (iso?: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() <= 24 * 60 * 60 * 1000;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Devices</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="text-sm text-slate-500">
            {loading ? "Loading..." : `${filteredDevices.length} of ${devices.length} devices`}
          </div>
          <button
            onClick={() => exportDevicesToCSV(filteredDevices)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-4"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name, identifier, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={osFilter}
          onChange={(e) => setOsFilter(e.target.value)}
          className="rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">All OS</option>
          <option value="Android">Android</option>
          <option value="iOS">iOS</option>
        </select>
        {(searchQuery || osFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setOsFilter("all");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
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

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="order-2 lg:order-1">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <Table
              headers={[
                "Name",
                "Status",
                "Last seen",
                "User",
                "Identifier",
                "OS",
                "",
              ]}
              rows={filteredDevices.map((d) => [
              d.name,
              <span
                key="status"
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  isActive(d.lastSeenAt) ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"
                }`}
              >
                {isActive(d.lastSeenAt) ? "Active" : "Inactive"}
              </span>,
              <span key="lastSeen" className="text-sm text-slate-600">
                {formatLastSeen(d.lastSeenAt)}
              </span>,
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
              <div key="actions" className="flex items-center gap-2">
                <button
                  onClick={() => setReassigningDevice(d)}
                  className="text-xs text-primary hover:underline"
                  title="Reassign device"
                >
                  Reassign
                </button>
                <button
                  onClick={() => setDeletingDevice(d)}
                  className="text-xs text-red-600 hover:underline"
                  title="Delete device"
                >
                  Delete
                </button>
              </div>,
            ])}
            emptyMessage={
              loading
                ? "Loading..."
                : searchQuery || osFilter !== "all"
                ? "No devices match your filters"
                : "No devices registered yet"
              }
            />
          )}
        </div>
        <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Manually Add Device</h2>
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

      {reassigningDevice && (
        <ReassignDeviceModal
          device={reassigningDevice}
          users={users}
          onClose={() => setReassigningDevice(null)}
          onSave={handleReassign}
        />
      )}

      {deletingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Delete Device</h2>
            <p className="mb-4 text-sm text-slate-600">
              Are you sure you want to delete device <strong>{deletingDevice.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingDevice(null)}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;


