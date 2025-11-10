// src/server/vision.ts

/**
 * Vision AI Service
 *
 * Analyzes vehicle damage photos to detect parts, severity, and damage types.
 * Supports multiple AI providers with a unified interface.
 *
 * Providers:
 * - Mock: Deterministic test data for prototyping
 * - Scale AI: Production-ready damage detection
 * - OpenAI Vision: GPT-4o for general image analysis
 * - Custom: Your own trained model
 */

import {
    PhotoMeta,
    PartSeverity,
    VehiclePart,
  } from "@/types/assessment";
import { FEATURES, MODEL, ENDPOINTS } from "@/config/policy";
  
  // ============================================================================
  // CONFIG
  // ============================================================================
  
  // Note: All configuration constants are imported from @/config/policy.ts
  
  // ============================================================================
  // TYPES
  // ============================================================================
  
  // Keep local damage type shape so we don't depend on non-exported types
  type DamageTypeLike = {
    type: string;
    severity?: string;
    area_percentage?: number;
  };
  
  export interface VisionResult {
    part: string;
    part_id: VehiclePart | string;
    severity: PartSeverity;
    confidence: number;
    damage_types?: DamageTypeLike[];
    bbox?: [number, number, number, number]; // [x, y, width, height]
    image_index?: number;
    notes?: string;
  }
  
  export interface VisionContext {
    vehicleInfo?: {
      year?: number;
      make?: string;
      model?: string;
    };
    incidentDescription?: string;
    expectedDamageArea?: "front" | "rear" | "side" | "multiple";
  }
  
  // ============================================================================
  // MAIN VISION FUNCTION
  // ============================================================================
  
  export async function runVisionModel(
    photos: PhotoMeta[],
    context?: VisionContext
  ): Promise<VisionResult[]> {
    const aiProvider = FEATURES.AI_PROVIDER || "mock";
    switch (aiProvider) {
      case "scale":
        return await runScaleVision(photos, context);
      case "openai":
        return await runOpenAIVision(photos, context);
      case "custom":
        return await runCustomVision(photos, context);
      case "mock":
      default:
        return await runMockVision(photos, context);
    }
  }
  
  // ============================================================================
  // MOCK VISION
  // ============================================================================
  
  async function runMockVision(
    photos: PhotoMeta[],
    context?: VisionContext
  ): Promise<VisionResult[]> {
    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, MODEL.MOCK_VISION_LATENCY_MS)
    );
  
    // Helper: allow optional qualityScore on PhotoMeta without changing global type
    type PhotoMetaWithQuality = PhotoMeta & { qualityScore?: number };
  
    const defaultQuality = MODEL.VISION.DEFAULT_QUALITY_SCORE;
    const avgQuality =
      photos.length > 0
        ? photos.reduce((sum, p) => {
            const pm = p as PhotoMetaWithQuality;
            const q =
              typeof pm.qualityScore === "number"
                ? pm.qualityScore
                : defaultQuality;
            return sum + q;
          }, 0) / photos.length
        : defaultQuality;
  
    const { BASE, QUALITY_MULTIPLIER, MAX } = MODEL.VISION.CONFIDENCE;
    const baseConfidence = Math.min(
      MAX,
      BASE + avgQuality * QUALITY_MULTIPLIER
    );
    const complexity = getComplexity(photos.length, avgQuality);
  
    return generateMockResults(complexity, baseConfidence, context);
  }
  
  
  function getComplexity(
    photoCount: number,
    avgQuality: number
  ): "minimal" | "moderate" | "extensive" {
    const {
      MINIMAL_PHOTO_COUNT,
      MODERATE_PHOTO_COUNT,
      MINIMAL_QUALITY_THRESHOLD,
      MODERATE_QUALITY_THRESHOLD,
    } = MODEL.VISION.COMPLEXITY;
    
    if (photoCount <= MINIMAL_PHOTO_COUNT || avgQuality < MINIMAL_QUALITY_THRESHOLD) {
      return "minimal";
    }
    if (photoCount <= MODERATE_PHOTO_COUNT || avgQuality < MODERATE_QUALITY_THRESHOLD) {
      return "moderate";
    }
    return "extensive";
  }
  
  function generateMockResults(
    complexity: "minimal" | "moderate" | "extensive",
    baseConfidence: number,
    context?: VisionContext
  ): VisionResult[] {
    const results: VisionResult[] = [];
  
    if (complexity === "minimal") {
      results.push({
        part: "Rear bumper",
        part_id: VehiclePart.REAR_BUMPER,
        severity: PartSeverity.MINOR,
        confidence: baseConfidence,
        damage_types: [
          {
            type: "scratch",
            severity: "light",
            area_percentage: 15,
          },
        ],
        image_index: 0,
        notes: "Minor surface damage, repair recommended",
      });
    } else if (complexity === "moderate") {
      results.push(
        {
          part: "Rear bumper",
          part_id: VehiclePart.REAR_BUMPER,
          severity:
            baseConfidence > MODEL.VISION.CONFIDENCE_THRESHOLDS.HIGH
              ? PartSeverity.SEVERE
              : PartSeverity.MODERATE,
          confidence: baseConfidence,
          damage_types: [
            {
              type: "dent",
              severity: "moderate",
              area_percentage: 40,
            },
            {
              type: "crack",
              severity: "moderate",
              area_percentage: 15,
            },
          ],
          image_index: 0,
          notes:
            "Significant impact damage, replacement likely needed",
        },
        {
          part: "Trunk lid",
          part_id: VehiclePart.TRUNK_LID,
          severity: PartSeverity.MODERATE,
          confidence: Math.max(
            MODEL.VISION.CONFIDENCE_THRESHOLDS.MEDIUM_LOW,
            baseConfidence + MODEL.VISION.CONFIDENCE_ADJUSTMENTS.SECONDARY_PART
          ),
          damage_types: [
            {
              type: "dent",
              severity: "moderate",
              area_percentage: 25,
            },
          ],
          image_index: 1,
          notes:
            "Alignment affected, repair or replace based on shop assessment",
        },
        {
          part: "Right tail light",
          part_id: VehiclePart.REAR_RIGHT_TAILLIGHT,
          severity: PartSeverity.REPLACE,
          confidence: Math.max(
            MODEL.VISION.CONFIDENCE_THRESHOLDS.MEDIUM_HIGH,
            baseConfidence + MODEL.VISION.CONFIDENCE_ADJUSTMENTS.TERTIARY_PART
          ),
          damage_types: [
            {
              type: "crack",
              severity: "heavy",
              area_percentage: 80,
            },
          ],
          image_index: 0,
          notes: "Housing cracked, full replacement required",
        }
      );
    } else {
      // extensive
      results.push(
        {
          part: "Rear bumper",
          part_id: VehiclePart.REAR_BUMPER,
          severity: PartSeverity.SEVERE,
          confidence: baseConfidence,
          damage_types: [
            {
              type: "crack",
              severity: "heavy",
              area_percentage: 60,
            },
            {
              type: "misalignment",
              severity: "moderate",
            },
          ],
          image_index: 0,
          notes: "Extensive damage with structural concerns",
        },
        {
          part: "Trunk lid",
          part_id: VehiclePart.TRUNK_LID,
          severity: PartSeverity.MODERATE,
          confidence: Math.max(
            MODEL.VISION.CONFIDENCE_THRESHOLDS.HIGH,
            baseConfidence + MODEL.VISION.CONFIDENCE_ADJUSTMENTS.MINOR_ADJUSTMENT
          ),
          damage_types: [
            {
              type: "dent",
              severity: "moderate",
              area_percentage: 30,
            },
          ],
          image_index: 1,
        },
        {
          part: "Right tail light",
          part_id: VehiclePart.REAR_RIGHT_TAILLIGHT,
          severity: PartSeverity.REPLACE,
          confidence: Math.max(
            MODEL.VISION.CONFIDENCE_THRESHOLDS.HIGH_PLUS,
            baseConfidence + MODEL.VISION.CONFIDENCE_ADJUSTMENTS.SECONDARY_PART
          ),
          damage_types: [
            {
              type: "shatter",
              severity: "heavy",
            },
          ],
          image_index: 0,
        },
        {
          part: "Left quarter panel",
          part_id: VehiclePart.LEFT_QUARTER_PANEL,
          severity: PartSeverity.MODERATE,
          confidence: Math.max(
            MODEL.VISION.CONFIDENCE_THRESHOLDS.MEDIUM,
            baseConfidence + MODEL.VISION.CONFIDENCE_ADJUSTMENTS.TERTIARY_PART
          ),
          damage_types: [
            {
              type: "dent",
              severity: "moderate",
              area_percentage: 20,
            },
            {
              type: "paint_damage",
              severity: "light",
              area_percentage: 35,
            },
          ],
          image_index: 2,
          notes:
            "Panel damage extending beyond primary impact zone",
        }
      );
  
      if (
        context?.incidentDescription
          ?.toLowerCase()
          .includes("high speed") ||
        context?.incidentDescription
          ?.toLowerCase()
          .includes("t-bone")
      ) {
        results.push({
          part: "Frame",
          part_id: VehiclePart.FRAME,
          severity: PartSeverity.STRUCTURAL,
          confidence: MODEL.VISION.CONFIDENCE_THRESHOLDS.MEDIUM_LOW,
          damage_types: [
            {
              type: "misalignment",
              severity: "moderate",
            },
          ],
          notes:
            "Potential structural damage detected - in-person inspection required",
        });
      }
    }
  
    return results;
  }
  
  // ============================================================================
  // SCALE AI VISION
  // ============================================================================
  
  async function runScaleVision(
    photos: PhotoMeta[],
    context?: VisionContext
  ): Promise<VisionResult[]> {
    const SCALE_API_KEY = process.env.SCALE_API_KEY;
    const SCALE_PROJECT =
      process.env.SCALE_PROJECT || "auto_damage_detection";
  
    if (!SCALE_API_KEY) {
      console.warn(
        "Scale API key not configured, falling back to mock"
      );
      return runMockVision(photos, context);
    }
  
    try {
      const scaleApiUrl = ENDPOINTS.SCALE_API || "https://api.scale.com/v1";
      const taskResponse = await fetch(
        `${scaleApiUrl}/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(
              SCALE_API_KEY + ":"
            ).toString("base64")}`,
          },
          body: JSON.stringify({
            project: SCALE_PROJECT,
            type: "imageannotation",
            instruction:
              "Identify and assess all vehicle damage",
            attachments: photos.map((photo) => ({
              type: "image",
              content: photo.url,
            })),
            fields: [
              {
                type: "box",
                field_id: "damage_regions",
                title: "Damaged Parts",
                choices: Object.values(VehiclePart),
              },
              {
                type: "category",
                field_id: "severity",
                title: "Damage Severity",
                choices: Object.values(PartSeverity),
              },
            ],
          }),
        }
      );
  
      if (!taskResponse.ok) {
        throw new Error(
          `Scale API error: ${taskResponse.statusText}`
        );
      }
  
      const task = await taskResponse.json();
      const result = await pollScaleTask(
        task.task_id,
        SCALE_API_KEY
      );
      return transformScaleResults(result);
    } catch (error) {
      console.error("Scale AI error:", error);
      return runMockVision(photos, context);
    }
  }
  
  async function pollScaleTask(
    taskId: string,
    apiKey: string,
    maxAttempts = MODEL.VISION.SCALE.MAX_POLL_ATTEMPTS
  ): Promise<any> {
    const scaleApiUrl = ENDPOINTS.SCALE_API || "https://api.scale.com/v1";
    const pollDelay = MODEL.VISION.SCALE.POLL_DELAY_MS;
    
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${scaleApiUrl}/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              apiKey + ":"
            ).toString("base64")}`,
          },
        }
      );
  
      const task = await response.json();
  
      if (task.status === "completed") {
        return task.response;
      }
      if (
        task.status === "error" ||
        task.status === "canceled"
      ) {
        throw new Error(
          `Task ${task.status}: ${task.error_message}`
        );
      }
  
      await new Promise((resolve) =>
        setTimeout(resolve, pollDelay)
      );
    }
  
    throw new Error("Task timed out");
  }
  
  function transformScaleResults(
    scaleResponse: any
  ): VisionResult[] {
    const results: VisionResult[] = [];
  
    if (scaleResponse.annotations) {
      scaleResponse.annotations.forEach(
        (annotation: any) => {
          const label = annotation.label || "";
          results.push({
            part: label,
            part_id: mapPartNameToId(label),
            severity:
              (annotation.attributes
                ?.severity as PartSeverity) ??
              PartSeverity.MODERATE,
            confidence:
              annotation.confidence ?? MODEL.VISION.SCALE.DEFAULT_CONFIDENCE,
            bbox: annotation.bbox
              ? ([
                  annotation.bbox.x,
                  annotation.bbox.y,
                  annotation.bbox.width,
                  annotation.bbox.height,
                ] as [number, number, number, number])
              : undefined,
          });
        }
      );
    }
  
    return results;
  }
  
  // ============================================================================
  // OPENAI VISION (GPT-4o)
  // ============================================================================
  
  async function runOpenAIVision(
    photos: PhotoMeta[],
    context?: VisionContext
  ): Promise<VisionResult[]> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
    if (!OPENAI_API_KEY) {
      console.warn(
        "OpenAI API key not configured, falling back to mock"
      );
      return runMockVision(photos, context);
    }
  
    try {
      const openaiConfig = MODEL.VISION.OPENAI;
      const openaiApiUrl = ENDPOINTS.OPENAI_API || "https://api.openai.com/v1";
      const imageContent = photos.slice(0, openaiConfig.MAX_PHOTOS).map((photo) => ({
        type: "image_url",
        image_url: { url: photo.url },
      }));
  
      const response = await fetch(
        `${openaiApiUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: openaiConfig.MODEL,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze these vehicle damage photos. For each damaged part, provide:
  1. Part name
  2. Severity (minor, moderate, severe, replace, structural)
  3. Confidence (0-1)
  4. Brief notes
  
  Return ONLY a JSON array.`,
                  },
                  ...imageContent,
                ],
              },
            ],
            max_tokens: openaiConfig.MAX_TOKENS,
            temperature: openaiConfig.TEMPERATURE,
          }),
        }
      );
  
      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.statusText}`
        );
      }
  
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || "[]";
  
      const cleaned = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
  
      const parsed = JSON.parse(cleaned || "[]");
      return transformOpenAIResults(parsed);
    } catch (error) {
      console.error("OpenAI Vision error:", error);
      return runMockVision(photos, context);
    }
  }
  
  function transformOpenAIResults(
    openAIResults: any[]
  ): VisionResult[] {
    return openAIResults.map((item) => {
      const part = String(item.part || "").trim();
      return {
        part,
        part_id: mapPartNameToId(part),
        severity:
          (item.severity as PartSeverity) ??
          PartSeverity.MODERATE,
        confidence:
          typeof item.confidence === "number"
            ? item.confidence
            : MODEL.VISION.OPENAI.DEFAULT_CONFIDENCE,
        notes: item.notes,
      };
    });
  }
  
  // ============================================================================
  // CUSTOM MODEL
  // ============================================================================
  
  async function runCustomVision(
    photos: PhotoMeta[],
    context?: VisionContext
  ): Promise<VisionResult[]> {
    const modelUrl = ENDPOINTS.CUSTOM_MODEL;
  
    try {
      const response = await fetch(
        `${modelUrl}/detect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: photos.map((p) => p.url),
            context,
          }),
        }
      );
  
      if (!response.ok) {
        throw new Error(
          `Custom model error: ${response.statusText}`
        );
      }
  
      const results = await response.json();
      return transformCustomResults(results);
    } catch (error) {
      console.error("Custom model error:", error);
      return runMockVision(photos, context);
    }
  }
  
  function transformCustomResults(
    customResults: any
  ): VisionResult[] {
    if (!customResults?.detections) return [];
  
    return customResults.detections.map(
      (d: any) => {
        const part = String(
          d.part_name || d.part || ""
        ).trim();
        return {
          part,
          part_id:
            mapPartNameToId(part) ??
            d.part_id ??
            part,
          severity:
            (d.severity as PartSeverity) ??
            PartSeverity.MODERATE,
          confidence:
            typeof d.confidence === "number"
              ? d.confidence
              : MODEL.VISION.CUSTOM.DEFAULT_CONFIDENCE,
          damage_types: d.damage_types || [],
          bbox: d.bbox,
        };
      }
    );
  }
  
  // ============================================================================
  // VALIDATION & MERGE HELPERS
  // ============================================================================
  
  export function validateVisionResults(
    results: VisionResult[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
  
    if (results.length === 0) {
      errors.push("No damaged parts detected");
    }
  
    results.forEach((r, i) => {
      if (!r.part || !r.part.trim()) {
        errors.push(`Result ${i}: Missing part name`);
      }
      if (r.confidence < 0 || r.confidence > 1) {
        errors.push(
          `Result ${i}: Invalid confidence (${r.confidence})`
        );
      }
      if (
        !Object.values(PartSeverity).includes(
          r.severity as PartSeverity
        )
      ) {
        errors.push(
          `Result ${i}: Invalid severity (${r.severity})`
        );
      }
    });
  
    return { valid: errors.length === 0, errors };
  }
  
  export function mergeDuplicates(
    results: VisionResult[]
  ): VisionResult[] {
    const partMap = new Map<string, VisionResult>();
  
    results.forEach((r) => {
      const key = String(r.part_id || r.part);
      const existing = partMap.get(key);
  
      if (!existing || r.confidence > existing.confidence) {
        partMap.set(key, r);
      }
    });
  
    return Array.from(partMap.values());
  }
  
  // ============================================================================
  // PART NAME -> ENUM MAPPING
  // ============================================================================
  
  function mapPartNameToId(
    partName: string
  ): VehiclePart | string {
    const normalized = partName.toLowerCase().trim();
  
    const mapping: Record<string, VehiclePart> = {
      "rear bumper": VehiclePart.REAR_BUMPER,
      "rear bumper cover": VehiclePart.REAR_BUMPER,
      "trunk lid": VehiclePart.TRUNK_LID,
      trunk: VehiclePart.TRUNK_LID,
  

  
      "left quarter panel": VehiclePart.LEFT_QUARTER_PANEL,
      "quarter panel": VehiclePart.LEFT_QUARTER_PANEL,
  
      "right tail light": VehiclePart.REAR_RIGHT_TAILLIGHT,
      "left tail light": VehiclePart.REAR_LEFT_TAILLIGHT,
      "tail light": VehiclePart.REAR_RIGHT_TAILLIGHT,
  

  
      frame: VehiclePart.FRAME,
    };
  
    return mapping[normalized] ?? partName;
  }
  