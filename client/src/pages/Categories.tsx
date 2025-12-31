import { FormEvent, useEffect, useState } from "react";
import Table from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getDeviceApps,
  updateCategory,
  createCategoryLimit,
  getCategoryLimits,
  deleteCategoryLimit,
  getDevices,
} from "../lib/api";
import type { App, AppCategory, CategoryLimit, Device } from "../types";

const Categories = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [deviceApps, setDeviceApps] = useState<App[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", selectedAppIds: new Set<string>() });
  const [limitForm, setLimitForm] = useState({ categoryId: "", dailyLimitMinutes: 60 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const [catsResp, devsResp] = await Promise.all([getCategories(token), getDevices(token)]);
        setCategories(catsResp.categories);
        setDevices(devsResp.devices);
        if (devsResp.devices.length > 0) {
          setSelectedDevice(devsResp.devices[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    const loadDeviceData = async () => {
      if (!token || !selectedDevice) return;
      try {
        const [appsResp, limitsResp] = await Promise.all([
          getDeviceApps(token, selectedDevice),
          getCategoryLimits(token, selectedDevice),
        ]);
        setDeviceApps(appsResp.apps);
        setCategoryLimits(limitsResp.limits);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    loadDeviceData();
  }, [token, selectedDevice]);

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
    if (!confirm("Delete this category? This will also remove all category limits.")) return;
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

  const handleLimitSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDevice) return;
    setError(null);
    setLoading(true);
    try {
      await createCategoryLimit(token, {
        deviceId: selectedDevice,
        categoryId: limitForm.categoryId,
        dailyLimitMinutes: limitForm.dailyLimitMinutes,
      });
      showToast("Category limit created successfully", "success");
      const resp = await getCategoryLimits(token, selectedDevice);
      setCategoryLimits(resp.limits);
      setLimitForm({ categoryId: "", dailyLimitMinutes: 60 });
    } catch (err) {
      setError((err as Error).message);
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLimit = async (categoryId: string) => {
    if (!token || !selectedDevice) return;
    if (!confirm("Remove this category limit?")) return;
    try {
      await deleteCategoryLimit(token, selectedDevice, categoryId);
      showToast("Category limit removed successfully", "success");
      const resp = await getCategoryLimits(token, selectedDevice);
      setCategoryLimits(resp.limits);
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
            headers={["Category", "Apps", "Limits", "Actions"]}
            rows={categories.map((cat) => [
              <div key="name">
                <div className="font-semibold">{cat.name}</div>
                {cat.description && <div className="text-xs text-slate-500">{cat.description}</div>}
              </div>,
              `${cat.apps?.length || 0}`,
              `${cat._count?.limits || 0}`,
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
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border p-2">
                {deviceApps.map((app) => {
                  const checked = form.selectedAppIds.has(app.id);
                  return (
                    <label key={app.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleApp(app.id)}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{app.name}</div>
                        <div className="truncate text-xs text-slate-500">{app.packageName}</div>
                      </div>
                    </label>
                  );
                })}
                {deviceApps.length === 0 && (
                  <div className="text-sm text-slate-600">No apps found. Select a device first.</div>
                )}
              </div>
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

      {/* Category Limits Section */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Category Limits</h2>
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

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <Table
              headers={["Category", "Daily Limit", "Actions"]}
              rows={categoryLimits.map((limit) => [
                limit.category.name,
                `${limit.dailyLimitMinutes} minutes`,
                <button
                  key="delete"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => handleDeleteLimit(limit.categoryId)}
                >
                  Remove
                </button>,
              ])}
              emptyMessage="No category limits set for this device"
            />
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-lg border bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Set Category Limit</h3>
            <form className="mt-3 space-y-3" onSubmit={handleLimitSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={limitForm.categoryId}
                  onChange={(e) => setLimitForm((p) => ({ ...p, categoryId: e.target.value }))}
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Daily limit (minutes)</label>
                <input
                  type="number"
                  min={30}
                  max={300}
                  step={30}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={limitForm.dailyLimitMinutes}
                  onChange={(e) => setLimitForm((p) => ({ ...p, dailyLimitMinutes: Number(e.target.value) }))}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">30-300 minutes (30-minute intervals)</p>
              </div>

              <button
                className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                disabled={loading || !selectedDevice}
              >
                {loading ? "Saving..." : "Set limit"}
              </button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;

