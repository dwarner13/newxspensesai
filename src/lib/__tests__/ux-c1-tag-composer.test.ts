/**
 * UX-C1 — Tag composer sits in the panel's normal layout (no longer floats over the last
 * messages), auto-grows from one line to a cap, keeps Enter-to-send and IME handling,
 * keeps Send visible, and clears the iPhone status bar.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { computeComposerHeight, COMPOSER_MAX_HEIGHT_PX, COMPOSER_MIN_HEIGHT_PX } from '../chatComposer';

const root = path.resolve(__dirname, '../../..');
const panel = fs.readFileSync(path.join(root, 'src/components/transactions/TagCopilotPanel.tsx'), 'utf8');
const composer = panel.slice(panel.indexOf('{/* Input'), panel.lastIndexOf('</button>'));

describe('computeComposerHeight', () => {
  it('grows with content between min and max', () => {
    expect(computeComposerHeight(37)).toEqual({ height: 37, scrollable: false });
    expect(computeComposerHeight(96.4)).toEqual({ height: 97, scrollable: false });
  });

  it('caps at the max and becomes scrollable past it', () => {
    expect(computeComposerHeight(400)).toEqual({ height: COMPOSER_MAX_HEIGHT_PX, scrollable: true });
    expect(computeComposerHeight(COMPOSER_MAX_HEIGHT_PX)).toEqual({ height: COMPOSER_MAX_HEIGHT_PX, scrollable: false });
  });

  it('falls back to the minimum for empty or invalid measurements', () => {
    expect(computeComposerHeight(0).height).toBe(COMPOSER_MIN_HEIGHT_PX);
    expect(computeComposerHeight(Number.NaN).height).toBe(COMPOSER_MIN_HEIGHT_PX);
    expect(computeComposerHeight(5).height).toBe(COMPOSER_MIN_HEIGHT_PX);
  });

  it('uses a reasonable cap', () => {
    expect(COMPOSER_MAX_HEIGHT_PX).toBeGreaterThanOrEqual(100);
    expect(COMPOSER_MAX_HEIGHT_PX).toBeLessThanOrEqual(200);
  });
});

describe('TagCopilotPanel composer layout', () => {
  it('is an in-flow flex child, not absolutely positioned over the list', () => {
    expect(composer).toMatch(/flexShrink: 0,/);
    expect(composer).not.toMatch(/position: "absolute"/);
    expect(composer).not.toMatch(/backdropFilter/);
    expect(composer).toMatch(/env\(safe-area-inset-bottom, 0px\)/);
  });

  it('the message list no longer reserves a fixed 160px overlay gap', () => {
    expect(panel).not.toMatch(/calc\(160px/);
    expect(panel).toMatch(/flex: 1, minHeight: 0, overflowY: "auto"/);
  });

  it('starts at one row and auto-grows via the shared helper', () => {
    expect(composer).toMatch(/rows=\{1\}/);
    expect(composer).not.toMatch(/rows=\{2\}/);
    expect(composer).toMatch(/ref=\{composerRef\}/);
    expect(composer).toMatch(/maxHeight: COMPOSER_MAX_HEIGHT_PX/);
    expect(panel).toMatch(/computeComposerHeight\(el\.scrollHeight\)/);
    expect(panel).toMatch(/\}, \[inputValue\]\);/);
  });

  it('keeps Enter-to-send, Shift+Enter newline and IME composition handling', () => {
    expect(composer).toMatch(/e\.key === "Enter" && !e\.shiftKey && !e\.nativeEvent\.isComposing/);
    expect(composer).toMatch(/if \(inputValue\.trim\(\) && !isLoading\) handleSend\(\);/);
  });

  it('keeps the Send button with an accessible label and the mobile 16px input', () => {
    expect(composer).toMatch(/className="tag-btn-send"/);
    expect(composer).toMatch(/aria-label="Send message to Tag"/);
    expect(composer).toMatch(/fontSize: isMobile \? 16 : 15/);
  });

  it('pads the header for the iPhone status bar', () => {
    // TB-3: compact header, still clears the iPhone status bar on every width.
    expect(panel).toMatch(/padding: isMobile \? "calc\(8px \+ env\(safe-area-inset-top, 0px\)\) 8px 8px 12px" : "calc\(12px \+ env\(safe-area-inset-top, 0px\)\) 16px 12px"/);
  });

  it('leaves the C3b anomaly card untouched', () => {
    expect(panel).toMatch(/anomalyAmountDisplay/);
    expect(panel).toMatch(/AmountAnomalyCard/);
  });
});
