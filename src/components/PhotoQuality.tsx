// src/components/PhotoQuality.tsx
"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, Camera } from "lucide-react";
import type { PhotoMeta } from "@/types/assessment";
import { IMAGE_QUALITY, PHOTO } from "@/config/policy";

// ============================================================================
// TYPES
// ============================================================================

// Extend PhotoMeta with optional view-model fields used only by this component.
// Because all extras are optional, calling code that passes PhotoMeta[] is still valid.
export type ExtendedPhotoMeta = PhotoMeta & {
  url?: string;
  previewUrl?: string;
  angle?: string;
  issues?: string[];
  qualityScore?: number; // <-- needed for the scores.reduce() usage
};

interface PhotoQualityProps {
  photos: ExtendedPhotoMeta[];
}

// ============================================================================
// HELPERS
// ============================================================================

function computeQualityScore(photo: ExtendedPhotoMeta): number {
  // Prefer an explicit qualityScore if provided
  if (typeof photo.qualityScore === "number") {
    return Math.max(0, Math.min(1, photo.qualityScore));
  }

  // Otherwise derive a light heuristic from metadata if present
  const width = (photo as { width?: number }).width ?? 0;
  const height = (photo as { height?: number }).height ?? 0;

  // Use config thresholds for quality scoring
  if (width === 0 || height === 0) return IMAGE_QUALITY.DEFAULT_SCORE;
  if (
    width >= IMAGE_QUALITY.IDEAL_RESOLUTION.width &&
    height >= IMAGE_QUALITY.IDEAL_RESOLUTION.height
  ) {
    return IMAGE_QUALITY.HIGH_SCORE;
  }
  if (
    width >= IMAGE_QUALITY.MIN_RESOLUTION.width &&
    height >= IMAGE_QUALITY.MIN_RESOLUTION.height
  ) {
    return IMAGE_QUALITY.GOOD_SCORE;
  }
  return IMAGE_QUALITY.FAIR_SCORE;
}

function summarizeIssues(photos: ExtendedPhotoMeta[]): string[] {
  const notes: string[] = [];

  if (!photos.length) {
    notes.push("No photos provided.");
    return notes;
  }

  if (photos.length < PHOTO.MIN_PHOTOS_RECOMMENDED) {
    notes.push("Limited photo set; add more angles for better assessment.");
  }

  const hasLowRes = photos.some((p) => {
    const width = (p as { width?: number }).width ?? 0;
    return width > 0 && width < IMAGE_QUALITY.MIN_RESOLUTION.width;
  });
  if (hasLowRes) {
    notes.push(
      "Some photos appear low-resolution; higher resolution images are recommended."
    );
  }

  if (photos.some((p) => p.issues && p.issues.length > 0)) {
    notes.push("Certain photos have flagged quality issues; review before approval.");
  }

  return notes;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PhotoQuality({ photos }: PhotoQualityProps) {
  const { avgQuality, minQuality, issues } = useMemo(() => {
    if (!photos.length) {
      return {
        avgQuality: 0,
        minQuality: 0,
        issues: ["No photos uploaded yet."],
      };
    }

    const scores = photos.map((photo) => computeQualityScore(photo));
    const avgQuality =
      scores.reduce((sum, s) => sum + s, 0) / (scores.length || 1);
    const minQuality = Math.min(...scores);
    const issues = summarizeIssues(photos);

    return { avgQuality, minQuality, issues };
  }, [photos]);

  const percent = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100">
            Photo & Quality Check
          </h2>
        </div>
        <span className="text-[10px] text-slate-500">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Quality summary bar */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-[10px] text-slate-400">
          <span>Average quality</span>
          <span className="font-semibold text-sky-400">
            {percent(avgQuality)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: percent(avgQuality) }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span>Lowest frame</span>
          <span>{percent(minQuality)}</span>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-400">
            {issues.some((i) => i.toLowerCase().includes("no photos")) ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>Quality notes</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
            {issues.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {photos.slice(0, IMAGE_QUALITY.MAX_THUMBNAIL_PREVIEWS).map((photo) => {
            const src = photo.url || photo.previewUrl;
            const q = computeQualityScore(photo);

            return (
              <div
                key={photo.id}
                className="relative aspect-square rounded-md bg-slate-950 border border-slate-800 overflow-hidden"
              >
                {src ? (
                  <Image
                    src={src}
                    alt={photo.angle || "Damage photo"}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                    No preview
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-900/80">
                  <div
                    className={`h-full ${
                      q >= IMAGE_QUALITY.INDICATOR_THRESHOLDS.HIGH
                        ? "bg-emerald-500"
                        : q >= IMAGE_QUALITY.INDICATOR_THRESHOLDS.MEDIUM
                        ? "bg-amber-400"
                        : "bg-rose-500"
                    }`}
                    style={{ width: percent(q) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OK badge when strong set */}
      {photos.length >= IMAGE_QUALITY.MIN_PHOTOS_FOR_BADGE &&
        avgQuality >= IMAGE_QUALITY.MIN_QUALITY_FOR_BADGE && (
        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[9px] text-emerald-300">
            Sufficient photo quality for automated triage
          </span>
        </div>
      )}
    </div>
  );
}
