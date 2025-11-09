import { NextRequest, NextResponse } from "next/server";
import type { Assessment, DamagedPart } from "../../../types/assessment";



export async function POST(req: NextRequest) {
  // Simulate realistic model latency
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const body = await req.json();
  const photos: string[] = body.photos || [];

  const complexity = photos.length;

  let damaged_parts: DamagedPart[];

  if (complexity <= 2) {
    damaged_parts = [
      {
        part_label: "Rear bumper",
        severity: "minor",
        confidence: 0.86,
        estimated_cost_min: 300,
        estimated_cost_max: 600,
      },
    ];
  } else if (complexity <= 4) {
    damaged_parts = [
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
  } else {
    damaged_parts = [
      {
        part_label: "Rear bumper",
        severity: "moderate",
        confidence: 0.82,
        estimated_cost_min: 600,
        estimated_cost_max: 900,
      },
      {
        part_label: "Trunk lid",
        severity: "moderate",
        confidence: 0.75,
        estimated_cost_min: 350,
        estimated_cost_max: 550,
      },
      {
        part_label: "Left quarter panel",
        severity: "minor",
        confidence: 0.7,
        estimated_cost_min: 250,
        estimated_cost_max: 400,
      },
      {
        part_label: "Right tail light",
        severity: "replace",
        confidence: 0.97,
        estimated_cost_min: 150,
        estimated_cost_max: 220,
      },
    ];
  }

  const total_min = damaged_parts.reduce(
    (sum, p) => sum + p.estimated_cost_min,
    0
  );
  const total_max = damaged_parts.reduce(
    (sum, p) => sum + p.estimated_cost_max,
    0
  );

  const overall_confidence =
    damaged_parts.reduce((sum, p) => sum + p.confidence, 0) /
    damaged_parts.length;

  const recommendation: Assessment["recommendation"] =
    overall_confidence >= 0.8 && total_max < 3000
      ? {
          code: "fast_track_review",
          text:
            "✓ Fast-track eligible – Approve with verification (high confidence, low complexity).",
        }
      : {
          code: "escalate",
          text:
            "Route to senior adjuster – low confidence or higher exposure; manual review recommended.",
        };

  const flags: string[] = [];
  if (overall_confidence < 0.6) {
    flags.push("Low model confidence – requires manual review.");
  }
  if (total_max >= 3000) {
    flags.push("High exposure (≥ $3,000) – escalate or verify.");
  }

  const image_quality: string[] = [];
  if (photos.length >= 3) {
    image_quality.push("Resolution acceptable for automated review (mock).");
    image_quality.push("Key angles covered (mock).");
  } else {
    image_quality.push("Limited coverage – additional photos recommended.");
  }

  const cost_breakdown = damaged_parts.map((p) => ({
    label: p.part_label,
    details: [
      `Estimated range: $${p.estimated_cost_min.toLocaleString()}–$${p.estimated_cost_max.toLocaleString()}`,
    ],
  }));


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
      processing_time_ms: 2500,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response);
}
