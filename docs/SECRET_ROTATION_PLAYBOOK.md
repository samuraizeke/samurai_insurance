# Secret Rotation Playbook

## Overview

This document provides step-by-step procedures for rotating secrets in the Samurai Insurance infrastructure. Follow these procedures in case of:

- Suspected credential compromise
- Scheduled security rotation (recommended: every 90 days)
- Employee offboarding with secret access
- Security audit requirements

## Critical Secrets Inventory

| Secret Name | Location | Impact if Leaked |
|------------|----------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | GCP Secret Manager | **CRITICAL** - Full database access, bypasses RLS |
| `SUPABASE_PUBLISHABLE_KEY` | GCP Secret Manager | Medium - Client-side key, limited by RLS |
| `SUPABASE_URL` | GCP Secret Manager | Low - Public endpoint |

---

## Emergency Rotation: SUPABASE_SERVICE_ROLE_KEY

**Estimated Time:** 15-30 minutes
**Downtime:** ~2-5 minutes during Cloud Run redeployment

### Step 1: Generate New Key in Supabase

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `samurai-insurance`
3. Navigate to **Settings** → **API**
4. Click **Regenerate** next to `service_role` key
5. **COPY THE NEW KEY IMMEDIATELY** - it won't be shown again

### Step 2: Update GCP Secret Manager

```bash
# Set your project
export PROJECT_ID="hale-dynamo-480016-a2"

# Create new secret version with the new key
echo -n "YOUR_NEW_SERVICE_ROLE_KEY" | \
  gcloud secrets versions add supabase-service-role-key \
  --project=$PROJECT_ID \
  --data-file=-

# Verify the new version was created
gcloud secrets versions list supabase-service-role-key --project=$PROJECT_ID
```

### Step 3: Deploy New Cloud Run Revision

```bash
# Force a new deployment to pick up the new secret
gcloud run services update samurai-insurance \
  --region=us-east5 \
  --project=$PROJECT_ID \
  --update-secrets=SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest
```

### Step 4: Verify Application Health

```bash
# Check service status
gcloud run services describe samurai-insurance \
  --region=us-east5 \
  --project=$PROJECT_ID \
  --format="value(status.url)"

# Test health endpoint
curl -s https://samurai-insurance-<hash>-ue.a.run.app/ | head -1
```

### Step 5: Disable Old Secret Version

```bash
# List versions to find the old one
gcloud secrets versions list supabase-service-role-key --project=$PROJECT_ID

# Disable the old version (e.g., version 1)
gcloud secrets versions disable 1 \
  --secret=supabase-service-role-key \
  --project=$PROJECT_ID
```

### Step 6: Monitor for Errors

Check Cloud Logging for authentication failures in the next 30 minutes:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR AND timestamp>="2024-01-01T00:00:00Z"' \
  --project=$PROJECT_ID \
  --limit=50 \
  --format="table(timestamp,jsonPayload.message)"
```

---

## Scheduled Rotation Checklist

Use this checklist for routine 90-day rotations:

- [ ] Schedule maintenance window (low-traffic period)
- [ ] Notify team via #engineering Slack channel
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` (see above)
- [ ] Update local `.env` files for developers
- [ ] Document rotation in security log
- [ ] Verify all services are healthy
- [ ] Delete disabled secret versions after 7 days

---

## Rollback Procedure

If the new secret causes issues:

```bash
# Re-enable the previous version
gcloud secrets versions enable PREVIOUS_VERSION_NUMBER \
  --secret=supabase-service-role-key \
  --project=$PROJECT_ID

# Update Cloud Run to use specific version
gcloud run services update samurai-insurance \
  --region=us-east5 \
  --project=$PROJECT_ID \
  --update-secrets=SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:PREVIOUS_VERSION_NUMBER
```

---

## First-Time Setup: Creating Secrets in Secret Manager

Before the first deployment with Secret Manager, create the secrets:

```bash
export PROJECT_ID="hale-dynamo-480016-a2"

# Create the secrets (one-time setup)
gcloud secrets create supabase-url --project=$PROJECT_ID --replication-policy="automatic"
gcloud secrets create supabase-service-role-key --project=$PROJECT_ID --replication-policy="automatic"
gcloud secrets create supabase-publishable-key --project=$PROJECT_ID --replication-policy="automatic"

# Add the initial values
echo -n "https://atgykhhbgbchhbnurhtx.supabase.co" | \
  gcloud secrets versions add supabase-url --project=$PROJECT_ID --data-file=-

echo -n "YOUR_SERVICE_ROLE_KEY" | \
  gcloud secrets versions add supabase-service-role-key --project=$PROJECT_ID --data-file=-

echo -n "YOUR_PUBLISHABLE_KEY" | \
  gcloud secrets versions add supabase-publishable-key --project=$PROJECT_ID --data-file=-

# Grant Cloud Run service account access to secrets
gcloud secrets add-iam-policy-binding supabase-url \
  --project=$PROJECT_ID \
  --member="serviceAccount:si-app-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding supabase-service-role-key \
  --project=$PROJECT_ID \
  --member="serviceAccount:si-app-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding supabase-publishable-key \
  --project=$PROJECT_ID \
  --member="serviceAccount:si-app-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Incident Response Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-Call Engineer | [Check PagerDuty] | Any secret rotation |
| Security Lead | [security@company.com] | Suspected compromise |
| Supabase Support | support@supabase.io | Cannot regenerate keys |

---

## Audit Log

| Date | Secret Rotated | Reason | Performed By |
|------|---------------|--------|--------------|
| YYYY-MM-DD | SUPABASE_SERVICE_ROLE_KEY | Initial setup | [Name] |

---

*Last Updated: 2025-12-09*
