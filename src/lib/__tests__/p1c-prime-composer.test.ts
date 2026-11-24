/**
 * P1-c — Prime composer: growing multi-line textarea, Enter to send, Shift+Enter newline,
 * IME-safe, always-visible 44px Send, 16px+ mobile / 17px desktop text.
 * The attachment button and the pending-file pill are unchanged (Attachments HQ / chip step).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const input = fs.readFileSync(path.join(root, 'src/pages/PrimeChatV2/PrimeChatInput.tsx'), 'utf8');

describe('PrimeChatInput', () => {
  it('is a one-row textarea that auto-grows via the shared helper', () => {
    expect(input).toMatch(/<textarea\s+ref=\{textRef\}\s+rows=\{1\}/);
    expect(input).not.toMatch(/<input\s+type="text"/);
    expect(input).toMatch(/computeComposerHeight\(el\.scrollHeight\)/);
    expect(input).toMatch(/\}, \[value\]\);/);
    expect(input).toMatch(/maxHeight: COMPOSER_MAX_HEIGHT_PX/);
  });

  it('keeps Enter to send, Shift+Enter newline and IME safety', () => {
    expect(input).toMatch(/e\.key === "Enter" && !e\.shiftKey && !e\.nativeEvent\.isComposing/);
  });

  it('has an accessible, always-visible 44px Send that is disabled when empty', () => {
    expect(input).toMatch(/aria-label="Send message"/);
    expect(input).toMatch(/disabled=\{!canSend\}/);
    expect(input).toMatch(/width: CHAT_VISUALS\.touchTarget,\s*height: CHAT_VISUALS\.touchTarget/);
    expect(input).toMatch(/aria-label="Message Prime"/);
  });

  it('uses 16px+ on mobile and 17px on desktop', () => {
    expect(input).toMatch(/fontSize: Math\.max\(PANEL\.inputFontSize, chatTextSize\(isMobile\)\)/);
  });

  it('leaves the attachment button and pending-file pill unchanged', () => {
    expect(input).toMatch(/<ChatAttachmentButton onFileSelected=/);
    expect(input).toMatch(/setTimeout\(\(\) => setPendingFile\(null\), 8000\)/);
  });
});
