# PLQ Rater API Integration
## Technical Specification for Team Review

**Project**: Samurai Insurance AI Agent
**Date**: January 2026
**Status**: Planning Phase - Awaiting Approval
**Version**: 1.1 (Updated after QA schema review)

---

## 1. Executive Summary

This document outlines the technical plan for integrating the PLQ Rater API v2 into the Samurai Insurance platform. The integration will enable real-time insurance quote generation from multiple carriers, with AI-powered analysis and presentation through our existing Sam chat agent.

### Objectives
- Enable users to get **real personalized quotes** (not just estimates)
- Submit rating requests to **multiple carriers simultaneously**
- **AI agent analyzes results** and presents best options conversationally
- Store quote history for comparison and future reference

### Scope
- **Phase 1**: Personal Auto insurance (this document)
- **Phase 2**: Homeowners insurance (future)

---

## 2. API Overview

### Endpoint Details
| Item | Value |
|------|-------|
| Base URL | `https://gateway.pre.zrater.io/api/v2` |
| Environment | Pre-production (Sandbox) |
| Authentication | `x-api-key` header |
| API Version | v2 |

### Key Endpoints
```
POST /linesOfBusiness/{line}/states/{state}/rates/{version}
  → Submits rating request, returns transactionId

GET /linesOfBusiness/{line}/getRateResultsById?id={transactionId}
  → Polls for results (async operation)

GET /linesOfBusiness/{line}/states/{state}/activeProducts
  → Lists available carrier products for state
```

### Request/Response Flow
```
1. Submit Rate Request → Returns transactionId (immediate)
2. Poll for Results → Returns carrierResults[] (5-30 seconds)
3. Parse & Store Results → Display to user via AI agent
```

---

## 3. Database Gap Analysis

> **Note**: Initial analysis was based on production `schema.sql`. After team feedback, we reviewed the **QA environment** which contains significantly more fields based on the Canopy/Zywave integration work. This section reflects the corrected analysis.

### Current State
Our QA Supabase database has **65 tables** with approximately **55% of fields** required by the PLQ API already existing. This is significantly better than the initial 21% estimate.

### Coverage by Category (Updated)

| Category | Existing | Missing | Coverage |
|----------|----------|---------|----------|
| Customer/User Info | 12 | 8 | 60% |
| Driver Basic Info | 10 | 4 | 71% |
| Driver License Details | 8 | 4 | 67% |
| Driver Attributes | 2 | 5 | 29% |
| Driver Discounts | 1 | 8 | 11% |
| Vehicle Basic Info | 14 | 6 | 70% |
| Vehicle Coverage | 6 | 6 | 50% |
| Policy Coverages | 4 | 8 | 33% |
| Policy Metadata | 6 | 4 | 60% |
| **TOTAL** | **63** | **53** | **55%** |

### Existing Fields (QA Schema)

**Users Table** ✅ Already has:
- `prior_carrier`, `prior_insurance_months`, `continuous_insurance_months`
- `months_at_residence`
- `home_phone`, `work_phone`

**Driver Table** ✅ Already has:
- `relationship_to_named_insured`, `license_state`, `license_status`
- `years_licensed`, `months_licensed`
- `sr22_required`, `sr22a_required`
- `good_driver`

**Vehicle Table** ✅ Already has:
- `annual_mileage`, `miles_to_work`, `odometer_reading`
- `garaging_zip`, `garaging_state`, `garaging_street`
- `purchase_date`, `ownership`
- `anti_theft_device`, `safety_features`, `primary_use`

**Prior Insurance** ✅ Table already exists:
- `plq_prior_insurance` with: carrier_name, policy_number, coverage dates, months_covered

**Zywave Tables** ✅ Existing integration tables:
- `zyw_rating_requests`, `zyw_drivers`, `zyw_vehicles`
- `zyw_policy`, `zyw_vehicle_coverages`, `zyw_discounts`, `zyw_rating_results`

### Remaining Gaps

**Customer Data** (Minor gaps)
- County in address (can derive from ZIP)
- Middle name field

**Driver Data**
- Employment info (industry, occupation, months employed)
- Discount eligibility flags (good student, defensive driving, distant student, etc.)
- Detailed violation/accident history structure

**Vehicle Data**
- `assigned_driver_id` foreign key
- Lienholder/leasing company details
- Usage-based insurance enrollment flag

**Policy Coverages**
- Standardized coverage limit fields matching PLQ format
- Some coverage types (PIP, Medical Payments, Rental Reimbursement)

### Field Name Mapping (Canopy/Zywave → PLQ)

| Our Field Name | PLQ API Field | Notes |
|---------------|---------------|-------|
| `annual_mileage` | `AnnualMiles` | Direct map |
| `months_licensed` | `MonthsLicensed` | Direct map |
| `license_status` | `LicenseStatus` | May need value mapping |
| `prior_carrier` | `PriorCarrierName` | Direct map |
| `prior_insurance_months` | `PriorMonthsCoverage` | Direct map |
| `relationship_to_named_insured` | `RelationToInsured` | Value mapping needed |
| `garaging_zip` | `GaragingAddress.ZipCode` | Nested in API |
| `primary_use` | `Usage` | Value mapping needed |
| `sr22_required` | `SR22Required` | Direct map (boolean) |

---

## 4. Required Database Changes

> **Reduced Scope**: Thanks to existing Canopy/Zywave integration work, the required changes are ~50% less than initially estimated.

### New Tables (2 instead of 5)

| Table | Purpose | Status |
|-------|---------|--------|
| ~~`prior_insurance`~~ | Previous insurance history | ✅ **Already exists** as `plq_prior_insurance` |
| `driver_attributes` | Education, employment details | ⚠️ **Needed** |
| `driver_discounts` | Discount eligibility flags | ⚠️ **Needed** |
| ~~`auto_policy_coverages`~~ | Policy coverage selections | ✅ **Partially exists** in `zyw_vehicle_coverages` |
| `rater_transactions` | API call tracking & results | ⚠️ **Needed** (or extend `zyw_rating_requests`) |

### Column Additions (~15 columns instead of ~40)

**Users Table** (minimal changes needed)
- ~~`home_phone`, `work_phone`~~ ✅ Already exist
- ~~`months_at_residence`~~ ✅ Already exists
- `middle_name` ⚠️ Add if name parsing needed
- `county` ⚠️ Add or derive from ZIP lookup

**Driver Table** (minimal changes needed)
- ~~`relation_to_insured`~~ ✅ Already exists as `relationship_to_named_insured`
- ~~`sr22_required`, `sr22a_required`~~ ✅ Already exist
- `industry`, `occupation`, `months_employed` ⚠️ Add for employment info

**Vehicle Table** (minimal changes needed)
- ~~`annual_miles`, `miles_to_work`, `odometer`~~ ✅ Already exist
- ~~`garaging_*`~~ ✅ Already exist
- ~~`purchase_date`, `ownership`~~ ✅ Already exist
- `assigned_driver_id` ⚠️ Add FK to driver table
- `leased_vehicle` ⚠️ Add boolean flag
- `ubi_enrolled`, `rideshare_use` ⚠️ Add if needed

### Decision: Extend Existing vs Create New

**Option A: Extend `zyw_*` tables**
- Pros: Less migration work, data already flowing
- Cons: Zywave-specific naming, may not fit PLQ exactly

**Option B: Create parallel `plq_*` tables**
- Pros: Clean PLQ-specific schema, clear separation
- Cons: Data duplication, sync complexity

**Recommendation**: Option A with a transformation layer in code. Use existing `zyw_*` tables and create `rater-transformer.ts` to map between schemas.

---

## 5. System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│                                                              │
│   User in Chat  →  "I want to get a quote for my car"       │
│        ↓                                                     │
│   Sam Agent detects "buying" intent                          │
│        ↓                                                     │
│   Check if user has all required data                        │
│        ↓                                                     │
│   [Missing Data?] → Ask conversationally in chat             │
│        ↓                                                     │
│   Submit to Rating API                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND PROCESSING                      │
│                                                              │
│   1. Validate data with Zod schemas                         │
│   2. Transform Supabase data → PLQ API format               │
│   3. Call PLQ API (POST /rates)                             │
│   4. Store transaction in rater_transactions                │
│   5. Poll for results (every 5s, max 60s)                   │
│   6. Parse carrier results                                   │
│   7. Store quotes in database                                │
│   8. Format for AI presentation                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      AI PRESENTATION                         │
│                                                              │
│   Sam Agent receives structured quote results:               │
│   - Top 5 carriers sorted by price                          │
│   - Coverage comparison                                      │
│   - Savings vs current policy (if applicable)               │
│   - AI recommendation with reasoning                         │
│                                                              │
│   User can request:                                          │
│   - "Show me all quotes"                                     │
│   - "Compare Carrier A vs B"                                 │
│   - "What coverages am I getting?"                          │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling Strategy

| Scenario | User Experience |
|----------|-----------------|
| Validation errors | Sam asks for corrections conversationally |
| Missing required fields | Sam prompts for specific missing data |
| API timeout (>60s) | Show fallback estimates, offer retry |
| Carrier declines | Include in results with reason |
| Server error | Retry 3x, then show cached/average rates |

---

## 6. User Experience Design

### Quote Flow (Conversational)

**Happy Path:**
```
User: "I want to get quotes for my car insurance"

Sam: "I'd be happy to help you get personalized quotes!
      I have your basic info on file. Let me confirm a few details:

      Your 2016 Toyota Camry - is it used for commuting to work?"

User: "Yes, about 15 miles each way"

Sam: "Got it. And are you currently insured? If so, who's your carrier?"

User: "Yes, State Farm"

Sam: "Perfect! I'm getting quotes from multiple carriers now.
      This usually takes about 20 seconds..."

      [20 seconds later]

Sam: "Great news! I got quotes from 8 carriers. Here are your top options:

      1. Progressive - $142/month ($1,704/year)
      2. Geico - $156/month ($1,872/year)
      3. Allstate - $163/month ($1,956/year)

      Progressive has the best rate and includes the same
      100/300/100 liability coverage you have now.

      Would you like to see all 8 quotes or compare specific carriers?"
```

### Data Collection Strategy

| Data Type | Collection Method |
|-----------|-------------------|
| Basic info (name, DOB, address) | From user profile (already have) |
| Vehicle info | From uploaded policy OR ask in chat |
| Driver history | Ask in chat (simple yes/no questions) |
| Coverage preferences | Offer recommendations, let user adjust |
| Discounts | Checklist-style questions in chat |

---

## 7. Files to Create/Modify

### New Files

| File | Purpose | Est. Lines |
|------|---------|------------|
| `backend/types/rater.ts` | TypeScript interfaces for PLQ API | ~200 |
| `backend/lib/rater-validation.ts` | Zod schemas for validation | ~150 |
| `backend/services/rater-api.ts` | HTTP client with auth & retry | ~200 |
| `backend/services/rater-transformer.ts` | Data transformation (Supabase ↔ PLQ) | ~250 |
| `backend/services/rater-polling.ts` | Background polling service | ~100 |
| `backend/routes/rating.ts` | Express route handlers | ~150 |
| `database/migrations/004_rater_integration.sql` | Schema changes (reduced scope) | ~75 |

### Files to Modify

| File | Changes |
|------|---------|
| `backend/server.ts` | Register new routes |
| `backend/agents/sam.ts` | Add quote flow handling (~200 lines) |
| `.env` | Add API credentials |

### Leverage Existing Code

The following existing files may be useful to reference or extend:

| Existing File/Table | Relevance |
|---------------------|-----------|
| `zyw_rating_requests` | Similar request tracking pattern |
| `zyw_rating_results` | Result storage structure |
| `plq_prior_insurance` | Prior insurance already modeled |
| `zyw_*` transformer logic (if any) | Pattern for data transformation |

---

## 8. Implementation Phases

### Phase 1: Foundation (Database & Types) — Reduced Scope
- [ ] Review existing `zyw_*` tables for reusability
- [ ] Create minimal migration (~15 columns, 2 tables)
- [ ] Define TypeScript interfaces for PLQ API
- [ ] Create Zod validation schemas
- [ ] Set up environment variables (API key)

### Phase 2: API Integration
- [ ] Build PLQ API client with auth headers
- [ ] Implement data transformer (Supabase ↔ PLQ format)
- [ ] Create field mapping layer (Canopy naming → PLQ naming)
- [ ] Create polling service for async results

### Phase 3: Backend Routes
- [ ] POST /api/rating/submit endpoint
- [ ] GET /api/rating/results/:id endpoint
- [ ] Register in server.ts

### Phase 4: Sam Agent Integration
- [ ] Add quote intent detection
- [ ] Implement conversational data collection
- [ ] Build results presentation logic
- [ ] Add "Top 5 / Show All" display

### Phase 5: Testing & QA
- [ ] Unit tests for transformer (field mapping)
- [ ] Integration tests with sandbox API
- [ ] End-to-end flow testing
- [ ] Error scenario testing

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| API Key Storage | Environment variable, never in code |
| PII in Logs | Redact sensitive fields before logging |
| Rate Limiting | Implement client-side throttling |
| Data Retention | Store only necessary quote data |
| Input Validation | Zod schemas validate all input |

---

## 10. Open Items

### Required Before Implementation
1. **Agency ID** - Need assigned AgencyId for CarrierInformation
2. **Team Approval** - This document

### Future Considerations
1. **Homeowners Integration** - Phase 2
2. **Quote Comparison UI** - Visual comparison tool
3. **Bind Flow** - Actually purchasing the policy
4. **Quote Persistence** - Save quotes for later

---

## 11. Appendix: Sample API Payload

<details>
<summary>Click to expand full Personal Auto request payload</summary>

```json
{
  "Identifier": "Gateway-PersonalAuto-IL",
  "Customer": {
    "Identifier": "TestCustomer",
    "FirstName": "John",
    "LastName": "Smith",
    "Address": {
      "Street1": "123 Main St",
      "City": "Chicago",
      "State": "Illinois",
      "County": "Cook",
      "ZipCode": "60007"
    },
    "ContactInformation": {
      "MobilePhone": "555-123-4567",
      "EmailAddress": "john@example.com"
    },
    "MonthsAtResidence": 60,
    "PriorInsuranceInformation": {
      "PriorInsurance": true,
      "PriorCarrierName": "State Farm",
      "PriorLiabilityLimit": "100000/300000/100000",
      "PriorMonthsCoverage": 36
    }
  },
  "RatedDrivers": [
    {
      "DriverId": 1,
      "FirstName": "John",
      "LastName": "Smith",
      "DateOfBirth": "1985-03-15T00:00:00Z",
      "Gender": "Male",
      "MaritalStatus": "Married",
      "LicenseInformation": {
        "LicenseStatus": "Valid",
        "MonthsLicensed": 240,
        "StateLicensed": "Illinois"
      },
      "Violations": []
    }
  ],
  "Vehicles": [
    {
      "Vin": "1HGBH41JXMN109186",
      "Make": "Honda",
      "Model": "Accord",
      "Year": 2021,
      "AnnualMiles": 12000,
      "AssignedDriverId": 1,
      "Usage": "Work School",
      "CoverageInformation": {
        "ComprehensiveDeductible": "500",
        "CollisionDeductible": "500"
      }
    }
  ],
  "PolicyCoverages": {
    "LiabilityBiLimit": "100000/300000",
    "LiabilityPdLimit": "100000",
    "UninsuredMotoristBiLimit": "100000/300000"
  },
  "Term": "Semi Annual",
  "EffectiveDate": "2026-02-01T00:00:00Z"
}
```

</details>

---

## 12. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial draft based on production schema.sql |
| 1.1 | Jan 2026 | Updated gap analysis after QA schema review. Coverage corrected from 21% → 55%. Added field mapping table. Reduced scope for database changes. |

---

**Document Version**: 1.1
**Author**: Claude (AI Assistant)
**Review Status**: Pending Team Approval

### Key Changes in v1.1
- **Gap Analysis Corrected**: Initial analysis used production `schema.sql`. QA environment has significantly more fields from Canopy/Zywave integration.
- **Coverage Improved**: 21% → 55% (63 of 116 required fields already exist)
- **Reduced Effort**: Database migration reduced from ~40 columns to ~15 columns
- **Existing Tables**: `plq_prior_insurance` and `zyw_*` tables can be leveraged
- **Field Mapping Added**: Documentation of naming differences between our schema and PLQ API
