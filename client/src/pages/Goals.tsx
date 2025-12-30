import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDevices, getGoals, getAllGoalProgress, createGoal, updateGoal, deleteGoal } from "../lib/api";
import { Device, UsageGoal, GoalProgress, GoalType, GoalStatus } from "../types";
import { useToast } from "../context/ToastContext";

const Goals = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [goals, setGoals] = useState<UsageGoal[]>([]);
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<UsageGoal | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        const resp = await getDevices(token);
        setDevices(resp.devices);
        if (resp.devices.length > 0) {
          setSelectedDevice(resp.devices[0].id);
        }
      } catch (err) {
        showToast((err as Error).message, "error");
      }
    };
    init();
  }, [token, showToast]);

  useEffect(() => {
    const load = async () => {
      if (!token || !selectedDevice) return;
      setLoading(true);
      try {
        const [goalsResp, progressResp] = await Promise.all([
          getGoals(token, selectedDevice),
          getAllGoalProgress(token, selectedDevice),
        ]);
        setGoals(goalsResp.goals);
        setProgress(progressResp.progress);
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, selectedDevice, showToast]);

  const handleCreateGoal = async (formData: {
    type: GoalType;
    targetMinutes: number;
    appId?: string;
    categoryId?: string;
    name?: string;
    endDate?: string;
  }) => {
    if (!token || !selectedDevice) return;
    try {
      await createGoal(token, selectedDevice, formData);
      showToast("Goal created successfully", "success");
      setShowCreateModal(false);
      // Reload goals
      const [goalsResp, progressResp] = await Promise.all([
        getGoals(token, selectedDevice),
        getAllGoalProgress(token, selectedDevice),
      ]);
      setGoals(goalsResp.goals);
      setProgress(progressResp.progress);
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<UsageGoal>) => {
    if (!token) return;
    try {
      await updateGoal(token, goalId, updates);
      showToast("Goal updated successfully", "success");
      // Reload goals
      if (selectedDevice) {
        const [goalsResp, progressResp] = await Promise.all([
          getGoals(token, selectedDevice),
          getAllGoalProgress(token, selectedDevice),
        ]);
        setGoals(goalsResp.goals);
        setProgress(progressResp.progress);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await deleteGoal(token, goalId);
      showToast("Goal deleted successfully", "success");
      // Reload goals
      if (selectedDevice) {
        const [goalsResp, progressResp] = await Promise.all([
          getGoals(token, selectedDevice),
          getAllGoalProgress(token, selectedDevice),
        ]);
        setGoals(goalsResp.goals);
        setProgress(progressResp.progress);
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const getProgressForGoal = (goalId: string): GoalProgress | undefined => {
    return progress.find(p => p.goalId === goalId);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Usage Goals</h1>
        <div className="flex gap-2">
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Create Goal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Loading goals...
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          <p className="mb-2">No goals set yet.</p>
          <p className="text-xs text-slate-400">Create a goal to track your usage targets.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const goalProgress = getProgressForGoal(goal.id);
            const percentage = goalProgress?.percentage || 0;
            const statusColor = goalProgress?.status === "exceeded" 
              ? "bg-red-500" 
              : goalProgress?.status === "at_risk"
              ? "bg-yellow-500"
              : "bg-green-500";

            return (
              <div key={goal.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {goal.name || goal.type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Target: {goal.targetMinutes} minutes
                      {goal.app && ` • ${goal.app.name}`}
                      {goal.category && ` • ${goal.category.name}`}
                    </p>
                  </div>
                  <select
                    value={goal.status}
                    onChange={(e) => handleUpdateGoal(goal.id, { status: e.target.value as GoalStatus })}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                {goalProgress && (
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-sm">
                      <span>
                        {goalProgress.currentMinutes} / {goalProgress.targetMinutes} minutes
                      </span>
                      <span className="font-semibold">{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full ${statusColor}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {goalProgress.remainingMinutes > 0
                        ? `${Math.round(goalProgress.remainingMinutes)} minutes remaining`
                        : "Goal exceeded"}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateGoalModal
          deviceId={selectedDevice}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGoal}
        />
      )}
    </div>
  );
};

const CreateGoalModal = ({
  deviceId,
  onClose,
  onCreate,
}: {
  deviceId: string;
  onClose: () => void;
  onCreate: (data: {
    type: GoalType;
    targetMinutes: number;
    appId?: string;
    categoryId?: string;
    name?: string;
    endDate?: string;
  }) => void;
}) => {
  const [type, setType] = useState<GoalType>("DAILY_TOTAL");
  const [targetMinutes, setTargetMinutes] = useState(120);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      type,
      targetMinutes,
      name: name || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Create Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Goal Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GoalType)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="DAILY_TOTAL">Daily Total</option>
              <option value="WEEKLY_TOTAL">Weekly Total</option>
              <option value="APP_SPECIFIC">App Specific</option>
              <option value="CATEGORY_SPECIFIC">Category Specific</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target (minutes)</label>
            <input
              type="number"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(parseInt(e.target.value, 10))}
              min={1}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g., Reduce Instagram usage"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Goals;


