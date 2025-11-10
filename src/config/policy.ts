// src/config/policy.ts
/**
 * Claims Intelligence Workbench - Policy Configuration
 * 
 * This file contains all business rules, thresholds, and configuration
 * values used throughout the application. Update these values to adjust
 * system behavior without changing code.
 */

// ============================================================================
// ENVIRONMENT & FEATURE FLAGS
// ============================================================================

export const ENV = {
    NODE_ENV: process.env.NODE_ENV || "development",
    IS_PRODUCTION: process.env.NODE_ENV === "production",
    IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  } as const;
  
  export const FEATURES = {
    // AI & Assessment
    USE_REAL_AI: process.env.NEXT_PUBLIC_USE_REAL_AI === "true",
    AI_PROVIDER: (process.env.NEXT_PUBLIC_AI_PROVIDER || "mock") as "mock" | "scale" | "openai" | "custom",
    ENABLE_ASSESSMENT_CACHE: process.env.NEXT_PUBLIC_ENABLE_CACHE === "true",
    
    // UI Features
    SHOW_DEBUG_INFO: process.env.NEXT_PUBLIC_SHOW_DEBUG === "true",
    ENABLE_KEYBOARD_SHORTCUTS: true,
    SHOW_QUALITY_GUIDANCE: true,
    
    // Data & Storage
    ENABLE_PERSISTENT_STORAGE: true,
    ENABLE_AUDIT_LOGGING: true,
    
    // Fraud Detection
    ENABLE_FRAUD_DETECTION: true,
    
    // Monitoring
    ENABLE_ERROR_REPORTING: ENV.IS_PRODUCTION,
    ENABLE_ANALYTICS: ENV.IS_PRODUCTION,
  } as const;
  
  // ============================================================================
  // ASSESSMENT THRESHOLDS & ROUTING
  // ============================================================================
  
  /**
   * Fast-track eligibility thresholds
   * Claims meeting these criteria can be processed with minimal human review
   */
  export const FAST_TRACK = {
    /** Minimum AI confidence score for fast-track (0-1) */
    MIN_CONFIDENCE: 0.8,
    
    /** Maximum total cost for fast-track (in cents) */
    MAX_COST: 300000, // $3,000
    
    /** Maximum cost for auto-approval without senior review (in cents) */
    AUTO_APPROVAL_MAX: 150000, // $1,500
  } as const;
  
  /**
   * Escalation thresholds
   * Claims exceeding these values require senior adjuster review
   */
  export const ESCALATION = {
    /** Minimum confidence to avoid automatic escalation */
    MIN_CONFIDENCE: 0.6,
    
    /** Cost threshold requiring senior review (in cents) */
    HIGH_EXPOSURE_THRESHOLD: 300000, // $3,000
    
    /** Cost threshold requiring structural engineer (in cents) */
    STRUCTURAL_THRESHOLD: 500000, // $5,000
    
    /** Maximum cost before mandatory shop inspection (in cents) */
    INSPECTION_THRESHOLD: 1000000, // $10,000
    
    /** Very low confidence threshold requiring full manual verification (0-1) */
    VERY_LOW_CONFIDENCE: 0.5,
  } as const;
  
  /**
   * Fraud detection thresholds
   * Rules for identifying potentially fraudulent claims
   */
  export const FRAUD = {
    /** Cost threshold for minor severity that triggers fraud suspicion (in cents) */
    MINOR_SEVERITY_COST_THRESHOLD: 100000, // $1,000
    
    /** Maximum number of parts before triggering fraud suspicion */
    MAX_PARTS_THRESHOLD: 5,
    
    /** Standard deviation multiplier for historical anomaly detection */
    HISTORICAL_ANOMALY_MULTIPLIER: 2,
    
    /** Standard deviation threshold for inconsistent damage flag (0-1) */
    INCONSISTENT_DAMAGE_SD_THRESHOLD: 0.3,
    
    /** Fraud risk score threshold for compliance notes (0-1) */
    COMPLIANCE_NOTES_THRESHOLD: 0.5,
    
    /** Fraud risk score threshold for auto-escalation (0-1) */
    AUTO_ESCALATION_THRESHOLD: 0.7,
    
    /** Fraud risk score threshold for senior approval requirement (0-1) */
    SENIOR_APPROVAL_THRESHOLD: 0.7,
  } as const;
  
  /**
   * Override significance thresholds
   * Changes exceeding these are flagged as high-value training data
   */
  export const OVERRIDE = {
    /** Absolute dollar change threshold (in cents) */
    SIGNIFICANT_DELTA_ABS: 30000, // $300
    
    /** Percentage change threshold (0-1) */
    SIGNIFICANT_DELTA_PCT: 0.2, // 20%
    
    /** Maximum allowed override without senior approval (in cents) */
    MAX_OVERRIDE_WITHOUT_APPROVAL: 100000, // $1,000
  } as const;
  
  // ============================================================================
  // PHOTO & IMAGE REQUIREMENTS
  // ============================================================================
  
  /**
   * Photo upload constraints
   */
  export const PHOTO = {
    /** Maximum file size in MB */
    MAX_FILE_SIZE_MB: 10,
    
    /** Maximum file size in bytes (computed) */
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
    
    /** Minimum file size in bytes (too small = over-compressed) */
    MIN_FILE_SIZE_BYTES: 100 * 1024, // 100KB
    
    /** Maximum number of photos per claim */
    MAX_PHOTOS: 6,
    
    /** Minimum recommended photos for good coverage */
    MIN_PHOTOS_RECOMMENDED: 3,
    
    /** Absolute minimum photos to run assessment */
    MIN_PHOTOS_REQUIRED: 2,
    
    /** Accepted file types */
    ACCEPTED_TYPES: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ] as const,
    
    /** Accepted file extensions (for display) */
    ACCEPTED_EXTENSIONS: ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const,
  } as const;
  
  /**
   * Image quality thresholds
   */
  export const IMAGE_QUALITY = {
    /** Minimum overall quality score (0-1) */
    MIN_SCORE: 0.55,
    
    /** Ideal quality score (0-1) */
    IDEAL_SCORE: 0.8,
    
    /** High quality score threshold (0-1) */
    HIGH_SCORE: 0.9,
    
    /** Good quality score threshold (0-1) */
    GOOD_SCORE: 0.75,
    
    /** Default quality score when resolution is unknown (0-1) */
    DEFAULT_SCORE: 0.5,
    
    /** Fair quality score threshold (0-1) */
    FAIR_SCORE: 0.6,
    
    /** Minimum resolution (width x height) */
    MIN_RESOLUTION: {
      width: 1280,
      height: 720,
    },
    
    /** Ideal resolution for best AI performance */
    IDEAL_RESOLUTION: {
      width: 1920,
      height: 1080,
    },
    
    /** Blur detection threshold (lower = blurrier) */
    BLUR_THRESHOLD: 0.5,
    
    /** Compression quality threshold */
    COMPRESSION_THRESHOLD: 0.6,
    
    /** Quality indicator thresholds for UI display */
    INDICATOR_THRESHOLDS: {
      HIGH: 0.8,
      MEDIUM: 0.6,
    },
    
    /** Minimum photos for quality badge display */
    MIN_PHOTOS_FOR_BADGE: 4,
    
    /** Minimum quality for quality badge */
    MIN_QUALITY_FOR_BADGE: 0.75,
    
    /** Maximum thumbnail previews to show */
    MAX_THUMBNAIL_PREVIEWS: 8,
  } as const;
  
  /**
   * Required photo angles for comprehensive assessment
   */
  export const REQUIRED_ANGLES = [
    { id: "rear", label: "Rear damage", icon: "🚗", priority: "required" },
    { id: "rear-left", label: "Rear left quarter", icon: "↙️", priority: "recommended" },
    { id: "rear-right", label: "Rear right quarter", icon: "↘️", priority: "recommended" },
    { id: "close-up", label: "Close-up of damage", icon: "🔍", priority: "recommended" },
    { id: "front", label: "Front view", icon: "🚙", priority: "optional" },
    { id: "interior", label: "Interior damage", icon: "🪟", priority: "optional" },
  ] as const;
  
  // ============================================================================
  // AI MODEL CONFIGURATION
  // ============================================================================
  
  /**
   * AI model settings
   */
  export const MODEL = {
    /** Mock model latency in milliseconds */
    MOCK_LATENCY_MS: 2500,
    
    /** Mock vision latency in milliseconds (faster for testing) */
    MOCK_VISION_LATENCY_MS: 1000,
    
    /** Real API timeout in milliseconds */
    TIMEOUT_MS: 25000, // 25 seconds (leave buffer for 30s Vercel limit)
    
    /** Retry attempts for failed API calls */
    MAX_RETRIES: 2,
    
    /** Delay between retries in milliseconds */
    RETRY_DELAY_MS: 1000,
    
    /** Model version identifier */
    VERSION: "v2.3.1",
    
    /** Minimum confidence to show results */
    MIN_DISPLAY_CONFIDENCE: 0.3,
    
    /** Cache TTL in seconds */
    CACHE_TTL_SECONDS: 3600, // 1 hour
    
    /** Vision AI specific settings */
    VISION: {
      /** Default quality score when not provided (0-1) */
      DEFAULT_QUALITY_SCORE: 0.6,
      
      /** Base confidence calculation: base + (quality * multiplier) */
      CONFIDENCE: {
        BASE: 0.5,
        QUALITY_MULTIPLIER: 0.4,
        MAX: 0.99,
      },
      
      /** Complexity thresholds based on photo count and quality */
      COMPLEXITY: {
        MINIMAL_PHOTO_COUNT: 2,
        MODERATE_PHOTO_COUNT: 4,
        MINIMAL_QUALITY_THRESHOLD: 0.5,
        MODERATE_QUALITY_THRESHOLD: 0.7,
      },
      
      /** Confidence adjustment factors for secondary parts */
      CONFIDENCE_ADJUSTMENTS: {
        SECONDARY_PART: -0.12,
        TERTIARY_PART: -0.15,
        MINOR_ADJUSTMENT: -0.08,
      },
      
      /** Confidence thresholds for severity determination */
      CONFIDENCE_THRESHOLDS: {
        HIGH: 0.7,
        MEDIUM_HIGH: 0.75,
        HIGH_PLUS: 0.8, // Used for high-confidence replacements
        MEDIUM: 0.72,
        MEDIUM_LOW: 0.65,
      },
      
      /** Scale AI polling settings */
      SCALE: {
        MAX_POLL_ATTEMPTS: 30,
        POLL_DELAY_MS: 2000,
        DEFAULT_CONFIDENCE: 0.85,
      },
      
      /** OpenAI Vision settings */
      OPENAI: {
        MAX_PHOTOS: 4,
        MAX_TOKENS: 1000,
        TEMPERATURE: 0.1,
        DEFAULT_CONFIDENCE: 0.8,
        MODEL: "gpt-4o",
      },
      
      /** Custom model settings */
      CUSTOM: {
        DEFAULT_CONFIDENCE: 0.8,
      },
    },
  } as const;
  
  // ============================================================================
  // CLAIM PROCESSING
  // ============================================================================
  
  /**
   * Claim lifecycle settings
   */
  export const CLAIM = {
    /** Policy number format regex */
    POLICY_NUMBER_PATTERN: /^POL-[A-Z0-9]{6,12}$/,
    
    /** Minimum description length */
    MIN_DESCRIPTION_LENGTH: 10,
    
    /** Maximum description length */
    MAX_DESCRIPTION_LENGTH: 500,
    
    /** Maximum date of loss (days in past) */
    MAX_DATE_OF_LOSS_DAYS: 365, // 1 year
    
    /** Auto-close abandoned claims after days */
    AUTO_CLOSE_AFTER_DAYS: 30,
    
    /** Claim ID prefix */
    ID_PREFIX: "CLM-",
    
    /** Assessment ID prefix */
    ASSESSMENT_ID_PREFIX: "ASM-",
  } as const;
  
  /**
   * Priority levels and SLAs
   */
  export const PRIORITY = {
    /** Target handling time by priority (in minutes) */
    TARGET_HANDLING_TIME: {
      urgent: 5,
      high: 15,
      medium: 30,
      low: 60,
    },
    
    /** Auto-escalate if not handled within (in hours) */
    AUTO_ESCALATE_AFTER: {
      urgent: 1,
      high: 4,
      medium: 24,
      low: 48,
    },
  } as const;
  
  // ============================================================================
  // UI & UX SETTINGS
  // ============================================================================
  
  /**
   * User interface configuration
   */
  export const UI = {
    /** Maximum items in undo history */
    MAX_HISTORY: 20,
    
    /** Auto-save draft interval (milliseconds) */
    AUTO_SAVE_INTERVAL_MS: 30000, // 30 seconds
    
    /** Toast notification duration (milliseconds) */
    TOAST_DURATION_MS: 5000,
    
    /** Loading spinner delay (milliseconds) */
    SPINNER_DELAY_MS: 300,
    
    /** Debounce delay for search/filter (milliseconds) */
    DEBOUNCE_DELAY_MS: 300,
    
    /** Items per page in tables */
    ITEMS_PER_PAGE: 25,
    
    /** Max length for truncated text */
    TRUNCATE_LENGTH: 50,
    
    /** Confidence badge thresholds for UI display (0-1) */
    CONFIDENCE_BADGE: {
      /** Excellent confidence threshold */
      EXCELLENT: 0.85,
      
      /** Good confidence threshold */
      GOOD: 0.7,
      
      /** Fair confidence threshold */
      FAIR: 0.5,
    },
  } as const;
  
  /**
   * Store configuration
   */
  export const STORE = {
    /** LocalStorage key for claim store persistence */
    CLAIM_STORE_KEY: "claim-store",
    
    /** Save operation delay in milliseconds (for UX simulation) */
    SAVE_DELAY_MS: 500,
    
    /** Mock assessment delay in milliseconds */
    MOCK_ASSESSMENT_DELAY_MS: 1000,
    
    /** Mock assessment data */
    MOCK_ASSESSMENT: {
      /** Default confidence for mock assessment (0-1) */
      CONFIDENCE: 0.85,
      
      /** Mock part cost range (in cents) */
      PART_COST_MIN: 50000, // $500
      PART_COST_MAX: 75000, // $750
      
      /** Mock model version identifier */
      MODEL_VERSION: "store-mock-v1",
    },
  } as const;
  
  /**
   * Keyboard shortcuts
   */
  export const SHORTCUTS = {
    APPROVE: "ctrl+a",
    REQUEST_PHOTOS: "ctrl+p",
    ESCALATE: "ctrl+e",
    SAVE: "ctrl+s",
    UNDO: "ctrl+z",
    SEARCH: "ctrl+k",
  } as const;
  
  // ============================================================================
  // VALIDATION RULES
  // ============================================================================
  
  /**
   * Input validation rules
   */
  export const VALIDATION = {
    /** Name field */
    NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z\s\-'.]+$/,
    },
    
    /** Email field */
    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    
    /** Phone field */
    PHONE: {
      PATTERN: /^\+?[\d\s\-().]+$/,
      MIN_LENGTH: 10,
      MAX_LENGTH: 20,
    },
    
    /** VIN field */
    VIN: {
      LENGTH: 17,
      PATTERN: /^[A-HJ-NPR-Z0-9]{17}$/,
    },
    
    /** Currency amounts (in cents) */
    COST: {
      MIN: 0,
      MAX: 10000000, // $100,000
    },
  } as const;
  
  // ============================================================================
  // COST ESTIMATION
  // ============================================================================
  
  /**
   * Cost estimation parameters
   */
  export const COST = {
    /** Regional labor rate multipliers */
    REGIONAL_MULTIPLIERS: {
      northeast: 1.2,
      west: 1.15,
      south: 0.95,
      midwest: 1.0,
    },
    
    /** Default hourly labor rate (in cents) */
    DEFAULT_LABOR_RATE: 12000, // $120/hour
    
    /** Paint & refinish base cost (in cents) */
    PAINT_BASE_COST: 50000, // $500
    
    /** Parts markup percentage */
    PARTS_MARKUP: 0.15, // 15%
    
    /** Estimate padding for uncertainty */
    ESTIMATE_PADDING: 0.1, // 10%
    
    /** Labor cost as fraction of total parts cost */
    LABOR_FRACTION: 0.3, // 30%
    
    /** Default base part cost when no specific mapping exists (in cents) */
    DEFAULT_BASE_PART_COST: 40000, // $400
    
    /** Minimum part cost (in cents) */
    MIN_PART_COST: 10000, // $100
    
    /** Cost range multipliers (min and max around midpoint) */
    RANGE: {
      MIN_MULTIPLIER: 0.8, // 80% of midpoint
      MAX_MULTIPLIER: 1.2, // 120% of midpoint
    },
    
    /** Damage type multiplier fallback for unknown types */
    DEFAULT_DAMAGE_TYPE_MULTIPLIER: 0.5,
    
    /** Damage type multiplier bounds */
    DAMAGE_TYPE_MULTIPLIER: {
      MIN: 0.4,
      MAX: 2.0,
    },
    
    /** Area factor normalization and bounds */
    AREA_FACTOR: {
      NORMALIZATION_PERCENT: 50, // 50% area ≈ 1.0x multiplier
      MIN: 0.3, // Minimum area factor
      MAX: 1.5, // Maximum area factor
    },
    
    /** Severity multipliers for cost estimation */
    SEVERITY_MULTIPLIERS: {
      MINOR: 0.6,
      MODERATE: 1.0,
      SEVERE: 1.5,
      REPLACE: 1.8,
      STRUCTURAL: 2.5,
    },
    
    /** Damage type multipliers (lowercased keys) */
    DAMAGE_TYPE_MULTIPLIERS: {
      scratch: 0.3,
      scuff: 0.25,
      dent: 0.6,
      crack: 0.7,
      crush: 1.1,
      tear: 0.8,
      shatter: 0.9,
      misalignment: 0.6,
      structural_compromise: 1.5,
    },
    
    /** Base part costs by vehicle part type (in cents) */
    BASE_PART_COSTS: {
      REAR_BUMPER: 50000, // $500
      TRUNK_LID: 60000, // $600
      REAR_LEFT_TAILLIGHT: 20000, // $200
      REAR_RIGHT_TAILLIGHT: 20000, // $200
      LEFT_QUARTER_PANEL: 40000, // $400 (default)
      FRAME: 300000, // $3,000
    },
  } as const;
  
  // ============================================================================
  // COMPLIANCE & AUDIT
  // ============================================================================
  
  /**
   * Audit and compliance settings
   */
  export const AUDIT = {
    /** Retain audit logs for (days) */
    RETENTION_DAYS: 2555, // 7 years (regulatory requirement)
    
    /** Log level in production */
    PRODUCTION_LOG_LEVEL: "info" as "debug" | "info" | "warn" | "error",
    
    /** Log level in development */
    DEVELOPMENT_LOG_LEVEL: "debug" as "debug" | "info" | "warn" | "error",
    
    /** Enable PII logging (disable in production) */
    LOG_PII: ENV.IS_DEVELOPMENT,
    
    /** Sensitive fields to redact */
    SENSITIVE_FIELDS: [
      "ssn",
      "driverLicense",
      "creditCard",
      "password",
      "apiKey",
    ] as const,
  } as const;
  
  /**
   * Data privacy settings
   */
  export const PRIVACY = {
    /** Anonymize data after (days) */
    ANONYMIZE_AFTER_DAYS: 730, // 2 years
    
    /** Delete anonymized data after (days) */
    DELETE_AFTER_DAYS: 2555, // 7 years
    
    /** Enable data export */
    ALLOW_DATA_EXPORT: true,
    
    /** Enable right to deletion */
    ALLOW_DATA_DELETION: true,
  } as const;
  
  // ============================================================================
  // RATE LIMITING
  // ============================================================================
  
  /**
   * API rate limits
   */
  export const RATE_LIMITS = {
    /** Requests per user per minute */
    USER_PER_MINUTE: 60,
    
    /** Requests per user per hour */
    USER_PER_HOUR: 500,
    
    /** Assessment requests per user per day */
    ASSESSMENTS_PER_DAY: 100,
    
    /** Photo uploads per user per hour */
    UPLOADS_PER_HOUR: 50,
  } as const;
  
  // ============================================================================
  // MONITORING & ALERTS
  // ============================================================================
  
  /**
   * Monitoring thresholds
   */
  export const MONITORING = {
    /** Alert if average response time exceeds (ms) */
    RESPONSE_TIME_THRESHOLD_MS: 5000,
    
    /** Alert if error rate exceeds (percentage) */
    ERROR_RATE_THRESHOLD: 5, // 5%
    
    /** Alert if model confidence drops below */
    CONFIDENCE_DROP_THRESHOLD: 0.7,
    
    /** Alert if override rate exceeds (percentage) */
    OVERRIDE_RATE_THRESHOLD: 40, // 40%
    
    /** Health check interval (ms) */
    HEALTH_CHECK_INTERVAL_MS: 60000, // 1 minute
  } as const;
  
  // ============================================================================
  // EXTERNAL SERVICES
  // ============================================================================
  
  /**
   * External API endpoints
   */
  export const ENDPOINTS = {
    /** Scale AI API */
    SCALE_API: process.env.SCALE_API_URL || "https://api.scale.com/v1",
    
    /** OpenAI API */
    OPENAI_API: process.env.OPENAI_API_URL || "https://api.openai.com/v1",
    
    /** Custom model service */
    CUSTOM_MODEL: process.env.MODEL_SERVICE_URL || "http://localhost:8000",
    
    /** Logging service */
    LOGGING_SERVICE: process.env.LOGGING_SERVICE_URL,
    
    /** Analytics service */
    ANALYTICS_SERVICE: process.env.ANALYTICS_SERVICE_URL,
  } as const;
  
  // ============================================================================
  // FEATURE ROLLOUT
  // ============================================================================
  
  /**
   * Feature flags for gradual rollout
   * Set percentage of users who see new features
   */
  export const ROLLOUT = {
    /** Advanced fraud detection */
    FRAUD_DETECTION: 0, // 0% - not yet rolled out
    
    /** Historical comparison */
    HISTORICAL_COMPARISON: 50, // 50% of users
    
    /** Shop recommendations */
    SHOP_RECOMMENDATIONS: 100, // 100% - fully rolled out
    
    /** Video upload support */
    VIDEO_UPLOAD: 0, // 0% - coming soon
    
    /** Telematics integration */
    TELEMATICS: 0, // 0% - future feature
  } as const;
  
  // ============================================================================
  // EXPORTS & HELPERS
  // ============================================================================
  
  /**
   * Helper to check if feature is enabled for user
   */
  export function isFeatureEnabled(
    feature: keyof typeof ROLLOUT,
    userId?: string
  ): boolean {
    const percentage = ROLLOUT[feature];
    
    if (percentage === 0) return false;
    if (percentage === 100) return true;
    
    // Deterministic rollout based on user ID
    if (!userId) return false;
    
    const hash = userId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 100) < percentage;
  }
  
  /**
   * Get environment-appropriate log level
   */
  export function getLogLevel(): string {
    return ENV.IS_PRODUCTION
      ? AUDIT.PRODUCTION_LOG_LEVEL
      : AUDIT.DEVELOPMENT_LOG_LEVEL;
  }
  
  /**
   * Format cost from cents to dollars
   */
  export function formatCost(cents: number): string {
    return `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  /**
   * Check if cost qualifies for fast-track
   */
  export function isFastTrackEligible(
    totalCost: number,
    confidence: number
  ): boolean {
    return (
      confidence >= FAST_TRACK.MIN_CONFIDENCE &&
      totalCost <= FAST_TRACK.MAX_COST
    );
  }
  
  /**
   * Determine if override is significant
   */
  export function isSignificantOverride(
    originalCost: number,
    newCost: number
  ): boolean {
    const delta = Math.abs(newCost - originalCost);
    const percentChange = originalCost > 0 ? delta / originalCost : 0;
    
    return (
      delta > OVERRIDE.SIGNIFICANT_DELTA_ABS ||
      percentChange > OVERRIDE.SIGNIFICANT_DELTA_PCT
    );
  }
  
  /**
   * Get priority from claim attributes
   */
  export function determinePriority(claim: {
    injuries?: boolean;
    drivable?: boolean;
    totalCost?: number;
  }): "urgent" | "high" | "medium" | "low" {
    if (claim.injuries) return "urgent";
    if (!claim.drivable) return "high";
    if (claim.totalCost && claim.totalCost > ESCALATION.HIGH_EXPOSURE_THRESHOLD) {
      return "high";
    }
    return "medium";
  }
  
  // ============================================================================
  // TYPE EXPORTS
  // ============================================================================
  
  export type PhotoType = (typeof PHOTO.ACCEPTED_TYPES)[number];
  export type PriorityLevel = keyof typeof PRIORITY.TARGET_HANDLING_TIME;
  export type LogLevel = typeof AUDIT.PRODUCTION_LOG_LEVEL;
  export type FeatureFlag = keyof typeof ROLLOUT;
  
  // Export all as default for convenient imports
  export default {
    ENV,
    FEATURES,
    FAST_TRACK,
    ESCALATION,
    FRAUD,
    OVERRIDE,
    PHOTO,
    IMAGE_QUALITY,
    REQUIRED_ANGLES,
    MODEL,
    CLAIM,
    PRIORITY,
    UI,
    STORE,
    SHORTCUTS,
    VALIDATION,
    COST,
    AUDIT,
    PRIVACY,
    RATE_LIMITS,
    MONITORING,
    ENDPOINTS,
    ROLLOUT,
    // Helpers
    isFeatureEnabled,
    getLogLevel,
    formatCost,
    isFastTrackEligible,
    isSignificantOverride,
    determinePriority,
  };