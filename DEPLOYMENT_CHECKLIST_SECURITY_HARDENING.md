# 🚀 Deployment Checklist: Security Hardening

**Date:** 2025-10-19  
**Scope:** Audit Logs Immutability + User Consents + Signature Verification  
**Status:** Ready for Production

---

## Pre-Deployment (Dev Environment)

- [ ] **Backup database**
  ```bash
  supabase db pull --schema public > backup_2025_10_19.sql
  ```

- [ ] **Test migrations locally**
  ```bash
  supabase migration up 20251019_audit_logs_immutable
  supabase migration up 20251019_user_consents_and_signatures
  ```

- [ ] **Verify migration success**
  ```sql
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('audit_logs', 'user_consents', 'hmac_secrets', 'signature_verification_log');
  -- Expected: All rowsecurity = 't'
  ```

- [ ] **Test audit log immutability**
  ```sql
  -- Should succeed
  INSERT INTO audit_logs (user_id, action, resource_type) 
  VALUES (auth.uid(), 'test', 'transaction');
  
  -- Should fail
  UPDATE audit_logs SET action = 'hack' WHERE id = '...';
  DELETE FROM audit_logs WHERE id = '...';
  ```

- [ ] **Test user consents**
  ```sql
  -- Should succeed
  INSERT INTO user_consents (user_id, consent_version, consent_text_hash)
  VALUES (auth.uid(), 'privacy-v1.0', 'hash123');
  
  -- Should return records
  SELECT * FROM user_consents WHERE user_id = auth.uid();
  ```

- [ ] **Deploy signature verification utility**
  - [ ] Copy `netlify/functions/_shared/verify-signature.ts`
  - [ ] Test import: `import { verifySignature } from './_shared/verify-signature'`
  - [ ] Run unit tests:
    ```bash
    npm test -- verify-signature.test.ts
    ```

---

## Staging Environment

- [ ] **Run migrations on staging database**
  ```bash
  SUPABASE_PROJECT_REF=<staging> supabase migration up 20251019_audit_logs_immutable
  SUPABASE_PROJECT_REF=<staging> supabase migration up 20251019_user_consents_and_signatures
  ```

- [ ] **Verify staging RLS policies**
  ```sql
  SELECT * FROM pg_policies
  WHERE tablename IN ('audit_logs', 'user_consents', 'hmac_secrets', 'signature_verification_log');
  ```

- [ ] **Test integration in staging Netlify functions**
  - [ ] Deploy test function with audit logging
  - [ ] Verify audit logs are created and immutable
  - [ ] Verify no UPDATE/DELETE succeeds

- [ ] **Test consent workflow**
  - [ ] User accepts consent
  - [ ] Consent is recorded with timestamp
  - [ ] User can retrieve consent history
  - [ ] Cannot accept duplicate consent version

- [ ] **Test signature verification**
  - [ ] Valid signatures are accepted
  - [ ] Invalid signatures are rejected
  - [ ] Timing-safe comparison works
  - [ ] Replay attack prevention works

- [ ] **Test RLS policies**
  - [ ] Users see only their own records
  - [ ] Service role sees all records
  - [ ] Unauthorized access is blocked

- [ ] **Load testing**
  - [ ] Test audit log inserts at scale (100 qps)
  - [ ] Verify no UPDATE/DELETE operations succeed
  - [ ] Check signature verification performance

---

## Pre-Production Checklist

- [ ] **Security review**
  - [ ] All RLS policies reviewed and approved
  - [ ] HMAC signature implementation uses timing-safe comparison
  - [ ] No plaintext secrets stored in database
  - [ ] PII redaction in logs verified

- [ ] **Environment variables configured**
  - [ ] `WEBHOOK_SECRET` set (production value)
  - [ ] `CONSENT_VERSION_CURRENT` set
  - [ ] `CONSENT_VERSION_AI_TEAM` set
  - [ ] All secrets rotated and synced to Netlify

- [ ] **Documentation ready**
  - [ ] `SQL_SECURITY_COMPLETE_GUIDE.md` published
  - [ ] Team trained on new security features
  - [ ] Troubleshooting guide reviewed
  - [ ] Compliance requirements confirmed (GDPR, SOC2, etc.)

- [ ] **Monitoring configured**
  - [ ] Audit log monitoring alerts set up
  - [ ] Failed signature verification alerts
  - [ ] Rate limit monitoring
  - [ ] Unusual activity detection

---

## Production Deployment

### Phase 1: Database Migrations (Low Risk)

```bash
# Step 1: Apply audit logs immutability
psql -h <prod-db> -U postgres -d postgres << 'EOF'
$(cat migrations/20251019_audit_logs_immutable.sql)
EOF

# Step 2: Verify success
psql -h <prod-db> -U postgres -d postgres << 'EOF'
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'audit_logs';
EOF

# Expected output: rowsecurity = 't'
```

```bash
# Step 3: Apply user consents & signatures
psql -h <prod-db> -U postgres -d postgres << 'EOF'
$(cat migrations/20251019_user_consents_and_signatures.sql)
EOF

# Step 4: Verify success
psql -h <prod-db> -U postgres -d postgres << 'EOF'
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_consents', 'hmac_secrets', 'signature_verification_log');
EOF
```

### Phase 2: Code Deployment (Netlify)

- [ ] **Deploy new Netlify functions**
  ```bash
  netlify deploy --prod
  ```

- [ ] **Verify deployment**
  - [ ] Netlify logs show no errors
  - [ ] Functions are accessible
  - [ ] Signature verification middleware works

- [ ] **Monitor first 1 hour**
  - [ ] No increase in error rates
  - [ ] Audit logs being created successfully
  - [ ] No RLS policy violations
  - [ ] Performance metrics normal

### Phase 3: Client-Side Updates (React)

- [ ] **Deploy consent banner**
  - [ ] Component displays on first visit
  - [ ] Consent acceptance persists
  - [ ] Analytics track acceptance rate

- [ ] **Deploy audit logging in critical flows**
  - [ ] Transaction creation logs
  - [ ] Category changes log
  - [ ] Exports log

---

## Post-Deployment Verification

### Day 1

- [ ] **Check audit logs volume**
  ```sql
  SELECT COUNT(*) as total_logs
  FROM public.audit_logs
  WHERE created_at > NOW() - INTERVAL '24 hours';
  ```

- [ ] **Verify immutability holds**
  ```sql
  -- This should fail
  UPDATE public.audit_logs SET action = 'TEST' 
  WHERE created_at > NOW() - INTERVAL '24 hours' LIMIT 1;
  ```

- [ ] **Check consent acceptance**
  ```sql
  SELECT COUNT(*) as consents_accepted
  FROM public.user_consents
  WHERE accepted_at > NOW() - INTERVAL '24 hours';
  ```

- [ ] **Verify signature verification logs**
  ```sql
  SELECT status, COUNT(*) as count
  FROM public.signature_verification_log
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY status;
  ```

- [ ] **Review error logs**
  - [ ] No RLS policy violations
  - [ ] No signature verification failures (expected)
  - [ ] No database errors

### Week 1

- [ ] **Monitor compliance metrics**
  ```sql
  -- User consent acceptance rate
  SELECT 
    COUNT(DISTINCT user_id) as users_consented,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM auth.users), 2) as acceptance_rate
  FROM public.user_consents;
  ```

- [ ] **Audit log analysis**
  ```sql
  SELECT action, COUNT(*) as count
  FROM public.audit_logs
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY action
  ORDER BY count DESC;
  ```

- [ ] **Performance analysis**
  - [ ] Query response times normal
  - [ ] No database bottlenecks
  - [ ] RLS policy evaluation is fast

### Month 1

- [ ] **Compliance report**
  - [ ] All required actions audited
  - [ ] Consent tracking complete
  - [ ] No unauthorized modifications detected

- [ ] **Security incident check**
  - [ ] No failed signature verification patterns
  - [ ] No suspicious activity
  - [ ] No RLS bypass attempts

---

## Rollback Plan (If Needed)

### Database Rollback

```bash
# Step 1: Restore from backup
psql -h <prod-db> -U postgres -d postgres < backup_2025_10_19.sql

# Step 2: Verify restoration
psql -h <prod-db> -U postgres -d postgres << 'EOF'
SELECT COUNT(*) FROM public.audit_logs;
SELECT COUNT(*) FROM public.user_consents;
EOF
```

### Code Rollback

```bash
# Redeploy previous Netlify version
netlify deploy --prod --alias previous

# Or use Netlify CLI to rollback
netlify rollback
```

---

## Post-Implementation Tasks

- [ ] **Documentation**
  - [ ] Update API docs with signature verification requirements
  - [ ] Add consent acceptance to onboarding flow
  - [ ] Update privacy policy with audit logging disclosure

- [ ] **Training**
  - [ ] Conduct team training on new security features
  - [ ] Create runbook for common issues
  - [ ] Set up on-call rotation for security monitoring

- [ ] **Monitoring**
  - [ ] Set up Datadog/CloudWatch dashboards
  - [ ] Configure PagerDuty alerts
  - [ ] Create compliance reporting views

- [ ] **Future Enhancements**
  - [ ] Implement audit log archival to cold storage
  - [ ] Add API rate limiting based on signature verification
  - [ ] Implement automatic secret rotation
  - [ ] Add anomaly detection for audit events

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | ___________ | ________ | __________ |
| DevOps Lead | ___________ | ________ | __________ |
| Product Manager | ___________ | ________ | __________ |

---

**Deployment Time Estimate:** 30-45 minutes  
**Downtime Required:** None (zero-downtime deployment)  
**Rollback Time (if needed):** 10-15 minutes

**Last Updated:** 2025-10-19  
**Version:** 1.0






