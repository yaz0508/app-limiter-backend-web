type Props = { label: string; value: string; helper?: string };

const StatCard = ({ label, value, helper }: Props) => (
  <div className="rounded-lg border bg-white p-3 shadow-sm sm:p-4">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</div>
    {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
  </div>
);

export default StatCard;


