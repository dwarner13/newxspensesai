# Production Runbooks

## 🚨 Incident Response

### Severity Levels
- **P0 (Critical)**: Complete outage, data breach, security incident
  - Response time: 15 minutes
  - Escalation: Immediate to CTO
  
- **P1 (High)**: Partial outage, performance degradation >50%
  - Response time: 30 minutes
  - Escalation: After 1 hour
  
- **P2 (Medium)**: Feature unavailable, performance degradation <50%
  - Response time: 2 hours
  - Escalation: After 4 hours
  
- **P3 (Low)**: Minor issues, cosmetic bugs
  - Response time: 24 hours
  - Escalation: After 48 hours

### Response Checklist
1. [ ] Acknowledge alert
2. [ ] Create incident channel (#incident-YYYY-MM-DD-description)
3. [ ] Assess impact and severity
4. [ ] Implement immediate mitigation
5. [ ] Update status page
6. [ ] Begin root cause analysis
7. [ ] Deploy fix
8. [ ] Write postmortem

## 🔑 Secret Rotation

### Quarterly Rotation
```bash
# OpenAI API Key
1. Generate new key in OpenAI dashboard
2. Update in Netlify env: OPENAI_API_KEY
3. Deploy and verify
4. Revoke old key after 24 hours

# Stripe Keys
1. Generate new keys in Stripe dashboard
2. Update webhook endpoint with new signing secret
3. Update env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
4. Test payment flow in staging
5. Deploy to production
6. Monitor for 24 hours
7. Revoke old keys

# Database Encryption Keys
1. Run key rotation script: npm run security:rotate-keys
2. Verify all encrypted fields accessible
3. Backup old keys securely
4. Update key vault
```

## 📊 Monitoring Alerts

### Critical Alerts
- Error rate > 5% for 5 minutes
- Response time p95 > 5 seconds
- Token usage > 90% of limit
- Failed auth attempts > 10 in 5 minutes
- Database connection pool exhausted

### Warning Alerts
- Error rate > 1% for 10 minutes
- Response time p95 > 2 seconds
- Token usage > 70% of limit
- Disk usage > 80%
- Memory usage > 85%

## 🔒 Security Procedures

### Data Breach Response
1. **Immediate**: Isolate affected systems
2. **15 min**: Assess scope and impact
3. **30 min**: Notify security team and legal
4. **1 hour**: Begin forensic analysis
5. **4 hours**: Prepare user notification (if required)
6. **24 hours**: Submit regulatory notifications
7. **48 hours**: Complete initial report

### GDPR Data Request
1. Verify requester identity
2. Log request in gdpr_requests table
3. Export data using: npm run gdpr:export USER_ID
4. Review for third-party data
5. Provide within 30 days
6. Log completion

## 🔄 Backup & Recovery

### Daily Backups
- Database: Automated via Supabase (PITR enabled)
- Storage: S3 cross-region replication
- Configs: Git repository

### Recovery Procedures
```bash
# Database recovery
1. Stop application traffic
2. Restore from Supabase dashboard
3. Verify data integrity
4. Resume traffic
5. Monitor for issues

# Full disaster recovery
1. Provision new infrastructure
2. Restore database from backup
3. Restore storage from S3
4. Update DNS
5. Verify all services
6. Resume operations
```

## 📈 Scaling Procedures

### Horizontal Scaling
- Netlify: Automatic
- Database: Add read replicas
- Redis: Add cluster nodes

### Vertical Scaling
- Database: Upgrade tier in Supabase
- Functions: Increase memory/timeout in Netlify

## 📝 Maintenance Windows

### Scheduled Maintenance
- Time: Sunday 2-4 AM UTC
- Notification: 72 hours advance
- Procedure:
  1. Enable maintenance mode
  2. Run migrations
  3. Deploy updates
  4. Verify services
  5. Disable maintenance mode

## 🔍 Debugging Production Issues

### Database Slow Queries
```sql
-- Find slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Function Debugging
```bash
# Check function logs
netlify functions:log FUNCTION_NAME --tail

# Local debugging
netlify dev --inspect
```

## 📞 Escalation Matrix

| Service | Contact | Method | Escalation |
|---------|---------|--------|------------|
| Database | Supabase Support | support@supabase.io | Enterprise SLA |
| Hosting | Netlify Support | support@netlify.com | Pro plan |
| Payments | Stripe Support | Dashboard | Priority support |
| AI | OpenAI Support | Dashboard | Standard |

## 🛠️ Common Commands

### Database Operations
```bash
# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Check connection
npm run db:ping

# Export data
npm run db:export

# Import data
npm run db:import
```

### Security Operations
```bash
# Rotate encryption keys
npm run security:rotate-keys

# Audit user permissions
npm run security:audit-users

# Check API key usage
npm run security:check-api-keys

# Generate security report
npm run security:report
```

### Monitoring Operations
```bash
# Check system health
npm run health:check

# View error logs
npm run logs:errors

# Check performance metrics
npm run metrics:performance

# Generate usage report
npm run report:usage
```

## 🚀 Deployment Procedures

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Security scans clean
- [ ] Database migrations ready
- [ ] Environment variables updated
- [ ] Monitoring configured
- [ ] Rollback plan prepared

### Deployment Steps
1. **Staging Deployment**
   - Deploy to staging environment
   - Run smoke tests
   - Verify all integrations

2. **Production Deployment**
   - Enable maintenance mode
   - Deploy to production
   - Run health checks
   - Monitor for 15 minutes
   - Disable maintenance mode

3. **Post-deployment**
   - Verify all services
   - Check error rates
   - Monitor performance
   - Update documentation

### Rollback Procedures
```bash
# Immediate rollback
npm run deploy:rollback

# Database rollback
npm run db:rollback -- --target=VERSION

# Configuration rollback
npm run config:rollback
```

## 📋 Compliance Procedures

### GDPR Compliance
1. **Data Subject Rights**
   - Right to access: Export user data
   - Right to rectification: Update user data
   - Right to erasure: Delete user data
   - Right to portability: Export in standard format

2. **Data Processing Records**
   - Maintain processing activity records
   - Document lawful basis for processing
   - Record consent where required
   - Implement data protection by design

### SOC 2 Compliance
1. **Security Controls**
   - Access controls and authentication
   - System operations and monitoring
   - Data protection and encryption
   - Incident response procedures

2. **Availability Controls**
   - System monitoring and alerting
   - Backup and recovery procedures
   - Change management process
   - Vendor management program

## 🔧 Troubleshooting Guide

### Common Issues

#### High Error Rate
1. Check recent deployments
2. Review error logs
3. Check external service status
4. Verify database connectivity
5. Check rate limiting

#### Slow Response Times
1. Check database performance
2. Review query execution plans
3. Check external API responses
4. Verify caching effectiveness
5. Check resource utilization

#### Authentication Issues
1. Check JWT token validity
2. Verify session expiration
3. Check API key status
4. Review rate limiting
5. Check user permissions

#### Data Issues
1. Verify data integrity
2. Check for corruption
3. Review recent changes
4. Check backup status
5. Validate migrations

## 📊 Performance Optimization

### Database Optimization
- Index optimization
- Query performance tuning
- Connection pool sizing
- Read replica configuration
- Partitioning strategies

### Application Optimization
- Code performance profiling
- Memory usage optimization
- Caching strategies
- API response optimization
- Bundle size reduction

### Infrastructure Optimization
- CDN configuration
- Load balancing
- Auto-scaling policies
- Resource allocation
- Cost optimization

## 🔐 Security Best Practices

### Code Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure coding practices

### Infrastructure Security
- Network segmentation
- Firewall configuration
- SSL/TLS implementation
- Access controls
- Monitoring and logging

### Data Security
- Encryption at rest and in transit
- Key management
- Data classification
- Access controls
- Audit logging

## 📈 Capacity Planning

### Growth Projections
- User growth trends
- Usage pattern analysis
- Resource consumption trends
- Cost projections
- Scaling requirements

### Resource Planning
- Database capacity
- Storage requirements
- Network bandwidth
- Compute resources
- Third-party service limits

### Cost Optimization
- Resource utilization analysis
- Waste identification
- Right-sizing recommendations
- Reserved capacity planning
- Cost monitoring and alerting
