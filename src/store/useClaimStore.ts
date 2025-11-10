// src/store/useClaimStore.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  Assessment,
  AuditLogEntry,
  Claim,
  DamagedPart,
  PhotoMeta,
  PartSeverity,
  VehiclePart,
  RecommendationCode,
} from "@/types/assessment";
import { STORE } from "@/config/policy";

// ============================================================================
// TYPES
// ============================================================================

type ActionType =
  | "assessment_run"
  | "approve"
  | "request_photos"
  | "escalate"
  | "override"
  | "add_part"
  | "remove_part"
  | "undo"
  | "redo";

interface HistoryEntry {
  timestamp: string;
  assessment: Assessment | null;
  description: string;
}

interface ClaimState {
  // Core data
  claim: Claim | null;
  photos: PhotoMeta[];
  assessment: Assessment | null;

  // UI state
  isRunning: boolean;
  isSaving: boolean;
  status: string | null;
  error: string | null;

  // Audit & history
  auditLog: AuditLogEntry[];
  history: HistoryEntry[];
  historyIndex: number; // For undo/redo

  // Metadata
  lastSaved: string | null;
  isDirty: boolean;
}

interface ClaimActions {
  // Core actions
  setClaim: (claim: Claim | null) => void;
  updateClaim: (updates: Partial<Claim>) => void;
  setPhotos: (photos: PhotoMeta[]) => void;
  addPhotos: (newPhotos: PhotoMeta[]) => void;
  removePhoto: (photoId: string) => void;
  setAssessment: (assessment: Assessment | null) => void;

  // Assessment workflow
  runAssessment: () => Promise<void>;
  approve: (notes?: string) => Promise<void>;
  requestPhotos: (message?: string, warnings?: string[]) => Promise<void>;
  escalate: (reason?: string) => Promise<void>;

  // Override actions
  overridePart: (
    index: number,
    updated: DamagedPart,
    notes?: string
  ) => void;
  addPart: (part: DamagedPart) => void;
  removePart: (index: number) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Audit log
  addLog: (
    actionType: ActionType,
    description: string,
    metadata?: Record<string, unknown>
  ) => void;
  exportAuditLog: () => string;

  // Utility actions
  setStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  save: () => Promise<void>;

  // Computed values
  getStats: () => {
    totalPhotos: number;
    totalParts: number;
    totalCostRange: string;
    confidence: number;
  };
}

type ClaimStore = ClaimState & ClaimActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ClaimState = {
  claim: null,
  photos: [],
  assessment: null,
  isRunning: false,
  isSaving: false,
  status: null,
  error: null,
  auditLog: [],
  history: [],
  historyIndex: -1,
  lastSaved: null,
  isDirty: false,
};

// ============================================================================
// STORE CREATION
// ============================================================================

export const useClaimStore = create<ClaimStore>()(
  immer(
    persist(
      (set, get) => ({
        ...initialState,

        // ---------------- Core ----------------

        setClaim: (claim) =>
          set({
            claim,
            isDirty: true,
          }),

        updateClaim: (updates) =>
          set((state) => {
            if (state.claim) {
              state.claim = { ...state.claim, ...updates };
              state.isDirty = true;
            }
          }),

        setPhotos: (photos) =>
          set({
            photos,
            isDirty: true,
          }),

        addPhotos: (newPhotos) =>
          set((state) => {
            state.photos = [...state.photos, ...newPhotos];
            state.isDirty = true;
          }),

        removePhoto: (photoId) =>
          set((state) => {
            state.photos = state.photos.filter((p) => p.id !== photoId);
            state.isDirty = true;
          }),

        setAssessment: (assessment) =>
          set({
            assessment,
            isDirty: true,
          }),

        // ---------------- Assessment workflow ----------------

        runAssessment: async () => {
          set({
            isRunning: true,
            error: null,
            status: "Running mock assessment...",
          });

          try {
            // Mock local assessment; real implementation would call your API.
            await new Promise((resolve) =>
              setTimeout(resolve, STORE.MOCK_ASSESSMENT_DELAY_MS)
            );

            const mockConfidence = STORE.MOCK_ASSESSMENT.CONFIDENCE;
            const mockCostMin = STORE.MOCK_ASSESSMENT.PART_COST_MIN;
            const mockCostMax = STORE.MOCK_ASSESSMENT.PART_COST_MAX;

            const mockParts: DamagedPart[] = [
              {
                part_id: VehiclePart.REAR_BUMPER,
                part_label: "Rear Bumper",
                severity: PartSeverity.MODERATE,
                confidence: mockConfidence,
                estimated_cost_min: mockCostMin,
                estimated_cost_max: mockCostMax,
                repair_action: "replace",
              },
            ];

            const mockAssessment: Assessment = {
              damaged_parts: mockParts,
              total_min: mockCostMin,
              total_max: mockCostMax,
              overall_confidence: mockConfidence,
              recommendation: {
                code: RecommendationCode.MANUAL_REVIEW,
                text: "Review needed",
                priority: "medium",
              },
              flags: [],
              image_quality: ["Mock: not evaluated"],
              cost_breakdown: [
                {
                  label: "Rear Bumper",
                  details: ["Severity: moderate"],
                },
              ],
              _meta: {
                model_version: STORE.MOCK_ASSESSMENT.MODEL_VERSION,
                processing_time_ms: STORE.MOCK_ASSESSMENT_DELAY_MS,
                timestamp: new Date().toISOString(),
              },
            };

            set({
              assessment: mockAssessment,
              isRunning: false,
              isDirty: true,
              status: "Mock assessment complete",
            });

            get().addLog("assessment_run", "AI assessment completed (mock)");
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.error("runAssessment error", error);
            }
            set({
              isRunning: false,
              error: "Failed to run assessment",
              status: null,
            });
          }
        },

        approve: async (notes) => {
          get().addLog("approve", "Claim approved", { notes });
          set({ status: "Claim approved", isDirty: true });
        },

        requestPhotos: async (message, warnings) => {
          get().addLog(
            "request_photos",
            message || "Additional photos requested",
            { warnings }
          );
          set({
            status: "Requested additional photos",
            isDirty: true,
          });
        },

        escalate: async (reason) => {
          get().addLog("escalate", reason || "Claim escalated");
          set({
            status: "Claim escalated",
            isDirty: true,
          });
        },

        // ---------------- Override / Parts ----------------

        overridePart: (index, updated, notes) => {
          set((state) => {
            if (!state.assessment) return;
            if (!state.assessment.damaged_parts[index]) return;

            state.assessment.damaged_parts[index] = updated;
            state.isDirty = true;
          });
          get().addLog("override", `Part ${index} overridden`, { notes });
        },

        addPart: (part) => {
          set((state) => {
            if (!state.assessment) return;
            state.assessment.damaged_parts.push(part);
            state.isDirty = true;
          });
          get().addLog("add_part", "New part added");
        },

        removePart: (index) => {
          set((state) => {
            if (!state.assessment) return;
            if (!state.assessment.damaged_parts[index]) return;
            state.assessment.damaged_parts.splice(index, 1);
            state.isDirty = true;
          });
          get().addLog("remove_part", `Part ${index} removed`);
        },

        // ---------------- History (minimal, only assessment snapshot) ----------------

        undo: () => {
          set((state) => {
            if (state.historyIndex > 0) {
              state.historyIndex--;
              state.assessment =
                state.history[state.historyIndex].assessment;
            }
          });
          get().addLog("undo", "Undo performed");
        },

        redo: () => {
          set((state) => {
            if (state.historyIndex < state.history.length - 1) {
              state.historyIndex++;
              state.assessment =
                state.history[state.historyIndex].assessment;
            }
          });
          get().addLog("redo", "Redo performed");
        },

        canUndo: () => get().historyIndex > 0,

        canRedo: () =>
          get().historyIndex < get().history.length - 1,

        // ---------------- Audit log ----------------

        addLog: (actionType, description, metadata) =>
          set((state) => {
            const entry: AuditLogEntry = {
              id: Date.now().toString(),
              claim_id: state.claim?.id || "",
              timestamp: new Date().toISOString(),
              user_id: "user", // placeholder
              action_type: actionType,
              description,
              metadata,
            };
            state.auditLog.push(entry);
          }),

        exportAuditLog: () => JSON.stringify(get().auditLog, null, 2),

        // ---------------- Utility ----------------

        setStatus: (status) => set({ status }),

        setError: (error) =>
          set({
            error,
            isSaving: false,
            isRunning: false,
          }),

        clearError: () => set({ error: null }),

        reset: () => set(initialState),

        save: async () => {
          const { isDirty } = get();
          if (!isDirty) return;
          set({ isSaving: true });
          try {
            await new Promise((resolve) =>
              setTimeout(resolve, STORE.SAVE_DELAY_MS)
            );
            set({
              isSaving: false,
              isDirty: false,
              lastSaved: new Date().toISOString(),
              status: "Saved",
            });
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              // eslint-disable-next-line no-console
              console.error("save error", error);
            }
            set({
              isSaving: false,
              error: "Failed to save changes",
            });
          }
        },

        getStats: () => {
          const { photos, assessment } = get();
          const totalPhotos = photos.length;
          const totalParts = assessment?.damaged_parts.length || 0;
          const totalCostRange = assessment
            ? `$${(assessment.total_min / 100).toLocaleString()}–$${(
                assessment.total_max / 100
              ).toLocaleString()}`
            : "$0";
          const confidence = assessment?.overall_confidence || 0;

          return {
            totalPhotos,
            totalParts,
            totalCostRange,
            confidence,
          };
        },
      }),
      {
        name: STORE.CLAIM_STORE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          claim: state.claim,
          photos: state.photos,
          assessment: state.assessment,
          auditLog: state.auditLog,
          history: state.history,
          historyIndex: state.historyIndex,
          lastSaved: state.lastSaved,
        }),
      }
    )
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectClaim = (state: ClaimStore) => state.claim;
export const selectPhotos = (state: ClaimStore) => state.photos;
export const selectAssessment = (state: ClaimStore) => state.assessment;
export const selectIsRunning = (state: ClaimStore) => state.isRunning;
export const selectStatus = (state: ClaimStore) => state.status;
export const selectAuditLog = (state: ClaimStore) => state.auditLog;
export const selectCanUndo = (state: ClaimStore) => state.canUndo();
export const selectCanRedo = (state: ClaimStore) => state.canRedo();
export const selectStats = (state: ClaimStore) => state.getStats();
