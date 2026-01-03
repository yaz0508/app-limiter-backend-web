interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

const LoadingSkeleton = ({ lines = 3, className = "" }: LoadingSkeletonProps) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded bg-slate-200 ${
            i === 0 ? "w-3/4" : i === 1 ? "w-1/2" : "w-5/6"
          }`}
        />
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="animate-pulse">
        <div className="border-b bg-gray-50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="h-4 flex-1 rounded bg-slate-200"></div>
            ))}
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex gap-4">
                {Array.from({ length: cols }).map((_, j) => (
                  <div key={j} className="h-4 flex-1 rounded bg-slate-100"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
