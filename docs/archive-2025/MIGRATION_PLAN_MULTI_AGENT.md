# 🗺️ Multi-Agent Migration Plan

**Goal**: Enable AI employee collaboration with Prime as orchestrator  
**Timeline**: 6-8 weeks  
**Risk Level**: Medium (phased approach mitigates)

---

## 📊 Migration Phases

### Phase 0: Audit & Freeze (Week 1)

**Objective**: Document current state, prevent drift

#### Tasks

- [x] Complete employee inventory (`EMPLOYEES.md`)
- [x] Map current architecture (`AGENT_NETWORK.md`)
- [x] Define inter-agent protocol (`docs/INTER_AGENT_PROTOCOL.md`)
- [x] Design Prime's orchestrator prompt (`docs/PRIME_PROMPT.md`)
- [ ] Freeze new employee additions
- [ ] Freeze prompt changes (version control required)
- [ ] Document all existing chat endpoints

#### Deliverables

- ✅ `EMPLOYEES.md` - Complete inventory
- ✅ `AGENT_NETWORK.md` - Architecture analysis
- ✅ Protocol specification
- ✅ Prime prompt v2.0

#### Success Criteria

- All 7 active employees documented
- Current flow understood and diagrammed
- Team aligned on multi-agent vision

#### Rollback

N/A (documentation only)

---

### Phase 1: Foundation (Week 2)

**Objective**: Implement agent bridge and delegate tool (no user-facing changes)

#### Tasks

##### Database Updates

```sql
-- 1. Add delegate tool to registry
INSERT INTO tools_registry (name, purpose, description, handler_path, auth_scope, parameters_schema)
VALUES (
  'delegate',
  'Delegate task to specialist AI employee',
  'Allows Prime to call other employees for specialized tasks. Returns structured results.',
  'chat_runtime/tools/delegate.ts',
  'service',
  '{
    "type": "object",
    "properties": {
      "employee": {
        "type": "string",
        "enum": ["byte-doc", "tag-ai", "crystal-analytics", "ledger-tax", "goalie-goals", "blitz-debt"],
        "description": "Target employee slug"
      },
      "task": {
        "type": "string",
        "description": "Specific task for the employee"
      },
      "context": {
        "type": "object",
        "description": "Additional context to pass"
      }
    },
    "required": ["employee", "task"]
  }'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  parameters_schema = EXCLUDED.parameters_schema;

-- 2. Grant delegate tool to Prime
UPDATE employee_profiles
SET tools_allowed = array_append(tools_allowed, 'delegate')
WHERE slug = 'prime-boss'
  AND NOT ('delegate' = ANY(tools_allowed));

-- 3. Add missing active employees to database
INSERT INTO employee_profiles (slug, title, emoji, system_prompt, capabilities, tools_allowed)
VALUES
  ('crystal-analytics', 'Crystal - Predictive Analytics', '💎', 
   '[Copy from src/config/ai-employees.js:67-73]', 
   ARRAY['spending-analysis','predictions','trends','insights'], 
   ARRAY[]::text[]),
  ('ledger-tax', 'Ledger - Tax Assistant', '📊',
   '[Copy from src/config/ai-employees.js:122-127]',
   ARRAY['tax-optimization','accounting','compliance','deductions'],
   ARRAY[]::text[]),
  ('goalie-goals', 'Goalie - Achievement Coach', '🥅',
   '[Copy from src/config/ai-employees.js:148-153]',
   ARRAY['goal-setting','tracking','motivation','achievement'],
   ARRAY[]::text[]),
  ('blitz-debt', 'Blitz - Debt Demolition', '⚡',
   '[Copy from src/config/ai-employees.js:175-180]',
   ARRAY['debt-payoff','strategy','motivation','optimization'],
   ARRAY[]::text[])
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  capabilities = EXCLUDED.capabilities;

-- 4. Create delegation audit log table
CREATE TABLE IF NOT EXISTS delegation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  origin_employee TEXT,
  target_employee TEXT,
  user_id TEXT,
  parent_session_id UUID,
  objective TEXT,
  success BOOLEAN,
  duration_ms INT,
  token_usage JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_delegation_audit_user ON delegation_audit_log(user_id, created_at DESC);
CREATE INDEX idx_delegation_audit_employees ON delegation_audit_log(origin_employee, target_employee);
```

##### Code Implementation

- [ ] Implement `chat_runtime/internal/agentBridge.ts` (stub provided)
- [ ] Implement `chat_runtime/tools/delegate.ts` (stub provided)
- [ ] Register delegate tool in function handler
- [ ] Add depth/cycle/timeout guards
- [ ] Write unit tests for agentBridge

##### Testing

- [ ] Test agentBridge standalone (direct calls)
- [ ] Test delegation with mock employees
- [ ] Verify depth limiting (should block at depth 2)
- [ ] Verify cycle detection works
- [ ] Load test (100 concurrent delegations)

#### Deliverables

- ✅ Database schema updated
- ✅ agentBridge implemented
- ✅ delegate tool implemented
- ✅ Tests passing
- ⬜ Prime prompt updated in DB

#### Success Criteria

- agentBridge can call any employee internally
- Delegation respects depth/fan-out limits
- No cycles possible
- Tests achieve >90% coverage

#### Rollback

```sql
-- Remove delegate tool
DELETE FROM tools_registry WHERE name = 'delegate';

-- Remove from Prime's allowed tools
UPDATE employee_profiles
SET tools_allowed = array_remove(tools_allowed, 'delegate')
WHERE slug = 'prime-boss';

-- Drop audit log (optional)
DROP TABLE delegation_audit_log;
```

---

### Phase 2: Prime Solo Delegation (Weeks 3-4)

**Objective**: Prime delegates to ONE employee (byte-doc) on limited queries

#### Feature Flag

```typescript
// In environment or feature flags
const ENABLE_PRIME_DELEGATION = process.env.ENABLE_PRIME_DELEGATION === 'true';
const ALLOWED_DELEGATES = ['byte-doc'];  // Whitelist

if (ENABLE_PRIME_DELEGATION && employeeSlug === 'prime-boss') {
  // Enable delegation tool
} else {
  // Old behavior
}
```

#### Routing Logic

```typescript
// In Prime's context
if (userInput.includes('upload') || userInput.includes('receipt') || userInput.includes('document')) {
  // Suggest or auto-delegate to Byte
  return await useTool('delegate', {
    employee: 'byte-doc',
    task: extractObjective(userInput)
  });
}
```

#### Test Queries

Run these specific queries with Prime:

1. "Process this receipt" → Should delegate to Byte
2. "Upload my bank statement" → Should delegate to Byte
3. "What is compound interest?" → Should answer directly (no delegation)
4. "Analyze my spending" → Should answer directly (Crystal not yet enabled)

#### Monitoring

```sql
-- Track delegations
SELECT 
  DATE_TRUNC('day', created_at) as date,
  origin_employee,
  target_employee,
  COUNT(*) as delegation_count,
  AVG(duration_ms) as avg_duration,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
FROM delegation_audit_log
WHERE origin_employee = 'prime-boss'
GROUP BY date, origin_employee, target_employee
ORDER BY date DESC;
```

#### Success Criteria

- ≥ 80% of document queries auto-delegate to Byte
- Delegation success rate > 95%
- User satisfaction maintained or improved
- Latency < 3s total (Prime + Byte)

#### Rollback

```typescript
// Set feature flag to false
ENABLE_PRIME_DELEGATION = false;

// Or update Prime's tools_allowed
UPDATE employee_profiles
SET tools_allowed = array_remove(tools_allowed, 'delegate')
WHERE slug = 'prime-boss';
```

---

### Phase 3: Sequential Chains (Weeks 5-6)

**Objective**: Prime can chain 2 employees (Byte→Tag)

#### Enable

```typescript
const ALLOWED_DELEGATES = ['byte-doc', 'tag-ai'];
const MAX_CHAIN_LENGTH = 2;
```

#### Test Scenarios

1. **Receipt → Categorize**:
   ```
   User: "Upload receipt.jpg and categorize it"
   Prime → Byte (extract) → Tag (categorize) → Prime (merge)
   ```

2. **Statement → Tax Review**:
   ```
   User: "Review my bank statement for deductions"
   Prime → Byte (extract) → Ledger (analyze) → Prime (merge)
   ```

#### Monitoring

```sql
-- Chain analysis
SELECT 
  COUNT(*) as total_chains,
  AVG(duration_ms) as avg_chain_duration,
  MAX(duration_ms) as max_chain_duration
FROM (
  SELECT 
    parent_session_id,
    SUM(duration_ms) as duration_ms
  FROM delegation_audit_log
  WHERE origin_employee = 'prime-boss'
  GROUP BY parent_session_id, created_at::date
  HAVING COUNT(*) > 1  -- More than 1 delegation = chain
) chains;
```

#### Success Criteria

- Chains complete in < 5s total
- Success rate > 90%
- Context preserved across chain
- User sees unified result

#### Rollback

```typescript
const MAX_CHAIN_LENGTH = 1;  // Disable chaining
```

---

### Phase 4: Parallel Delegation (Weeks 7-8)

**Objective**: Prime can call 2-3 employees in parallel

#### Enable

```typescript
const MAX_FAN_OUT = 3;
const PARALLEL_ENABLED = true;
```

#### Test Scenarios

1. **Comprehensive Review**:
   ```
   User: "Give me a complete financial analysis"
   Prime → [Crystal, Tag, Ledger] (parallel) → Prime (synthesize)
   ```

2. **Multi-Source Reconciliation**:
   ```
   User: "Match my receipts to my bank statement"
   Prime → [Byte(receipts), Byte(statement)] → Prime (compare)
   ```

#### Monitoring

```sql
-- Parallel execution efficiency
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(DISTINCT parent_session_id) as parallel_delegations,
  AVG(duration_ms) as avg_duration,
  MIN(duration_ms) as best_duration,
  MAX(duration_ms) as worst_duration
FROM delegation_audit_log
WHERE created_at > now() - interval '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

#### Success Criteria

- Parallel execution saves time vs sequential
- No race conditions or conflicts
- Results properly aggregated
- User sees cohesive synthesis

#### Rollback

```typescript
const PARALLEL_ENABLED = false;  // Force sequential
```

---

## 🚨 Risk Mitigation

### Risk 1: Infinite Loops

**Mitigation**:
- Depth limit: 2
- Cycle detection by (origin, target, objective)
- Timeout per delegation: 15s

**Monitoring**:
```sql
SELECT * FROM delegation_audit_log 
WHERE error_message LIKE '%cycle%' OR error_message LIKE '%depth%';
```

### Risk 2: Token Explosion

**Mitigation**:
- Budget per delegation: 1200 tokens
- Monitor total usage per user per day
- Alert if user exceeds 50k tokens/day

**Monitoring**:
```sql
SELECT 
  user_id,
  SUM((token_usage->>'total')::int) as daily_tokens
FROM delegation_audit_log
WHERE created_at > current_date
GROUP BY user_id
HAVING SUM((token_usage->>'total')::int) > 50000;
```

### Risk 3: Latency

**Mitigation**:
- Timeout protection
- Parallel execution where possible
- Cache frequent delegations

**Monitoring**:
```sql
SELECT 
  target_employee,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency
FROM delegation_audit_log
WHERE success = true
GROUP BY target_employee;
```

### Risk 4: Context Loss

**Mitigation**:
- Child sessions linked to parent
- Handoff data preserved
- Delegation chain in metadata

**Testing**:
- Verify facts passed to specialists
- Confirm specialists see parent context
- Check merged results include all findings

---

## 🧪 Testing Gates

### Gate 1: Before Phase 1→2

- [ ] agentBridge unit tests pass
- [ ] Can call Byte internally
- [ ] Depth limiting works
- [ ] No performance regression

### Gate 2: Before Phase 2→3

- [ ] >100 successful Prime→Byte delegations
- [ ] User satisfaction ≥ baseline
- [ ] No security issues found
- [ ] Audit log shows healthy metrics

### Gate 3: Before Phase 3→4

- [ ] Chains complete successfully >90%
- [ ] Context preserved across chain
- [ ] Latency acceptable (<5s)
- [ ] Token usage reasonable

### Gate 4: Before Phase 4→Production

- [ ] All employees tested
- [ ] Parallel execution stable
- [ ] Comprehensive monitoring in place
- [ ] Rollback plan tested
- [ ] Team trained on new system

---

## 📈 Success Metrics

### Technical Metrics

| Metric | Target | Current | Phase 4 Goal |
|--------|--------|---------|--------------|
| Delegation Success Rate | >95% | N/A | >95% |
| P95 Latency (single) | <2s | ~1.5s | <2s |
| P95 Latency (chain) | <5s | N/A | <5s |
| P95 Latency (parallel) | <4s | N/A | <4s |
| Token Efficiency | -20% | Baseline | -20% |
| Cycle Detection Rate | 100% | N/A | 100% |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Satisfaction | NPS >40 | Monthly survey |
| Task Completion Rate | >85% | Analytics |
| Time to Resolution | <30s avg | Session duration |
| Employee Utilization | Balanced | Delegation logs |
| Cost per Conversation | <$0.03 | Usage logs |

---

## 🔄 Detailed Phase Steps

### Phase 1 Implementation Checklist

#### Week 2, Day 1-2: Code Stubs

- [ ] Create `chat_runtime/internal/agentBridge.ts`
  - [ ] `callEmployee()` function
  - [ ] Depth validation
  - [ ] Cycle detection
  - [ ] Timeout wrapper
  - [ ] Response formatting

- [ ] Create `chat_runtime/tools/delegate.ts`
  - [ ] Tool metadata
  - [ ] `execute()` function
  - [ ] Input validation
  - [ ] Error handling

#### Week 2, Day 3-4: Integration

- [ ] Register delegate tool in `netlify/functions/chat.ts`
- [ ] Add tool calling loop (if tool_calls in response)
- [ ] Wire agentBridge to delegate tool
- [ ] Add feature flag check

#### Week 2, Day 5: Testing

- [ ] Unit tests for agentBridge
- [ ] Integration test: Prime calls Byte
- [ ] Test depth limiting
- [ ] Test cycle detection
- [ ] Test timeout

#### Week 2, Weekend: Code Review & Deploy to Staging

- [ ] Code review with team
- [ ] Deploy to staging environment
- [ ] Smoke tests on staging
- [ ] Monitor for issues

### Phase 2 Implementation Checklist

#### Week 3: Limited Beta

- [ ] Enable feature flag for 10% of users
- [ ] Monitor delegation logs hourly
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately

#### Week 4: Expand Beta

- [ ] Increase to 50% of users
- [ ] A/B test: Prime with delegation vs without
- [ ] Compare metrics (satisfaction, latency, tokens)
- [ ] Optimize based on findings

### Phase 3 Implementation Checklist

#### Week 5: Sequential Chains

- [ ] Enable chaining (MAX_CHAIN_LENGTH=2)
- [ ] Test: Byte→Tag chain
- [ ] Test: Byte→Ledger chain
- [ ] Monitor chain latency
- [ ] Fix context loss issues

#### Week 6: Refine & Optimize

- [ ] Optimize chain latency (parallel where possible)
- [ ] Improve result merging
- [ ] Add chain visualization in UI (optional)
- [ ] Document successful patterns

### Phase 4 Implementation Checklist

#### Week 7: Parallel Delegation

- [ ] Enable parallel (MAX_FAN_OUT=3)
- [ ] Implement result synthesis
- [ ] Test 2-employee parallel
- [ ] Test 3-employee parallel
- [ ] Monitor for race conditions

#### Week 8: Full Rollout

- [ ] 100% of users on multi-agent
- [ ] Monitor for 1 week
- [ ] Address any issues
- [ ] Declare stable

---

## 🎯 Rollback Procedures

### Emergency Rollback (Any Phase)

**If critical issues found**:

```sql
-- 1. Disable delegation immediately
UPDATE employee_profiles
SET tools_allowed = array_remove(tools_allowed, 'delegate')
WHERE slug = 'prime-boss';

-- 2. Restart services to clear cache

-- 3. Monitor for stability

-- 4. Investigate root cause
```

**RTO (Recovery Time Objective)**: < 5 minutes  
**RPO (Recovery Point Objective)**: 0 (no data loss)

### Planned Rollback (End of Phase)

**If phase goals not met**:

1. Revert code changes to previous tag
2. Restore database to snapshot
3. Update feature flags
4. Notify users of temporary issue
5. Investigate and fix
6. Re-attempt phase when ready

---

## 📊 Phase Gate Criteria

Before proceeding to next phase, ALL must be true:

### Technical Gates

- [ ] Success rate > target
- [ ] Latency within bounds
- [ ] No critical bugs
- [ ] Tests passing
- [ ] Monitoring configured

### Business Gates

- [ ] User satisfaction maintained
- [ ] No increase in support tickets
- [ ] Product team approval
- [ ] Stakeholder sign-off

---

## 🔧 Implementation Details

### Code Locations

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Agent Bridge | `chat_runtime/internal/agentBridge.ts` | ~300 | Stub provided |
| Delegate Tool | `chat_runtime/tools/delegate.ts` | ~150 | Stub provided |
| Tool Registry | `chat_runtime/tools/index.ts` | ~100 | Exists |
| Netlify Function | `netlify/functions/chat.ts` | ~400 | Needs tool loop |
| Prime Prompt | Database or config | ~500 | Needs update |

### Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "openai": "^4.20.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.9.0"
  }
}
```

---

## 📅 Timeline Summary

| Week | Phase | Key Activities | Risk |
|------|-------|----------------|------|
| 1 | 0 | Audit & Documentation | LOW |
| 2 | 1 | Implement foundation | MEDIUM |
| 3-4 | 2 | Prime→Byte delegation | MEDIUM |
| 5-6 | 3 | Sequential chains | MEDIUM-HIGH |
| 7-8 | 4 | Parallel execution | HIGH |

**Total Duration**: 8 weeks  
**Critical Path**: Phase 1 & 2  
**Can Fast-Track**: If Phase 2 very successful, skip to Phase 4

---

## 💰 Resource Requirements

### Engineering Time

- **Phase 0**: 1 developer, 1 week (complete)
- **Phase 1**: 2 developers, 1 week
- **Phase 2**: 1 developer + 1 QA, 2 weeks
- **Phase 3**: 2 developers, 2 weeks
- **Phase 4**: 2 developers + 1 QA, 2 weeks

**Total**: ~12 developer-weeks

### Infrastructure

- No additional servers required
- Existing Netlify + Supabase scales
- OpenAI costs increase ~20-30% (delegation overhead)

### Estimated Cost Impact

**Current**: ~$35/month (1000 users, 50 convos/month each)  
**With Multi-Agent**: ~$45/month (+29%)

**ROI**: Better user experience, higher engagement, reduced support tickets

---

## 📋 Pre-Launch Checklist

Before going to production:

### Technical

- [ ] All tests passing (unit + integration)
- [ ] Load testing complete (1000 concurrent users)
- [ ] Security audit passed
- [ ] PII redaction verified
- [ ] RLS policies enforced
- [ ] Monitoring dashboards configured
- [ ] Alerts configured (errors, latency, tokens)
- [ ] Backup/restore tested

### Business

- [ ] Product team sign-off
- [ ] Legal review (if needed for AI usage)
- [ ] Support team trained
- [ ] User documentation updated
- [ ] Beta user feedback incorporated
- [ ] Pricing impact assessed
- [ ] Launch communication ready

### Operational

- [ ] Runbook created
- [ ] On-call rotation defined
- [ ] Escalation process documented
- [ ] Rollback tested
- [ ] Database backups automated
- [ ] Log retention configured

---

## 🎯 Definition of Done

Multi-agent system is DONE when:

- ✅ Prime can delegate to all 7 active employees
- ✅ Sequential chains work reliably
- ✅ Parallel delegation stable
- ✅ Safety mechanisms prevent loops/explosions
- ✅ User experience seamless (no manual switching)
- ✅ Monitoring shows healthy metrics
- ✅ Team confident in system
- ✅ Documentation complete

---

## 📞 Post-Launch

### Week 9-12: Optimization

- Monitor delegation patterns
- Optimize routing logic
- Reduce latency where possible
- Fine-tune employee prompts
- Add more employees to delegation pool

### Ongoing

- Monthly review of delegation metrics
- Quarterly employee prompt updates
- Continuous A/B testing of routing
- User feedback integration

---

**Migration Plan Complete** | 8-week phased rollout with safety gates

