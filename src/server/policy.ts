// src/server/policy.ts

/**
 * Policy Engine
 *
 * Applies business rules, routing logic, and compliance checks
 * to AI-generated assessments. This is the decision-making layer
 * that determines how claims should be handled.
 */

import {
    Assessment,
    DamagedPart,
    PartSeverity,
    VehiclePart,
    RecommendationCode,
    RiskFlag,
    Claim,
  } from "@/types/assessment";
  
  // ============================================================================
  // CONFIG
  // ============================================================================
  
  const FAST_TRACK = { CONFIDENCE_THRESHOLD: 0.8, MAX_COST: 300_000 }; // cents
  const ESCALATION = {
    MIN_CONFIDENCE: 0.6,
    HIGH_EXPOSURE_THRESHOLD: 500_000, // cents
  };
  const MODEL = { VERSION: "v2.3.1" };
  const FEATURES = {
    ENABLE_FRAUD_DETECTION: true,
    ENABLE_PERSISTENT_STORAGE: true,
  };
  
  // ============================================================================
  // TYPES
  // ============================================================================
  
  interface PolicyContext {
    claim?: Claim;
    historicalData?: {
      similarClaimsCount: number;
      averageFinalCost: number; // cents
      standardDeviation: number; // same unit as above or normalized
    };
    userId?: string;
  }
  
  interface RoutingInstructions {
    assignTo: "agent" | "senior_adjuster" | "structural_engineer" | "siu";
    priority: 1 | 2 | 3 | 4 | 5;
    estimatedTimeMinutes: number;
    requiredActions: string[];
  }
  
  interface PolicyDecision {
    assessment: Assessment;
    routingInstructions: RoutingInstructions;
    complianceNotes: string[];
  }
  
  // ============================================================================
  // MAIN POLICY APPLICATION
  // ============================================================================
  
  /**
   * Apply comprehensive policy rules to generate a complete Assessment
   * plus routing and compliance guidance.
   */
  export function applyPolicy(
    parts: DamagedPart[],
    context: PolicyContext = {}
  ): PolicyDecision {
    // Totals
    const { total_min, total_max } = calculateTotals(parts);
  
    // Overall confidence
    const overall_confidence = calculateOverallConfidence(parts);
  
    // Risk flags
    const flags = collectRiskFlags(
      parts,
      total_max,
      overall_confidence,
      context
    );
  
    // Recommendation
    const recommendation = determineRecommendation(
      overall_confidence,
      total_max,
      parts,
      flags
    );
  
    // Fraud risk
    const fraud_risk_score = FEATURES.ENABLE_FRAUD_DETECTION
      ? calculateFraudRiskScore(parts, context)
      : undefined;
  
    // Image quality notes (simple heuristic)
    const image_quality = generateImageQualityCheck(parts);
  
    // Cost breakdown
    const cost_breakdown = generateCostBreakdown(parts);
  
    // Compliance notes
    const complianceNotes = generateComplianceNotes(
      overall_confidence,
      total_max,
      flags,
      fraud_risk_score
    );
  
    // Build Assessment
    const assessment: Assessment = {
      damaged_parts: parts,
      total_min,
      total_max,
      overall_confidence,
      recommendation,
      flags,
      image_quality,
      cost_breakdown,
      _meta: {
        model_version: MODEL.VERSION,
        processing_time_ms: 25,
        timestamp: new Date().toISOString(),
        batch_id: context.userId ? `user:${context.userId}` : undefined,
      },
      fraud_risk_score,
    };
  
    // Routing
    const routingInstructions = determineRouting(recommendation.code);
  
    return {
      assessment,
      routingInstructions,
      complianceNotes,
    };
  }
  
  // ============================================================================
  // CALCULATION HELPERS
  // ============================================================================
  
  function calculateTotals(
    parts: DamagedPart[]
  ): { total_min: number; total_max: number } {
    return parts.reduce(
      (acc, part) => ({
        total_min: acc.total_min + part.estimated_cost_min,
        total_max: acc.total_max + part.estimated_cost_max,
      }),
      { total_min: 0, total_max: 0 }
    );
  }
  
  function calculateOverallConfidence(parts: DamagedPart[]): number {
    if (parts.length === 0) return 0;
    const avg =
      parts.reduce((sum, p) => sum + p.confidence, 0) / parts.length;
    return Math.round(avg * 100) / 100;
  }
  
  function collectRiskFlags(
    parts: DamagedPart[],
    total_max: number,
    overall_confidence: number,
    context: PolicyContext
  ): RiskFlag[] {
    const flags: RiskFlag[] = [];
  
    // Structural damage (including frame considered structural)
    if (
      parts.some(
        (p) =>
          p.severity === PartSeverity.STRUCTURAL ||
          p.part_id === VehiclePart.FRAME
      )
    ) {
      if (!flags.includes(RiskFlag.STRUCTURAL_DAMAGE)) {
        flags.push(RiskFlag.STRUCTURAL_DAMAGE);
      }
    }
  
    // High exposure
    if (total_max > ESCALATION.HIGH_EXPOSURE_THRESHOLD) {
      flags.push(RiskFlag.HIGH_EXPOSURE);
    }
  
    // Low confidence
    if (overall_confidence < ESCALATION.MIN_CONFIDENCE) {
      flags.push(RiskFlag.LOW_CONFIDENCE);
    }
  
    // Historical anomaly → inconsistent
    if (
      context.historicalData &&
      context.historicalData.standardDeviation > 0.3
    ) {
      flags.push(RiskFlag.INCONSISTENT_DAMAGE);
    }
  
    return flags;
  }
  
  function determineRecommendation(
    confidence: number,
    total_max: number,
    parts: DamagedPart[],
    flags: RiskFlag[]
  ): Assessment["recommendation"] {
    // Structural priority
    if (flags.includes(RiskFlag.STRUCTURAL_DAMAGE)) {
      return {
        code: RecommendationCode.ESCALATE_STRUCTURAL,
        text: "Escalate for structural review",
      };
    }
  
    // Fast-track window
    if (
      confidence >= FAST_TRACK.CONFIDENCE_THRESHOLD &&
      total_max <= FAST_TRACK.MAX_COST &&
      !flags.includes(RiskFlag.HIGH_EXPOSURE) &&
      !flags.includes(RiskFlag.LOW_CONFIDENCE)
    ) {
      return {
        code: RecommendationCode.FAST_TRACK_REVIEW,
        text: "Fast-track approval recommended",
      };
    }
  
    // Senior escalation
    if (
      confidence < ESCALATION.MIN_CONFIDENCE ||
      total_max > ESCALATION.HIGH_EXPOSURE_THRESHOLD
    ) {
      return {
        code: RecommendationCode.ESCALATE_SENIOR,
        text: "Escalate to senior adjuster",
      };
    }
  
    // Default manual review
    return {
      code: RecommendationCode.MANUAL_REVIEW,
      text: "Manual review recommended",
    };
  }
  
  function calculateFraudRiskScore(
    parts: DamagedPart[],
    context: PolicyContext
  ): number {
    let score = 0;
  
    // High cost with minor severity
    if (
      parts.some(
        (p) =>
          p.severity === PartSeverity.MINOR &&
          p.estimated_cost_max > 100_000
      )
    ) {
      score += 0.3;
    }
  
    // Many fragmented damages
    if (parts.length > 5) score += 0.2;
  
    // Historical mismatch
    if (context.historicalData) {
      const estTotal = parts.reduce(
        (sum, p) => sum + p.estimated_cost_max,
        0
      );
      if (
        Math.abs(context.historicalData.averageFinalCost - estTotal) >
        context.historicalData.standardDeviation * 2
      ) {
        score += 0.4;
      }
    }
  
    return Math.min(1, score);
  }
  
  function generateImageQualityCheck(parts: DamagedPart[]): string[] {
    const notes: string[] = [];
  
    if (parts.some((p) => p.confidence < 0.6)) {
      notes.push(
        "One or more parts have low model confidence; request clearer photos or additional angles."
      );
    }
  
    if (parts.length === 0) {
      notes.push("No parts detected; verify that photos clearly show the vehicle.");
    }
  
    return notes;
  }
  
  function generateCostBreakdown(
    parts: DamagedPart[]
  ): Assessment["cost_breakdown"] {
    return parts.map((p) => ({
      label: p.part_label,
      details: [
        `Severity: ${p.severity}`,
        `Range: $${(p.estimated_cost_min / 100).toFixed(
          0
        )} - $${(p.estimated_cost_max / 100).toFixed(0)}`,
        p.repair_action
          ? `Action: ${p.repair_action}`
          : "Action: assess/confirm with shop",
      ],
    }));
  }
  
  function generateComplianceNotes(
    confidence: number,
    total_max: number,
    flags: RiskFlag[],
    fraud_risk_score?: number
  ): string[] {
    const notes: string[] = [];
  
    if (confidence < 0.5) {
      notes.push(
        "Low model confidence: full manual verification required before payout."
      );
    }
  
    if (total_max > 1_000_000) {
      notes.push(
        "High value claim: ensure enhanced approval workflow and compliance review."
      );
    }
  
    if (flags.includes(RiskFlag.STRUCTURAL_DAMAGE)) {
      notes.push(
        "Structural damage indicated: ensure safety standards and OEM repair guidelines are followed."
      );
    }
  
    if (fraud_risk_score !== undefined && fraud_risk_score > 0.5) {
      notes.push(
        `Elevated fraud risk score (${fraud_risk_score.toFixed(
          2
        )}): document justification and consider SIU review.`
      );
    }
  
    return notes;
  }
  
  // ============================================================================
  // ROUTING HELPERS
  // ============================================================================
  
  function determineRouting(
    code: RecommendationCode
  ): RoutingInstructions {
    const baseRouting: RoutingInstructions = {
      assignTo: "agent",
      priority: 3,
      estimatedTimeMinutes: 30,
      requiredActions: ["Initial review", "Cost confirmation"],
    };
  
    switch (code) {
      case RecommendationCode.FAST_TRACK_REVIEW:
        return {
          ...baseRouting,
          priority: 2,
          estimatedTimeMinutes: 15,
          requiredActions: ["Quick validation", "Fast-track approval"],
        };
  
      case RecommendationCode.ESCALATE_STRUCTURAL:
        return {
          assignTo: "structural_engineer",
          priority: 5,
          estimatedTimeMinutes: 120,
          requiredActions: [
            "Structural assessment",
            "Safety inspection",
            "Detailed report",
          ],
        };
  
      case RecommendationCode.ESCALATE_SENIOR:
        return {
          assignTo: "senior_adjuster",
          priority: 4,
          estimatedTimeMinutes: 60,
          requiredActions: [
            "Comprehensive review",
            "Cost validation",
            "Approval decision",
          ],
        };
  
      case RecommendationCode.MANUAL_REVIEW:
      default:
        return baseRouting;
    }
  }
  
  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================
  
  export function validateAssessment(
    assessment: Assessment
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
  
    if (assessment.damaged_parts.length === 0) {
      errors.push("Assessment must include at least one damaged part.");
    }
  
    if (assessment.total_min > assessment.total_max) {
      errors.push("Minimum cost cannot exceed maximum cost.");
    }
  
    if (
      assessment.overall_confidence < 0 ||
      assessment.overall_confidence > 1
    ) {
      errors.push("Confidence must be between 0 and 1.");
    }
  
    if (!assessment.recommendation?.code) {
      errors.push("Assessment must include a recommendation code.");
    }
  
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Check if assessment requires senior approval.
   */
  export function requiresSeniorApproval(
    assessment: Assessment
  ): boolean {
    return (
      assessment.total_max >= ESCALATION.HIGH_EXPOSURE_THRESHOLD ||
      assessment.overall_confidence < ESCALATION.MIN_CONFIDENCE ||
      assessment.flags.includes(RiskFlag.STRUCTURAL_DAMAGE) ||
      (assessment.fraud_risk_score !== undefined &&
        assessment.fraud_risk_score > 0.7)
    );
  }
  
  /**
   * Check if claim should be auto-escalated.
   */
  export function shouldAutoEscalate(
    assessment: Assessment,
    claim?: Claim & { injuries?: boolean | string }
  ): boolean {
    // Injuries reported
    if (claim?.injuries) return true;
  
    // Structural damage
    if (assessment.flags.includes(RiskFlag.STRUCTURAL_DAMAGE)) return true;
  
    // High fraud risk
    if (
      assessment.fraud_risk_score !== undefined &&
      assessment.fraud_risk_score > 0.7
    ) {
      return true;
    }
  
    return false;
  }
  
  // ============================================================================
  // EXPORT TYPES
  // ============================================================================
  
  export type { PolicyContext, PolicyDecision };
  