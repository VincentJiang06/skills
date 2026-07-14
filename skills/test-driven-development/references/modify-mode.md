# Modify mode — keep the suite a living spec, not a landfill

**Load this when** a test suite already exists for the area you're touching: to
decide edit vs merge vs delete vs add, to consolidate micro-tests into one
parametrized test, and to get the native-collector commands for the inventory
subagent.

Lineage anchor [P4]: the whole mode instantiates [P2] — the spec is a living,
decision-first artifact you edit, not a log you append to.

The principle: **the suite tracks the *current* target.** When code changes, the
test count for that feature-group should **not** grow just because you touched it.
You change the spec, you don't append to it.
Before adding anything, check what's there
and prefer to change it:

## Quick reference — edit/merge/delete/add

| Situation | Do this | Not this |
|---|---|---|
| An existing test already covers the area | **Edit / strengthen** it | Add a second overlapping test |
| New behavior is related to an existing test | **Merge** into one parametrized/table-driven test | Add a separate near-duplicate |
| Target changed → an existing test asserts the old behavior | **Update** it to the new target (or **delete** if obsolete) | Leave old + new asserting in conflict |
| N micro-behaviors of one feature | **One** parametrized test with N cases | N separate tests |
| Coverage already exists elsewhere | **Consolidate / delete** the duplicate | Grow net test count for the same group |
| Genuinely new feature-group, nothing covers it | **Add ONE** group test | A test per assertion |

Net rule: for the same feature-group, the test count should **not** grow just
because the code changed. Worked examples + per-stack consolidation patterns
are in Step 3 below.

---

## Step 1 — Inventory first (delegate to a subagent)

Before writing anything, find what already covers the area. Dispatch a subagent
that runs the stack's **native collector** and returns the matching tests (file ·
name · line). Don't hand-write a test parser, and don't re-read every test file
inline.

### Native collectors {#native-collectors}

| Stack | Collect (list tests without running) | Run only the target |
|---|---|---|
| **vitest** | `npx vitest list` (or `--filter <pat>`) | `npx vitest run <file> -t "<name>"` |
| **jest** | `npx jest --listTests` (lists test **files** — jest has no names-only collector; for case names open the file or `grep -nE "\b(test\|it)\("`) | `npx jest <file> -t "<name>"` |
| **pytest** | `pytest --collect-only -q [path/-k expr]` | `pytest path::test_name -q` |
| **go** | `go test ./pkg -list '.*'` | `go test ./pkg -run '^TestName$'` |
| **rust** (best-effort) | `cargo test -- --list` | `cargo test name -- --exact` |
| **other** | the runner's own `--collect`/`--list`/dry-run flag | the runner's name/path filter |

Subagent brief: *"Run `<collect command>` for the suite at <path>; return only the
tests whose name or file matches <area> (file · test name · line). Don't run the
full suite; don't write a parser."* Consume the summary, not the raw dump.

---

## Step 2 — Pick the mode

```
Does a test already cover this area?
├─ No  → is the change real new behavior?  → ADD exactly ONE feature-group test.
└─ Yes →
     ├─ The target CHANGED (old assertion now wrong)
     │     → UPDATE that test to the new target  (DELETE it if the behavior is gone).
     ├─ New behavior is RELATED to what the test covers
     │     → MERGE it in: extend to a parametrized/table-driven test with a new case.
     └─ Coverage is DUPLICATED elsewhere
           → CONSOLIDATE / DELETE the duplicate.
```

- **Edit over add.** A new related behavior almost always belongs *in* the
  existing test as another case — not in a new near-duplicate test.
- **Update/delete on target change.** If the target moved, the old test is now
  *wrong*, not *additional*. Fix or remove it so old and new don't assert in
  conflict. A stale test is worse than no test — it lies.
- **Add is the exception, not the default,** once a suite exists.

---

## Step 3 — Consolidate: one test per feature-group

A **feature-group** is one behavior with its edges. Collapse N micro-tests (or N
would-be tests) into ONE parametrized test whose cases are the edges. Same
coverage, a fraction of the lines, one place to change.

**pytest**
```python
@pytest.mark.parametrize("email, expected", [
    ("",            "Email required"),   # empty
    ("   ",         "Email required"),   # whitespace
    ("a@b.co",      None),               # valid
])
def test_email_validation(email, expected):
    assert validate(email) == expected
```

**vitest / jest**
```ts
test.each([
  ['',       'Email required'],   // empty
  ['   ',    'Email required'],   // whitespace
  ['a@b.co', null],              // valid
])('validate(%j) → %j', (email, expected) => {
  expect(validate(email)).toBe(expected);
});
```

**go** (table-driven)
```go
func TestEmailValidation(t *testing.T) {
    cases := []struct{ in, want string }{
        {"", "Email required"}, {"   ", "Email required"}, {"a@b.co", ""},
    }
    for _, c := range cases {
        if got := Validate(c.in); got != c.want {
            t.Errorf("Validate(%q) = %q, want %q", c.in, got, c.want)
        }
    }
}
```

Three separate `test('rejects empty')`, `test('rejects whitespace')`,
`test('accepts valid')` → **one** table. Add the next edge as a row, not a new test.

> Watch-it-fail is still **once for the group**: add the failing row/case, run the
> one test, see it fail, then make it pass. Not one red→green per row.

---

## Step 4 — Stale / duplicate scan (delegate)

After green, dispatch a subagent to catch what the change left behind:

- Tests referencing **removed or renamed** symbols, files, or routes.
- Tests asserting the **old** target you just changed (should have been updated).
- **Duplicate** coverage — two tests exercising the same path with different names.

Subagent brief: *"In <test dir>, find tests that (a) reference symbols not present
in <changed files>, (b) assert the pre-change behavior of <area>, or (c) duplicate
another test's path. Return file · name · why — don't fix them."* Then
consolidate/delete from the summary.

---

## What NOT to do

- Don't add a test "to be safe" when one already covers the path — that's
  proliferation, the exact pain this mode fixes.
- Don't leave a renamed-around or now-wrong test in place "just in case" — delete
  means delete; a lying test costs more than no test.
- Don't grow net test count for the same feature-group because the code changed —
  edit the spec, don't append to it.
