"use client";

interface Props {
  actions: string[];
}

export default function ActionLog({ actions }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
      <h2 className="text-sm font-semibold mb-2 text-slate-100">
        Audit Trail (Mock)
      </h2>
      {actions.length === 0 ? (
        <p className="text-slate-500">
          Actions, overrides, and decisions will appear here to show the review
          trail and training signal.
        </p>
      ) : (
        <ul className="space-y-1">
          {actions.map((a, i) => (
            <li key={i}>• {a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
