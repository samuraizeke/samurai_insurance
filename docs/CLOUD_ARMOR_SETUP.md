# Cloud Armor Setup Guide

## Status: DEFERRED

**Decision Date:** 2025-12-09
**Reason:** MVP/Beta phase - relying on existing protections
**Revisit When:** Before GA launch or after first security incident

---

## Current Protections (Active)

| Layer | Protection | Location |
|-------|------------|----------|
| Application | Rate limiting (100 req/min general, 30/min chat) | [rateLimiter.ts](../backend/middleware/rateLimiter.ts) |
| Database | Feedback rate limit (10/hour per user) | [rls_security_hardening.sql](../database/rls_security_hardening.sql) |
| Infrastructure | Cloud Run built-in DDoS mitigation | GCP managed |
| Infrastructure | Max instances cap (10) | [cloudbuild.yaml](../backend/cloudbuild.yaml) |

---

## Why Cloud Armor?

Cloud Armor provides:
- **WAF Rules**: Block SQL injection, XSS, and other OWASP Top 10 attacks
- **Geo-blocking**: Restrict traffic by country
- **Rate limiting**: IP-based throttling at edge (before hitting your app)
- **Adaptive protection**: ML-based anomaly detection
- **Kill switch**: Instantly block all traffic or specific patterns

---

## Prerequisites

Cloud Armor requires a Global External HTTP(S) Load Balancer. Current architecture:

```
Current:  Users → Cloud Run (direct)
Required: Users → Load Balancer → Cloud Armor → Serverless NEG → Cloud Run
```

**Estimated additional cost:** ~$18-25/month for load balancer

---

## Implementation Steps

### Step 1: Create Serverless Network Endpoint Group (NEG)

```bash
export PROJECT_ID="hale-dynamo-480016-a2"
export REGION="us-east5"

gcloud compute network-endpoint-groups create samurai-serverless-neg \
  --project=$PROJECT_ID \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=samurai-insurance
```

### Step 2: Create Backend Service

```bash
gcloud compute backend-services create samurai-backend-service \
  --project=$PROJECT_ID \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTPS

gcloud compute backend-services add-backend samurai-backend-service \
  --project=$PROJECT_ID \
  --global \
  --network-endpoint-group=samurai-serverless-neg \
  --network-endpoint-group-region=$REGION
```

### Step 3: Create URL Map

```bash
gcloud compute url-maps create samurai-url-map \
  --project=$PROJECT_ID \
  --default-service=samurai-backend-service
```

### Step 4: Create SSL Certificate

```bash
# Option A: Google-managed certificate (recommended)
gcloud compute ssl-certificates create samurai-ssl-cert \
  --project=$PROJECT_ID \
  --domains=api.joinsamurai.com \
  --global

# Option B: Upload your own certificate
# gcloud compute ssl-certificates create samurai-ssl-cert \
#   --project=$PROJECT_ID \
#   --certificate=path/to/cert.pem \
#   --private-key=path/to/key.pem \
#   --global
```

### Step 5: Create HTTPS Proxy

```bash
gcloud compute target-https-proxies create samurai-https-proxy \
  --project=$PROJECT_ID \
  --url-map=samurai-url-map \
  --ssl-certificates=samurai-ssl-cert
```

### Step 6: Reserve Static IP and Create Forwarding Rule

```bash
# Reserve static IP
gcloud compute addresses create samurai-lb-ip \
  --project=$PROJECT_ID \
  --global \
  --ip-version=IPV4

# Get the IP address
gcloud compute addresses describe samurai-lb-ip \
  --project=$PROJECT_ID \
  --global \
  --format="get(address)"

# Create forwarding rule
gcloud compute forwarding-rules create samurai-https-rule \
  --project=$PROJECT_ID \
  --global \
  --target-https-proxy=samurai-https-proxy \
  --address=samurai-lb-ip \
  --ports=443
```

### Step 7: Create Cloud Armor Security Policy

```bash
# Create the policy
gcloud compute security-policies create samurai-waf-policy \
  --project=$PROJECT_ID \
  --description="WAF policy for Samurai Insurance API"

# Add OWASP ModSecurity Core Rule Set
gcloud compute security-policies rules create 1000 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy \
  --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
  --action=deny-403 \
  --description="Block XSS attacks"

gcloud compute security-policies rules create 1001 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy \
  --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
  --action=deny-403 \
  --description="Block SQL injection"

# Add rate limiting rule
gcloud compute security-policies rules create 2000 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=1000 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600 \
  --conform-action=allow \
  --exceed-action=deny-429 \
  --enforce-on-key=IP \
  --description="Rate limit: 1000 req/min per IP"
```

### Step 8: Attach Policy to Backend Service

```bash
gcloud compute backend-services update samurai-backend-service \
  --project=$PROJECT_ID \
  --global \
  --security-policy=samurai-waf-policy
```

### Step 9: Update DNS

Point your domain to the load balancer IP:

```
api.joinsamurai.com → [LOAD_BALANCER_IP]
```

### Step 10: Restrict Cloud Run to Load Balancer Only

```bash
# After confirming LB works, restrict direct access
gcloud run services update samurai-insurance \
  --project=$PROJECT_ID \
  --region=$REGION \
  --ingress=internal-and-cloud-load-balancing
```

---

## Emergency Kill Switch Commands

Once Cloud Armor is configured, use these commands during an attack:

### Block All Traffic (Nuclear Option)

```bash
gcloud compute security-policies rules create 0 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy \
  --expression="true" \
  --action=deny-403 \
  --description="EMERGENCY: Block all traffic"
```

### Block Specific IP

```bash
gcloud compute security-policies rules create 100 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy \
  --expression="origin.ip == '1.2.3.4'" \
  --action=deny-403 \
  --description="Block attacker IP"
```

### Block Country

```bash
gcloud compute security-policies rules create 101 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy \
  --expression="origin.region_code == 'XX'" \
  --action=deny-403 \
  --description="Block country XX"
```

### Remove Emergency Block

```bash
gcloud compute security-policies rules delete 0 \
  --project=$PROJECT_ID \
  --security-policy=samurai-waf-policy
```

---

## Estimated Costs

| Component | Monthly Cost |
|-----------|--------------|
| Global External HTTP(S) Load Balancer | ~$18 (5 rules) |
| Cloud Armor Standard | Included with LB |
| Cloud Armor Managed Protection Plus | ~$3,000/month (optional, for large-scale DDoS) |
| Data processing | ~$0.008/GB |

**Recommended tier:** Standard (included with LB) - sufficient for most attacks.

---

## Rollback Plan

If issues arise after implementing Cloud Armor:

1. Update Cloud Run to allow direct access:
   ```bash
   gcloud run services update samurai-insurance \
     --project=$PROJECT_ID \
     --region=$REGION \
     --ingress=all
   ```

2. Update DNS to point directly to Cloud Run URL

3. Delete load balancer resources (in reverse order of creation)

---

*Document Created: 2025-12-09*
*Status: Deferred - Revisit before GA*
