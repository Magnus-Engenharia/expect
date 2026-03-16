import { useState } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
}

export const DataTable = <T,>({ columns, data, rowKey }: DataTableProps<T>) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((rowA, rowB) => {
    if (!sortKey) return 0;
    const column = columns.find((col) => col.key === sortKey);
    if (!column?.sortValue) return 0;
    const valueA = column.sortValue(rowA);
    const valueB = column.sortValue(rowB);
    const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => column.sortValue && handleSort(column.key)}
                className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                  column.sortValue ? "cursor-pointer hover:text-gray-700 select-none" : ""
                }`}
              >
                {column.header}
                {sortKey === column.key && (
                  <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedData.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-gray-700">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export type { Column };
