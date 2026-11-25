/**
 * T-H2 — Prime shows the same honest save status as Tag when the server reports the reply
 * was not saved (meta.persisted === false). Never retried automatically.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const v2 = fs.readFileSync(path.resolve(__dirname, '../../pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');

describe('Prime save notice', () => {
  it('assistant replies with meta.persisted === false show the notice', () => {
    expect(v2).toMatch(/msg\.role === "assistant" && metaAny\?\.persisted === false && !isThisStreaming/);
    expect(v2).toMatch(/This conversation couldn&apos;t be saved, so it won&apos;t appear in History or on your other devices\./);
  });
  it('no automatic resend', () => {
    const i = v2.indexOf('metaAny?.persisted === false');
    expect(v2.slice(i, i + 800)).not.toMatch(/sendMessage|handleSend|onClick/);
  });
});
