Day 1 PR Ready for Review - Instructions
=========================================

The script `scripts/mark_pr_ready_day1.sh` is ready to:
1. Find the draft PR for branch feature/day1-chat-merge-adapt
2. Mark it as ready for review
3. Post verification comment with links to reports

QUICK START
-----------
```bash
export GITHUB_TOKEN=your_github_token_here
bash scripts/mark_pr_ready_day1.sh
```

MANUAL STEPS (if script unavailable)
------------------------------------

Step 1: Find PR Number
- Visit: https://github.com/dwarner13/newxspensesai/pulls
- Search for branch: feature/day1-chat-merge-adapt
- Note the PR number

Step 2: Mark PR as Ready
- Open the PR page
- Click "Ready for review" button

OR use API:
```bash
curl -X PATCH \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/dwarner13/newxspensesai/pulls/{PR_NUMBER}" \
  -d '{"draft":false}'
```

Step 3: Post Verification Comment
```bash
export GITHUB_TOKEN=your_token
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/dwarner13/newxspensesai/issues/{PR_NUMBER}/comments" \
  -d '{
    "body": "## Day 1 verification complete ✅\n\n- Endpoint unified to `/.netlify/functions/chat`\n- SSE headers + streaming verified\n- PII masking active during stream\n- Guardrails active\n\n### Verification Reports:\n\n- [`reports/DAY1_APPLIED.md`](reports/DAY1_APPLIED.md)\n- [`reports/DAY1_CHANGED_FILES.txt`](reports/DAY1_CHANGED_FILES.txt)\n- [`reports/DAY1_SMOKE.log`](reports/DAY1_SMOKE.log)\n- [`reports/DAY1_VERIFY_SSE_HEADERS.txt`](reports/DAY1_VERIFY_SSE_HEADERS.txt)\n- [`reports/DAY1_VERIFY_SSE_SAMPLE.txt`](reports/DAY1_VERIFY_SSE_SAMPLE.txt)\n\n### Next steps:\nRun Day 2 (PII unification) per [`reports/CLEANUP_PLAN.md`](reports/CLEANUP_PLAN.md)."
  }'
```

VERIFICATION COMMENT TEXT
-------------------------
## Day 1 verification complete ✅

- Endpoint unified to `/.netlify/functions/chat`
- SSE headers + streaming verified
- PII masking active during stream (screenshot + manual test)
- Guardrails active (blocked bad prompts)

### Verification Reports:

- [`reports/DAY1_APPLIED.md`](reports/DAY1_APPLIED.md)
- [`reports/DAY1_CHANGED_FILES.txt`](reports/DAY1_CHANGED_FILES.txt)
- [`reports/DAY1_SMOKE.log`](reports/DAY1_SMOKE.log)
- [`reports/DAY1_VERIFY_SSE_HEADERS.txt`](reports/DAY1_VERIFY_SSE_HEADERS.txt)
- [`reports/DAY1_VERIFY_SSE_SAMPLE.txt`](reports/DAY1_VERIFY_SSE_SAMPLE.txt)

### Next steps:
Run Day 2 (PII unification) per [`reports/CLEANUP_PLAN.md`](reports/CLEANUP_PLAN.md).

CURRENT STATUS
-------------
⚠️  GITHUB_TOKEN not configured
✅ Script ready: scripts/mark_pr_ready_day1.sh
✅ All verification reports available in reports/ directory

