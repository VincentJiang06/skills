# Testing anti-patterns

**Load this when** writing or changing tests, adding mocks, or tempted to add
test-only methods to production code.

Lineage anchor [P4]: domain-convention gotchas with real BAD/GOOD pairs [S6];
an assert-on-mock test is a vacuous evaluator — the green-but-wrong shape [P5].

**Core principle:** test what the code *does*, not what the mocks do. Mocks
isolate; they are not the thing under test. Strict TDD (watch a real failure
first) prevents every pattern below.

```
1. NEVER assert on mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding the dependency
```

---

## 1. Testing mock behavior

```typescript
// ❌ asserts the mock exists, not that the component works
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// ✅ test the real thing (or, if you must mock for isolation, assert Page's
//    behavior with the sidebar present — never assert on the mock)
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

**Gate:** before asserting on any mock element — "am I testing real behavior or
just mock existence?" If existence → delete the assertion or unmock.

## 2. Test-only methods in production

```typescript
// ❌ destroy() exists only for test cleanup but looks like production API
class Session { async destroy() { await this._workspaceManager?.destroyWorkspace(this.id); } }

// ✅ cleanup lives in test-utils, not on the production class
export async function cleanupSession(session: Session) {
  const ws = session.getWorkspaceInfo();
  if (ws) await workspaceManager.destroyWorkspace(ws.id);
}
```

**Gate:** before adding a method to a production class — "is this only used by
tests?" Yes → put it in test utilities. "Does this class own this resource's
lifecycle?" No → wrong class.

## 3. Mocking without understanding

```typescript
// ❌ mocks away a side effect the test depends on (the config write), so the
//    duplicate-detection it's testing never fires
vi.mock('ToolCatalog', () => ({ discoverAndCacheTools: vi.fn().mockResolvedValue(undefined) }));

// ✅ mock only the slow/external part, preserve the behavior the test needs
vi.mock('MCPServerManager'); // just the slow server startup; config still written
```

**Gate:** before mocking — what side effects does the real method have? Does the
test depend on any? If yes, mock at a *lower* level (the actual slow/external op),
not the high-level method the test relies on. Unsure what the test needs? Run it
against the real implementation first, observe, then mock minimally.

Red flags: "I'll mock this to be safe", "this might be slow, better mock it",
mocking without knowing the dependency chain.

## 4. Incomplete mocks

```typescript
// ❌ only the fields you happened to think of — breaks when code reads metadata
const res = { status: 'success', data: { userId: '123' } };

// ✅ mirror the real response completely
const res = { status: 'success', data: { userId: '123', name: 'Alice' },
              metadata: { requestId: 'req-789', timestamp: 1234567890 } };
```

**Iron rule:** mock the COMPLETE structure as it exists in reality, not just the
fields your immediate test reads — partial mocks fail silently when downstream
code touches an omitted field. Unsure? Include all documented fields.

## 5. Tests as an afterthought

"Implementation complete, no tests, ready for testing" — wrong. Testing is part
of implementation. TDD order: failing test → implement → refactor → *then*
complete. You can't claim done without it.

---

## When mocks get too complex

Warning signs: mock setup longer than the test logic; mocking everything to make
it pass; mocks missing methods the real component has; the test breaks when the
mock changes. Ask: do we need the mock at all? Integration tests with real
components are often simpler than elaborate mocks.

## Quick reference

| Anti-pattern | Fix |
|---|---|
| Assert on mock elements | Test the real component or unmock it |
| Test-only methods in production | Move to test utilities |
| Mock without understanding | Understand the dependency first, mock minimally |
| Incomplete mocks | Mirror the real structure completely |
| Tests as afterthought | TDD — tests first |
| Over-complex mocks | Consider integration tests with real components |

**Bottom line:** mocks are tools to isolate, not things to test. If TDD reveals
you're testing mock behavior, test real behavior instead — or question why you're
mocking at all.
