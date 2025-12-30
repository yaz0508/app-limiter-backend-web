import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string; // YYYY-MM-DD
  minutes: number;
};

type Props = {
  data: Array<{ date: string; totalMinutes: number }>;
};

const TrendChart = ({ data }: Props) => {
  const formatted: Point[] = data.map((p) => ({
    date: p.date,
    minutes: Number((p.totalMinutes ?? 0).toFixed(1)),
  }));

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis width={40} />
          <Tooltip />
          <Line type="monotone" dataKey="minutes" stroke="#6366F1" strokeWidth={3} dot={{ fill: "#6366F1", r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;


