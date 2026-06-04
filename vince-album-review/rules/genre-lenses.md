# Genre lenses — pick the critical dimensions by runtime judgment

NOT a fixed bucket enum. Read what the album actually is from rich descriptors,
then foreground the dimensions that matter for it. The validator only enforces two
classes (`standard`, `classical`); the *content* lens is yours to choose.

## Descriptors to set first

- **idiom** (free text): pop / rock / jazz / electronic / hip-hop / folk /
  soundtrack / classical / world / experimental …
- **era** and the artist's place in their arc.
- **role-of-credit**: is the primary credit the songwriter, the bandleader, the
  performer, the conductor, the soloist?
- **work-vs-performance**: for classical/jazz-standards, the *composition* and the
  *performance* are separately evaluable.
- **release-form**: single / EP / LP / box / live / compilation / soundtrack →
  sets the **unit of analysis** (逐曲 vs 逐乐章 vs 逐碟).

## Lens by idiom (foreground these)

- **classical** — separate the WORK (form, total, harmonic argument) from the
  PERFORMANCE (tempo, phrasing, balance, recorded sound, conductor/soloist choices);
  performance practice; and a **reference-recording / 版本比较** section. Validate
  with `--class classical`.
- **jazz** — improvisation, interplay, take history, the rhythm section, arranging.
- **pop / rock** — songcraft, hooks, production, era sound, sequencing.
- **electronic** — sound design, texture, rhythm programming, spatialization.
- **hip-hop** — flow, lyricism, beat construction, sampling, guests.
- **soundtrack / score** — function-to-image, themes, diegetic vs underscore.
- **folk / world** — tradition, idiom authenticity, transmission, language.

## Guardrail (edge: genre mismatch)

Never force a pop/songcraft template onto a symphony, and never impose a
movements/乐章 template on a pop LP. The lens follows the descriptors. For a
non-standard release form, adapt the unit of analysis (per-disc for a box set) and
keep the length/coverage target — or degrade it with a stated reason, never a crash.
