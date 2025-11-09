// Shared domain types for the workbench

export type Claim = {
    id: string;
    policyNumber: string;
    name: string;
    description: string;
  };
  
  export type DamagedPart = {
    part_label: string;
    severity: string;
    confidence: number; // 0–1
    estimated_cost_min: number;
    estimated_cost_max: number;
    overridden?: boolean;
    override_reason?: string;
  };
  
  export type AssessmentMeta = {
    model_version: string;
    processing_time_ms: number;
    timestamp: string;
  };
  
  export type Assessment = {
    damaged_parts: DamagedPart[];
    total_min: number;
    total_max: number;
    overall_confidence: number;
    recommendation: {
      code: string;
      text: string;
    };
    flags: string[];
    image_quality?: string[];
    risk_flags?: string[];
    cost_breakdown?: string;
    _meta?: AssessmentMeta;
  };
  