// src/app/api/damage_assessment/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  Assessment,
  DamagedPart,
  PartSeverity,
  VehiclePart,
  RecommendationCode,
  RiskFlag,
  Claim,
  formatCostRange,
} from "@/types/assessment";
import { FAST_TRACK } from "@/config/policy";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Feature flags
  USE_REAL_AI: process.env.USE_REAL_DAMAGE_AI === "true",
  ENABLE_CACHING: process.env.ENABLE_ASSESSMENT_CACHE === "true",
  ENABLE_ASYNC_PROCESSING: process.env.ENABLE_ASYNC_PROCESSING === "true",

  // Limits
  MAX_PHOTOS: 10,
  MIN_PHOTOS: 1,
  MAX_FILE_SIZE_MB: 10,

  // Thresholds (costs in cents)
  FAST_TRACK_MAX_COST: FAST_TRACK.MAX_COST,
  FAST_TRACK_MIN_CONFIDENCE: FAST_TRACK.MIN_CONFIDENCE,
  HIGH_EXPOSURE_THRESHOLD: 300_000, // $3,000
  STRUCTURAL_THRESHOLD: 500_000, // $5,000
  TOTAL_LOSS_THRESHOLD: 2_000_000, // $20,000

  // Timeouts
  AI_TIMEOUT_MS: 25_000,
  MOCK_LATENCY_MS: 2_000,

  // AI Provider
  AI_PROVIDER: process.env.AI_PROVIDER || "mock", // "scale" | "custom" | "openai" | "mock"
} as const;

// ============================================================================
// TYPES
// ============================================================================

// API-facing Claim may include aliases; normalize into our shared Claim shape
type ApiClaim = Claim & {
  policyNumber?: string; // alias for policy_number
  description?: string; // alias for incident_description
  vehicleInfo?: unknown;
};

interface AssessmentRequest {
  claim: ApiClaim;
  photos: Photo[];
  options?: {
    skip_cache?: boolean;
    webhook_url?: string;
    priority?: "low" | "normal" | "high";
    force_manual?: boolean;
  };
}

interface Photo {
  id: string;
  filename: string;
  url?: string;
  size_bytes?: number;
  mime_type?: string;
  metadata?: {
    width?: number;
    height?: number;
    taken_at?: string;
    location?: string;
  };
}

interface AssessmentResponse {
  success: boolean;
  data?: Assessment;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    request_id: string;
    timestamp: string;
    processing_time_ms: number;
    provider: string;
    cached?: boolean;
    version?: string;
  };
}

// ============================================================================
// MAIN HANDLER (POST)
// ============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();

  const headers = {
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
    "Cache-Control": "no-store",
  };

  try {
    // 1. Parse & validate
    const body = await req.json();
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        buildErrorResponse(validationError, requestId, startTime),
        { status: 400, headers }
      );
    }

    const { claim: rawClaim, photos, options } = body as AssessmentRequest;

    // Normalize claim: ensure canonical fields exist
    const claim: ApiClaim = {
      ...rawClaim,
      policy_number:
        rawClaim.policy_number ?? rawClaim.policyNumber ?? "",
      incident_description:
        rawClaim.incident_description ?? rawClaim.description ?? "",
    };

    // 2. Auth
    const authError = await checkAuthentication(req);
    if (authError) {
      return NextResponse.json(
        buildErrorResponse(
          authError,
          requestId,
          startTime,
          "AUTH_ERROR"
        ),
        { status: 401, headers }
      );
    }

    // 3. Rate limiting
    const rateLimitError = await checkRateLimit(
      req,
      claim.policy_number || "unknown"
    );
    if (rateLimitError) {
      return NextResponse.json(
        buildErrorResponse(
          rateLimitError,
          requestId,
          startTime,
          "RATE_LIMIT"
        ),
        { status: 429, headers }
      );
    }

    // 4. Force manual path
    if (options?.force_manual) {
      log("info", "Force manual review requested", {
        requestId,
        claimId: claim.id,
      });
      const manualAssessment = createManualReviewAssessment(
        claim,
        photos
      );
      return NextResponse.json(
        buildSuccessResponse(
          manualAssessment,
          requestId,
          startTime,
          false
        ),
        { headers }
      );
    }

    // 5. Cache
    if (CONFIG.ENABLE_CACHING && !options?.skip_cache) {
      const cached = await getCachedAssessment(
        claim.id,
        photos
      );
      if (cached) {
        log("info", "Cache hit", { requestId, claimId: claim.id });
        return NextResponse.json(
          buildSuccessResponse(
            cached,
            requestId,
            startTime,
            true
          ),
          { headers }
        );
      }
    }

    // 6. Async processing mode
    if (CONFIG.ENABLE_ASYNC_PROCESSING && options?.webhook_url) {
      await queueAssessmentJob({
        requestId,
        claim,
        photos,
        webhookUrl: options.webhook_url,
        priority: options.priority || "normal",
      });

      return NextResponse.json(
        {
          success: true,
          message: "Assessment queued for processing",
          job_id: requestId,
          status_url: `/api/damage_assessment/${requestId}/status`,
        },
        { status: 202, headers }
      );
    }

    // 7. Run assessment with timeout guard
    const assessmentPromise = runAssessment({ claim, photos });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Assessment timeout")),
        CONFIG.AI_TIMEOUT_MS
      )
    );

    const assessment = (await Promise.race([
      assessmentPromise,
      timeoutPromise,
    ])) as Assessment;

    // 8. Enrich
    const enrichedAssessment = await enrichAssessment(
      assessment,
      claim
    );

    // 9. Persist & cache
    await Promise.all([
      saveAssessmentToDatabase(
        enrichedAssessment,
        claim,
        requestId
      ),
      CONFIG.ENABLE_CACHING
        ? cacheAssessment(
            claim.id,
            photos,
            enrichedAssessment
          )
        : Promise.resolve(),
    ]);

    // 10. Audit log
    await logAuditEvent({
      claimId: claim.id,
      action: "assessment_completed",
      requestId,
      metadata: {
        photoCount: photos.length,
        confidence: enrichedAssessment.overall_confidence,
        totalCost: enrichedAssessment.total_max,
        recommendation:
          enrichedAssessment.recommendation.code,
        flags: enrichedAssessment.flags,
      },
    });

    log("info", "Assessment completed successfully", {
      requestId,
      claimId: claim.id,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(
      buildSuccessResponse(
        enrichedAssessment,
        requestId,
        startTime,
        false
      ),
      { headers }
    );
  } catch (error) {
    log("error", "Assessment failed", {
      requestId,
      error:
        error instanceof Error
          ? error.message
          : String(error),
      stack:
        error instanceof Error
          ? error.stack
          : undefined,
    });

    if (
      error instanceof Error &&
      error.message === "Assessment timeout"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TIMEOUT",
            message:
              "Assessment timed out. Please proceed with manual review or retry.",
          },
          metadata: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            processing_time_ms:
              Date.now() - startTime,
            provider: CONFIG.AI_PROVIDER,
          },
        } satisfies AssessmentResponse,
        { status: 504, headers }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ASSESSMENT_FAILED",
          message:
            "AI assessment unavailable. Please proceed with manual review.",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        },
        metadata: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          processing_time_ms:
            Date.now() - startTime,
          provider: CONFIG.AI_PROVIDER,
          version: "1.0.0",
        },
      } satisfies AssessmentResponse,
      { status: 500, headers }
    );
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateRequest(body: unknown): string | null {
  const b = body as Partial<AssessmentRequest>;

  if (!b?.claim) return "Missing required field: claim";
  if (!Array.isArray(b.photos))
    return "Photos must be provided as an array";

  const c = b.claim;

  if (!c.id) return "Claim must include id";
  if (!c.policy_number && !c.policyNumber) {
    return "Claim must include policy_number";
  }

  if (b.photos.length < CONFIG.MIN_PHOTOS) {
    return `At least ${CONFIG.MIN_PHOTOS} photo(s) required`;
  }
  if (b.photos.length > CONFIG.MAX_PHOTOS) {
    return `Maximum ${CONFIG.MAX_PHOTOS} photos allowed`;
  }

  for (let i = 0; i < b.photos.length; i++) {
    const photo = b.photos[i];

    if (!photo?.id || !photo.filename) {
      return `Photo ${i + 1} must have id and filename`;
    }

    if (
      photo.size_bytes &&
      photo.size_bytes >
        CONFIG.MAX_FILE_SIZE_MB *
          1024 *
          1024
    ) {
      return `Photo ${photo.filename} exceeds ${CONFIG.MAX_FILE_SIZE_MB}MB limit`;
    }

    if (
      photo.mime_type &&
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heif",
      ].includes(photo.mime_type)
    ) {
      return `Photo ${photo.filename} has unsupported format: ${photo.mime_type}`;
    }
  }

  return null;
}

// ============================================================================
// ASSESSMENT LOGIC
// ============================================================================

async function runAssessment(input: {
  claim: ApiClaim;
  photos: Photo[];
}): Promise<Assessment> {
  if (CONFIG.USE_REAL_AI) {
    switch (CONFIG.AI_PROVIDER) {
      case "scale":
        return runScaleAIAssessment(input);
      case "openai":
        return runOpenAIAssessment(input);
      case "custom":
        return runCustomModelAssessment(input);
      default:
        throw new Error(
          `Unknown AI provider: ${CONFIG.AI_PROVIDER}`
        );
    }
  }
  return runMockAssessment(input);
}

/**
 * Enhanced mock assessment for realistic testing.
 * Returns a structure compatible with src/types/assessment.ts.
 */
async function runMockAssessment(input: {
  claim: ApiClaim;
  photos: Photo[];
}): Promise<Assessment> {
  await new Promise((resolve) =>
    setTimeout(resolve, CONFIG.MOCK_LATENCY_MS)
  );

  const { claim, photos } = input;
  const parts: DamagedPart[] = [];

  const complexity = calculateComplexity(
    claim,
    photos
  );

  if (complexity === "minor") {
    parts.push({
      part_id: VehiclePart.REAR_BUMPER,
      part_label: "Rear bumper",
      severity: PartSeverity.MINOR,
      confidence: 0.92,
      estimated_cost_min: 35_000,
      estimated_cost_max: 55_000,
      damage_types: [
        {
          type: "scratch",
          severity: "light",
          area_percentage: 15,
        },
        {
          type: "scuff",
          severity: "light",
          area_percentage: 10,
        },
      ],
      repair_action: "repair",
    });
  } else if (complexity === "moderate") {
    parts.push(
      {
        part_id: VehiclePart.REAR_BUMPER,
        part_label: "Rear bumper",
        severity: PartSeverity.MODERATE,
        confidence: 0.88,
        estimated_cost_min: 80_000,
        estimated_cost_max: 120_000,
        damage_types: [
          {
            type: "dent",
            severity: "moderate",
            area_percentage: 40,
          },
          {
            type: "crack",
            severity: "light",
            area_percentage: 20,
          },
        ],
        repair_action: "replace",
      },
      {
        part_id: VehiclePart.TRUNK_LID,
        part_label: "Trunk lid",
        severity: PartSeverity.MODERATE,
        confidence: 0.76,
        estimated_cost_min: 60_000,
        estimated_cost_max: 90_000,
        damage_types: [
          {
            type: "dent",
            severity: "moderate",
            area_percentage: 25,
          },
          {
            type: "paint_damage",
            severity: "light",
            area_percentage: 15,
          },
        ],
        repair_action: "repair",
      },
      {
        part_id:
          VehiclePart.REAR_RIGHT_TAILLIGHT,
        part_label: "Right tail light",
        severity: PartSeverity.REPLACE,
        confidence: 0.98,
        estimated_cost_min: 25_000,
        estimated_cost_max: 35_000,
        damage_types: [
          {
            type: "crack",
            severity: "heavy",
            area_percentage: 80,
          },
        ],
        repair_action: "replace",
      }
    );
  } else if (complexity === "severe") {
    parts.push(
      {
        part_id: VehiclePart.REAR_BUMPER,
        part_label: "Rear bumper",
        severity: PartSeverity.SEVERE,
        confidence: 0.95,
        estimated_cost_min: 120_000,
        estimated_cost_max: 150_000,
        damage_types: [
          {
            type: "crush",
            severity: "heavy",
            area_percentage: 60,
          },
          {
            type: "tear",
            severity: "heavy",
            area_percentage: 30,
          },
        ],
        repair_action: "replace",
      },
      {
        part_id: VehiclePart.TRUNK_LID,
        part_label: "Trunk lid",
        severity: PartSeverity.SEVERE,
        confidence: 0.82,
        estimated_cost_min: 100_000,
        estimated_cost_max: 140_000,
        damage_types: [
          {
            type: "crush",
            severity: "heavy",
            area_percentage: 50,
          },
          {
            type: "misalignment",
            severity: "heavy",
          },
        ],
        repair_action: "replace",
      },
      {
        part_id:
          VehiclePart.LEFT_QUARTER_PANEL,
        part_label: "Left quarter panel",
        severity: PartSeverity.MODERATE,
        confidence: 0.71,
        estimated_cost_min: 80_000,
        estimated_cost_max: 120_000,
        damage_types: [
          {
            type: "dent",
            severity: "moderate",
            area_percentage: 35,
          },
          {
            type: "scratch",
            severity: "moderate",
            area_percentage: 25,
          },
        ],
        repair_action: "repair",
      },
      {
        part_id:
          VehiclePart.REAR_LEFT_TAILLIGHT,
        part_label: "Left tail light",
        severity: PartSeverity.REPLACE,
        confidence: 0.94,
        estimated_cost_min: 25_000,
        estimated_cost_max: 35_000,
        damage_types: [
          {
            type: "shatter",
            severity: "heavy",
            area_percentage: 90,
          },
        ],
        repair_action: "replace",
      }
    );
  } else {
    // structural / complex
    parts.push(
      {
        part_id: VehiclePart.FRAME,
        part_label: "Frame / unibody",
        severity: PartSeverity.STRUCTURAL,
        confidence: 0.68,
        estimated_cost_min: 300_000,
        estimated_cost_max: 500_000,
        damage_types: [
          { type: "bend", severity: "heavy" },
          {
            type: "structural_compromise",
            severity: "heavy",
          },
        ],
        repair_action: "specialist_required",
      },
      {
        part_id: VehiclePart.REAR_BUMPER,
        part_label: "Rear bumper",
        severity: PartSeverity.SEVERE,
        confidence: 0.96,
        estimated_cost_min: 120_000,
        estimated_cost_max: 150_000,
        repair_action: "replace",
      }
    );
  }

  const total_min = parts.reduce(
    (sum, p) => sum + p.estimated_cost_min,
    0
  );
  const total_max = parts.reduce(
    (sum, p) => sum + p.estimated_cost_max,
    0
  );
  const overall_confidence =
    parts.length > 0
      ? Math.round(
          (parts.reduce(
            (s, p) => s + p.confidence,
            0
          ) /
            parts.length) *
            100
        ) / 100
      : 0;

  const recommendation = determineRecommendation(
    overall_confidence,
    total_max,
    parts
  );
  const flags = collectRiskFlags(
    overall_confidence,
    total_max,
    parts,
    photos
  );
  const image_quality = assessImageQuality(photos);
  const cost_breakdown = generateCostBreakdown(
    parts
  );
  const fraud_risk_score = calculateFraudRisk(
    claim,
    photos,
    parts
  );

  // simple batch_id encodes mock context
  const batch_id = `mock:${complexity}:${photos.length}`;

  return {
    damaged_parts: parts,
    total_min,
    total_max,
    overall_confidence,
    recommendation,
    flags,
    image_quality,
    cost_breakdown,
    fraud_risk_score,
    _meta: {
      model_version: "mock-v2.1.0",
      processing_time_ms:
        CONFIG.MOCK_LATENCY_MS,
      timestamp: new Date().toISOString(),
      batch_id,
    },
  };
}

// ============================================================================
// REAL INTEGRATIONS (STUBS)
// ============================================================================

async function runScaleAIAssessment(_input: {
  claim: ApiClaim;
  photos: Photo[];
}): Promise<Assessment> {
  throw new Error(
    "Scale AI integration not implemented. Set USE_REAL_AI=false or implement Scale AI integration."
  );
}

async function runOpenAIAssessment(_input: {
  claim: ApiClaim;
  photos: Photo[];
}): Promise<Assessment> {
  throw new Error(
    "OpenAI integration not implemented. Set USE_REAL_AI=false or implement OpenAI integration."
  );
}

async function runCustomModelAssessment(_input: {
  claim: ApiClaim;
  photos: Photo[];
}): Promise<Assessment> {
  throw new Error(
    "Custom model integration not implemented. Set USE_REAL_AI=false or implement custom model integration."
  );
}

// ============================================================================
// BUSINESS LOGIC HELPERS
// ============================================================================

function calculateComplexity(
  claim: ApiClaim,
  photos: Photo[]
): "minor" | "moderate" | "severe" | "structural" {
  const photoCount = photos.length;
  const desc =
    claim.incident_description ??
    claim.description ??
    "";
  const description = desc.toLowerCase();

  if (
    description.includes("total loss") ||
    description.includes("rollover")
  ) {
    return "structural";
  }
  if (
    photoCount >= 6 ||
    description.includes("multiple") ||
    description.includes("severe")
  ) {
    return "severe";
  }
  if (
    photoCount >= 3 ||
    description.includes("moderate") ||
    description.includes("dent")
  ) {
    return "moderate";
  }
  return "minor";
}

function determineRecommendation(
  confidence: number,
  totalMax: number,
  parts: DamagedPart[]
): Assessment["recommendation"] {
  const hasStructural = parts.some(
    (p) =>
      p.severity === PartSeverity.STRUCTURAL ||
      p.part_id === VehiclePart.FRAME
  );

  if (
    hasStructural ||
    totalMax >= CONFIG.STRUCTURAL_THRESHOLD
  ) {
    return {
      code: RecommendationCode.ESCALATE_STRUCTURAL,
      text: "Escalate for structural review.",
      priority: "high",
    };
  }

  if (
    confidence >=
      CONFIG.FAST_TRACK_MIN_CONFIDENCE &&
    totalMax <= CONFIG.FAST_TRACK_MAX_COST &&
    parts.length <= 3
  ) {
    return {
      code: RecommendationCode.FAST_TRACK_REVIEW,
      text: "Fast-track approval recommended.",
      priority: "low",
    };
  }

  if (
    confidence < 0.6 ||
    totalMax >=
      CONFIG.HIGH_EXPOSURE_THRESHOLD
  ) {
    return {
      code: RecommendationCode.ESCALATE_SENIOR,
      text: "Escalate to senior adjuster.",
      priority: "high",
    };
  }

  return {
    code: RecommendationCode.MANUAL_REVIEW,
    text: "Manual review recommended.",
    priority: "medium",
  };
}

function collectRiskFlags(
  confidence: number,
  totalMax: number,
  parts: DamagedPart[],
  photos: Photo[]
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (confidence < 0.6)
    flags.push(RiskFlag.LOW_CONFIDENCE);
  if (
    totalMax >=
    CONFIG.HIGH_EXPOSURE_THRESHOLD
  ) {
    flags.push(RiskFlag.HIGH_EXPOSURE);
  }

  if (
    parts.some(
      (p) =>
        p.severity ===
          PartSeverity.STRUCTURAL ||
        p.part_id === VehiclePart.FRAME
    )
  ) {
    flags.push(RiskFlag.STRUCTURAL_DAMAGE);
  }

  if (photos.length < 3) {
    flags.push(RiskFlag.MISSING_ANGLES);
  }

  const severityVariance =
    calculateSeverityVariance(parts);
  if (severityVariance > 0.5) {
    flags.push(RiskFlag.INCONSISTENT_DAMAGE);
  }

  return flags;
}

function calculateSeverityVariance(
  parts: DamagedPart[]
): number {
  if (parts.length < 2) return 0;

  const scores: number[] = parts.map((p) => {
    switch (p.severity) {
      case PartSeverity.MINOR:
        return 1;
      case PartSeverity.MODERATE:
        return 2;
      case PartSeverity.SEVERE:
        return 3;
      case PartSeverity.REPLACE:
        return 3.5;
      case PartSeverity.STRUCTURAL:
        return 4;
      default:
        return 0;
    }
  });

  const mean =
    scores.reduce(
      (a, b) => a + b,
      0
    ) / scores.length;

  const variance =
    scores.reduce(
      (sum, s) =>
        sum +
        Math.pow(s - mean, 2),
      0
    ) / scores.length;

  return Math.sqrt(variance);
}

function assessImageQuality(
  photos: Photo[]
): string[] {
  const notes: string[] = [];

  if (!photos.length) {
    notes.push("No photos provided.");
    return notes;
  }

  if (photos.length < 3) {
    notes.push(
      "Limited photo set; upload additional angles for better assessment."
    );
  }

  const lowRes = photos.some(
    (p) =>
      p.metadata &&
      (p.metadata.width ?? 0) < 1280
  );

  if (lowRes) {
    notes.push(
      "Some photos appear low-resolution; higher resolution images are recommended."
    );
  }

  return notes;
}

function generateCostBreakdown(
  parts: DamagedPart[]
): Assessment["cost_breakdown"] {
  if (!parts.length) return [];

  return parts.map((p) => ({
    label: p.part_label,
    details: [
      `Severity: ${p.severity}`,
      `Estimated range: ${formatCostRange(
        p.estimated_cost_min,
        p.estimated_cost_max
      )}`,
      p.repair_action
        ? `Recommended action: ${p.repair_action}`
        : "Action: to be confirmed by adjuster",
    ],
  }));
}

function calculateFraudRisk(
  claim: ApiClaim,
  photos: Photo[],
  parts: DamagedPart[]
): number {
  let riskScore = 0.05;

  if (photos.length < 2) riskScore += 0.15;
  if (
    parts.some(
      (p) => p.confidence < 0.5
    )
  ) {
    riskScore += 0.1;
  }

  const desc =
    claim.incident_description ??
    claim.description ??
    "";
  if (desc.toLowerCase().includes("staged")) {
    riskScore += 0.2;
  }

  return Math.min(0.95, riskScore);
}

async function enrichAssessment(
  assessment: Assessment,
  claim: ApiClaim
): Promise<Assessment> {
  return {
    ...assessment,
    _meta: {
      ...assessment._meta,
      batch_id:
        assessment._meta?.batch_id ??
        `claim:${claim.id}`,
    },
  };
}

function createManualReviewAssessment(
  claim: ApiClaim,
  photos: Photo[]
): Assessment {
  return {
    damaged_parts: [],
    total_min: 0,
    total_max: 0,
    overall_confidence: 0,
    recommendation: {
      code: RecommendationCode.MANUAL_REVIEW,
      text: "Manual review requested – AI assessment bypassed.",
      priority: "medium",
    },
    flags: [],
    image_quality: [
      "Manual review path selected; AI model not invoked.",
    ],
    cost_breakdown: [],
    fraud_risk_score: 0,
    _meta: {
      model_version: "manual-v1.0.0",
      processing_time_ms: 0,
      timestamp: new Date().toISOString(),
      batch_id: `manual:${claim.id}:${photos.length}`,
    },
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${crypto
    .randomBytes(8)
    .toString("hex")}`;
}

function buildSuccessResponse(
  assessment: Assessment,
  requestId: string,
  startTime: number,
  cached: boolean
): AssessmentResponse {
  return {
    success: true,
    data: assessment,
    metadata: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      processing_time_ms:
        Date.now() - startTime,
      provider: CONFIG.AI_PROVIDER,
      cached,
      version: "1.0.0",
    },
  };
}

function buildErrorResponse(
  message: string,
  requestId: string,
  startTime: number,
  code = "VALIDATION_ERROR"
): AssessmentResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
    metadata: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      processing_time_ms:
        Date.now() - startTime,
      provider: CONFIG.AI_PROVIDER,
      version: "1.0.0",
    },
  };
}

function log(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>
): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  } else {
    // eslint-disable-next-line no-console
    console[level](message, meta);
  }
}

// ============================================================================
// INTEGRATION STUB HELPERS
// ============================================================================

async function checkAuthentication(
  req: NextRequest
): Promise<string | null> {
  const authHeader =
    req.headers.get("authorization");
  if (
    process.env.REQUIRE_AUTH === "true" &&
    !authHeader
  ) {
    return "Missing authentication credentials";
  }
  return null;
}

async function checkRateLimit(
  _req: NextRequest,
  _policyNumber: string
): Promise<string | null> {
  if (process.env.ENABLE_RATE_LIMIT === "true") {
    // plug in rate limiter here
  }
  return null;
}

async function getCachedAssessment(
  _claimId: string,
  _photos: Photo[]
): Promise<Assessment | null> {
  return null;
}

async function cacheAssessment(
  _claimId: string,
  _photos: Photo[],
  _assessment: Assessment
): Promise<void> {
  // implement cache if desired
}

async function saveAssessmentToDatabase(
  assessment: Assessment,
  claim: ApiClaim,
  requestId: string
): Promise<void> {
  log("info", "Assessment saved to database (mock)", {
    claimId: claim.id,
    requestId,
    total_max: assessment.total_max,
    overall_confidence:
      assessment.overall_confidence,
  });
}

async function logAuditEvent(event: {
  claimId: string;
  action: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  log("info", "Audit event logged", event);
}

async function queueAssessmentJob(job: {
  requestId: string;
  claim: ApiClaim;
  photos: Photo[];
  webhookUrl: string;
  priority: string;
}): Promise<void> {
  log("info", "Assessment job queued (mock)", {
    requestId: job.requestId,
    priority: job.priority,
  });
}

// ============================================================================
// GET (health/status)
// ============================================================================

export async function GET(
  _req: NextRequest
): Promise<NextResponse> {
  return NextResponse.json({
    status: "healthy",
    provider: CONFIG.AI_PROVIDER,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
