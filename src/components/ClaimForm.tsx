"use client";

import { useState } from "react";

type ClaimFormProps = {
  onSubmit: (data: {
    policyNumber: string;
    name: string;
    description: string;
  }) => void;
  policyError?: string | null;
};

export default function ClaimForm({ onSubmit, policyError }: ClaimFormProps) {
  const [policyNumber, setPolicyNumber] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      policyNumber,
      name,
      description,
    });
  };

  const handleSample = () => {
    const sample = {
      policyNumber: "POL-123456",
      name: "Sami",
      description: "Low-speed rear-end, drivable, no injuries.",
    };
    setPolicyNumber(sample.policyNumber);
    setName(sample.name);
    setDescription(sample.description);
    onSubmit(sample);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Policy # */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Policy #{" "}
            <span className="text-slate-500">(must start with&nbsp;POL-)</span>
          </label>
          <input
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="POL-123456"
            className={`w-full rounded-md bg-slate-950 border px-3 py-2 text-sm outline-none ${
              policyError
                ? "border-rose-500 text-rose-100"
                : "border-slate-700 text-slate-50"
            }`}
          />
          {policyError && (
            <p className="mt-1 text-[10px] text-rose-400">{policyError}</p>
          )}
        </div>

        {/* Claimant Name */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Claimant Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sami"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none"
          />
        </div>

        {/* Incident Summary */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Incident Summary
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary for context"
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={handleSample}
          className="px-3 py-1.5 rounded-md bg-slate-800 text-[10px] text-slate-100 hover:bg-slate-700"
        >
          Use sample claim
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-md bg-emerald-500 text-[11px] font-medium text-slate-950 hover:bg-emerald-400"
        >
          Set Claim Context
        </button>
      </div>
    </form>
  );
}
