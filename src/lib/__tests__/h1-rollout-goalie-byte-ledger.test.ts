/**
 * Universal conversation history rollout: Goalie (2), Byte (4, history only), Ledger (5)
 * use the same shared hook and controls as Crystal. Custodian (3) is NOT wired: its live
 * panel uses a separate custodian-chat endpoint whose persistence is not yet verified.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const panels = [
  { file: 'src/pages/GoalsDebtV2/GoalieCopilotPanel.tsx', canonical: 'goalie-goals', slug: 'goalie-ai', name: 'Goalie' },
  { file: 'src/pages/CategoriesV2/ByteCopilotPanel.tsx', canonical: 'byte-docs', slug: 'byte-docs', name: 'Byte' },
  { file: 'src/pages/TaxBusinessV2/LedgerCopilotPanel.tsx', canonical: 'ledger-tax', slug: 'ledger-tax', name: 'Ledger' },
];

describe.each(panels)('$name', ({ file, canonical, slug, name }) => {
  const src = read(file);
  it('uses the shared hook with its canonical employee and unchanged persona slug', () => {
    expect(src).toMatch(new RegExp(`useEmployeeChat\\("${canonical}", \\{ employeeSlug: "${slug}" \\}\\)`));
    expect(src).not.toMatch(/useUnifiedChatEngine\(/);
  });
  it('shared History / New conversation controls and a 44px close', () => {
    expect(src).toMatch(new RegExp(`<ConversationControls\\s+employeeName="${name}"`));
    expect(src).toMatch(new RegExp(`aria-label="Close ${name}" style=\\{\\{ width: 44, height: 44`));
  });
  it('unsaved replies show the honest notice', () => {
    expect(src).toMatch(/\{isUnsavedReply\(m\) && <div style=\{\{ maxWidth: "80%" \}\}><UnsavedReplyNotice \/><\/div>\}/);
  });
});

describe('Byte: history only', () => {
  const byte = read('src/pages/CategoriesV2/ByteCopilotPanel.tsx');
  it('no new document access: sendMessage gets no documentIds; existing upload buttons unchanged', () => {
    expect(byte).not.toMatch(/documentIds/);
    expect(byte).toMatch(/<ChatAttachmentButton onFileSelected=\{\(file\) => \{ setUploadOpen\(true\); \}\} \/>/);
  });
});

describe('Custodian: not wired until its endpoint is verified', () => {
  it('the live Custodian panel is unchanged', () => {
    const live = read('src/components/onboarding/CustodianPanelChat.tsx');
    expect(live).not.toMatch(/useEmployeeChat|ConversationControls/);
  });
});
