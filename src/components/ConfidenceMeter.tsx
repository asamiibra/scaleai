// src/components/ConfidenceMeter.tsx
"use client";

import React from "react";
import {
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ConfidenceMeterProps {
  value: number; // 0-1
  showPercentage?: boolean;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  showIcon?: boolean;
  animated?: boolean;
  showThresholds?: boolean;
  variant?: "default" | "minimal" | "detailed";
}

interface CompactConfidenceMeterProps {
  value: number;
  showPercentage?: boolean;
  size?: "xs" | "sm" | "md";
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const THRESHOLDS = {
  EXCELLENT: 0.85,
  GOOD: 0.7,
  FAIR: 0.5,
  POOR: 0,
} as const;

const CONFIDENCE_LEVELS = {
  excellent: {
    label: "Excellent",
    color: "emerald",
    bgColor: "bg-emerald-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgOpacity: "bg-emerald-500/20",
    icon: CheckCircle,
    description: "High confidence - AI assessment highly reliable",
  },
  good: {
    label: "Good",
    color: "green",
    bgColor: "bg-green-500",
    textColor: "text-green-400",
    borderColor: "border-green-500/30",
    bgOpacity: "bg-green-500/20",
    icon: TrendingUp,
    description: "Good confidence - AI assessment reliable",
  },
  fair: {
    label: "Fair",
    color: "amber",
    bgColor: "bg-amber-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgOpacity: "bg-amber-500/20",
    icon: Minus,
    description: "Fair confidence - Manual review recommended",
  },
  poor: {
    label: "Low",
    color: "rose",
    bgColor: "bg-rose-500",
    textColor: "text-rose-400",
    borderColor: "border-rose-500/30",
    bgOpacity: "bg-rose-500/20",
    icon: AlertTriangle,
    description: "Low confidence - Manual review required",
  },
} as const;

// ============================================================================
// UTILITIES
// ============================================================================

function getConfidenceLevel(value: number) {
  if (value >= THRESHOLDS.EXCELLENT) return CONFIDENCE_LEVELS.excellent;
  if (value >= THRESHOLDS.GOOD) return CONFIDENCE_LEVELS.good;
  if (value >= THRESHOLDS.FAIR) return CONFIDENCE_LEVELS.fair;
  return CONFIDENCE_LEVELS.poor;
}

// ============================================================================
// CONFIDENCE METER COMPONENT
// ============================================================================

export function ConfidenceMeter({
  value,
  showPercentage = true,
  showLabel = true,
  size = "md",
  label,
  showIcon = true,
  animated = true,
  showThresholds = false,
  variant = "default",
}: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clamped * 100);
  const level = getConfidenceLevel(clamped);
  const Icon = level.icon;

  const sizeConfig = {
    xs: { bar: "h-1 w-12", text: "text-[10px]" },
    sm: { bar: "h-1.5 w-16", text: "text-xs" },
    md: { bar: "h-2 w-24", text: "text-sm" },
    lg: { bar: "h-3 w-32", text: "text-base" },
    xl: { bar: "h-4 w-40", text: "text-lg" },
  } as const;

  const config = sizeConfig[size];
  const barAnim = animated ? "transition-all duration-300" : "";

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-slate-400">{label}</span>}

      <div className="flex items-center gap-2">
        {showIcon && <Icon className={`w-4 h-4 ${level.textColor}`} />}

        <div className={`${config.bar} bg-slate-800 rounded-full overflow-hidden`}>
          <div
            className={`h-full ${level.bgColor} ${barAnim}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {showPercentage && (
          <span
            className={`${config.text} ${level.textColor} font-medium tabular-nums`}
          >
            {percentage}%
          </span>
        )}

        {showLabel && (
          <span className={`${config.text} ${level.textColor}`}>
            {level.label}
          </span>
        )}
      </div>

      {variant === "detailed" && (
        <p className="text-xs text-slate-400">{level.description}</p>
      )}

      {showThresholds && (
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT CONFIDENCE METER
// ============================================================================

export function CompactConfidenceMeter({
  value,
  showPercentage = true,
  size = "md",
}: CompactConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clamped * 100);
  const level = getConfidenceLevel(clamped);

  const sizeConfig = {
    xs: { bar: "h-1 w-8", text: "text-[10px]" },
    sm: { bar: "h-1.5 w-12", text: "text-xs" },
    md: { bar: "h-2 w-16", text: "text-sm" },
  } as const;

  const config = sizeConfig[size];
  const barAnim = "transition-all duration-300";

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={`${config.bar} bg-slate-800 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${level.bgColor} ${barAnim}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span
          className={`${config.text} ${level.textColor} font-medium tabular-nums`}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// CONFIDENCE BADGE COMPONENT
// ============================================================================

export function ConfidenceBadge({
  value,
  size = "sm",
}: {
  value: number;
  size?: "xs" | "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clamped * 100);
  const level = getConfidenceLevel(clamped);
  const Icon = level.icon;

  const sizeConfig = {
    xs: { padding: "px-1.5 py-0.5", text: "text-[10px]", icon: "w-3 h-3" },
    sm: { padding: "px-2 py-1", text: "text-xs", icon: "w-3.5 h-3.5" },
    md: { padding: "px-3 py-1.5", text: "text-sm", icon: "w-4 h-4" },
  } as const;

  const config = sizeConfig[size];

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${config.padding} rounded-full ${level.bgOpacity} border ${level.borderColor}`}
    >
      <Icon className={`${config.icon} ${level.textColor}`} />
      <span
        className={`${config.text} font-semibold ${level.textColor}`}
      >
        {percentage}%
      </span>
      <span className={`${config.text} ${level.textColor}`}>
        {level.label}
      </span>
    </div>
  );
}

// ============================================================================
// CONFIDENCE INDICATOR (Icon only)
// ============================================================================

export function ConfidenceIndicator({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const level = getConfidenceLevel(clamped);
  const Icon = level.icon;

  const sizeConfig = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  } as const;

  return (
    <div
      className={`inline-flex items-center justify-center p-1.5 rounded-full ${level.bgOpacity}`}
    >
      <Icon className={`${sizeConfig[size]} ${level.textColor}`} />
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { getConfidenceLevel, THRESHOLDS, CONFIDENCE_LEVELS };
