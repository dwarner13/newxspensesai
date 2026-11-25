# UI/UX browser acceptance checklist (desktop Chrome + iPhone Safari)

Run on **staging only**, signed in with the **dedicated test account**, after Prime HQ
confirms which candidate is deployed. Local automated tests do not establish visual
acceptance. Record for each line: Pass / Fail / Note, plus a screenshot.

Devices: desktop Chrome at 1440 and 1280 wide; iPhone Safari in the browser AND as the
installed PWA. Width checks at 320, 390 and 430.

## 1. Startup (LD-1)
- [ ] Cold start to `/dashboard`: one XspensesAI screen (logo, gold ring, status line), with no second spinner at a different height and no white flash.
- [ ] Sign-in: the status reads "Signing you in…", then "Preparing your workspace…".
- [ ] Page change inside the dashboard: the sidebar stays; a brief load shows nothing, and a slow one shows the screen in the content area only.
- [ ] Reduced motion (iOS setting on): the ring is still.
- [ ] Slow network (Chrome throttling): after about 15 s, "This is taking longer than usual." and Reload.
- [ ] Expired session and refresh go to sign-in cleanly; the iPhone PWA return from background shows no endless spinner.
- [ ] Note: iOS's own launch screen comes before the app's screen; it is not app-controlled.

## 2. Prime
- [ ] Quick, Expanded and Workspace modes: header, Full screen / Exit full screen, the same conversation in all three.
- [ ] Greeting uses the preferred name (never an email); a no-name account reads naturally.
- [ ] Reply formatting: a table (scrolls sideways on phones), numbered steps, headings, dividers; no raw `|`, `#` or `**` while typing.
- [ ] Activity status shows "Prime is reviewing your transactions…" etc., only during real tool use.
- [ ] Spending breakdown card: the period in the header, CAD amounts, total = sum of rows.
- [ ] "Prime checked with Tag · <period>" appears only on replies where Tag was consulted.
- [ ] History drawer: open a past conversation; resume it on the other device.
- [ ] If shown: "This conversation couldn't be saved…", with no automatic resend.
- [ ] Mobile keyboard: the composer stays above the keyboard; drafts survive mode switches.

## 3. Tag
- [ ] Ask Tag on desktop, then open Tag on the iPhone: the same conversation appears.
- [ ] Six hours later the conversation is still there (no wipe).
- [ ] New conversation starts empty; the previous one is in History; nothing is deleted.
- [ ] History drawer: Tag conversations only; opening one restores it.
- [ ] Network off, then send: "That message didn't go through." with Retry. After Retry the message appears once, and no categorization preview or change repeats.
- [ ] A categorization preview, then confirm / "no": the reply comes from the server and nothing is applied twice.

## 4. Transactions
- [ ] Toolbar: search, year, date range, account, statement, category, Needs category and type; filters survive opening a transaction and reloading.
- [ ] Summary strip counts match "Needs category" results and the banner count.
- [ ] Desktop rows: Date, Merchant, Account, Category, Amount. Phone rows are grouped by date and show Category · Account.
- [ ] Coming back within 30 minutes returns to the same place (rows loaded, scroll).
- [ ] Drawer: Account and Statement don't flicker; the Statement shows the period or "Statement period unavailable" (never the bank name twice).
- [ ] Expand drawer (desktop): details left, Tag right; edits kept when toggling.
- [ ] After a correction, "Done" (gold) returns focus to the same row; X also returns to it.

## 5. Categories
- [ ] Compact list, search, year, month, custom range, account, Reset; filters survive navigation.
- [ ] The review count ignores customer-approved "Other".
- [ ] Subcategories expand inline; the detail shows exactly the transactions counted, paged.
- [ ] Transactions on the 1st of a month count in that month (Mountain time).

## 6. Settings
- [ ] Data & privacy: no destructive "Nuke" button; the honest support-contact option is present.
