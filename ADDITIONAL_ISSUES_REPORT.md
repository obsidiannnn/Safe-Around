# SafeAround - Additional Issues Report
**Generated:** April 11, 2026  
**Priority:** 🔴 HIGH - Additional Critical Issues Found

---

## 🔴 CRITICAL ISSUES (New Findings)

### 1. **Production Credentials Exposed in Git** 🔴 CRITICAL
**Location:** `backend/.env`
**Issue:** Production database credentials are committed to git repository
```env
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_USER=postgres.rmomkbyxnsmbdiocqsgk
DB_PASSWORD=SafeAround,2026
SUPABASE_PUBLISHABLE_KEY=sb_publishable_7dppdsaS63KP7V4-UGBwgQ_HJgzy65L
REDIS_URL=rediss://default:gQAAAAAAARfEAAIncDE0YzFjNmFlNzI5Nzg0OTI5YTNiZmQ3NTZhZmI3MDNjNHAxNzE2MjA@allowed-lobster-71620.upstash.io:6379
TWILIO_ACCOUNT_SID=ACf8462f33403c041232268266ebb90389
TWILIO_AUTH_TOKEN=33adb9af02aa77c32c6efd72878b6fc1
```

**Risk:** 
- ⚠️ **IMMEDIATE SECURITY BREACH** - Anyone with repo access has full database access
- Database can be compromised, data stolen or deleted
- Twilio account can be used for unauthorized SMS (billing fraud)
- Redis cache can be accessed/manipulated

**IMMEDIATE ACTION REQUIRED:**
```bash
# 1. ROTATE ALL CREDENTIALS IMMEDIATELY
# - Change Supabase database password
# - Regenerate Supabase API keys
# - Rotate Twilio credentials
# - Change Redis password

# 2. Remove from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (coordinate with team first!)
git push origin --force --all

# 4. Ensure .gitignore is working
echo ".env" >> backend/.gitignore
git add backend/.gitignore
git commit -m "Ensure .env is ignored"
```

### 2. **Weak JWT Secret** 🔴 CRITICAL
**Location:** `backend/.env`
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```
**Issue:** Default/placeholder JWT secret is being used
**Risk:** 
- Attackers can forge authentication tokens
- Complete authentication bypass possible
- User impersonation attacks

**Fix:**
```bash
# Generate strong secret (256-bit minimum)
openssl rand -base64 64

# Update .env with generated secret
JWT_SECRET=<generated-secret-here>
```

### 3. **Missing FCM Server Key** 🔴 CRITICAL
**Location:** `backend/.env`
```env
FCM_SERVER_KEY=your_fcm_server_key
```
**Issue:** Placeholder value - push notifications won't work
**Impact:** Emergency alerts cannot be sent to mobile devices
**Fix:** Add real Firebase Cloud Messaging server key

### 4. **Database Schema Mismatch** 🟡 MEDIUM
**Issue:** Two different schemas exist:
- `backend/migrations/000001_initial_schema.sql` (uses BIGSERIAL, simpler)
- `backend/scripts/schema.sql` (uses UUID, complex with partitioning)

**Risk:** 
- Confusion about which schema is actually deployed
- Migration conflicts
- Data type mismatches (BIGSERIAL vs UUID for IDs)

**Current State:**
- GORM models use `uint` (suggests BIGSERIAL/integer IDs)
- Production schema.sql uses UUID
- **These are incompatible!**

**Fix Required:**
1. Determine which schema is actually in production
2. Update GORM models to match (either uint or uuid.UUID)
3. Remove conflicting schema file
4. Test all queries with correct ID types

### 5. **Missing Database Partitions** 🟡 MEDIUM
**Location:** `backend/scripts/schema.sql`
**Issue:** Partitioned tables only have partitions through May 2026
```sql
CREATE TABLE IF NOT EXISTS user_locations_2026_05 PARTITION OF user_locations
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```
**Risk:** Application will fail when inserting data after May 31, 2026
**Fix:** 
- Add automated partition creation (cron job or trigger)
- Create partitions for next 12 months
- Document partition maintenance procedure

---

## 🟡 HIGH PRIORITY Issues

### 6. **Incomplete Features (TODOs in Production Code)**
**Locations:**
```typescript
// frontend/src/screens/emergency/ResponderAlertModal.tsx
// TODO: Submit decline reason for analytics

// frontend/src/components/common/ErrorBoundary.tsx
// TODO: Send to error tracking service (Sentry)

// frontend/src/components/forms/PhoneInput.tsx
// TODO: Open country code picker
```
**Impact:** 
- Analytics data not being collected
- Errors not being tracked
- Country code selection not working

### 7. **CORS Configuration Too Permissive in Debug Mode**
**Location:** `backend/internal/middleware/cors.go`
```go
if gin.Mode() != gin.DebugMode {
    c.Next()
    return
}
c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
```
**Issue:** In debug mode, allows all origins (*)
**Risk:** If GIN_MODE is accidentally set to debug in production, CORS is wide open
**Fix:** Remove wildcard fallback, always enforce whitelist

### 8. **Rate Limiting Bypass for Critical Endpoints**
**Location:** `backend/internal/middleware/rate_limit.go`
```go
if endpoint == "/api/v1/location/nearby" || endpoint == "/api/v1/heatmap/statistics" {
    c.Next()
    return
}
```
**Issue:** Location and heatmap endpoints bypass rate limiting
**Risk:** 
- DDoS attacks possible on these endpoints
- Database overload from unlimited queries
**Fix:** Apply appropriate rate limits (higher than normal, but not unlimited)

### 9. **No Input Validation on Critical Endpoints**
**Issue:** No validation middleware visible for:
- Location coordinates (could be invalid lat/lng)
- Phone numbers (format validation)
- Emergency alert data

**Risk:** 
- Invalid data in database
- PostGIS errors from invalid coordinates
- Application crashes

**Fix:** Add validation middleware using go-playground/validator

### 10. **Missing Security Headers**
**Issue:** No security headers middleware found
**Missing Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`

**Fix:** Add security headers middleware

---

## 🟢 MEDIUM PRIORITY Issues

### 11. **No Database Connection Pooling Limits**
**Location:** `backend/.env`
```env
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
```
**Issue:** Low limits for production workload
**Recommendation:** 
- Increase to 100 max open connections
- Set idle to 25
- Monitor and adjust based on load

### 12. **No Backup Verification**
**Location:** `deploy/scripts/backup.sh`
**Issue:** Backup script exists but no restore testing documented
**Risk:** Backups may be corrupted and unusable
**Fix:** 
- Add automated backup verification
- Document restore procedure
- Test restore monthly

### 13. **Hardcoded Production URLs**
**Location:** `frontend/.env.production`
```env
API_URL=https://api.safearound.com/v1
```
**Issue:** Domain is .com but app.json and docs reference .app
**Inconsistency:** Multiple domains referenced:
- safearound.app (in CORS, docs)
- safearound.com (in .env.production)

**Fix:** Standardize on one domain

### 14. **No Health Check Timeout Configuration**
**Location:** `backend/Dockerfile`
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3
```
**Issue:** 5s timeout may be too short for database queries
**Recommendation:** Increase to 10s

### 15. **Missing Monitoring Alerts**
**Issue:** Prometheus configured but no alert rules for:
- High error rates
- Database connection failures
- Redis connection failures
- High response times
- Disk space

**Fix:** Add alerting rules in `deploy/prometheus.rules.yml`

---

## 📋 IMMEDIATE ACTION CHECKLIST

### 🔴 CRITICAL (Do Today)
- [ ] **ROTATE ALL CREDENTIALS** in backend/.env
- [ ] Remove .env from git history
- [ ] Generate and set strong JWT_SECRET
- [ ] Add real FCM_SERVER_KEY
- [ ] Resolve database schema mismatch (UUID vs BIGSERIAL)
- [ ] Test with correct schema

### 🟡 HIGH (Do This Week)
- [ ] Fix CORS wildcard in debug mode
- [ ] Add rate limiting to location/heatmap endpoints
- [ ] Add input validation middleware
- [ ] Add security headers middleware
- [ ] Complete TODO features or remove code
- [ ] Create database partitions for next 12 months
- [ ] Set up automated partition creation

### 🟢 MEDIUM (Do Before Production)
- [ ] Increase database connection pool limits
- [ ] Test backup restore procedure
- [ ] Standardize domain names
- [ ] Add Prometheus alerting rules
- [ ] Increase health check timeout
- [ ] Document all configuration decisions

---

## 🎯 Updated Deployment Readiness Score

| Category | Previous | Current | Status |
|----------|----------|---------|--------|
| Infrastructure | 9/10 | 9/10 | ✅ Good |
| Security | 5/10 | **2/10** | 🔴 **CRITICAL** |
| Testing | 2/10 | 2/10 | 🔴 Critical |
| Monitoring | 8/10 | 6/10 | 🟡 Needs Work |
| Documentation | 8/10 | 8/10 | ✅ Good |
| CI/CD | 7/10 | 7/10 | ✅ Good |
| **Overall** | **6.5/10** | **4/10** | 🔴 **NOT READY** |

---

## ⚠️ FINAL RECOMMENDATION

**DO NOT DEPLOY UNDER ANY CIRCUMSTANCES** until:

1. ✅ All production credentials are rotated
2. ✅ .env file is removed from git history
3. ✅ JWT secret is changed to strong random value
4. ✅ FCM server key is added
5. ✅ Database schema mismatch is resolved
6. ✅ Security headers are added
7. ✅ Input validation is implemented
8. ✅ Rate limiting is applied to all endpoints

**Estimated Time to Production Ready:** 5-7 days

**Security Risk Level:** 🔴 **CRITICAL** - Active security vulnerabilities present

---

## 📞 Immediate Actions Required

1. **Stop all public access** to the repository if it's public
2. **Rotate credentials** immediately (even if not deploying yet)
3. **Audit git history** for other exposed secrets
4. **Review access logs** for unauthorized access
5. **Implement secrets management** (AWS Secrets Manager, Vault, etc.)

---

**Report Generated by:** Kiro AI Assistant  
**Severity:** CRITICAL  
**Action Required:** IMMEDIATE
