import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { getDevices, getUsers } from "../lib/api";
import { Device, User } from "../types";

type RowUser = User & { deviceCount: number };

const Users = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [u, d] = await Promise.all([getUsers(token), getDevices(token)]);
        setUsers(u.users);
        setDevices(d.devices);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const rows: RowUser[] = useMemo(() => {
    const byUser: Record<string, number> = {};
    for (const device of devices) {
      byUser[device.userId] = (byUser[device.userId] ?? 0) + 1;
    }
    return users.map((u) => ({ ...u, deviceCount: byUser[u.id] ?? 0 }));
  }, [users, devices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <div className="text-sm text-slate-500">
          {loading ? "Loading..." : `${rows.length} total`}
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table
        headers={["Name", "Email", "Role", "Devices", ""]}
        rows={rows.map((u) => [
          u.name,
          u.email,
          <span key="role" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {u.role}
          </span>,
          u.deviceCount,
          <Link key="view" to={`/users/${u.id}`} className="text-sm font-semibold text-primary hover:underline">
            View
          </Link>,
        ])}
        emptyMessage={loading ? "Loading..." : "No users yet"}
      />
    </div>
  );
};

export default Users;

