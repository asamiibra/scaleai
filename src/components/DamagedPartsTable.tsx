// src/components/DamagedPartsTable.tsx
"use client";

import { useState, useMemo } from "react";
import type { DamagedPart } from "@/types/assessment";

interface DamagedPartsTableProps {
  parts: DamagedPart[];
  onEdit: (index: number) => void;
}

type SortKey = "part" | "severity" | "confidence" | "cost";
type SortDirection = "asc" | "desc";

// Severity ordering based on normalized string values
const SEVERITY_ORDER: Record<string, number> = {
  minor: 1,
  moderate: 2,
  severe: 3,
  replace: 4,
  structural: 5,
};

// Format cost (cents → dollars, whole numbers)
const formatCost = (min: number, max: number) =>
  `$${(min / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}–${(max / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;

// Severity pill styling
const getSeverityColor = (severity: string) => {
  const s = severity.toLowerCase();
  switch (s) {
    case "minor":
      return "text-emerald-400 bg-emerald-500/10";
    case "moderate":
      return "text-amber-400 bg-amber-500/10";
    case "severe":
      return "text-orange-400 bg-orange-500/10";
    case "replace":
      return "text-rose-400 bg-rose-500/10";
    case "structural":
      return "text-red-400 bg-red-500/10";
    default:
      return "text-slate-400 bg-slate-500/10";
  }
};

// Confidence color
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "text-emerald-400";
  if (confidence >= 0.6) return "text-amber-400";
  return "text-rose-400";
};

export default function DamagedPartsTable({
  parts,
  onEdit,
}: DamagedPartsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const sortedParts = useMemo(() => {
    const sorted = [...parts].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "part":
          aVal = (a.part_label || "").toLowerCase();
          bVal = (b.part_label || "").toLowerCase();
          break;
        case "severity": {
          const aKey = (a.severity || "").toString().toLowerCase();
          const bKey = (b.severity || "").toString().toLowerCase();
          aVal = SEVERITY_ORDER[aKey] ?? 0;
          bVal = SEVERITY_ORDER[bKey] ?? 0;
          break;
        }
        case "confidence":
          aVal = a.confidence ?? 0;
          bVal = b.confidence ?? 0;
          break;
        case "cost":
          aVal =
            ((a.estimated_cost_min ?? 0) +
              (a.estimated_cost_max ?? 0)) / 2;
          bVal =
            ((b.estimated_cost_min ?? 0) +
              (b.estimated_cost_max ?? 0)) / 2;
          break;
      }

      if (aVal < bVal)
        return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal)
        return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [parts, sortKey, sortDirection]);

  const totals = useMemo(() => {
    const count = parts.length;
    const costMin = parts.reduce(
      (sum, p) => sum + (p.estimated_cost_min ?? 0),
      0
    );
    const costMax = parts.reduce(
      (sum, p) => sum + (p.estimated_cost_max ?? 0),
      0
    );
    const avgConfidence =
      count > 0
        ? parts.reduce(
            (sum, p) => sum + (p.confidence ?? 0),
            0
          ) / count
        : 0;

    return {
      count,
      costMin,
      costMax,
      avgConfidence,
    };
  }, [parts]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(
        sortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
      <h2 className="text-sm font-semibold mb-2 text-slate-100">
        Damaged Parts
      </h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-800">
            <th
              className="p-3 text-left text-slate-400 cursor-pointer"
              onClick={() => handleSort("part")}
            >
              Part{" "}
              {sortKey === "part" &&
                (sortDirection === "asc"
                  ? "↑"
                  : "↓")}
            </th>
            <th
              className="p-3 text-left text-slate-400 cursor-pointer"
              onClick={() => handleSort("severity")}
            >
              Severity{" "}
              {sortKey === "severity" &&
                (sortDirection === "asc"
                  ? "↑"
                  : "↓")}
            </th>
            <th
              className="p-3 text-left text-slate-400 cursor-pointer"
              onClick={() => handleSort("confidence")}
            >
              Confidence{" "}
              {sortKey === "confidence" &&
                (sortDirection === "asc"
                  ? "↑"
                  : "↓")}
            </th>
            <th
              className="p-3 text-left text-slate-400 cursor-pointer"
              onClick={() => handleSort("cost")}
            >
              Est. Cost{" "}
              {sortKey === "cost" &&
                (sortDirection === "asc"
                  ? "↑"
                  : "↓")}
            </th>
            <th className="p-3 text-right text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedParts.map((part, index) => {
            const originalIndex = parts.findIndex(
              (p) => p === part
            );
            return (
              <tr
                key={`${part.part_id}-${index}`}
                className="border-b border-slate-800 last:border-b-0"
              >
                <td className="p-3 text-slate-200">
                  {part.part_label}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${getSeverityColor(
                      part.severity as string
                    )}`}
                  >
                    {part.severity}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs font-medium ${getConfidenceColor(
                      part.confidence ?? 0
                    )}`}
                  >
                    {((part.confidence ?? 0) * 100).toFixed(
                      0
                    )}
                    %
                  </span>
                </td>
                <td className="p-3 text-slate-200">
                  {formatCost(
                    part.estimated_cost_min ?? 0,
                    part.estimated_cost_max ?? 0
                  )}
                </td>
                <td className="p-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() =>
                        onEdit(
                          originalIndex >= 0
                            ? originalIndex
                            : index
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-sky-400 transition-colors"
                      title="Edit estimate"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-slate-700 bg-slate-950">
          <tr>
            <td className="p-3 text-sm font-semibold text-slate-200">
              Total ({totals.count}{" "}
              {totals.count === 1
                ? "part"
                : "parts"}
              )
            </td>
            <td className="p-3"></td>
            <td className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                  <div
                    className={`h-full ${getConfidenceColor(
                      totals.avgConfidence
                    ).replace("text-", "bg-")}`}
                    style={{
                      width: `${
                        totals.avgConfidence * 100
                      }%`,
                    }}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${getConfidenceColor(
                    totals.avgConfidence
                  )}`}
                >
                  {Math.round(
                    totals.avgConfidence * 100
                  )}
                  %
                </span>
              </div>
            </td>
            <td className="p-3 text-sm font-semibold text-slate-100">
              {formatCost(
                totals.costMin,
                totals.costMax
              )}
            </td>
            <td className="p-3"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
