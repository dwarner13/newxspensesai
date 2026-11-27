/**
 * Universal conversation history rollout: Goalie (2), Byte (4, history only), Ledger (5)
 * use the same shared hook and controls as Crystal. Custodian (3) keeps its own
 * custodian-chat endpoint and uses the shared endpoint-conversation hook.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const panels = [
  { file: 'src/pages/GoalsDebtV2/GoalieCopilotPanel.tsx', canonical: 'goalie-goals', slug: 'goalie-ai', name: 'Goalie' },
  { file: 'src/pages/TaxBusinessV2/LedgerCopilotPanel.tsx', canonical: 'ledger-tax', slug: 'ledger-tax', name: 'Ledger' },
];

describe.each(panels)('$name', ({ file, canonical, slug, name }) => {
  const src = read(file);
  it('uses the shared hook with its canonical employee and unchanged persona slug', () => {
    expect(src).toMatch(new RegExp(`useEmployeeChat\\("${canonical}", \\{ employeeSlug: "${slug}" \\}\\)`));
    expect(src).not.toMatch(/useUnifiedChatEngine\(/);
  });
  it('shared History / New conversation and Close in the universal toolbar (TB-4)', () => {
    expect(src).toMatch(new RegExp(`<ConversationControls\\s+employeeName="${name}" accent=\\{\\w+\\} isMobile=\\{isMobile\\}`));
    expect(src).toMatch(/onClose=\{handleClose\}/);
    expect(src).toMatch(/<ChatIdentity/);
    expect(src).not.toMatch(new RegExp(`aria-label="Close ${name}"`));
  });
  it('unsaved replies show the honest notice', () => {
    expect(src).toMatch(/\{isUnsavedReply\(m\) && <div style=\{\{ maxWidth: "80%" \}\}><UnsavedReplyNotice \/><\/div>\}/);
  });
});

describe('Byte: the unused copilot panel is retired (owner GO 2026-11-27, W5)', () => {
  it('ByteCopilotPanel.tsx no longer exists; Byte chat returns through the Upload Centre plan (U-E)', () => {
    expect(fs.existsSync(path.join(root, 'src/pages/CategoriesV2/ByteCopilotPanel.tsx'))).toBe(false);
  });
});

describe('Custodian (rollout 3): own endpoint, shared conversation hook', () => {
  const live = read('src/components/onboarding/CustodianPanelChat.tsx');
  const hook = read('src/hooks/useEndpointConversation.ts');
  it('uses the shared endpoint hook and controls; keeps custodian-chat', () => {
    expect(live).toMatch(/const convo = useEndpointConversation\('custodian'\);/);
    expect(live).toMatch(/<ConversationControls\s+employeeName="Custodian"/);
    expect(live).toMatch(/fetch\('\/\.netlify\/functions\/custodian-chat'/);
  });
  it('no client history is sent; sessionId / clientMessageId / newConversation come from the hook', () => {
    expect(live).not.toMatch(/history,|history:/);
    expect(live).toMatch(/body: JSON\.stringify\(\{ message: text, currentPath: window\.location\.pathname, \.\.\.fields \}\)/);
    expect(hook).toMatch(/clientMessageId: retryClientMessageId \|\| newClientMessageId\(\),/);
  });
  it('duplicate / conflict replies are display-only; unsaved and resend notices; manual retry only', () => {
    expect(live).toMatch(/action: outcome\.mayApply \? data\.action : undefined,/);
    expect(live).toMatch(/\{m\.unsaved && <UnsavedReplyNotice \/>\}/);
    expect(live).toMatch(/Nothing was changed\. Please send that again\./);
    expect(live).toMatch(/onClick=\{\(\) => void send\(failed\)\}/);
  });
  it('restore and history are owner- and employee-scoped; nothing deleted', () => {
    expect(hook).toMatch(/verifyOwnedSession\(sb, userId, cachedId, employee\)/);
    expect(hook).toMatch(/if \(!\(await verifyOwnedSession\(sb, userId, id, employee\)\)\) return false;/);
    expect(hook).not.toMatch(/\.delete\(|chat_threads/);
  });
});
