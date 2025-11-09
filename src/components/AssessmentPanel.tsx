"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Assessment,
  DamagedPart,
  CostBreakdownEntry,
} from "@/types/assessment"; // adjust path if needed

type Claim = {
  id: string;
  policyNumber: string;
  name: string;
  description: string;
};

type AssessmentPanelProps = {
  claim: Claim | null;
  photos: File[];
  assessment: Assessment | null;
  isRunning?: boolean;
  onRunAssessment?: () => void;
  onAction?: (label: string, meta?: { complete?: boolean }) => void;
};

type BreakdownItem = CostBreakdownEntry;

const fmt = (min: number, max: number) =>
  `$${min.toLocaleString()}–${max.toLocaleString()}`;

const confBadge = (c: number) => {
  if (c >= 0.9) return { label: `${Math.round(c * 100)}%`, class: "bg-emerald-500" };
  if (c >= 0.7) return { label: `${Math.round(c * 100)}%`, class: "bg-amber-400" };
  return { label: `${Math.round(c * 100)}%`, class: "bg-rose-500" };
};

const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);

export default function AssessmentPanel({
  claim,
  photos,
  assessment,
  isRunning,
  onRunAssessment,
  onAction,
}: AssessmentPanelProps) {
  const [local, setLocal] = useState<Assessment | null>(assessment);
  const [manualMode, setManualMode] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Sync in new assessments from parent
  useEffect(() => {
    if (assessment) {
      setLocal(assessment);
    }
  }, [assessment]);

  const canRunAi =
    !!claim && photos.length >= 2 && !!onRunAssessment && !isRunning && !manualMode;

  const breakdownItems: BreakdownItem[] = useMemo(() => {
    if (!local) return [];
    if (local.cost_breakdown && local.cost_breakdown.length > 0) {
      return local.cost_breakdown;
    }
    // Fallback breakdown derived from parts
    return local.damaged_parts.map((p) => ({
      label: p.part_label,
      details: [`Estimated range: ${fmt(p.estimated_cost_min, p.estimated_cost_max)}`],
    }));
  }, [local]);

  const recalcTotals = (parts: DamagedPart[]): { min: number; max: number } => {
    return parts.reduce(
      (acc, p) => {
        acc.min += p.estimated_cost_min || 0;
        acc.max += p.estimated_cost_max || 0;
        return acc;
      },
      { min: 0, max: 0 }
    );
  };

  const log = (msg: string, complete = false) => {
    onAction?.(`${ts()} - ${msg}`, complete ? { complete: true } : undefined);
  };

  /* ---------- Overrides ---------- */

  const handleOverridePart = (index: number) => {
    if (!local) return;
    const part = local.damaged_parts[index];
    if (!part) return;

    const askNumber = (label: string, current: number): number | null => {
      if (typeof window === "undefined") return null;
      const raw = window.prompt(
        `${label} for ${part.part_label} (current ${current}). Leave blank to keep current.`,
        current.toString()
      );
      if (raw === null || raw.trim() === "") return current;
      const value = Number(raw.trim());
      if (!Number.isFinite(value) || value < 0) {
        window.alert("Please enter a valid non-negative number.");
        return null;
      }
      return value;
    };

    const newMin = askNumber("Override MIN", part.estimated_cost_min);
    if (newMin === null) return;
    const newMax = askNumber("Override MAX", part.estimated_cost_max);
    if (newMax === null) return;

    const adjMin = Math.min(newMin, newMax);
    const adjMax = Math.max(newMin, newMax);

    const updatedParts = local.damaged_parts.map((p, i) =>
      i === index
        ? {
            ...p,
            estimated_cost_min: adjMin,
            estimated_cost_max: adjMax,
          }
        : p
    );

    const totals = recalcTotals(updatedParts);

    const updated: Assessment = {
      ...local,
      damaged_parts: updatedParts,
      total_min: totals.min,
      total_max: totals.max,
    };

    setLocal(updated);

    const prevMid =
      (part.estimated_cost_min + part.estimated_cost_max) / 2 || 0;
    const newMid = (adjMin + adjMax) / 2 || 0;
    const deltaAbs = Math.abs(newMid - prevMid);
    const deltaPct = prevMid > 0 ? deltaAbs / prevMid : 0;
    const significant = deltaAbs > 300 || deltaPct > 0.2;

    log(
      `[OVERRIDE] ${part.part_label}: ${fmt(
        part.estimated_cost_min,
        part.estimated_cost_max
      )} → ${fmt(adjMin, adjMax)} (Δ$${deltaAbs.toFixed(0)}, ${(deltaPct * 100).toFixed(
        1
      )}%)${significant ? " [HIGH-VALUE TRAINING DATA]" : ""}.`
    );
  };

  /* ---------- Actions ---------- */

  const captureFeedback = (label: string): string => {
    if (typeof window === "undefined") return "";
    const fb = window.prompt(
      `${label}\nOptional: add a short note for the training / QA pipeline.`,
      ""
    );
    return (fb || "").trim();
  };

  const handleApprove = () => {
    if (!local || !claim) return;
    const fb = captureFeedback("Approve & Log");
    const base = `APPROVED preliminary estimate for policy ${claim.policyNumber}: ${fmt(
      local.total_min,
      local.total_max
    )}.`;
    const msg = fb ? `${base} Feedback: ${fb}` : base;
    log(msg, true);
  };

  const handleRequestMore = () => {
    if (!claim) return;
    const fb = captureFeedback("Request More Photos");
    const base = `REQUESTED more photos for policy ${claim.policyNumber} (e.g. additional angles / close-ups).`;
    const msg = fb ? `${base} Details: ${fb}` : base;
    log(msg, true);
  };

  const handleEscalate = () => {
    if (!local || !claim) return;
    const fb = captureFeedback("Escalate to Senior");
    const base = `ESCALATED to senior adjuster for policy ${claim.policyNumber} (total ${fmt(
      local.total_min,
      local.total_max
    )}, confidence=${local.overall_confidence.toFixed(2)}).`;
    const msg = fb ? `${base} Notes: ${fb}` : base;
    log(msg, true);
  };

  /* ---------- Manual mode ---------- */

  const toggleManualMode = () => {
    const next = !manualMode;
    setManualMode(next);
    if (next) {
      log(
        "Switched to Manual Mode: AI suggestions frozen; decisions continue to be logged."
      );
    } else {
      log("Back to AI Mode: AI suggestions active again.");
    }
  };

  /* ---------- Render ---------- */

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold text-slate-100">
            AI Damage Assessment
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-sky-500 rounded-sm" />
              Powered by Scale AI · Mock Model{" "}
              {local?._meta?.model_version || "v2.3.1"}
            </span>
            <span>
              Inference ~
              {local?._meta?.processing_time_ms
                ? `${local._meta.processing_time_ms}ms`
                : "2500ms"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!manualMode && (
            <button
              onClick={onRunAssessment}
              disabled={!canRunAi}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold ${
                canRunAi
                  ? "bg-sky-500 text-slate-950 hover:bg-sky-400"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {isRunning ? "Analyzing…" : "Run AI Assessment"}
            </button>
          )}
          {manualMode && (
            <button
              onClick={toggleManualMode}
              className="px-4 py-1.5 rounded-md text-xs bg-slate-800 text-slate-100 hover:bg-slate-700"
            >
              ← Back to AI Mode
            </button>
          )}
          {!manualMode && (
            <button
              onClick={toggleManualMode}
              className="px-3 py-1.5 rounded-md text-[10px] bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700"
            >
              ⚠ Manual Mode
            </button>
          )}
        </div>
      </div>

      {/* Manual mode note */}
      {manualMode ? (
        <p className="text-[10px] text-amber-300">
          Manual Mode active. AI suggestions are shown for reference only; use
          the actions below to record manual decisions. All actions are logged.
        </p>
      ) : (
        <p className="text-[10px] text-slate-500">
          Set claim context and upload 2–4 photos, then run AI assessment.
        </p>
      )}

      {/* Parts table */}
      <div className="mt-1 space-y-1 text-[11px]">
        {local?.damaged_parts?.length ? (
          local.damaged_parts.map((part, idx) => {
            const badge = confBadge(part.confidence);
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1 cursor-pointer hover:bg-slate-800/40 rounded px-1"
                onClick={() => handleOverridePart(idx)}
              >
                <div className="flex items-center gap-1">
                  <span>{part.part_label}</span>
                  <span className="text-[8px] text-slate-500">✏ edit</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300">{part.severity}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[8px] text-slate-950 font-semibold ${badge.class}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-slate-100">
                    {fmt(part.estimated_cost_min, part.estimated_cost_max)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-[10px] text-slate-600 italic">
            Run AI assessment to see suggested parts and ranges.
          </p>
        )}
      </div>

      {/* Totals & recommendation */}
      {local && (
        <div className="space-y-1 mt-1">
          <div className="text-sm text-slate-100">
            <span className="font-semibold">Total:</span>{" "}
            {fmt(local.total_min, local.total_max)}
          </div>
          <div className="text-[11px] text-slate-100">
            <span className="font-semibold">Recommendation:</span>{" "}
            {local.recommendation?.text ||
              "✓ Fast-track eligible – Approve with verification (high confidence, low complexity)."}
          </div>
        </div>
      )}

      {/* Image quality & risk flags */}
      {local && (
        <div className="mt-2 space-y-1 text-[10px]">
          <div className="font-semibold text-slate-200">
            Image Quality Checks:
          </div>
          <ul className="ml-4 list-disc text-emerald-400">
            {(local.image_quality && local.image_quality.length
              ? local.image_quality
              : [
                  "Resolution acceptable for automated review (mock).",
                  "Key angles covered (mock).",
                ]
            ).map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <div className="text-slate-200 font-semibold">Risk Flags:</div>
          <ul className="ml-4 list-disc">
            {local.flags && local.flags.length ? (
              local.flags.map((f, i) => (
                <li key={i} className="text-amber-400">
                  {f}
                </li>
              ))
            ) : (
              <li className="text-emerald-400">None detected in this mock.</li>
            )}
          </ul>
          {manualMode && (
            <p className="text-[9px] text-slate-500 italic">
              AI suggestion shown for reference only in Manual Mode.
            </p>
          )}
        </div>
      )}

      {/* Cost breakdown toggle */}
      {local && breakdownItems.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="text-[10px] text-sky-400 hover:underline"
          >
            {showBreakdown ? "Hide cost breakdown" : "Show cost breakdown"}
          </button>
          {showBreakdown && (
            <div className="mt-1 space-y-1 text-[9px] text-slate-300">
              {breakdownItems.map((item, idx) => (
                <div key={idx}>
                  <div className="font-semibold">{item.label}</div>
                  <ul className="ml-4 list-disc text-slate-400">
                    {(item.details || []).map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                    {(!item.details || item.details.length === 0) && (
                      <li>Estimate details not available in this mock.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
        <button
          onClick={handleApprove}
          disabled={!local || !claim}
          className={`px-3 py-2 rounded-xl font-semibold ${
            local && claim
              ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          ✓ Approve &amp; Log{" "}
          {local ? `(${fmt(local.total_min, local.total_max)})` : ""}
        </button>
        <button
          onClick={handleRequestMore}
          disabled={!claim}
          className={`px-3 py-2 rounded-xl font-semibold ${
            claim
              ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          Request More Photos
        </button>
        <button
          onClick={handleEscalate}
          disabled={!claim}
          className={`px-3 py-2 rounded-xl font-semibold ${
            claim
              ? "bg-rose-500 text-slate-50 hover:bg-rose-400"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          Escalate to Senior
        </button>
      </div>
    </div>
  );
}
