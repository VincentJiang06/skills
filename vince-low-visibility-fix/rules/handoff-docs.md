# Handoff Document Set

Load at Step 5. The doc set is the skill's **stable deliverable** — emitted on
every run by `scripts/audit.py` and validated against
`schemas/handoff-doc.schema.json`. It is what an implementer agent reads to apply
fixes; this skill never edits the target itself.

## Files

`scripts/audit.py` writes two files into the out dir (default `<target>/.lv-audit/`):

- **`audit.json`** — the machine sidecar. Always carries all required sections.
- **`report.md`** — the human-readable render of the same data.

## Sections (all always present)

| Section | Contents |
|---|---|
| `schema_version`, `generated_by`, `target` | provenance |
| `scope` | `requested`, `analyzed_files`, `missing`, `bounded`, `selector`, `input_mode` |
| `summary` | `status` (`issues_found`/`clean`), `total_findings`, `by_severity`, `needs_judgment_count`, `worst_score` |
| `findings[]` | `id`, `file`, `rule`, `severity`, `location`, plus `measured`/`threshold`/`axis`/`evidence` where known |
| `recommendations[]` | one per finding: `finding_id`, `rule`, `recommendation`, `snippet_ref` |
| `needs_judgment[]` | `file`, `reason`, `location`, `guidance` (how to complete in the visual pass) |
| `next_round_scope` | a suggested scope for the next cheap re-run |

A clean scope still emits the full set with `summary.status: "clean"` and empty
`findings`/`recommendations` — never a missing or empty file.

## Fix recommendations (recommendations, never edits)

Each finding maps to a precise, build-ready recommendation — phrased for an
implementer to apply, not applied here. Recipes (in `scripts/emit_docs.py`,
mirrored to compliant patterns in `assets/fix-snippets.html`):

- **contrast** → reach the field ratio (text 7:1, large 4.5:1) by shifting the
  text colour toward the nearest extreme keeping hue; adjust background only if
  needed. Never recommend dropping below field for a field-critical control.
- **target_size** → `min-width`/`min-height` ≥ 64px (80px ideal) + padding; reflow
  or stack siblings rather than shrinking them.
- **icon_only** → add a VISIBLE text label beside the icon; `aria-label` alone is a
  weak glare fallback.
- **color_only** → encode state with colour PLUS text/icon/shape.
- **spacing** → gap ≥ 12px between adjacent targets.
- **font_size** → body ≥ 16px (18px critical labels); prefer `rem`.

Each `recommendation` should let an implementer act without re-deriving the fix;
`snippet_ref` points at the matching compliant pattern in `assets/fix-snippets.html`.
