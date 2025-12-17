type Props = { label: string; value: string; helper?: string };

const StatCard = ({ label, value, helper }: Props) => (
  <div className="rounded-lg border bg-white p-4 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    {helper && <div className="text-xs text-slate-500">{helper}</div>}
  </div>
);

export default StatCard;


