// src/components/DecisionBar.tsx
"use client";

import type { Assessment } from "@/types/assessment";
import {
  FAST_TRACK_CONFIDENCE_THRESHOLD,
  FAST_TRACK_MAX_COST,
  RecommendationCode,
} from "@/types/assessment";

type DecisionActionLabel = "Approve" | "Request Photos" | "Escalate";

interface DecisionBarProps {
  assessment: Assessment | null;
  onAction: (label: DecisionActionLabel, meta?: { complete?: boolean }) => void;
  disabled?: boolean;
}

export default function DecisionBar({
  assessment,
  onAction,
  disabled = false,
}: DecisionBarProps) {
  if (!assessment) return null;

  const { overall_confidence, total_max, recommendation } = assessment;

  // Use shared constants + recommendation signal instead of raw magic numbers
  const meetsFastTrackConfidence =
    overall_confidence >= FAST_TRACK_CONFIDENCE_THRESHOLD;
  const meetsFastTrackCost = total_max <= FAST_TRACK_MAX_COST;
  const recIsFastTrack =
    recommendation?.code === RecommendationCode.FAST_TRACK_REVIEW;

  const canFastTrack =
    recIsFastTrack && meetsFastTrackConfidence && meetsFastTrackCost;

  const handleApprove = () =>
    onAction("Approve", { complete: true });

  const handleRequestPhotos = () =>
    onAction("Request Photos", { complete: false });

  const handleEscalate = () =>
    onAction("Escalate", { complete: true });

  return (
    <div className="space-y-3">
      {/* Recommendation Banner */}
      <div
        className={`rounded-xl p-4 border ${
          canFastTrack
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {canFastTrack ? (
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`text-sm font-semibold mb-1 ${
                canFastTrack
                  ? "text-emerald-300"
                  : "text-amber-300"
              }`}
            >
              AI Recommendation
            </h4>
            <p
              className={`text-xs ${
                canFastTrack
                  ? "text-emerald-200"
                  : "text-amber-200"
              }`}
            >
              {recommendation?.text ||
                "AI recommendation unavailable. Please review manually."}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleApprove}
          disabled={disabled || !canFastTrack}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-emerald-500 text-[11px] font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
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
              d="M5 13l4 4L19 7"
            />
          </svg>
          Approve
        </button>

        <button
          onClick={handleRequestPhotos}
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-amber-500 text-[11px] font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Request Photos
        </button>

        <button
          onClick={handleEscalate}
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-rose-500 text-[11px] font-medium text-slate-50 hover:bg-rose-400 disabled:opacity-50"
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Escalate
        </button>
      </div>

      {/* Image Quality Info */}
      {assessment.image_quality &&
        assessment.image_quality.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300 flex items-center gap-2 transition-colors">
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Image Quality Notes
            </summary>
            <div className="mt-2 space-y-1 pl-6">
              {assessment.image_quality.map(
                (note, index) => (
                  <p
                    key={index}
                    className="text-xs text-slate-400"
                  >
                    • {note}
                  </p>
                )
              )}
            </div>
          </details>
        )}

      {/* Cost Breakdown */}
      {assessment.cost_breakdown &&
        assessment.cost_breakdown.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300 flex items-center gap-2 transition-colors">
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Cost Breakdown Details
            </summary>
            <div className="mt-2 space-y-2 pl-6">
              {assessment.cost_breakdown.map(
                (item, index) => (
                  <div key={index} className="text-xs">
                    <div className="font-medium text-slate-300">
                      {item.label}
                    </div>
                    {item.details?.map(
                      (detail, detailIndex) => (
                        <div
                          key={detailIndex}
                          className="text-slate-400 ml-2"
                        >
                          • {detail}
                        </div>
                      )
                    )}
                  </div>
                )
              )}
            </div>
          </details>
        )}
    </div>
  );
}
