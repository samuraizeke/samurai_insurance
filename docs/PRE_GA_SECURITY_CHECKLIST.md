# Pre-GA Security Checklist

## Overview

This document tracks security enhancements deferred during beta that **must be completed before General Availability (GA)**.

**Last Updated:** 2025-12-09
**Target Completion:** Before GA launch

---

## Deferred Items

### 1. Cloud Armor WAF (Kill Switch)

**Status:** ⏸️ Deferred
**Priority:** HIGH
**Estimated Cost:** ~$18-25/month
**Implementation Time:** 1-2 hours

**Why Deferred:** Requires load balancer setup; existing rate limiting provides baseline protection for beta.

**What It Provides:**
- Edge-level DDoS protection
- WAF rules (XSS, SQLi blocking)
- Geographic blocking capability
- Instant kill switch during attacks

**Implementation Guide:** [CLOUD_ARMOR_SETUP.md](./CLOUD_ARMOR_SETUP.md)

---

### 2. Supabase Point-in-Time Recovery (PITR)

**Status:** ⏸️ Deferred
**Priority:** HIGH
**Estimated Cost:** $25/month (Pro plan)
**Implementation Time:** 15 minutes (dashboard toggle)

**Why Deferred:** Daily backups sufficient for beta; limited user data at risk.

**What It Provides:**
- Restore database to any point in time (minute granularity)
- Protection against accidental data deletion
- Forensic capability after incidents
- Compliance requirement for financial/health data

**How to Enable:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project → Settings → Database → Backups
3. Upgrade to Pro plan if needed
4. Enable "Point-in-Time Recovery"
5. Verify backup retention period (recommend: 7 days minimum)

**Current State:** Daily backups only (up to 24 hours potential data loss)

---

### 3. GCP Alerting Policies

**Status:** ⏸️ Deferred
**Priority:** MEDIUM
**Estimated Cost:** Free (included in GCP)
**Implementation Time:** 30 minutes

**Why Deferred:** Can be added incrementally; manual monitoring acceptable for beta.

**Recommended Alerts:**

| Alert | Condition | Notification |
|-------|-----------|--------------|
| High Error Rate | > 5% errors for 5 min | Email + Slack |
| High Latency | p99 > 5s for 5 min | Email |
| Near Max Instances | > 8 instances | Email |
| Failed Deployments | Cloud Build failure | Email + Slack |

**How to Configure:**
1. GCP Console → Monitoring → Alerting → Create Policy
2. Add conditions per table above
3. Configure notification channels

---

## Completed Security Items (Beta)

| Item | Status | Date |
|------|--------|------|
| Row-Level Security (RLS) | ✅ Done | 2025-12-09 |
| RLS Security Hardening (external_id protection) | ✅ Done | 2025-12-09 |
| Secret Manager Integration | ✅ Done | 2025-12-09 |
| Structured JSON Logging | ✅ Done | 2025-12-09 |
| Docker Image SHA Pinning | ✅ Done | 2025-12-09 |
| Application Rate Limiting | ✅ Done | 2025-12-09 |
| IDOR Prevention | ✅ Done | 2025-12-09 |
| Secret Rotation Playbook | ✅ Done | 2025-12-09 |
| Supabase pg_audit Extension | ✅ Done | 2025-12-09 |
| Region Alignment (Cloud Run + Supabase in Ohio) | ✅ Done | 2025-12-09 |

---

## GA Readiness Criteria

Before launching GA, verify:

- [ ] Cloud Armor configured with WAF rules
- [ ] PITR enabled in Supabase
- [ ] GCP alerting policies active
- [x] pg_audit enabled and configured
- [ ] Penetration test completed
- [ ] SOC 2 Type I audit (if required)
- [ ] Privacy policy and ToS reviewed by legal
- [ ] Incident response plan documented
- [ ] On-call rotation established

---

## Risk Acceptance (Beta Phase)

| Risk | Likelihood | Impact | Mitigation | Accepted By |
|------|------------|--------|------------|-------------|
| DDoS without Cloud Armor | Low | Medium | App-level rate limiting | [Name/Date] |
| Data loss (up to 24h) | Low | Medium | Daily backups | [Name/Date] |
| Delayed breach detection | Low | High | Manual log review | [Name/Date] |

---

*Document Created: 2025-12-09*
