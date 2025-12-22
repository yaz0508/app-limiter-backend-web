import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Table from "../components/Table";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createUser, getDevices, getUsers, updateUser } from "../lib/api";
import { Device, User } from "../types";
import EditUserModal from "../components/EditUserModal";
import { exportUsersToCSV } from "../utils/export";

type RowUser = User & { deviceCount: number };

const Users = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    return filtered;
  }, [rows, searchQuery, roleFilter]);

  const handleEditUser = async (data: { name: string; email: string; role: string; password?: string }) => {
    if (!token || !editingUser) return;
    if (!editingUser.id) {
      // Creating new user
      await createUser(token, {
        name: data.name,
        email: data.email,
        password: data.password || "changeme123", // Require password for new users
        role: data.role as any,
      });
      showToast("User created successfully", "success");
    } else {
      // Updating existing user
      await updateUser(token, editingUser.id, data);
      showToast("User updated successfully", "success");
    }
    // Reload users
    const resp = await getUsers(token);
    setUsers(resp.users);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            {loading ? "Loading..." : `${filteredRows.length} of ${rows.length} users`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportUsersToCSV(filteredRows)}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => setEditingUser({ id: "", name: "", email: "", role: "USER" } as User)}
              className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              + Add User
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
          <option value="PARENT">Parent</option>
        </select>
        {(searchQuery || roleFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("all");
            }}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <Table
        headers={["Name", "Email", "Role", "Devices", ""]}
        rows={filteredRows.map((u) => [
          u.name,
          u.email,
          <span key="role" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {u.role}
          </span>,
          <span key="devices" className="text-sm">
            {u.deviceCount > 0 ? (
              <span className="font-semibold text-slate-900">{u.deviceCount}</span>
            ) : (
              <span className="text-slate-400">0</span>
            )}
          </span>,
          <div key="actions" className="flex items-center gap-2">
            <Link to={`/users/${u.id}`} className="text-sm font-semibold text-primary hover:underline">
              View
            </Link>
            <button
              onClick={() => setEditingUser(u)}
              className="text-sm text-slate-600 hover:text-slate-900"
              title="Edit user"
            >
              Edit
            </button>
          </div>,
        ])}
        emptyMessage={
          loading
            ? "Loading..."
            : searchQuery || roleFilter !== "all"
            ? "No users match your filters"
            : "No users yet"
        }
        />
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            <strong>Note:</strong> Device counts reflect devices automatically registered when users log in or register on the Android app.
          </p>
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
        />
      )}
    </div>
  );
};

export default Users;

