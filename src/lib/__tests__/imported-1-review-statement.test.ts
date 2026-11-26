/**
 * IMPORTED-1 (owner GO 2026-11-26): the statement review page never reviews or commits an
 * already-imported statement again, and only reports what the server saved.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const page = fs.readFileSync(path.resolve(__dirname, '../../pages/dashboard/ReviewStatementPage.tsx'), 'utf8');

describe('ReviewStatementPage — already imported and honest results', () => {
  it('a committed statement shows "already imported" with a link, not the review grid', () => {
    expect(page).toMatch(/if \(!committed && \(alreadyImported \|\| importStatus === 'committed'\)\) \{/);
    expect(page).toContain('This statement is already imported');
    expect(page).toContain('View its transactions');
  });

  it('an already-committed server answer (idempotent / 409) is shown as already imported', () => {
    expect(page).toMatch(/if \(data\?\.idempotent === true \|\| data\?\.error === 'already_committed'\) \{\s*\/\/[^\n]*\n\s*setAlreadyImported\(true\);/);
  });

  it('success shows the server insertedCount, never the on-screen row count', () => {
    expect(page).toMatch(/typeof data\?\.insertedCount === 'number'\) \{\s*setCommittedCount\(data\.insertedCount\);/);
    expect(page).not.toMatch(/Imported \{rows\.length\} transactions/);
  });

  it('failures are shown (no silent failure); a lost response is an unknown outcome', () => {
    expect(page).toMatch(/setCommitError\("This statement couldn't be imported, so nothing was added\. Please try again\."\)/);
    expect(page).toMatch(/setCommitError\("Couldn't confirm whether the import finished/);
    expect(page.match(/data-testid="commit-error"/g)?.length).toBe(2);
  });
});
