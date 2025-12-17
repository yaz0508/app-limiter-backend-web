import { ReactNode } from "react";

type Props = {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
};

const Table = ({ headers, rows, emptyMessage = "No data" }: Props) => {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-4 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;


