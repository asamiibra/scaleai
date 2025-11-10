// src/server/costing.ts

import {
    DamagedPart,
    PartSeverity,
    VehiclePart,
  } from "@/types/assessment";
  
  // ============================================================================
  // TYPES
  // ============================================================================
  
  /**
   * Infer the element type of DamagedPart["damage_types"] (if present),
   * with a safe fallback to a minimal compatible shape.
   */
  type DamageTypeEntry =
    NonNullable<DamagedPart["damage_types"]> extends Array<infer T>
      ? T
      : {
          type?: string;
          area_percentage?: number;
        };
  
  type DamageTypeLike = {
    type?: string;
    area_percentage?: number;
  };
  
  // ============================================================================
  // CONFIGURATION (all costs in cents)
  // ============================================================================
  
  /**
   * Base parts cost table.
   * Only reference keys that exist on VehiclePart.
   * Anything missing will fall back to a default.
   */
  const BASE_PART_COST: Partial<Record<VehiclePart, number>> = {
    [VehiclePart.REAR_BUMPER]: 50_000, // $500
    [VehiclePart.TRUNK_LID]: 60_000, // $600
    [VehiclePart.REAR_LEFT_TAILLIGHT]: 20_000, // $200
    [VehiclePart.REAR_RIGHT_TAILLIGHT]: 20_000, // $200
    [VehiclePart.FRAME]: 300_000, // $3,000
  };
  
  /**
   * Severity multipliers keyed by normalized string values.
   * We use string keys so we can support both the enum values and raw strings.
   */
  const SEVERITY_MULTIPLIER_BY_KEY: Record<string, number> = {
    [PartSeverity.MINOR]: 0.6,
    [PartSeverity.MODERATE]: 1.0,
    [PartSeverity.SEVERE]: 1.5,
    [PartSeverity.REPLACE]: 1.8,
    [PartSeverity.STRUCTURAL]: 2.5,
  };
  
  /**
   * Multipliers per damage type label (lowercased).
   * Unknown types fall back to 0.5.
   */
  const DAMAGE_TYPE_MULTIPLIER: Record<string, number> = {
    scratch: 0.3,
    scuff: 0.25,
    dent: 0.6,
    crack: 0.7,
    crush: 1.1,
    tear: 0.8,
    shatter: 0.9,
    misalignment: 0.6,
    structural_compromise: 1.5,
  };
  
  /**
   * Labor is modeled as a fraction of total parts cost.
   */
  const LABOR_FRACTION = 0.3;
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  function getBasePartCost(part: DamagedPart): number {
    const key = part.part_id as VehiclePart;
    const specific = BASE_PART_COST[key];
    // Default base if no specific mapping:
    return specific ?? 40_000; // $400
  }
  
  /**
   * Accept whatever DamagedPart.severity is (enum or raw string),
   * normalize, and look up in SEVERITY_MULTIPLIER_BY_KEY.
   */
  function getSeverityMultiplier(severity: DamagedPart["severity"]): number {
    const normalized = String(severity).toLowerCase();
    return SEVERITY_MULTIPLIER_BY_KEY[normalized] ?? 1.0;
  }
  
  function getDamageTypeMultiplier(
    damageTypes?: DamageTypeEntry[]
  ): number {
    if (!damageTypes || damageTypes.length === 0) {
      return 1.0;
    }
  
    let total = 0;
  
    for (const raw of damageTypes) {
      const d = raw as DamageTypeLike;
  
      const key = (d.type ?? "").toLowerCase();
      const base = DAMAGE_TYPE_MULTIPLIER[key] ?? 0.5;
  
      const area =
        typeof d.area_percentage === "number"
          ? d.area_percentage
          : undefined;
  
      // Normalize area: 50% ≈ 1.0; clamp between 0.3x and 1.5x
      const areaFactor =
        typeof area === "number"
          ? Math.max(0.3, Math.min(1.5, area / 50))
          : 1.0;
  
      total += base * areaFactor;
    }
  
    const avg = total / damageTypes.length || 1.0;
  
    // Keep within sane bounds
    return Math.max(0.4, Math.min(2.0, avg));
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Estimate a part's cost range (in cents).
   * - If part already has a valid [min, max], returns it unchanged.
   * - Otherwise, derives from:
   *   base part cost * severity multiplier * damage type multiplier.
   */
  export function estimatePartCostRange(
    part: DamagedPart
  ): {
    min: number;
    max: number;
  } {
    if (
      typeof part.estimated_cost_min === "number" &&
      typeof part.estimated_cost_max === "number" &&
      part.estimated_cost_max >= part.estimated_cost_min
    ) {
      return {
        min: part.estimated_cost_min,
        max: part.estimated_cost_max,
      };
    }
  
    const base = getBasePartCost(part);
    const severityMul = getSeverityMultiplier(part.severity);
    const damageMul = getDamageTypeMultiplier(part.damage_types);
  
    const mid = base * severityMul * damageMul;
  
    // Add a band around the midpoint; floor at $100
    const min = Math.max(10_000, Math.round(mid * 0.8));
    const max = Math.round(mid * 1.2);
  
    return { min, max };
  }
  
  /**
   * Compute total min/max including a simple labor component.
   * Returns values in cents:
   * - total_min / total_max
   * - labor_min / labor_max
   */
  export function computeTotalsFromParts(
    parts: DamagedPart[]
  ): {
    total_min: number;
    total_max: number;
    labor_min: number;
    labor_max: number;
  } {
    let partsMin = 0;
    let partsMax = 0;
  
    for (const part of parts) {
      const { min, max } = estimatePartCostRange(part);
      partsMin += min;
      partsMax += max;
    }
  
    const labor_min = Math.round(partsMin * LABOR_FRACTION);
    const labor_max = Math.round(partsMax * LABOR_FRACTION);
  
    return {
      total_min: partsMin + labor_min,
      total_max: partsMax + labor_max,
      labor_min,
      labor_max,
    };
  }
  