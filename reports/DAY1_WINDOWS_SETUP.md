Day 1 PR Update - Windows Setup Instructions
============================================

STEP 1: Set GITHUB_TOKEN Environment Variable
-----------------------------------------------
On Windows, use setx to set the environment variable:

```cmd
setx GITHUB_TOKEN "your_actual_token_here"
```

⚠️ IMPORTANT: 
- Replace "your_actual_token_here" with your actual GitHub personal access token
- You need to close and reopen your terminal after running setx for it to take effect
- Or use PowerShell: $env:GITHUB_TOKEN="your_token" (temporary, current session only)

STEP 2: Verify Token is Set
-----------------------------
After reopening terminal, verify:

```bash
echo $GITHUB_TOKEN
# Should show your token (or at least not be empty)
```

STEP 3: Run the Script
-----------------------
```bash
bash scripts/mark_pr_ready_day1.sh
```

WHAT THE SCRIPT DOES
--------------------
1. Finds PR #1 for branch feature/day1-chat-merge-adapt
2. Checks if it's draft (already ready, so will skip)
3. Posts verification comment with links to reports:
   - reports/DAY1_APPLIED.md
   - reports/DAY1_CHANGED_FILES.txt
   - reports/DAY1_SMOKE.log
   - reports/DAY1_VERIFY_SSE_HEADERS.txt
   - reports/DAY1_VERIFY_SSE_SAMPLE.txt

EXPECTED OUTPUT
---------------
✅ Summary:
PR URL: https://github.com/dwarner13/newxspensesai/pull/1
Status: Ready for review
Comment URL: https://github.com/dwarner13/newxspensesai/pull/1#issuecomment-XXXXX

ALTERNATIVE: Use PowerShell (temporary, current session)
-------------------------------------------------------
```powershell
$env:GITHUB_TOKEN="your_token_here"
bash scripts/mark_pr_ready_day1.sh
```

This sets the token only for the current PowerShell session and doesn't require
closing/reopening the terminal.

