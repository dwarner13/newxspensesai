/**
 * P-UI-2 — Prime's greeting uses the shared preferred-name rule (same as Prime's replies),
 * never the email address, and reads naturally when no name is known.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolvePreferredName } from '../../shared/preferred-name';

const root = path.resolve(__dirname, '../../..');
const v2 = fs.readFileSync(path.join(root, 'src/pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');

describe('shared rule (as used by the greeting)', () => {
  it('display name first; never an email', () => {
    expect(resolvePreferredName({ display_name: 'darrell warner', first_name: 'D' }).firstName).toBe('Darrell');
    expect(resolvePreferredName({ display_name: 'me@example.com' }, { name: 'Sam Lee' }).firstName).toBe('Sam');
    expect(resolvePreferredName(null, null).firstName).toBeNull();
  });
});

describe('PrimeChatV2 greeting', () => {
  it('resolves the name with the shared rule, not useAuth().firstName', () => {
    expect(v2).toMatch(/import \{ resolvePreferredName \} from "@\/shared\/preferred-name";/);
    expect(v2).toMatch(/resolvePreferredName\(profile, user\?\.user_metadata\)\.firstName/);
    expect(v2).not.toMatch(/const \{ firstName, userId, session \} = useAuth\(\);/);
  });

  it('no greeting line can render "undefined" or a dangling ", ." when there is no name', () => {
    const openers = v2.slice(v2.indexOf('openers.push'), v2.lastIndexOf('openers.push') + 200);
    expect(openers).not.toMatch(/, \$\{firstName\}/);
    expect(openers).not.toMatch(/`\$\{firstName\} — /);
    expect(v2).toMatch(/const nameSuffix = firstName \? `, \$\{firstName\}` : '';/);
    expect(v2).toMatch(/const namePrefix = firstName \? `\$\{firstName\} — ` : '';/);
    expect(v2).toMatch(/Hey\{firstName \? ` \$\{firstName\}` : ""\} — want to pick up where we left off\?/);
  });
});
