// src/components/ImageUploader.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Image } from "lucide-react";
import { PHOTO } from "@/config/policy";

interface ImageUploaderProps {
  photos: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  hint?: string;
}

export default function ImageUploader({
  photos,
  onChange,
  disabled,
  hint,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (files.length > 0) {
        onChange(files.slice(0, PHOTO.MAX_PHOTOS));
      }
    },
    [disabled, onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files).filter((f) =>
          f.type.startsWith("image/")
        );
        onChange(files.slice(0, PHOTO.MAX_PHOTOS));
      }
    },
    [onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      onChange(newPhotos);
    },
    [photos, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-sky-500 bg-sky-500/5' : 'border-slate-700 bg-slate-950'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-2">
          <Image className="w-8 h-8 text-slate-400" />
          <p className="text-sm text-slate-300">Drag photos here or click to upload</p>
          <p className="text-[10px] text-slate-500">
            Max {photos.length}/{PHOTO.MAX_PHOTOS} photos • {PHOTO.ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(", ")}
          </p>
        </div>
      </div>

      {hint && (
        <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-300">{hint}</p>
        </div>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-rose-600"
                  title="Remove photo"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              <div className="mt-1 text-xs text-slate-400 truncate">
                {photo.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}