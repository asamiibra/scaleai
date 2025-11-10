"use client";

import { useState } from "react";
import ClaimForm from "../components/ClaimForm";
import ImageUploader from "../components/ImageUploader";
import AssessmentPanel from "../components/AssessmentPanel";
import ActionLog from "../components/ActionLog";

import type { Assessment, DamagedPart } from "@/types/assessment";
import {
  PartSeverity,
  VehiclePart,
  RecommendationCode,
} from "@/types/assessment";

/* ---------- Types ---------- */

type Claim = {
  id: string;
  policyNumber: string;
  name: string;
  description: string;
};

type PanelActionMeta = {
  complete?: boolean; // when true: show completion + enable "start new claim"
};

/* ---------- Helpers ---------- */

const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);

const formatRange = (min: number, max: number) =>
  `$${(min / 100).toLocaleString()}–$${(max / 100).toLocaleString()}`;

/* ==================================================================== */

export default function Home() {
  /* Core state */
  const [claim, setClaim] = useState<Claim | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [actions, setActions] = useState<string[]>([]);

  /* UX state */
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [allowNewClaim, setAllowNewClaim] = useState(false);

  /* Simple undo: stack of snapshots */
  type Snapshot = {
    claim: Claim | null;
    photos: File[];
    assessment: Assessment | null;
    actions: string[];
    step: 1 | 2 | 3 | 4;
  };
  const [history, setHistory] = useState<Snapshot[]>([]);

  const snapshot = () => {
    setHistory((prev) => [
      ...prev,
      { claim, photos, assessment, actions, step },
    ]);
  };

  const log = (message: string) => {
    setActions((prev) => [...prev, `${ts()} - ${message}`]);
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy.pop()!;
      setClaim(last.claim);
      setPhotos(last.photos);
      setAssessment(last.assessment);
      setActions(last.actions);
      setStep(last.step);
      setStatus("Last change undone.");
      setAllowNewClaim(false);
      setUploadHint(null);
      setPolicyError(null);
      return copy;
    });
  };

  /* ---------- Step 1: Claim context ---------- */

  const handleClaimSubmit = (partial: Omit<Claim, "id">) => {
    const normalized = partial.policyNumber.trim().toUpperCase();
    if (!normalized.startsWith("POL-")) {
      setPolicyError('Policy # must start with "POL-".');
      log(`[SYSTEM] Invalid policy number "${partial.policyNumber}" rejected.`);
      return;
    }

    snapshot();
    const newClaim: Claim = {
      id: Math.random().toString(36).slice(2),
      ...partial,
      policyNumber: normalized,
    };
    setClaim(newClaim);
    setPolicyError(null);
    setStep(2);
    setUploadHint("Please upload damage photos to proceed.");
    log(`Claim context set for ${newClaim.policyNumber}`);
  };

  /* ---------- Step 2: Photos ---------- */

  const handlePhotosChange = (newPhotos: File[]) => {
    if (!claim) return;
    snapshot();
    setPhotos(newPhotos);
    setUploadHint(null);
    if (newPhotos.length >= 2) {
      setStep(3);
      log(`Uploaded ${newPhotos.length} photos`);
    } else {
      setStep(2);
    }
  };

  /* ---------- Step 3: Assessment ---------- */

  const handleRunAssessment = () => {
    if (!claim || photos.length < 2) return;
    snapshot();
    setIsRunning(true);
    setStatus("Running AI assessment...");
    log("AI assessment started");

    // Mock assessment (replace with actual API call)
    setTimeout(() => {
      const mockAssessment: Assessment = {
        damaged_parts: [
          {
            part_id: VehiclePart.REAR_BUMPER,
            part_label: "Rear Bumper",
            severity: PartSeverity.MODERATE,
            confidence: 0.85,
            estimated_cost_min: 50_000,
            estimated_cost_max: 75_000,
            repair_action: "replace",
          },
        ],
        total_min: 50_000,
        total_max: 75_000,
        overall_confidence: 0.85,
        recommendation: {
          code: RecommendationCode.FAST_TRACK_REVIEW,
          text: "Approve - high confidence, low exposure",
        },
        flags: [],
        image_quality: ["Good lighting", "Multiple angles provided"],
        cost_breakdown: [],
        _meta: {
          model_version: "mock-v1",
          processing_time_ms: 1500,
          timestamp: new Date().toISOString(),
        },
      };

      setAssessment(mockAssessment);
      setIsRunning(false);
      setStep(4);
      setStatus("Assessment complete");
      log("AI assessment completed");
    }, 2000);
  };

  const onApprove = () => {
    snapshot();
    log("Claim approved");
    setAllowNewClaim(true);
    setStatus("Claim approved successfully");
  };

  const onRequestPhotos = () => {
    snapshot();
    log("Additional photos requested");
    setStep(2);
    setUploadHint("Please upload additional photos for better assessment.");
  };

  const onEscalate = () => {
    snapshot();
    log("Claim escalated");
    setAllowNewClaim(true);
    setStatus("Claim escalated for manual review");
  };

  const onOverride = (index: number, updated: DamagedPart) => {
    if (!assessment) return;
    snapshot();
    const newParts = [...assessment.damaged_parts];
    newParts[index] = updated;
    const newAssessment: Assessment = {
      ...assessment,
      damaged_parts: newParts,
      total_min: newParts.reduce(
        (sum, p) => sum + p.estimated_cost_min,
        0
      ),
      total_max: newParts.reduce(
        (sum, p) => sum + p.estimated_cost_max,
        0
      ),
    };
    setAssessment(newAssessment);
    log(`Override applied to part ${index + 1}`);
  };

  const onAddPart = (part: DamagedPart) => {
    if (!assessment) return;
    snapshot();
    const newAssessment: Assessment = {
      ...assessment,
      damaged_parts: [...assessment.damaged_parts, part],
    };
    setAssessment(newAssessment);
    log("New part added");
  };

  const onRemovePart = (index: number) => {
    if (!assessment) return;
    snapshot();
    const newParts = assessment.damaged_parts.filter((_, i) => i !== index);
    const newAssessment: Assessment = {
      ...assessment,
      damaged_parts: newParts,
    };
    setAssessment(newAssessment);
    log(`Part ${index + 1} removed`);
  };

  const handleStartNewClaim = () => {
    setClaim(null);
    setPhotos([]);
    setAssessment(null);
    setActions([]);
    setStep(1);
    setPolicyError(null);
    setUploadHint(null);
    setStatus(null);
    setAllowNewClaim(false);
    setHistory([]);
    log("New claim started");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Claims Workbench
            </h1>
            {status && (
              <p className="text-xs text-emerald-400 mt-1">{status}</p>
            )}
          </div>
          <div className="flex gap-2">
            {history.length > 0 && (
              <button
                onClick={handleUndo}
                className="px-3 py-1.5 text-[10px] rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                ↺ Undo last change
              </button>
            )}
            {allowNewClaim && (
              <button
                onClick={handleStartNewClaim}
                className="px-3 py-1.5 text-[10px] rounded-md bg-slate-800 text-slate-100 hover:bg-slate-700"
              >
                Start new claim
              </button>
            )}
          </div>
        </header>

        {/* Claim context */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <ClaimForm onSubmit={handleClaimSubmit} policyError={policyError} />
        </section>

        {/* Main layout */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Damage Photos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2 text-slate-100">
              Damage Photos
            </h2>
            <p className="text-[11px] text-slate-400 mb-3">
              Upload 2–4 photos (rear, side, close-ups) to run assessment.
            </p>
            <ImageUploader
              photos={photos}
              onChange={handlePhotosChange}
              disabled={!claim}
              hint={
                uploadHint ||
                (claim && !photos.length
                  ? "Next: add photos to unlock AI assessment."
                  : undefined)
              }
            />
            <div className="mt-2 flex items-start gap-1 text-[10px] text-amber-300">
              <span className="mt-[1px]">💡</span>
              <span>
                Clear, well-lit photos from multiple angles help the AI produce
                a more confident and accurate assessment.
              </span>
            </div>
          </div>

          {/* AI / Manual Assessment panel */}
          <AssessmentPanel
            claim={claim}
            photos={photos}
            assessment={assessment}
            isRunning={isRunning}
            onRunAssessment={handleRunAssessment}
            onApprove={onApprove}
            onRequestPhotos={onRequestPhotos}
            onEscalate={onEscalate}
            onOverride={onOverride}
            onAddPart={onAddPart}
            onRemovePart={onRemovePart}
          />
        </section>

        {/* Audit trail */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-2 text-slate-100">
            Audit Trail (Mock)
          </h2>
          <ActionLog actions={actions} />
        </section>
      </div>
    </main>
  );
}
