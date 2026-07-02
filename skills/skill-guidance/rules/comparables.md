# Comparable-design research (the 资料搜集 step)

Goal: learn how *similar real skills* solve the structure problems the target is
weak on — then transfer the pattern, never the content. This is the light
application of skill-principle's research pillar.

## Procedure

1. **Frame the question** from the scorecard's weakest pillars. e.g. "How do
   mature skills express adjacent false-trigger examples?" or "How is a multi-step
   protocol split into modules?"

2. **Pick comparables** from the registry. `--list` shows ids/stars/example
   paths but not the "what to learn" hints — those live in the registry JSON, so
   read it when choosing:
   ```bash
   node <kb>/tools/fetch_skill_reference.mjs --list   # ids/stars/paths only — NOT the learn hints
   cat <kb>/references/skill_repos.registry.json      # the what_to_learn_zh/en hints live here
   ```
   (`<kb>` = the skill-principle KB dir, default `skill-principle/` inside this
   skill. The `what_to_learn_zh/en` hints live only in
   `<kb>/references/skill_repos.registry.json` — read that JSON when choosing;
   `--list` alone omits them.)
   Quick gap → comparable map (a starting point; refine by domain):

   | Weak pillar / need | Comparable to fetch |
   |---|---|
   | SKILL.md shape, frontmatter, progressive disclosure | `repo.anthropics_skills` (e.g. `skills/skill-creator`) |
   | testing / tdd / verification gates | `repo.addyosmani_agent-skills` (e.g. `skills/test-driven-development`) |
   | lifecycle phases, anti-rationalization | `repo.addyosmani_agent-skills` (`skills/using-agent-skills`) |
   | minimal-token / anti-bloat structure | `repo.neolabhq_context-engineering-kit` |
   | per-language plugin reuse | `repo.microsoft_skills` |

   Prefer official / high-star for canonical structure; match the target's domain
   where possible.

3. **Fetch only what you need** into a temp cache outside any KB:
   ```bash
   node <kb>/tools/fetch_skill_reference.mjs repo.anthropics_skills skills/skill-creator --out /tmp/sg-ref
   ```
   The fetch needs network. **Offline / sandboxed:** fall back to the
   registry's `what_to_learn_zh/en` hints alone, and say so in the
   `comparables[]` entry (`what_to_borrow: "... (registry hints only; fetch
   unavailable)"`) — a degraded comparable recorded honestly beats a fabricated
   one.

4. **Mine for transferable structure** — frontmatter/trigger phrasing, how
   modules are split, where tests/metrics live, how controls are externalized.
   Record each as a `comparables[]` entry: `{repo_id, skill_path, what_to_borrow}`.
   `what_to_borrow` must be a structural lesson ("gate each step with an explicit
   verification block"), not domain content.

5. **Optionally deepen** via the KB's breadth/depth knobs when a pattern is
   unclear: `query_kb "<pattern>" --broad` (or `--exhaustive` at full altitude).

## Altitude gating

- **lite** — at most one comparable, or skip entirely if the scorecard is already
  strong and the gaps are obvious. Don't spend the budget.
- **full** — 2 comparables, plus a `query_kb --exhaustive` pass on the 1–2 pillars
  scoring lowest, so the recommended design is grounded, not invented.

## Guardrails

- Never copy domain content; borrow structure only. Industrial skills must
  consider more than these examples do (controls, tests, metrics, lifecycle,
  evidence base) — note where the comparable itself falls short.
- The fetch tool writes outside the KB; keep the cache in `/tmp`. It is
  disposable, not a deliverable.
