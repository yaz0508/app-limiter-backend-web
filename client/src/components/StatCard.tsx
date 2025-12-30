type Props = { label: string; value: string; helper?: string; trend?: "up" | "down" | "neutral"; icon?: React.ReactNode };

const StatCard = ({ label, value, helper, trend, icon }: Props) => (
  <div className="stat-card group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {icon && <div className="text-primary-500">{icon}</div>}
          <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-text-primary sm:text-3xl">{value}</div>
          {trend && (
            <div className={`text-xs font-medium ${
              trend === "up" ? "text-accent-600" : trend === "down" ? "text-red-500" : "text-text-tertiary"
            }`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </div>
          )}
        </div>
        {helper && (
          <div className="mt-2 text-xs text-text-secondary">{helper}</div>
        )}
      </div>
    </div>
  </div>
);

export default StatCard;


