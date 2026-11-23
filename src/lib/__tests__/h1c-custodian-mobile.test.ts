/**
 * H1-C — Custodian chat panel on mobile: 16px input (prevents iOS focus zoom) and
 * bottom safe-area spacing for the bottom sheet (clears the home indicator).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PANEL } from '../../pages/PrimeChatV2/panelConfig';

const root = path.resolve(__dirname, '../../..');
const panel = fs.readFileSync(path.join(root, 'src/components/onboarding/CustodianPanelChat.tsx'), 'utf8');

describe('CustodianPanelChat', () => {
  it('uses the shared 16px input size', () => {
    expect(PANEL.inputFontSize).toBeGreaterThanOrEqual(16);
    expect(panel).toMatch(/fontSize: PANEL\.inputFontSize/);
    expect(panel).not.toMatch(/padding: '10px 14px', fontSize: 15/);
  });

  it('pads the bottom sheet for the home indicator, not the status bar', () => {
    expect(panel).toMatch(/paddingBottom: 'env\(safe-area-inset-bottom, 0px\)'/);
    expect(panel).not.toMatch(/safe-area-inset-top/);
  });

  it('keeps the existing chat endpoint and identity', () => {
    expect(panel).toMatch(/custodian-chat/);
    expect(panel).toMatch(/placeholder="Ask Custodian anything\.\.\."/);
  });
});
