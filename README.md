# 🚗 Claims Intelligence Workbench 🚗

> **AI-Powered Vehicle Claims Assessment Platform**  
> Accelerate auto damage claims processing with computer vision, human-in-the-loop verification, and continuous learning.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

##  Table of Contents

- [Problem Statement](#-problem-statement)
- [Product Vision](#-product-vision)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [User Guide](#-user-guide)
- [Success Metrics](#-guardrails)
- [Development](#-development)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## Problem Statement

### The Challenge

Photo-based auto claims are accelerating, but handling remains slow, manual, and expensive:

- **15-20 minutes** per preliminary estimate for simple photo-based losses
- **High LAE costs** (loss adjustment expenses) remain in high single digits as % of premium
- **Senior adjusters pulled into routine cases** instead of complex disputes
- **Regulators wary** of opaque "black box" AI
- **No scalable solution** to turn abundant photo evidence into fast, trustworthy decisions

### The Opportunity

A large share of personal auto claims (60-70%) are **low-severity physical damage**—precisely the segment best suited for standardized, governed automation. These high-volume, routine cases create the perfect environment for AI augmentation.

---

##  Product Vision

**We reduce the cost and time of handling routine auto damage claims** by providing adjusters with an AI-generated first-pass estimate that they can verify, correct, or escalate.

### Key Principles

1. **Adjuster in Control** - Licensed adjusters remain firmly in control; AI accelerates judgment but doesn't replace it
2. **Fast Decisions** - Turn routine approvals into 1-2 minute decisions instead of 15-20 minutes
3. **Continuous Learning** - Every adjustment, override, and final invoice captured as labeled feedback
4. **Transparency** - Full visibility into AI reasoning, confidence scores, and decision paths
5. **Regulatory Defensibility** - Complete audit trail with human verification at every ste

---

##  Key Features

### F1: AI Draft Estimate
**User Value**: Cuts time spent manually reviewing photos and keying line items  
**How It Works**: AI analyzes damage photos and generates structured estimate with parts, severity, and cost ranges

```
Example Output:
├─ Rear bumper – Severe, 95% conf, $800–1,200
├─ Trunk lid – Moderate, 78% conf, $400–600
└─ Right tail light – Replace, 99% conf, $150–200
   Total: $1,350–2,000
```

### F2: Confidence & Flags
**User Value**: Shows when to trust, double-check, or escalate  
**How It Works**: Visual confidence meters, quality checks, and risk flags enable safe adoption

- 🟢 **High Confidence (85%+)** - Fast-track eligible
- 🟡 **Medium Confidence (60-85%)** - Review recommended
- 🔴 **Low Confidence (<60%)** - Manual review required

### F3: Approve / Edit / Escalate
**User Value**: Keeps adjusters in full control of decision path  
**Actions Available**:
- ✅ **Approve** - Accept AI estimate (with verification)
- ✏️ **Edit** - Override specific parts or costs
- 🚨 **Escalate** - Send to senior adjuster
- 📸 **Request Photos** - Ask for additional angles

### F4: Feedback Logging
**User Value**: Converts real usage into continuous improvement  
**Captured Data**:
- All AI outputs with model versions
- Human overrides with delta calculations
- Final invoices for accuracy tracking
- High-value training cases auto-flagged

### F5: Policy-Based Routing
**User Value**: Sends complex cases to experts automatically  
**Routing Rules**:
- Structural damage → Senior adjuster
- High cost (>$3K) → Manual review
- Low confidence → Human verification
- Anomaly flags → Escalation queue

### F6: Audit & Traceability
**User Value**: Supports audits, QA reviews, and regulator questions  
**Full Trail**:
- What AI saw (input photos + metadata)
- What AI suggested (parts, severity, costs)
- How humans responded (approve/edit/escalate)
- Model versions and timestamps

---

##  How It Works

### Example User Flow: Low-Severity Rear-End Collision

#### Before (Manual Process)
```
 15-45 minutes
1. Visual review of each photo
2. System lookups for parts/pricing
3. Hand-typed line items and notes
4. Mental load: recall patterns, check consistency
5. Second-guess cost estimates
```

#### After (Workbench)
```
 90 seconds
1. Click "Run AI Assessment"
2. Review structured draft in 3 seconds
3. Approve or make quick edits
4. Done
```

### Detailed Flow

1. **Open Claim**
   - Jane opens Claim #47291 with policy details, FNOL summary, and 4 photos

2. **Run AI Assessment** (3 seconds)
   - AI analyzes photos using vision models
   - Detects parts: rear bumper, trunk lid, tail light
   - Classifies severity: severe, moderate, replace
   - Estimates costs: $800-1,200, $400-600, $150-200
   - Checks: No structural flags, passes quality checks
   - **Recommendation**: Eligible for fast-track with verification

3. **Human Review & Feedback** (1-2 minutes)
   - If draft looks right → Click "Approve Preliminary Estimate"
   - If something missing → Use "Add/Edit Item" to adjust
   - Overrides >$300 or >20% → Auto-marked for training pipeline

4. **Outcome**
   - All outputs, edits, and decisions logged for audit
   - Handling time: **90 seconds** vs 15-45 minutes
   - Adjuster stays in control throughout

---

##  Tech Stack

### Frontend Architecture

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (strict mode)
- **UI Library**: [React 18](https://reactjs.org/) with Server Components
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with Immer
- **Error Handling**: React Error Boundaries

### Backend/API

- **API Routes**: Next.js API Routes (serverless functions)
- **AI Integration**: Damage assessment API (configurable provider)
- **Image Processing**: Multi-part detection, classification, cost estimation
- **Rules Engine**: Policy-based routing and decision support

### AI Technical Approach

The system uses a four-stage pipeline:

1. **Detection** - Parts & Regions
   - Fine-tuned vision model (YOLO/Mask R-CNN-class)
   - Output: part_id, bounding box, damage_present, quality flags

2. **Classification** - Damage Type & Severity
   - Classifies: scratch, dent, crack, shatter, etc.
   - Severity: minor / moderate / severe / structural
   - Output: {part_id, damage_type, severity, confidence}

3. **Cost Estimation** - Calibrated Ranges
   - Regression models trained on historical invoices
   - Factors: labor rates, parts pricing, regional variations
   - Output: {cost_min, cost_max, rationale}

4. **Confidence & Safety Layer**
   - Cross-photo agreement validation
   - Image quality checks
   - Policy engine for routing decisions
   - Graceful degradation on low confidence

### Data & Storage

- **Database**: PostgreSQL (recommended) for claims data
- **File Storage**: S3-compatible object storage for photos
- **Caching**: Redis for API response caching (optional)
- **Logging**: Structured JSON logs for audit trail

---

## Getting Started

### Prerequisites

- **Node.js**: 18.0 or higher
- **npm/yarn/pnpm**: Latest version
- **PostgreSQL**: 14+ (optional for full setup)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/claims-workbench.git
cd claims-workbench

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Run development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### Environment Configuration

Create `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
USE_REAL_DAMAGE_AI=false
AI_PROVIDER=mock

# Feature Flags
ENABLE_FRAUD_DETECTION=false
ENABLE_ASSESSMENT_CACHE=true
ENABLE_ASYNC_PROCESSING=false

# Business Rules (cents)
FAST_TRACK_MAX_COST=300000
FAST_TRACK_MIN_CONFIDENCE=0.80
HIGH_EXPOSURE_THRESHOLD=500000

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/claims

# Storage (optional)
S3_BUCKET=claims-photos
S3_REGION=us-east-1
```

---

##  Project Structure

```
claims-workbench/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main workbench interface
│   │   ├── layout.tsx                # Root layout with error boundary
│   │   └── api/
│   │       └── damage_assessment/
│   │           └── route.ts          # Assessment API endpoint
│   │
│   ├── components/                   # React components
│   │   ├── ActionLog.tsx             # Audit trail display
│   │   ├── AssessmentPanel.tsx       # AI estimate panel
│   │   ├── ClaimForm.tsx             # Claim context input
│   │   ├── ConfidenceMeter.tsx       # Visual confidence indicators
│   │   ├── DamagedPartsTable.tsx     # Parts list with edit capability
│   │   ├── DecisionBar.tsx           # Action buttons (approve/edit/escalate)
│   │   ├── ErrorBoundary.tsx         # Error handling wrapper
│   │   ├── ImageUploader.tsx         # Photo upload with drag-and-drop
│   │   ├── Modal.tsx                 # Confirmation dialogs
│   │   └── PhotoQuality.tsx          # Image quality analysis
│   │
│   ├── config/
│   │   └── policy.ts                 # Business rules configuration
│   │
│   ├── lib/
│   │   └── cn.ts                     # Utility functions
│   │
│   ├── server/                       # Server-side logic
│   │   ├── costing.ts                # Cost estimation engine
│   │   ├── policy.ts                 # Policy routing engine
│   │   └── vision.ts                 # AI integration layer
│   │
│   ├── store/
│   │   └── useClaimStore.ts          # Zustand state management
│   │
│   └── types/
│       └── assessment.ts             # TypeScript type definitions
│
├── public/                           # Static assets
├── docs/                             # Documentation
│   ├── prd/                          # Product requirements
│   └── api/                          # API documentation
│
├── .env.local                        # Environment variables (git-ignored)
├── .env.example                      # Example configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

---

## Configuration

### Policy Configuration (`src/config/policy.ts`)

All business rules are centralized and configurable:

```typescript
// Fast-track eligibility
export const FAST_TRACK = {
  MIN_CONFIDENCE: 0.8,        // 80%+ confidence required
  MAX_COST: 300000,           // $3,000 maximum (in cents)
};

// Escalation triggers
export const ESCALATION = {
  MIN_CONFIDENCE: 0.6,        // Below 60% → manual review
  HIGH_EXPOSURE_THRESHOLD: 500000, // Above $5,000 → senior adjuster
  STRUCTURAL_THRESHOLD: 0,    // Any structural damage → escalate
};

// Override tracking
export const OVERRIDE = {
  SIGNIFICANT_DELTA_ABS: 10000,      // $100 absolute change
  SIGNIFICANT_DELTA_PCT: 0.2,        // 20% relative change
  // Overrides exceeding these thresholds → high-value training data
};

// Photo requirements
export const PHOTO = {
  MIN_PHOTOS_REQUIRED: 2,
  MIN_PHOTOS_RECOMMENDED: 3,
  MAX_PHOTOS: 6,
};
```

### Customization Examples

**Adjust fast-track limits**:
```typescript
// More conservative
FAST_TRACK.MAX_COST = 200000;  // $2,000
FAST_TRACK.MIN_CONFIDENCE = 0.85; // 85%

// More aggressive
FAST_TRACK.MAX_COST = 500000;  // $5,000
FAST_TRACK.MIN_CONFIDENCE = 0.75; // 75%
```

**Regional variations**:
```typescript
// Different costs by region
const REGIONAL_MULTIPLIERS = {
  'CA': 1.3,  // California 30% higher
  'TX': 0.9,  // Texas 10% lower
  'NY': 1.2,  // New York 20% higher
};
```

---

## User Guide

### Primary Users

1. **Claims Adjusters/Agents** - Frontline users handling high-volume photo-based claims
2. **Senior Adjusters** - Review escalated/high-risk cases with full AI trace

### Workflow: Processing a Claim

#### Step 1: Set Claim Context

```
1. Enter policy number (format: POL-XXXXXX)
2. Enter claimant name
3. Describe incident (brief summary)
4. Click "Set Claim Context"
```

**Validation**: Policy number must start with "POL-"

#### Step 2: Upload Damage Photos

```
1. Drag and drop 2-6 photos, or click to browse
2. Supported formats: JPG, PNG, WEBP, HEIC
3. Wait for quality analysis (automatic)
4. Review quality warnings if any
```

**Best Practices**:
- Include multiple angles (rear, side, close-ups)
- Ensure good lighting
- Capture full damage extent
- Minimum 800x600 resolution

#### Step 3: Run AI Assessment

```
1. Click "Run assessment" button
2. Wait 2-5 seconds for AI analysis
3. Review results:
   - Overall confidence score
   - Damaged parts table
   - Cost estimate range
   - AI recommendation
```

**What AI Provides**:
- Part identification
- Severity classification
- Cost range estimates
- Confidence scores per part
- Overall recommendation

#### Step 4: Review & Decision

**Option A: Approve** (Fast-track)
```
✓ High confidence (85%+)
✓ Low severity
✓ Cost under threshold
→ Click "Approve"
→ Confirm in modal
→ Claim processed
```

**Option B: Edit** (Override)
```
1. Click pencil icon on any part
2. Adjust cost estimates
3. Add override notes
4. Click "Save Override"
→ Delta calculated and logged
→ High-value overrides flagged for training
```

**Option C: Request Photos**
```
✓ Photo quality issues
✓ Missing angles
✓ Damage unclear
→ Click "Request Photos"
→ System generates photo request to claimant
→ Claim paused until photos received
```

**Option D: Escalate**
```
✓ Low confidence (<60%)
✓ Structural damage suspected
✓ Cost exceeds threshold
✓ Unusual patterns
→ Click "Escalate"
→ Confirm reason
→ Routed to senior adjuster queue
```

#### Step 5: Audit Trail

Every action automatically logged:
- Timestamp
- User ID
- Action type
- AI outputs
- Human decisions
- Override deltas
- Model versions

---

## Guardrails

### Model Health

| Metric | Target | Action Trigger |
|--------|--------|----------------|
| **Golden Set Accuracy** | >95% | Block release if >5% degradation |
| **False Positive Rate** (flags) | <5% | Investigate if exceeds |
| **Confidence Calibration** | Well-calibrated | Retrain if drift detected |

### Rollback Triggers

Automatic rollback if:
- Override rate jumps >15% above steady state
- Repeated high-severity misclassifications detected
- Dispute rate increases significantly

---

##  Development

### Available Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
npm run format       # Format with Prettier

# Testing (when implemented)
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Development Workflow

1. **Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Write code following TypeScript strict mode
   - Add types for new interfaces
   - Update tests if applicable

3. **Test Locally**
   ```bash
   npm run dev
   # Manual testing in browser
   npm run lint
   npm run type-check
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   # Follow conventional commits
   ```

5. **Push & PR**
   ```bash
   git push origin feature/your-feature
   # Open pull request on GitHub
   ```

### Code Style Guidelines

**TypeScript**:
- Strict mode enabled
- Explicit return types for functions
- No `any` types (use `unknown` if needed)
- Interface over type for objects

**React**:
- Functional components only
- Hooks for state management
- Props interfaces for all components
- Error boundaries for critical sections

**Naming Conventions**:
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Constants: `UPPER_SNAKE_CASE`
- Files: Match component name

---

##  Deployment

### Vercel (Recommended for v1)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Environment Variables** (set in Vercel dashboard):
- `USE_REAL_DAMAGE_AI=true`
- `AI_PROVIDER=production`
- `DATABASE_URL=postgresql://...`
- `S3_BUCKET=prod-claims-photos`

### Docker

```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t claims-workbench .
docker run -p 3000:3000 --env-file .env.production claims-workbench
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] S3 bucket created with proper permissions
- [ ] SSL certificate installed
- [ ] Logging and monitoring enabled
- [ ] Error tracking (Sentry) configured
- [ ] API rate limiting enabled
- [ ] CORS configured for domains
- [ ] Backup strategy implemented

---

##  Roadmap

### P0: Low-Complexity Fast-Track Pilot ✅

**Scope**: 200-500 claims/week, 2-3 regions, 8-12 weeks

**Focus**:
- Photo-based, low-severity PD claims <$3K
- High-volume band (60-70% of auto PD claims)
- Shadow mode → visible recommendations

**Why**: Maximizes time savings while minimizing risk. Builds trust, establishes ROI, creates labeled dataset.

**Status**: ✅ Prototype complete

### P1: Scale & Integrate 

**Planned Features**:
- [ ] More damage types (hail, glass, mechanical)
- [ ] Multi-region support with locale customization
- [ ] Integration with core claims platforms
- [ ] Parts database connections
- [ ] DRP (Direct Repair Program) network integration
- [ ] Leadership dashboards and analytics
- [ ] Mobile app for field adjusters

**Timeline**: Q2 2025

### P2: Advanced Intelligence 

**Planned Features**:
- [ ] Fraud pattern detection
- [ ] Shop optimization recommendations
- [ ] Cross-portfolio analytics
- [ ] Predictive cost modeling
- [ ] Video damage assessment
- [ ] Telematics data integration
- [ ] 3D damage visualization

**Prerequisites**: Stable P0/P1 performance + sufficient labeled data

**Timeline**: H2 2025

---

##  Contributing

We welcome contributions! Please follow these guidelines:

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch
3. **Commit** changes with clear messages
4. **Test** thoroughly
5. **Submit** a pull request

### Pull Request Guidelines

- **Title**: Clear, descriptive (e.g., "Add fraud detection flags")
- **Description**: What, why, and how
- **Tests**: Include tests for new features
- **Documentation**: Update README if needed
- **Code Style**: Follow existing patterns

### Reporting Issues

**Bug Reports** should include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment details

**Feature Requests** should include:
- Use case and user value
- Proposed implementation (optional)
- Priority and impact assessment
---

<div align="center">

**Built to accelerate claims, empower adjusters, and improve outcomes**

Version 1.0 | Last Updated: November 9, 2025

[⬆ back to top](#-claims-intelligence-workbench)

</div>
