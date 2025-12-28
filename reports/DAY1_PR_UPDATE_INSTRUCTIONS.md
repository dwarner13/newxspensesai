Day 1 PR Update - Manual Instructions
======================================

Since GitHub CLI is not available and GITHUB_TOKEN authentication failed,
please complete the PR update manually:

REPOSITORY: dwarner13/newxspensesai
BRANCH: feature/day1-chat-merge-adapt

STEP 1: Find the PR
-------------------
Visit: https://github.com/dwarner13/newxspensesai/pulls
Search for branch: feature/day1-chat-merge-adapt

Or use GitHub API (requires valid token):
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.github.com/repos/dwarner13/newxspensesai/pulls?head=dwarner13:feature/day1-chat-merge-adapt&state=open"

STEP 2: Mark PR as Ready for Review
------------------------------------
If PR is draft:
1. Open the PR page
2. Click "Ready for review" button

Or use API:
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/dwarner13/newxspensesai/pulls/{PR_NUMBER}" \
  -d '{"draft":false}'

STEP 3: Post Verification Comment
----------------------------------
Comment body:

## Day 1 verification complete ✅

- Endpoint unified to `/.netlify/functions/chat`
- SSE headers + streaming verified
- PII masking active during stream (screenshot + manual test)
- Guardrails active (blocked bad prompts)

### Reports:

- `reports/DAY1_APPLIED.md`
- `reports/DAY1_CHANGED_FILES.txt`
- `reports/DAY1_SMOKE.log`
- `reports/DAY1_VERIFY_SSE_HEADERS.txt`
- `reports/DAY1_VERIFY_SSE_SAMPLE.txt`

### Next steps:
Run Day 2 (PII unification) per `reports/CLEANUP_PLAN.md`.

ALTERNATIVE: Use GitHub CLI
---------------------------
If you install GitHub CLI (gh):
  gh pr list --head feature/day1-chat-merge-adapt
  gh pr ready <PR_NUMBER>
  gh pr comment <PR_NUMBER> --body-file comment.txt

VERIFICATION REPORTS AVAILABLE
-------------------------------
All reports are in the reports/ directory:
✓ reports/DAY1_APPLIED.md
✓ reports/DAY1_CHANGED_FILES.txt
✓ reports/DAY1_SMOKE.log
✓ reports/DAY1_VERIFY_SSE_HEADERS.txt
✓ reports/DAY1_VERIFY_SSE_SAMPLE.txt
✓ reports/DAY1_VERIFY_ENV.txt
✓ reports/DAY1_VERIFY_CALLS.txt
✓ reports/DAY1_VERIFY_VERDICT.txt
✓ reports/DAY1_LEGACY_REF_UPDATES.txt

