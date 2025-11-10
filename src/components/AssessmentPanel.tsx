"use client";

import React, { useMemo, useState } from "react";
import { Info } from "lucide-react";
import {
  Assessment,
  DamagedPart,
  formatCostRange,
} from "@/types/assessment";

// UI-local Claim shape (matches Home)
type Claim = {
  id: string;
  policyNumber: string;
  name: string;
  description: string;
};

type PanelActionMeta = {
  complete?: boolean;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const SIGNIFICANT_OVERRIDE_DELTA_ABS = 30_000; // $300 in cents
const SIGNIFICANT_OVERRIDE_DELTA_PCT = 0.2; // 20%

// ============================================================================
// TYPES
// ============================================================================

export interface OverrideMetadata {
  before: { cost_min: number; cost_max: number };
  after: { cost_min: number; cost_max: number };
  delta: number;
  delta_percent: number;
  high_value_training_data: boolean;
  notes?: string;
}

interface AssessmentPanelProps {
  claim: Claim | null;
  photos: File[];
  assessment: Assessment | null;
  isRunning?: boolean;
  onRunAssessment: () => void;
  onApprove: () => void;
  onRequestPhotos: () => void;
  onEscalate: () => void;
  onOverride: (
    index: number,
    updated: DamagedPart,
    metadata: OverrideMetadata
  ) => void;
  onAddPart?: (part: DamagedPart) => void;
  onRemovePart?: (index: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AssessmentPanel({
  claim,
  photos,
  assessment,
  isRunning = false,
  onRunAssessment,
  onApprove,
  onRequestPhotos,
  onEscalate,
  onOverride,
  onAddPart,
  onRemovePart,
}: AssessmentPanelProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DamagedPart | null>(null);
  const [overrideNotes, setOverrideNotes] = useState("");

  // Totals (recomputed from damaged_parts to stay in sync with overrides)
  const totals = useMemo(() => {
    if (!assessment) return { min: 0, max: 0 };
    return {
      min: assessment.damaged_parts.reduce(
        (s, p) => s + p.estimated_cost_min,
        0
      ),
      max: assessment.damaged_parts.reduce(
        (s, p) => s + p.estimated_cost_max,
        0
      ),
    };
  }, [assessment]);

  // ---------- Editing ----------

  const startEdit = (index: number) => {
    if (!assessment) return;
    const part = assessment.damaged_parts[index];
    if (!part) return;
    setEditForm({ ...part });
    setEditingIndex(index);
    setOverrideNotes("");
  };

  const validateEditForm = (): string | null => {
    if (!editForm) return "No data to save";

    if (!editForm.part_label?.trim()) {
      return "Part label is required";
    }
    if (editForm.estimated_cost_min < 0) {
      return "Minimum cost cannot be negative";
    }
    if (editForm.estimated_cost_max < 0) {
      return "Maximum cost cannot be negative";
    }
    if (editForm.estimated_cost_min > editForm.estimated_cost_max) {
      return "Minimum cost cannot exceed maximum cost";
    }
    if (editForm.confidence < 0 || editForm.confidence > 1) {
      return "Confidence must be between 0 and 1";
    }

    return null;
  };

  const saveOverride = () => {
    if (editingIndex === null || !editForm || !assessment) return;

    const validationError = validateEditForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const original = assessment.damaged_parts[editingIndex];
    if (!original) return;

    const originalMid =
      (original.estimated_cost_min + original.estimated_cost_max) / 2;
    const newMid =
      (editForm.estimated_cost_min + editForm.estimated_cost_max) / 2;
    const delta = newMid - originalMid;
    const deltaPct =
      originalMid > 0 ? Math.abs(delta) / originalMid : 0;

    const isHighValue =
      Math.abs(delta) > SIGNIFICANT_OVERRIDE_DELTA_ABS ||
      deltaPct > SIGNIFICANT_OVERRIDE_DELTA_PCT;

    const metadata: OverrideMetadata = {
      before: {
        cost_min: original.estimated_cost_min,
        cost_max: original.estimated_cost_max,
      },
      after: {
        cost_min: editForm.estimated_cost_min,
        cost_max: editForm.estimated_cost_max,
      },
      delta,
      delta_percent: deltaPct,
      high_value_training_data: isHighValue,
      notes: overrideNotes || undefined,
    };

    onOverride(editingIndex, editForm, metadata);
    setEditingIndex(null);
    setEditForm(null);
    setOverrideNotes("");
  };

  const cancelOverride = () => {
    setEditingIndex(null);
    setEditForm(null);
    setOverrideNotes("");
  };

  // ========================================================================
  // MAIN PANEL (keep simple; wire to your layout as needed)
  // ========================================================================

  const mainContent = (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            AI Assessment
          </h2>
          {claim && (
            <p className="text-[10px] text-slate-500">
              {claim.policyNumber} • {claim.name}
            </p>
          )}
        </div>
        <button
          onClick={onRunAssessment}
          disabled={!claim || photos.length < 2 || isRunning}
          className="px-3 py-1.5 rounded-md text-[10px] bg-sky-600 disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium"
        >
          {isRunning ? "Running..." : "Run assessment"}
        </button>
      </div>

      <div className="text-xs text-slate-400">
        Total Estimate:{" "}
        <span className="font-semibold text-slate-100">
          {formatCostRange(totals.min, totals.max)}
        </span>
      </div>

      {/* You can expand this to list parts, actions, etc. */}
    </div>
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      {mainContent}

      {editingIndex !== null && editForm && assessment && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            {/* Header */}
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-100">
                Override Estimate
              </h3>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Cost Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-2">
                    AI Estimate
                  </div>
                  <div className="text-sm text-slate-200">
                    {formatCostRange(
                      assessment.damaged_parts[editingIndex]
                        .estimated_cost_min,
                      assessment.damaged_parts[editingIndex]
                        .estimated_cost_max
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
                  <div className="text-xs text-sky-400 mb-2">
                    Your Override
                  </div>
                  <div className="text-sm text-slate-100 font-semibold">
                    {formatCostRange(
                      editForm.estimated_cost_min,
                      editForm.estimated_cost_max
                    )}
                  </div>
                </div>
              </div>

              {/* Delta Display */}
              {(() => {
                const originalPart =
                  assessment.damaged_parts[editingIndex];
                const originalMid =
                  (originalPart.estimated_cost_min +
                    originalPart.estimated_cost_max) /
                  2;
                const newMid =
                  (editForm.estimated_cost_min +
                    editForm.estimated_cost_max) /
                  2;
                const delta = newMid - originalMid;
                if (!originalMid || delta === 0) return null;
                const deltaPct = Math.abs(delta) / originalMid;
                const isSignificant =
                  Math.abs(delta) > SIGNIFICANT_OVERRIDE_DELTA_ABS ||
                  deltaPct > SIGNIFICANT_OVERRIDE_DELTA_PCT;

                return (
                  <div
                    className={`p-3 rounded-lg ${
                      isSignificant
                        ? "bg-amber-500/10 border border-amber-500/30"
                        : "bg-slate-950 border border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-amber-400 mb-1">
                          Override Impact
                        </p>
                        <div className="text-xs text-amber-300">
                          Delta: ${(delta / 100).toFixed(0)} (
                          {(deltaPct * 100).toFixed(1)}%)
                          {isSignificant &&
                            " • Marked as high-value override for review/training."}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Part Label
                  </label>
                  <input
                    value={editForm.part_label}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        part_label: e.target.value,
                      })
                    }
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Min Cost (cents)
                    </label>
                    <input
                      type="number"
                      value={editForm.estimated_cost_min}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          estimated_cost_min:
                            parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Max Cost (cents)
                    </label>
                    <input
                      type="number"
                      value={editForm.estimated_cost_max}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          estimated_cost_max:
                            parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Confidence (0-1)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={editForm.confidence}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        confidence:
                          parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Override Notes
                  </label>
                  <textarea
                    value={overrideNotes}
                    onChange={(e) =>
                      setOverrideNotes(e.target.value)
                    }
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    rows={3}
                    placeholder="Explain why you're overriding the AI estimate..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={cancelOverride}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveOverride}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
