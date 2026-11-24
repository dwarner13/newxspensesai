/**
 * L-A — "Prime checked with Tag" marker: genuine events only, assistant only, validated.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseSpecialistConsultations, SCOPE_LABEL_MAX } from '../specialistConsultation';

const root = path.resolve(__dirname, '../../..');
const v2 = fs.readFileSync(path.join(root, 'src/pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');
const marker = fs.readFileSync(path.join(root, 'src/components/chat/SpecialistConsultationMarker.tsx'), 'utf8');

const ev = (over: Record<string, unknown> = {}) => ({ employee: 'tag', tool: 'tag_status', status: 'ok', scopeLabel: 'June 2025', readOnly: true, ...over });

describe('parseSpecialistConsultations', () => {
  it('renders a genuine Tag consultation with its scope', () => {
    const out = parseSpecialistConsultations({ specialistConsultations: [ev()] }, 'assistant');
    expect(out.map(c => c.text)).toEqual(['Prime checked with Tag · June 2025']);
  });

  it('nothing without the field, on user messages or with malformed items', () => {
    expect(parseSpecialistConsultations({}, 'assistant')).toEqual([]);
    expect(parseSpecialistConsultations(undefined, 'assistant')).toEqual([]);
    expect(parseSpecialistConsultations({ specialistConsultations: [ev()] }, 'user')).toEqual([]);
    expect(parseSpecialistConsultations({ specialistConsultations: 'tag' }, 'assistant')).toEqual([]);
    expect(parseSpecialistConsultations({ specialistConsultations: [ev({ readOnly: false })] }, 'assistant')).toEqual([]);
    expect(parseSpecialistConsultations({ specialistConsultations: [ev({ employee: 'crystal' })] }, 'assistant')).toEqual([]);
    expect(parseSpecialistConsultations({ specialistConsultations: [null, 3] }, 'assistant')).toEqual([]);
  });

  it('is honest when the check did not complete', () => {
    const out = parseSpecialistConsultations({ specialistConsultations: [ev({ status: 'query_error' })] }, 'assistant');
    expect(out[0].text).toBe("Prime asked Tag, but the check didn't complete");
    expect(out[0].completed).toBe(false);
  });

  it('truncates long scopes, collapses whitespace and de-duplicates', () => {
    const long = 'x'.repeat(200);
    const out = parseSpecialistConsultations({ specialistConsultations: [ev({ scopeLabel: long }), ev({ scopeLabel: long })] }, 'assistant');
    expect(out).toHaveLength(1);
    expect(out[0].scopeLabel.length).toBe(SCOPE_LABEL_MAX);
    expect(parseSpecialistConsultations({ specialistConsultations: [ev({ scopeLabel: ' Jun \n 2025 ' })] }, 'assistant')[0].scopeLabel).toBe('Jun 2025');
  });
});

describe('wiring', () => {
  it('PrimeChatV2 parses from message meta with the message role, above the reply', () => {
    expect(v2).toMatch(/const consultations = parseSpecialistConsultations\(metaAny, msg\.role\);/);
    expect(v2).toMatch(/<SpecialistConsultationMarker consultations=\{consultations\} \/>\s*<TypingMessage/);
  });
  it('marker is read-only text, not a control', () => {
    expect(marker).not.toMatch(/<button|onClick/);
  });
});
