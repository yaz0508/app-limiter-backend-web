import { useEffect, useState } from "react";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getOverrideRequests,
  updateOverrideRequest,
  getDevices,
} from "../lib/api";
import { Device, OverrideRequest, OverrideStatus } from "../types";

const OverrideRequests = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<OverrideRequest[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const resp = await getDevices(token);
        setDevices(resp.devices);
        loadRequests();
      } catch (err) {
        showToast((err as Error).message, "error");
      }
    };
    init();
  }, [token]);

  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const filters: any = {};
      if (filterDevice !== "all") filters.deviceId = filterDevice;
      if (filterStatus !== "all") filters.status = filterStatus as OverrideStatus;
      const resp = await getOverrideRequests(token, filters);
      setRequests(resp.requests);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterDevice, filterStatus]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    if (!confirm("Approve this override request?")) return;
    try {
      await updateOverrideRequest(token, id, { status: OverrideStatus.APPROVED });
      showToast("Override request approved", "success");
      loadRequests();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleDeny = async (id: string) => {
    if (!token) return;
    if (!confirm("Deny this override request?")) return;
    try {
      await updateOverrideRequest(token, id, { status: OverrideStatus.DENIED });
      showToast("Override request denied", "success");
      loadRequests();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const getStatusBadge = (status: OverrideStatus) => {
    const colors = {
      PENDING: "bg-yellow-50 text-yellow-700",
      APPROVED: "bg-green-50 text-green-700",
      DENIED: "bg-red-50 text-red-700",
      EXPIRED: "bg-slate-50 text-slate-700",
    };
    return (
      <span className={`rounded px-2 py-1 text-xs font-semibold ${colors[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Override Requests</h1>
        <div className="flex gap-2">
          <select
            value={filterDevice}
            onChange={(e) => setFilterDevice(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="all">All Devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-center text-slate-500">Loading...</div>}

      <Table
        headers={["App", "Device", "Requested", "Reason", "Status", "Requested At", "Actions"]}
        rows={requests.map((req) => [
          <div key="app">
            <div className="font-semibold">{req.app.name}</div>
            <div className="text-xs text-slate-500">{req.app.packageName}</div>
          </div>,
          req.device.name,
          `${req.requestedMinutes} minutes`,
          req.reason || "—",
          getStatusBadge(req.status),
          new Date(req.createdAt).toLocaleString(),
          <div key="actions" className="flex gap-2">
            {req.status === OverrideStatus.PENDING && (
              <>
                <button
                  className="text-sm text-green-600 hover:underline"
                  onClick={() => handleApprove(req.id)}
                >
                  Approve
                </button>
                <button
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => handleDeny(req.id)}
                >
                  Deny
                </button>
              </>
            )}
            {req.status === OverrideStatus.APPROVED && req.expiresAt && (
              <div className="text-xs text-slate-500">
                Expires: {new Date(req.expiresAt).toLocaleString()}
              </div>
            )}
          </div>,
        ])}
        emptyMessage="No override requests found"
      />
    </div>
  );
};

export default OverrideRequests;

