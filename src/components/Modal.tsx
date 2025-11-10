// src/components/Modal.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";

// Inline cn utility to avoid import errors
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ============================================================================
// TYPES
// ============================================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  variant?: "default" | "danger" | "success" | "warning";
  loading?: boolean;
}

const MAX_WIDTH_CLASSES: Record<NonNullable<ModalProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full mx-4",
};

const VARIANT_STYLES = {
  default: {
    border: "border-slate-800",
    headerBg: "",
  },
  danger: {
    border: "border-rose-800",
    headerBg: "bg-rose-950/20",
  },
  success: {
    border: "border-emerald-800",
    headerBg: "bg-emerald-950/20",
  },
  warning: {
    border: "border-amber-800",
    headerBg: "bg-amber-950/20",
  },
} as const;

// ============================================================================
// MODAL
// ============================================================================

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  variant = "default",
  loading = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape && !loading) {
        onClose();
      }
    },
    [closeOnEscape, onClose, loading]
  );

  useEffect(() => {
    if (open) {
      previousActiveElement.current =
        document.activeElement as HTMLElement | null;
      document.addEventListener("keydown", handleEscape);
      modalRef.current?.focus();
    } else {
      document.removeEventListener("keydown", handleEscape);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const variantStyles = VARIANT_STYLES[variant];
  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth];
  const titleId = title ? "modal-title" : undefined;
  const descId = description ? "modal-description" : undefined;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (
          closeOnBackdropClick &&
          e.target === e.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-slate-900 rounded-2xl border overflow-y-auto max-h-[90vh] focus:outline-none",
          variantStyles.border,
          maxWidthClass
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
      >
        {(title || description || showCloseButton) && (
          <div
            className={cn(
              "p-4 border-b border-slate-800 flex items-start justify-between",
              variantStyles.headerBg
            )}
          >
            <div>
              {title && (
                <h3
                  id={titleId}
                  className="text-lg font-semibold text-slate-100"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p
                  id={descId}
                  className="text-sm text-slate-400 mt-1"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
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
          </div>
        )}

        {children && <div className="p-4">{children}</div>}

        {footer && (
          <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CONFIRM MODAL
// ============================================================================

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: "default" | "danger" | "success" | "warning";
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = "default",
  loading = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  const confirmColorClasses: Record<
    NonNullable<ConfirmModalProps["variant"]>,
    string
  > = {
    default: "bg-sky-600 hover:bg-sky-500",
    danger: "bg-rose-600 hover:bg-rose-500",
    success: "bg-emerald-600 hover:bg-emerald-500",
    warning: "bg-amber-600 hover:bg-amber-500",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      variant={variant}
      loading={loading}
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              confirmColorClasses[variant]
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}

// ============================================================================
// ALERT MODAL
// ============================================================================

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: "default" | "danger" | "success" | "warning";
}

export function AlertModal({
  open,
  onClose,
  title,
  message,
  variant = "default",
}: AlertModalProps) {
  const icons: Record<
    NonNullable<AlertModalProps["variant"]>,
    ReactNode
  > = {
    default: "ℹ️",
    danger: "⚠️",
    success: "✓",
    warning: "⚠️",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      variant={variant}
      maxWidth="sm"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
        >
          OK
        </button>
      }
    >
      <div className="flex items-center justify-center text-6xl">
        {icons[variant]}
      </div>
    </Modal>
  );
}
