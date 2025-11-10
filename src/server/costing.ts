// src/server/costing.ts

import {
    DamagedPart,
    PartSeverity,
    VehiclePart,
  } from "@/types/assessment";
import { COST } from "@/config/policy";
  
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
   * Values are imported from @/config/policy.ts
   */
  const BASE_PART_COST: Partial<Record<VehiclePart, number>> = {
    [VehiclePart.REAR_BUMPER]: COST.BASE_PART_COSTS.REAR_BUMPER,
    [VehiclePart.TRUNK_LID]: COST.BASE_PART_COSTS.TRUNK_LID,
    [VehiclePart.REAR_LEFT_TAILLIGHT]: COST.BASE_PART_COSTS.REAR_LEFT_TAILLIGHT,
    [VehiclePart.REAR_RIGHT_TAILLIGHT]: COST.BASE_PART_COSTS.REAR_RIGHT_TAILLIGHT,
    [VehiclePart.FRAME]: COST.BASE_PART_COSTS.FRAME,
  };
  
  /**
   * Severity multipliers keyed by normalized string values.
   * We use string keys so we can support both the enum values and raw strings.
   * Values are imported from @/config/policy.ts
   */
  const SEVERITY_MULTIPLIER_BY_KEY: Record<string, number> = {
    [PartSeverity.MINOR]: COST.SEVERITY_MULTIPLIERS.MINOR,
    [PartSeverity.MODERATE]: COST.SEVERITY_MULTIPLIERS.MODERATE,
    [PartSeverity.SEVERE]: COST.SEVERITY_MULTIPLIERS.SEVERE,
    [PartSeverity.REPLACE]: COST.SEVERITY_MULTIPLIERS.REPLACE,
    [PartSeverity.STRUCTURAL]: COST.SEVERITY_MULTIPLIERS.STRUCTURAL,
  };
  
  /**
   * Multipliers per damage type label (lowercased).
   * Unknown types fall back to COST.DEFAULT_DAMAGE_TYPE_MULTIPLIER.
   * Values are imported from @/config/policy.ts
   */
  const DAMAGE_TYPE_MULTIPLIER: Record<string, number> = COST.DAMAGE_TYPE_MULTIPLIERS;
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  function getBasePartCost(part: DamagedPart): number {
    const key = part.part_id as VehiclePart;
    const specific = BASE_PART_COST[key];
    // Default base if no specific mapping:
    return specific ?? COST.DEFAULT_BASE_PART_COST;
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
      const base = DAMAGE_TYPE_MULTIPLIER[key] ?? COST.DEFAULT_DAMAGE_TYPE_MULTIPLIER;
  
      const area =
        typeof d.area_percentage === "number"
          ? d.area_percentage
          : undefined;
  
      // Normalize area using config values; clamp between min and max
      const areaFactor =
        typeof area === "number"
          ? Math.max(
              COST.AREA_FACTOR.MIN,
              Math.min(
                COST.AREA_FACTOR.MAX,
                area / COST.AREA_FACTOR.NORMALIZATION_PERCENT
              )
            )
          : 1.0;
  
      total += base * areaFactor;
    }
  
    const avg = total / damageTypes.length || 1.0;
  
    // Keep within sane bounds from config
    return Math.max(
      COST.DAMAGE_TYPE_MULTIPLIER.MIN,
      Math.min(COST.DAMAGE_TYPE_MULTIPLIER.MAX, avg)
    );
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
  
    // Add a band around the midpoint using config multipliers; floor at minimum part cost
    const min = Math.max(
      COST.MIN_PART_COST,
      Math.round(mid * COST.RANGE.MIN_MULTIPLIER)
    );
    const max = Math.round(mid * COST.RANGE.MAX_MULTIPLIER);
  
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
  
    const labor_min = Math.round(partsMin * COST.LABOR_FRACTION);
    const labor_max = Math.round(partsMax * COST.LABOR_FRACTION);
  
    return {
      total_min: partsMin + labor_min,
      total_max: partsMax + labor_max,
      labor_min,
      labor_max,
    };
  }
  