// src/types/assessment.ts
/**
 * Claims Intelligence Workbench - Assessment Types
 * 
 * This file contains TypeScript type definitions, enums, and interfaces
 * for the assessment domain. For business rules and configuration values,
 * see @/config/policy.ts
 */

import { UI } from "@/config/policy";

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

export interface Claim {
    id: string;
    // canonical fields
    policy_number: string;
    incident_description: string;
  
    // optional / UI-facing aliases
    policyNumber?: string;
    description?: string;
  
    // additional metadata allowed
    name?: string;
    [key: string]: unknown;
  }
  
  export interface PhotoMeta {
    id: string;
    url: string;
    filename: string;
    uploadedAt?: string;
    source?: "user" | "system" | "api";
    meta?: {
      width?: number;
      height?: number;
      mime_type?: string;
      size_bytes?: number;
    };
  }
  
  // ============================================================================
  // ENUMS
  // ============================================================================
  
  export enum PartSeverity {
    MINOR = "minor",
    MODERATE = "moderate",
    SEVERE = "severe",
    REPLACE = "replace",
    STRUCTURAL = "structural",
  }
  
  export enum VehiclePart {
    REAR_BUMPER = "rear_bumper",
    TRUNK_LID = "trunk_lid",
    REAR_RIGHT_TAILLIGHT = "rear_right_taillight",
    REAR_LEFT_TAILLIGHT = "rear_left_taillight",
    LEFT_QUARTER_PANEL = "left_quarter_panel",
    FRAME = "frame",
    // extend as needed
  }
  
  export enum RecommendationCode {
    FAST_TRACK_REVIEW = "FAST_TRACK_REVIEW",
    MANUAL_REVIEW = "MANUAL_REVIEW",
    ESCALATE_SENIOR = "ESCALATE_SENIOR",
    ESCALATE_STRUCTURAL = "ESCALATE_STRUCTURAL",
  }
  
  export enum RiskFlag {
    LOW_CONFIDENCE = "LOW_CONFIDENCE",
    HIGH_EXPOSURE = "HIGH_EXPOSURE",
    STRUCTURAL_DAMAGE = "STRUCTURAL_DAMAGE",
    MISSING_ANGLES = "MISSING_ANGLES",
    INCONSISTENT_DAMAGE = "INCONSISTENT_DAMAGE",
  }
  
  // ============================================================================
  // ASSESSMENT STRUCTURES
  // ============================================================================
  
  export interface DamageTypeDetail {
    type: string;
    severity: string;
    area_percentage?: number;
  }
  
  export interface DamagedPart {
    part_id: VehiclePart | string;
    part_label: string;
    severity: PartSeverity | string;
    confidence: number; // 0-1
    estimated_cost_min: number; // cents
    estimated_cost_max: number; // cents
    repair_action?: string;
    damage_types?: DamageTypeDetail[];
  }
  
  export interface CostBreakdownItem {
    label: string;
    details: string[];
  }
  
  export interface AssessmentMeta {
    model_version?: string;
    processing_time_ms?: number;
    timestamp?: string;
    batch_id?: string;
    [key: string]: unknown;
  }
  
  export interface Assessment {
    damaged_parts: DamagedPart[];
    total_min: number;
    total_max: number;
    overall_confidence: number;
  
    recommendation: {
      code: RecommendationCode;
      text: string;
      priority?: "low" | "medium" | "high";
    };
  
    flags: RiskFlag[];
    image_quality: string[];
    cost_breakdown: CostBreakdownItem[];
  
    fraud_risk_score?: number; // 0-1
  
    _meta?: AssessmentMeta;
  }
  
  // ============================================================================
  // AUDIT LOG
  // ============================================================================
  
  export interface AuditLogEntry {
    id: string;
    claim_id: string;
    timestamp: string;
    user_id: string;
    action_type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  // Note: Fast-track thresholds and other configuration constants
  // are defined in @/config/policy.ts. Import FAST_TRACK from there.
  
  export function formatCostRange(min: number, max: number): string {
    if (min === 0 && max === 0) return "$0";
    const from = (min / 100).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
    const to = (max / 100).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
    return `$${from}–$${to}`;
  }
  
  export function getConfidenceBadge(confidence: number): {
    label: string;
    color: "green" | "amber" | "red";
  } {
    const { EXCELLENT, GOOD, FAIR } = UI.CONFIDENCE_BADGE;
    
    if (confidence >= EXCELLENT) {
      return { label: "Excellent", color: "green" };
    }
    if (confidence >= GOOD) {
      return { label: "Good", color: "green" };
    }
    if (confidence >= FAIR) {
      return { label: "Fair", color: "amber" };
    }
    return { label: "Low", color: "red" };
  }
  