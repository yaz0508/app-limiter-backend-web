import { FormEvent, useEffect, useState } from "react";
import { Device, User } from "../types";

type Props = {
  device: Device;
  users: User[];
  onClose: () => void;
  onSave: (userId: string) => Promise<void>;
};

const ReassignDeviceModal = ({ device, users, onClose, onSave }: Props) => {
  const [selectedUserId, setSelectedUserId] = useState(device.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedUserId === device.userId) {
      onClose();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSave(selectedUserId);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Reassign Device</h2>
        <p className="mb-4 text-sm text-slate-600">
          Transfer device <strong>{device.name}</strong> to a different user.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Current User</label>
            <input
              type="text"
              value={device.user?.name || device.user?.email || "Unknown"}
              disabled
              className="mt-1 w-full rounded border bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Assign To</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role}
                </option>
              ))}
            </select>
          </div>
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUserId === device.userId}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Reassigning..." : "Reassign Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignDeviceModal;
