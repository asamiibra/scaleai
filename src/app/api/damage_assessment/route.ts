import { NextRequest, NextResponse } from "next/server";
import {
  DamagedPart,
  CostBreakdownEntry,
  Assessment,
} from "../../../types/assessment";

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Simulate realistic latency (e.g., CV + policy engine)
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const body = await req.json();
  const photos: string[] = body.photos || [];
  const complexity = photos.length;

  // Simple heuristic mock
  const damaged_parts: DamagedPart[] =
    complexity <= 2
      ? [
          {
            part_label: "Rear bumper",
            severity: "minor",
            confidence: 0.9,
            estimated_cost_min: 300,
            estimated_cost_max: 600,
          },
        ]
      : [
          {
            part_label: "Rear bumper",
            severity: "severe",
            confidence: 0.95,
            estimated_cost_min: 800,
            estimated_cost_max: 1200,
          },
          {
            part_label: "Trunk lid",
            severity: "moderate",
            confidence: 0.78,
            estimated_cost_min: 400,
            estimated_cost_max: 600,
          },
          {
            part_label: "Right tail light",
            severity: "replace",
            confidence: 0.99,
            estimated_cost_min: 150,
            estimated_cost_max: 200,
          },
        ];

  const total_min = damaged_parts.reduce(
    (sum, p) => sum + p.estimated_cost_min,
    0
  );
  const total_max = damaged_parts.reduce(
    (sum, p) => sum + p.estimated_cost_max,
    0
  );

  const overall_confidence =
    damaged_parts.length === 0
      ? 0
      : damaged_parts.reduce((sum, p) => sum + p.confidence, 0) /
        damaged_parts.length;

  const fastTrack =
    overall_confidence >= 0.75 && total_max < 3000 && damaged_parts.length > 0;

  const recommendation: Assessment["recommendation"] = fastTrack
    ? {
        code: "fast_track_eligible",
        text:
          "✓ Fast-track eligible – Approve with verification (high confidence, low complexity).",
      }
    : {
        code: "escalate",
        text:
          "Route to senior adjuster (low confidence, high exposure, or policy exceptions).",
      };

  const flags: string[] = [];
  if (overall_confidence < 0.6) flags.push("low_confidence");
  if (total_max >= 3000) flags.push("high_estimate");

  // Image quality mock
  const iqChecks: string[] = ["Resolution acceptable for automated review (mock)."];
  const iqMissing: string[] = [];

  if (photos.length >= 3) {
    iqChecks.push("Key angles covered (mock).");
  } else {
    iqMissing.push("Additional exterior angles recommended.");
  }

  if (photos.length < 4) {
    iqMissing.push("Close-up of trunk hinge recommended (optional).");
  }

  const image_quality = {
    checks: iqChecks,
    missing: iqMissing,
  };

  // Cost breakdown rationale (mock)
  const cost_breakdown: CostBreakdownEntry[] = damaged_parts.map((p) => {
    if (p.part_label === "Rear bumper") {
      return {
        part_label: p.part_label,
        items: [
          { label: "Part (OEM)", amount: 450 },
          { label: "Labor (2.5h @ $140/hr)", amount: 350 },
          { label: "Paint / blend", amount: 200 },
        ],
      };
    }
    if (p.part_label === "Trunk lid") {
      return {
        part_label: p.part_label,
        items: [
          { label: "Repair / alignment", amount: 200 },
          { label: "Paint", amount: 200 },
        ],
      };
    }
    if (p.part_label === "Right tail light") {
      return {
        part_label: p.part_label,
        items: [
          { label: "Part (aftermarket)", amount: 120 },
          { label: "Labor", amount: 30 },
        ],
      };
    }
    return { part_label: p.part_label, items: [] };
  });

  const elapsed = Date.now() - start;

  const response: Assessment = {
    damaged_parts,
    total_min,
    total_max,
    overall_confidence,
    recommendation,
    flags,
    image_quality,
    cost_breakdown,
    _meta: {
      model_version: "v2.3.1-mock",
      timestamp: new Date().toISOString(),
      processing_time_ms: elapsed,
    },
  };

  return NextResponse.json(response);
}
