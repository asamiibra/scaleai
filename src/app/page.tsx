"use client";

import { useState } from "react";
import ClaimForm from "../components/ClaimForm";
import ImageUploader from "../components/ImageUploader";
import AssessmentPanel from "../components/AssessmentPanel";
import ActionLog from "../components/ActionLog";

/* ---------- Types shared across page & mock API ---------- */

type Claim = {
  id: string;
  policyNumber: string;
  name: string;
  description: string;
};

type AssessmentPart = {
  part_label: string;
  severity: string;
  confidence: number;
  estimated_cost_min: number;
  estimated_cost_max: number;
};

type Assessment = {
  damaged_parts: AssessmentPart[];
  total_min: number;
  total_max: number;
  overall_confidence: number;
  recommendation: {
    code: string;
    text: string;
  };
  flags: string[];
  image_quality?: string[];
  cost_breakdown?: {
    label: string;
    details: string[];
  }[];
  _meta?: {
    model_version: string;
    processing_time_ms: number;
    timestamp: string;
  };
};

type PanelActionMeta = {
  complete?: boolean; // when true: show completion + enable "start new claim"
};

/* ---------- Helpers ---------- */

const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);

const formatRange = (min: number, max: number) =>
  `$${min.toLocaleString()}–${max.toLocaleString()}`;

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

    const next: Claim = {
      id: claim?.id ?? `CLAIM-${Date.now()}`,
      policyNumber: normalized,
      name: partial.name.trim(),
      description: partial.description.trim(),
    };

    setClaim(next);
    setPolicyError(null);
    setStatus("Claim context set. Next: upload 2–4 damage photos.");
    setAllowNewClaim(false);
    setAssessment(null);
    setStep(2);

    if (photos.length === 0) {
      setUploadHint("Next: drag & drop or choose 2–4 clear photos to continue.");
    } else {
      setUploadHint(null);
    }

    log(
      `[AGENT] Claim context set for policy ${next.policyNumber} (${next.name}).`
    );
  };

  /* ---------- Step 2: Photos ---------- */

  const handlePhotosChange = (files: File[]) => {
    snapshot();

    const limited = files.slice(0, 4); // enforce max 4 in UI
    setPhotos(limited);
    setAllowNewClaim(false);

    if (limited.length > 0) {
      setUploadHint(null);
      setStatus("Photos added. You can now run AI assessment.");
      if (claim) setStep(3);
      log(
        `[AGENT] Uploaded ${limited.length} damage photos: ${limited
          .map((f) => f.name)
          .join(", ")}.`
      );
    } else {
      setStatus("No photos selected yet.");
      if (claim) {
        setUploadHint(
          "Please upload 2–4 clear photos (rear, side, close-ups) before running AI."
        );
        setStep(2);
      }
    }
  };

  /* ---------- Step 3: Run AI (mock) ---------- */

  const handleRunAssessment = async () => {
    if (!claim) {
      setStatus("Set claim context before running assessment.");
      return;
    }
    if (photos.length < 2) {
      setUploadHint("Upload at least 2 photos before running AI assessment.");
      setStatus("Need more photos to proceed.");
      return;
    }

    snapshot();
    setIsRunning(true);
    setAllowNewClaim(false);
    setStatus("Running mock AI assessment…");
    log(
      `[SYSTEM] Calling /api/damage_assessment with ${photos.length} photos.`
    );

    try {
      const res = await fetch("/api/damage_assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim,
          photos: photos.map((p) => p.name),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: Assessment = await res.json();
      setAssessment(data);
      setStep(4);
      setStatus("AI assessment ready. Review, override, or escalate.");
      log(
        `[AI] Assessment generated (overall_confidence=${data.overall_confidence.toFixed(
          2
        )}, total=${formatRange(data.total_min, data.total_max)}).`
      );
    } catch (err: any) {
      console.error(err);
      setStatus("Failed to run mock AI assessment. Please try again.");
      log(
        `[SYSTEM] Error while running damage_assessment: ${
          err?.message || String(err)
        }`
      );
    } finally {
      setIsRunning(false);
    }
  };

  /* ---------- Step 4: Actions from AssessmentPanel ---------- */

  const handlePanelAction = (label: string, meta?: PanelActionMeta) => {
    snapshot();
    log(label);

    if (meta?.complete) {
      setStatus("Decision recorded. You can start a new claim.");
      setAllowNewClaim(true);
    }
  };

  const handleStartNewClaim = () => {
    snapshot();
    setClaim(null);
    setPhotos([]);
    setAssessment(null);
    setActions([]);
    setStep(1);
    setUploadHint(null);
    setStatus(null);
    setAllowNewClaim(false);
    setPolicyError(null);
    log("[SYSTEM] Workbench reset. Ready for a new claim.");
  };

  /* ---------- UI helpers ---------- */

  const stepClass = (idx: number) => {
    if (step === idx)
      return "px-4 py-2 rounded-full border border-emerald-400 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2";
    if (step > idx)
      return "px-4 py-2 rounded-full border border-emerald-400/60 bg-slate-900 text-emerald-400 text-xs flex items-center gap-2";
    return "px-4 py-2 rounded-full border border-slate-700 bg-slate-900 text-slate-400 text-xs flex items-center gap-2";
  };

  /* ==================================================================== */

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Scale AI Claims Intelligence Workbench
          </h1>
          <div className="flex flex-wrap gap-3">
            <div className={stepClass(1)}>
              ① Load sample claim or enter details
            </div>
            <div className={stepClass(2)}>
              ② Upload 2–4 damage photos
            </div>
            <div className={stepClass(3)}>
              ③ Run AI damage assessment
            </div>
            <div className={stepClass(4)}>
              ④ Approve / Request info / Escalate
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {status && (
              <p className="text-xs text-sky-400">{status}</p>
            )}
            <div className="flex gap-2 ml-auto">
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
            onAction={handlePanelAction}
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
