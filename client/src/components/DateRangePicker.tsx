import { useState } from "react";

type Props = {
  onRangeChange: (start: string, end: string) => void;
  defaultStart?: string;
  defaultEnd?: string;
};

const DateRangePicker = ({ onRangeChange, defaultStart, defaultEnd }: Props) => {
  const [start, setStart] = useState(defaultStart || "");
  const [end, setEnd] = useState(defaultEnd || "");

  const handleApply = () => {
    if (start && end) {
      onRangeChange(start, end);
    }
  };

  const handlePreset = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    setStart(startStr);
    setEnd(endStr);
    onRangeChange(startStr, endStr);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="rounded border px-3 py-2 text-sm"
      />
      <span className="text-sm text-slate-500">to</span>
      <input
        type="date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="rounded border px-3 py-2 text-sm"
      />
      <button
        onClick={handleApply}
        disabled={!start || !end}
        className="rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Apply
      </button>
      <div className="flex gap-1">
        <button
          onClick={() => handlePreset(7)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          7d
        </button>
        <button
          onClick={() => handlePreset(30)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          30d
        </button>
        <button
          onClick={() => handlePreset(90)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          90d
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;
