import { useEffect, useRef } from "react";
import { HourlyUsage } from "../types";

type Props = {
  data: HourlyUsage[];
  date?: string;
};

const HourlyUsageChart = ({ data, date }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxMinutes = Math.max(...data.map(h => h.totalMinutes), 1);

    // Draw axes
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw bars
    const barWidth = chartWidth / 24;
    data.forEach((hour, index) => {
      const barHeight = (hour.totalMinutes / maxMinutes) * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;

      // Color based on usage intensity
      const intensity = hour.totalMinutes / maxMinutes;
      const r = Math.round(99 + intensity * 156); // 99-255
      const g = Math.round(102 + (1 - intensity) * 153); // 102-255
      const b = Math.round(241 - intensity * 141); // 241-100
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Draw hour labels on x-axis (every 3 hours)
      if (index % 3 === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${hour.hour}:00`, x + barWidth / 2, height - padding + 15);
      }
    });

    // Draw y-axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const value = (maxMinutes / 4) * i;
      const y = height - padding - (chartHeight / 4) * i;
      ctx.fillText(Math.round(value).toString(), padding - 5, y + 3);
    }
  }, [data]);

  return (
    <div className="space-y-2">
      {date && (
        <div className="text-sm text-slate-600">
          Hourly usage for {new Date(date).toLocaleDateString()}
        </div>
      )}
      <div className="rounded-lg border bg-white p-4">
        <canvas ref={canvasRef} width={800} height={300} className="w-full" />
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs text-slate-600">
        <div>Peak: {Math.max(...data.map(h => h.totalMinutes)).toFixed(1)} min</div>
        <div>Total: {data.reduce((sum, h) => sum + h.totalMinutes, 0).toFixed(1)} min</div>
        <div>Avg: {(data.reduce((sum, h) => sum + h.totalMinutes, 0) / 24).toFixed(1)} min</div>
        <div>Hours with usage: {data.filter(h => h.totalMinutes > 0).length}</div>
      </div>
    </div>
  );
};

export default HourlyUsageChart;


