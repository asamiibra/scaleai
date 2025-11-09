"use client";

import { useEffect, useState } from "react";

type ImageUploaderProps = {
  photos: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  hint?: string;
};

type Preview = {
  url: string;
  name: string;
  quality: "good" | "low";
};

export default function ImageUploader({
  photos,
  onChange,
  disabled,
  hint,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<Preview[]>([]);

  // Build previews when photos change
  useEffect(() => {
    const next: Preview[] = photos.map((file) => {
      const url = URL.createObjectURL(file);
      const size = (file.size || 0) / 1024; // KB
      const quality: "good" | "low" =
        size > 500 && file.type.toLowerCase().includes("image")
          ? "good"
          : "low";
      return { url, name: file.name, quality };
    });
    setPreviews(next);

    return () => {
      next.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [photos]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, 4); // enforce max 4
    onChange(files);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-2">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`relative border-2 border-dashed rounded-xl px-4 py-6 text-center transition-colors ${
          disabled
            ? "border-slate-800 bg-slate-950/40 text-slate-600"
            : "border-sky-500/40 bg-slate-950/60 text-slate-300 hover:border-sky-400"
        }`}
      >
        {disabled && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-[10px] text-slate-500 rounded-xl">
            Set claim context to enable uploads.
          </div>
        )}

        <div className="flex flex-col items-center gap-1 pointer-events-none">
          <span className="text-2xl">📷</span>
          <p className="text-[11px]">
            Drag &amp; drop photos here or{" "}
            <label className="underline text-sky-400 cursor-pointer pointer-events-auto">
              browse files
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onInputChange}
                disabled={disabled}
              />
            </label>
            .
          </p>
          <p className="text-[9px] text-slate-500">
            Max 4 images. Rear, side &amp; close-ups work best.
          </p>
        </div>
      </div>

      {hint && (
        <p className="text-[10px] text-sky-400 flex items-center gap-1">
          <span>⬆</span> {hint}
        </p>
      )}

      {previews.length > 0 && (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
          {previews.map((p) => (
            <div
              key={p.url}
              className="relative rounded-md overflow-hidden bg-slate-900 border border-slate-800"
            >
              <img
                src={p.url}
                alt={`Uploaded damage photo ${p.name}`}
                className="w-full h-24 object-cover"
              />
              <div className="flex items-center justify-between px-1.5 py-0.5 text-[8px] bg-slate-950/90 text-slate-200">
                <span className="truncate max-w-[70%]">{p.name}</span>
                <span
                  className={
                    p.quality === "good"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }
                >
                  {p.quality === "good" ? "✓ Good" : "⚠ Low"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
