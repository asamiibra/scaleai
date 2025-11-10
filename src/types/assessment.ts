// src/types/assessment.ts
// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Standardized severity levels for damage assessment.
 * Maps to insurance industry standards and repair complexity.
 */
export enum PartSeverity {
    MINOR = "minor",           // Cosmetic damage, < $500
    MODERATE = "moderate",     // Functional damage, $500-$1500
    SEVERE = "severe",         // Structural concern, $1500-$5000
    REPLACE = "replace",       // Complete replacement needed
    STRUCTURAL = "structural", // Frame/safety system damage
    TOTAL_LOSS = "total_loss", // Vehicle deemed total loss
    UNKNOWN = "unknown"        // Cannot determine from images
  }
  
  /**
   * Vehicle part taxonomy - standardized across industry
   */
  export enum VehiclePart {
    // Exterior Front
    FRONT_BUMPER = "front_bumper",
    HOOD = "hood",
    FRONT_LEFT_FENDER = "front_left_fender",
    FRONT_RIGHT_FENDER = "front_right_fender",
    GRILLE = "grille",
    FRONT_LEFT_HEADLIGHT = "front_left_headlight",
    FRONT_RIGHT_HEADLIGHT = "front_right_headlight",
  
    // Exterior Rear
    REAR_BUMPER = "rear_bumper",
    TRUNK_LID = "trunk_lid",
    REAR_LEFT_TAILLIGHT = "rear_left_taillight",
    REAR_RIGHT_TAILLIGHT = "rear_right_taillight",
  
    // Doors
    FRONT_LEFT_DOOR = "front_left_door",
    FRONT_RIGHT_DOOR = "front_right_door",
    REAR_LEFT_DOOR = "rear_left_door",
    REAR_RIGHT_DOOR = "rear_right_door",
  
    // Side Panels
    LEFT_QUARTER_PANEL = "left_quarter_panel",
    RIGHT_QUARTER_PANEL = "right_quarter_panel",
    LEFT_ROCKER_PANEL = "left_rocker_panel",
    RIGHT_ROCKER_PANEL = "right_rocker_panel",
  
    // Glass
    WINDSHIELD = "windshield",
    REAR_WINDOW = "rear_window",
    SUNROOF = "sunroof",
  
    // Mirrors & Trim
    LEFT_MIRROR = "left_mirror",
    RIGHT_MIRROR = "right_mirror",
  
    // Wheels & Undercarriage
    FRONT_LEFT_WHEEL = "front_left_wheel",
    FRONT_RIGHT_WHEEL = "front_right_wheel",
    REAR_LEFT_WHEEL = "rear_left_wheel",
    REAR_RIGHT_WHEEL = "rear_right_wheel",
  
    // Structural (high priority)
    FRAME = "frame",
    SUSPENSION = "suspension",
    ENGINE_COMPARTMENT = "engine_compartment",
  
    // Other
    ROOF = "roof",
    OTHER = "other"
  }
  
  /**
   * Recommendation codes for routing logic
   */
  export enum RecommendationCode {
    FAST_TRACK_REVIEW = "fast_track_review",     // High confidence, low complexity
    MANUAL_REVIEW = "manual_review",             // Standard review needed
    ESCALATE_SENIOR = "escalate_senior",         // Senior adjuster required
    ESCALATE_STRUCTURAL = "escalate_structural", // Structural engineer needed
    REQUEST_MORE_PHOTOS = "request_more_photos", // Insufficient image quality
    POTENTIAL_FRAUD = "potential_fraud",         // Flag for SIU review
    TOTAL_LOSS_REVIEW = "total_loss_review",     // Likely total loss
    SHOP_INSPECTION = "shop_inspection"          // In-person inspection required
  }
  
  /**
   * Risk flag types for compliance and routing
   */
  export enum RiskFlag {
    LOW_CONFIDENCE = "low_confidence",
    HIGH_EXPOSURE = "high_exposure",
    STRUCTURAL_DAMAGE = "structural_damage",
    AIRBAG_DEPLOYMENT = "airbag_deployment",
    FRAME_DAMAGE = "frame_damage",
    FLOOD_INDICATORS = "flood_indicators",
    PRIOR_DAMAGE = "prior_damage",
    INCONSISTENT_DAMAGE = "inconsistent_damage",
    POOR_IMAGE_QUALITY = "poor_image_quality",
    MISSING_ANGLES = "missing_angles"
  }
  
  /**
   * Image quality assessment levels
   */
  export enum ImageQuality {
    EXCELLENT = "excellent",
    GOOD = "good",
    ACCEPTABLE = "acceptable",
    POOR = "poor",
    INSUFFICIENT = "insufficient"
  }
  
  /**
   * Claim status values
   */
  export enum ClaimStatus {
    PENDING = "pending",
    IN_REVIEW = "in_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    ESCALATED = "escalated",
    REQUIRES_INFO = "requires_info",
    CLOSED = "closed"
  }
  
  /**
   * Action types for audit logging
   */
  export enum ActionType {
    CLAIM_CREATED = "claim_created",
    PHOTOS_UPLOADED = "photos_uploaded",
    ASSESSMENT_RUN = "assessment_run",
    PART_OVERRIDDEN = "part_overridden",
    PART_ADDED = "part_added",
    PART_REMOVED = "part_removed",
    CLAIM_APPROVED = "claim_approved",
    CLAIM_REJECTED = "claim_rejected",
    CLAIM_ESCALATED = "claim_escalated",
    PHOTOS_REQUESTED = "photos_requested",
    COMMENT_ADDED = "comment_added",
    STATUS_CHANGED = "status_changed"
  }
  
  // ============================================================================
  // INTERFACES
  // ============================================================================
  
  /** Individual damage type on a part (e.g., dent, scratch) */
  export interface DamageType {
    type: string;               // e.g. "dent", "scratch", "crack"
    severity: string;           // "light", "medium", "heavy"
    area_percentage?: number;   // 0-100, optional
    location?: string;          // e.g. "center", "lower edge"
  }
  
  /** Single damaged vehicle part assessment */
  export interface DamagedPart {
    part_id: VehiclePart;       // Standardized part ID
    part_label: string;         // Human-readable label
    severity: PartSeverity;     // Damage level
    confidence: number;         // 0-1
    estimated_cost_min: number; // cents
    estimated_cost_max: number; // cents
    damage_types?: DamageType[]; // Detailed damage breakdown
    repair_action?: string;     // e.g. "repair", "replace", "refinish"
    notes?: string;             // AI-generated notes
  }
  
  /** Cost breakdown item */
  export interface CostBreakdownItem {
    label: string;
    details: string[];
  }
  
  /** Recommendation structure */
  export interface Recommendation {
    code: RecommendationCode;
    text: string;
    priority?: "low" | "medium" | "high";
  }
  
  /** Assessment metadata */
  export interface AssessmentMeta {
    model_version: string;
    processing_time_ms: number;
    timestamp: string;
    batch_id?: string;
  }
  
  /** Full AI assessment response */
  export interface Assessment {
    damaged_parts: DamagedPart[];
    total_min: number;          // cents
    total_max: number;          // cents
    overall_confidence: number; // 0-1
    recommendation: Recommendation;
    flags: RiskFlag[];
    image_quality: string[];    // Assessment notes
    cost_breakdown: CostBreakdownItem[];
    _meta: AssessmentMeta;
    fraud_risk_score?: number;  // Optional 0-1 fraud probability
  }
  
  /** Claim structure */
  export interface Claim {
    id: string;
    policy_number: string;
    claimant_name: string;
    incident_description: string;
    status: ClaimStatus | string;  // Support both enum and string
    injuries?: boolean;         // For policy.ts auto-escalation
    created_at?: string;
    updated_at?: string;
  }
  
  /** Audit log entry */
  export interface AuditLogEntry {
    id: string;
    claim_id: string;
    timestamp: string;
    user_id: string;
    action_type: ActionType | string; // Support both enum and string
    description: string;
    metadata?: Record<string, any>;
  }
  
  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================
  
  export function isValidSeverity(value: any): value is PartSeverity {
    return Object.values(PartSeverity).includes(value);
  }
  
  export function isValidRecommendation(value: any): value is RecommendationCode {
    return Object.values(RecommendationCode).includes(value);
  }
  
  export function isStructuralDamage(part: DamagedPart): boolean {
    return (
      part.severity === PartSeverity.STRUCTURAL ||
      part.part_id === VehiclePart.FRAME ||
      part.part_id === VehiclePart.SUSPENSION
    );
  }
  
  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  /** Confidence threshold for fast-track eligibility */
  export const FAST_TRACK_CONFIDENCE_THRESHOLD = 0.8;
  
  /** Maximum cost for fast-track (in cents) */
  export const FAST_TRACK_MAX_COST = 300000; // $3,000
  
  /** High-value training data thresholds */
  export const HIGH_VALUE_DELTA_ABSOLUTE = 30000; // $300
  export const HIGH_VALUE_DELTA_PERCENT = 0.2; // 20%
  
  /** Cost display formatting */
  export const formatCostRange = (min: number, max: number): string => {
    const minDollars = (min / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const maxDollars = (max / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${minDollars}–${maxDollars}`;
  };
  
  /** Confidence badge helper */
  export const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { label: `${Math.round(confidence * 100)}%`, color: "emerald" };
    if (confidence >= 0.7) return { label: `${Math.round(confidence * 100)}%`, color: "amber" };
    return { label: `${Math.round(confidence * 100)}%`, color: "rose" };
  };
  
  // ============================================================================
  // UI PHOTO METADATA
  // ============================================================================
  
  /** UI Photo metadata used by the Workbench */
  export interface PhotoMeta {
    id: string;
    url: string;          // object URL or CDN URL
    fileName: string;
    fileSize: number;     // bytes
    type: string;         // mime type
    qualityScore?: number;
    uploadedAt?: string;
    width?: number;       // Added for PhotoQuality component
    height?: number;      // Added for PhotoQuality component
  }
  
  // Lightweight UI-facing action log entry for the Workbench view.
  // (For persisted/tamper-proof logs, use AuditLogEntry above.)
  export interface ActionLogEntry {
    id: string;
    claimId: string;
    at: string;
    user: string;            // e.g. email or name
    type: string;            // e.g. "run_ai", "approve", "override"
    details?: any;
  }
  
  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================
  
  export function isHighRisk(assessment: Assessment): boolean {
    const highCost = assessment.total_max > 500_000; // $5,000 in cents
    const lowConfidence = assessment.overall_confidence < 0.6;
    const structuralFlag =
      assessment.flags.includes(RiskFlag.STRUCTURAL_DAMAGE) ||
      assessment.flags.includes(RiskFlag.FRAME_DAMAGE);
    const highFraud =
      typeof assessment.fraud_risk_score === "number" &&
      assessment.fraud_risk_score > 0.7;
  
    return lowConfidence || highCost || structuralFlag || highFraud;
  }