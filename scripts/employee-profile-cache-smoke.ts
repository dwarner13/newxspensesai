import { getEmployeeProfileCached } from '../netlify/functions/chat.ts';

type MockQueryResult = {
  tools_allowed: string[];
  system_prompt: string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function createMockSupabaseClient(result: MockQueryResult) {
  let queryCount = 0;
  const client = {
    from(table: string) {
      assert(table === 'employee_profiles', 'expected employee_profiles table');
      return {
        select(_columns: string) {
          return {
            eq(_column: string, _value: string) {
              return {
                async maybeSingle() {
                  queryCount += 1;
                  return { data: result, error: null };
                },
              };
            },
          };
        },
      };
    },
    getQueryCount() {
      return queryCount;
    },
  };
  return client;
}

async function run(): Promise<void> {
  const slug = `cache-smoke-${Date.now()}`;
  const mockSb = createMockSupabaseClient({
    tools_allowed: ['request_employee_handoff', 'tag_category_brain'],
    system_prompt: 'You are a helpful assistant.',
  });

  const missCtx: any = { employee_profile_cache_hit: null };
  const first = await getEmployeeProfileCached(mockSb as any, slug, missCtx);
  assert(Array.isArray(first.tools_allowed), 'first call should return tools_allowed array');
  assert(first.system_prompt === 'You are a helpful assistant.', 'first call should return system_prompt');
  assert(missCtx.employee_profile_cache_hit === false, 'first call should be cache miss');
  assert(mockSb.getQueryCount() === 1, 'first call should query once');

  const hitCtx: any = { employee_profile_cache_hit: null };
  const second = await getEmployeeProfileCached(mockSb as any, slug, hitCtx);
  assert(Array.isArray(second.tools_allowed), 'second call should return tools_allowed array');
  assert(second.system_prompt === 'You are a helpful assistant.', 'second call should return system_prompt');
  assert(hitCtx.employee_profile_cache_hit === true, 'second call should be cache hit');
  assert(mockSb.getQueryCount() === 1, 'second call should not query again');

  console.log('[employee-profile-cache-smoke] PASS');
}

run().catch((error) => {
  console.error('[employee-profile-cache-smoke] FAIL', error);
  process.exitCode = 1;
});
