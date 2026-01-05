# PLQ Rater API Integration
## Technical Specification for Team Review

**Project**: Samurai Insurance AI Agent
**Date**: January 2026
**Status**: Planning Phase - Awaiting Approval

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

### Current State
Our Supabase database has 50+ tables but only **21% of fields** required by the PLQ API currently exist.

### Coverage by Category

| Category | Existing | Missing | Coverage |
|----------|----------|---------|----------|
| Customer/User Info | 5 | 15 | 25% |
| Driver Basic Info | 6 | 8 | 43% |
| Driver License Details | 2 | 10 | 17% |
| Driver Attributes | 0 | 7 | 0% |
| Driver Discounts | 0 | 9 | 0% |
| Vehicle Basic Info | 5 | 15 | 25% |
| Vehicle Coverage | 4 | 8 | 33% |
| Policy Coverages | 0 | 12 | 0% |
| Policy Metadata | 2 | 8 | 20% |
| **TOTAL** | **24** | **92** | **21%** |

### Key Missing Data Points

**Customer Data**
- Prior insurance history (carrier, limits, coverage duration)
- Months at current residence
- Structured address with county

**Driver Data**
- License experience (months licensed, MVR experience)
- Employment info (industry, occupation, months employed)
- Discount eligibility (good student, defensive driving, etc.)
- SR-22/SR-22A requirements

**Vehicle Data**
- Annual mileage
- Garaging address (if different from residence)
- Purchase type (new/used), lease status
- Anti-theft devices, telematics enrollment

---

## 4. Required Database Changes

### New Tables (5)

1. **`prior_insurance`** - Customer's previous insurance history
2. **`driver_attributes`** - Education, residency, employment details
3. **`driver_discounts`** - Discount eligibility flags
4. **`auto_policy_coverages`** - Policy-level coverage selections
5. **`rater_transactions`** - API call tracking and results storage

### Column Additions (~40 columns across existing tables)

**Users Table**
- `first_name`, `middle_name`, `last_name` (split from `name`)
- `home_phone`, `work_phone`
- `months_at_residence`

**Driver Table**
- `first_name`, `middle_name`, `last_name`
- `relation_to_insured`
- `sr22_required`, `sr22a_required`

**Vehicle Table**
- `annual_miles`, `miles_to_work`, `odometer`
- `assigned_driver_id` (FK)
- `purchase_type`, `leased_vehicle`, `purchase_date`
- `garaging_street`, `garaging_city`, `garaging_state`, `garaging_zip`
- Anti-theft flags, usage-based/rideshare flags

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
| `backend/services/rater-transformer.ts` | Data transformation layer | ~300 |
| `backend/services/rater-polling.ts` | Background polling service | ~100 |
| `backend/routes/rating.ts` | Express route handlers | ~150 |
| `database/migrations/004_rater_integration.sql` | Schema changes | ~150 |

### Files to Modify

| File | Changes |
|------|---------|
| `backend/server.ts` | Register new routes |
| `backend/agents/sam.ts` | Add quote flow handling (~200 lines) |
| `.env` | Add API credentials |

---

## 8. Implementation Phases

### Phase 1: Foundation (Database & Types)
- [ ] Create and apply database migration
- [ ] Define TypeScript interfaces
- [ ] Create Zod validation schemas
- [ ] Set up environment variables

### Phase 2: API Integration
- [ ] Build PLQ API client
- [ ] Implement data transformer (Supabase ↔ PLQ)
- [ ] Create polling service

### Phase 3: Backend Routes
- [ ] POST /api/rating/submit endpoint
- [ ] GET /api/rating/results/:id endpoint
- [ ] Register in server.ts

### Phase 4: Sam Agent Integration
- [ ] Add quote intent detection
- [ ] Implement conversational data collection
- [ ] Build results presentation logic
- [ ] Add "Top 5 / Show All" UI

### Phase 5: Testing & QA
- [ ] Unit tests for transformer
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

**Document Version**: 1.0
**Author**: Claude (AI Assistant)
**Review Status**: Pending Team Approval
