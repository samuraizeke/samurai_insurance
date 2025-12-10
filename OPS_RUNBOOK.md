# Samurai Insurance - Operations Runbook

**Emergency contacts and commands for on-call engineers.**

---

## 1. Deploy a Hotfix

### Option A: Via Cloud Build (Recommended)
```bash
# From the backend/ directory, push to main branch
cd backend
git add .
git commit -m "HOTFIX: <description>"
git push origin main

# Cloud Build will automatically build and deploy
# Monitor at: https://console.cloud.google.com/cloud-build/builds?project=hale-dynamo-480016-a2
```

### Option B: Direct Deploy (Emergency Only)
```bash
# Build and deploy directly from local
cd backend

# Build the image
gcloud builds submit \
  --tag us-east5-docker.pkg.dev/hale-dynamo-480016-a2/cloud-run-source-deploy/samurai-backend:hotfix-$(date +%Y%m%d%H%M%S) \
  .

# Deploy to Cloud Run
gcloud run deploy samurai-insurance \
  --image us-east5-docker.pkg.dev/hale-dynamo-480016-a2/cloud-run-source-deploy/samurai-backend:hotfix-$(date +%Y%m%d%H%M%S) \
  --region us-east5 \
  --platform managed
```

---

## 2. Rollback

### Option A: Revert to Previous Revision (Instant)
```bash
# List recent revisions
gcloud run revisions list \
  --service samurai-insurance \
  --region us-east5 \
  --limit 10

# Route 100% traffic to a known-good revision
gcloud run services update-traffic samurai-insurance \
  --region us-east5 \
  --to-revisions <REVISION_NAME>=100

# Example:
# gcloud run services update-traffic samurai-insurance \
#   --region us-east5 \
#   --to-revisions samurai-insurance-00042-abc=100
```

### Option B: Via Cloud Console (GUI)
1. Go to: https://console.cloud.google.com/run/detail/us-east5/samurai-insurance/revisions?project=hale-dynamo-480016-a2
2. Click on a healthy revision
3. Click "Manage Traffic"
4. Set the good revision to 100%

### Option C: Git Revert
```bash
# Revert the last commit and redeploy
git revert HEAD --no-edit
git push origin main
# Cloud Build will deploy the reverted state
```

---

## 3. Logs

### Cloud Run Logs (Backend)
```bash
# Stream live logs
gcloud run services logs read samurai-insurance \
  --region us-east5 \
  --limit 100

# Or tail logs in real-time
gcloud run services logs tail samurai-insurance \
  --region us-east5
```

**Cloud Console:**
- https://console.cloud.google.com/run/detail/us-east5/samurai-insurance/logs?project=hale-dynamo-480016-a2

### Cloud Logging (Full Search)
- https://console.cloud.google.com/logs/query?project=hale-dynamo-480016-a2

**Useful filters:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="samurai-insurance"
severity>=ERROR
```

### Supabase Dashboard
- **Project Dashboard:** https://supabase.com/dashboard/projects
- **Database Logs:** Project > Logs > Postgres
- **Auth Logs:** Project > Authentication > Logs
- **API Logs:** Project > API > Logs

---

## 4. Database Connection

### Supavisor Connection String Format
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**To find your connection string:**
1. Go to Supabase Dashboard > Project Settings > Database
2. Copy the "Connection string" (URI format)
3. Use the **Pooler** connection for production apps

### Direct Connection (Admin Only)
```bash
# Using psql (get credentials from Supabase dashboard)
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Environment Variables (in Cloud Run)
The following secrets are mounted from Secret Manager:
- `SUPABASE_URL` - API URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)
- `SUPABASE_PUBLISHABLE_KEY` - Public/anon key

---

## 5. Quick Health Check

```bash
# Check service status
gcloud run services describe samurai-insurance \
  --region us-east5 \
  --format="value(status.url)"

# Run smoke test against production
PROD_URL=https://samurai-insurance-<hash>-ue.a.run.app npx tsx scripts/smoke-test.ts
```

---

## 6. Scaling & Instance Management

```bash
# View current instance count
gcloud run services describe samurai-insurance \
  --region us-east5 \
  --format="yaml(status)"

# Force scale to zero (stop all instances)
gcloud run services update samurai-insurance \
  --region us-east5 \
  --max-instances 0

# Restore normal scaling
gcloud run services update samurai-insurance \
  --region us-east5 \
  --max-instances 10
```

---

## 7. Secrets Management

```bash
# List secrets
gcloud secrets list --project=hale-dynamo-480016-a2

# View secret versions
gcloud secrets versions list supabase-url --project=hale-dynamo-480016-a2

# Update a secret (creates new version)
echo -n "new-value" | gcloud secrets versions add supabase-url --data-file=-

# After updating secrets, redeploy to pick up changes
gcloud run services update samurai-insurance \
  --region us-east5 \
  --update-secrets SUPABASE_URL=supabase-url:latest
```

---

## Key Resources

| Resource | Link |
|----------|------|
| Cloud Run Service | https://console.cloud.google.com/run/detail/us-east5/samurai-insurance |
| Cloud Build History | https://console.cloud.google.com/cloud-build/builds?project=hale-dynamo-480016-a2 |
| Cloud Logging | https://console.cloud.google.com/logs?project=hale-dynamo-480016-a2 |
| Secret Manager | https://console.cloud.google.com/security/secret-manager?project=hale-dynamo-480016-a2 |
| Supabase Dashboard | https://supabase.com/dashboard |
| Artifact Registry | https://console.cloud.google.com/artifacts/docker/hale-dynamo-480016-a2/us-east5/cloud-run-source-deploy |

---

*Last updated: December 2024*
