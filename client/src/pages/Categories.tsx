import { FormEvent, useEffect, useState } from "react";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getDeviceApps,
  getAllApps,
  updateCategory,
  getDevices,
} from "../lib/api";
import type { App, AppCategory, Device } from "../types";

const Categories = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceApps, setDeviceApps] = useState<App[]>([]);
  const [allApps, setAllApps] = useState<App[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", selectedAppIds: new Set<string>() });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const [catsResp, devsResp, appsResp] = await Promise.all([
          getCategories(token),
          getDevices(token),
          getAllApps(token),
        ]);
        setCategories(catsResp.categories);
        setDevices(devsResp.devices);
        setAllApps(appsResp.apps);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    init();
  }, [token]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      if (editingId) {
        await updateCategory(token, editingId, {
          name: form.name,
          description: form.description || undefined,
          appIds: Array.from(form.selectedAppIds),
        });
        showToast("Category updated successfully", "success");
      } else {
        await createCategory(token, {
          name: form.name,
          description: form.description || undefined,
          appIds: Array.from(form.selectedAppIds),
        });
        showToast("Category created successfully", "success");
      }
      const resp = await getCategories(token);
      setCategories(resp.categories);
      resetForm();
    } catch (err) {
      setError((err as Error).message);
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm("Delete this category? This will remove all apps from this category.")) return;
    try {
      await deleteCategory(token, id);
      showToast("Category deleted successfully", "success");
      const resp = await getCategories(token);
      setCategories(resp.categories);
      if (editingId === id) resetForm();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", description: "", selectedAppIds: new Set() });
  };

  const beginEdit = (category: AppCategory) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || "",
      selectedAppIds: new Set(category.apps.map((ca) => ca.appId)),
    });
  };

  const toggleApp = (appId: string) => {
    setForm((prev) => {
      const next = new Set(prev.selectedAppIds);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return { ...prev, selectedAppIds: next };
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">App Categories</h1>
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="order-2 lg:order-1">
          <Table
            headers={["Category", "Apps", "Actions"]}
            rows={categories.map((cat) => [
              <div key="name">
                <div className="font-semibold">{cat.name}</div>
                {cat.description && <div className="text-xs text-slate-500">{cat.description}</div>}
              </div>,
              `${cat.apps?.length || 0}`,
              <div key="actions" className="flex gap-2">
                <button
                  className="text-sm text-primary hover:underline"
                  onClick={() => beginEdit(cat)}
                >
                  Edit
                </button>
                <button
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => handleDelete(cat.id)}
                >
                  Delete
                </button>
              </div>,
            ])}
            emptyMessage="No categories yet"
          />
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {editingId ? "Edit category" : "Create category"}
            </h2>
          {editingId && (
            <button className="mt-1 text-sm text-slate-600 hover:underline" onClick={resetForm}>
              Cancel
            </button>
          )}

          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Category name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Social Media"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Apps in category</label>
              <p className="mt-1 text-xs text-slate-500 mb-2">
                Showing all detected apps from all devices. Use search to filter.
              </p>
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2 w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <div className="mt-2 max-h-96 space-y-1 overflow-y-auto rounded border p-2">
                {allApps
                  .filter((app) => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      app.name.toLowerCase().includes(query) ||
                      app.packageName.toLowerCase().includes(query)
                    );
                  })
                  .map((app) => {
                    const checked = form.selectedAppIds.has(app.id);
                    return (
                      <label
                        key={app.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleApp(app.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{app.name}</div>
                          <div className="truncate text-xs text-slate-500">{app.packageName}</div>
                        </div>
                      </label>
                    );
                  })}
                {allApps.length === 0 && (
                  <div className="text-sm text-slate-600">No apps found. Apps will appear here once they are detected on devices.</div>
                )}
                {allApps.length > 0 &&
                  allApps.filter((app) => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      app.name.toLowerCase().includes(query) ||
                      app.packageName.toLowerCase().includes(query)
                    );
                  }).length === 0 && (
                    <div className="text-sm text-slate-600">No apps match your search.</div>
                  )}
              </div>
              {form.selectedAppIds.size > 0 && (
                <div className="mt-2 text-xs text-slate-600">
                  {form.selectedAppIds.size} app{form.selectedAppIds.size !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>

            <button
              className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Saving..." : editingId ? "Update category" : "Create category"}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;

