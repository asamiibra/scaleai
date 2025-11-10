// src/components/ActionLog.tsx
"use client";

interface ActionLogProps {
  actions: string[];
}

export default function ActionLog({ actions }: ActionLogProps) {
  if (!actions.length) {
    return (
      <p className="text-xs text-slate-500">
        Actions, overrides, and decisions will appear here to show the review
        trail and training signal.
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-xs text-slate-300">
      {actions.map((entry, index) => (
        <li key={`${index}-${entry.slice(0, 24)}`}>• {entry}</li>
      ))}
    </ul>
  );
}
