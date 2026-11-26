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

## 7. Conversation history: all seven integrated employees (candidate b706405)

Where to open each one:
- **Prime:** the Prime panel, in all three modes.
- **Tag:** the Tag panel on Transactions or Categories.
- **Crystal:** My Story → Crystal.
- **Goalie:** Goals & Debt → Goalie.
- **Byte:** Categories → Byte.
- **Ledger:** Tax & Business → Ledger.
- **Custodian:** Settings → the Custodian bubble.

Finley, Liberty, Chime and Blitz are **not** part of this release. They stay inactive until a separate readiness review.

Run every row for each of the seven employees (Prime, Tag, Crystal, Goalie, Byte, Ledger, Custodian), on desktop Chrome AND iPhone Safari (browser and installed PWA). Tick per employee.

| # | Check | Pass criteria |
|---|---|---|
| 7.1 | Conversation history | The History button (44px) opens the shared drawer. It lists only **this** employee's conversations, newest first, with readable titles, plus search and Today / Earlier. Opening one restores its messages in order. |
| 7.2 | Cross-device continuity | Send a message on desktop, then open the same employee on iPhone (and the reverse). The same conversation appears, with no duplicates and nothing missing. Repeat after a page refresh and after reopening the PWA. |
| 7.3 | New conversation | New conversation clears the panel. The next message starts a new conversation, and the earlier one is still in History. Nothing is deleted. |
| 7.4 | Save failure | If a reply shows "This conversation couldn't be saved, so it won't appear in History or on your other devices." it is readable and does not resend anything. |
| 7.5 | Manual retry (Tag, Custodian) | With the network off, send. "That message didn't go through." appears with Retry. After reconnecting and pressing Retry, the message appears once and the reply once. Nothing retries automatically. Tag: no categorization preview or change is repeated. |
| 7.6 | Conflict / duplicate (Tag, Custodian) | "Nothing was changed. Please send that again." appears where applicable; nothing is applied twice; Custodian shows no "Go there" button on such replies. |
| 7.7 | Employee isolation | One employee's History never shows another employee's conversations. Opening Crystal right after Prime starts or resumes a **Crystal** conversation and never shows Prime's. Switching employees never moves an existing conversation. |
| 7.8 | Customer isolation | Sign out, then sign in as a second test account on the same device. None of the first account's conversations, cached messages or history appear. Sign back in and the first account's history returns. |
| 7.9 | Personality and readability | Each employee still sounds like itself: Prime the advisor; Tag categorization; Crystal trends; Goalie goals; Byte documents and statements (**no document reading in chat**); Ledger tax; Custodian app guidance (read-only). Replies are readable: 16–17px text, tables / lists / headings where used, no raw `**`, `#` or `|`. |
| 7.10 | Mobile keyboard | On iPhone, focusing the composer keeps it above the keyboard. The last message stays visible. Sending keeps the keyboard usable. Rotating doesn't hide the input. |
| 7.11 | Scrolling | Long conversations scroll smoothly. Reading earlier messages is not interrupted by auto-scroll; new replies scroll into view only when already at the bottom. The History drawer scrolls on its own and closes with Escape (desktop) or Close (44px). |
| 7.12 | Controls and accessibility | History, New conversation and Close are 44px with spoken labels ("Previous Crystal conversations", "New conversation", "Close Crystal"). Keyboard Tab order reaches them. |
| 7.13 | Byte boundary | Byte has history only: there is no in-chat document reading. "Upload New Statement" and the attachment button only open the statement-import screen, as before. |

Record any failure with employee, device, steps, screenshot and time, and send it to Development HQ / Prime HQ.
