# Research protocol — 资料搜集 + claim→evidence map

The skill makes heavy external factual claims (track lists, personnel, recording
dates/venue, label, release form, reception). Fabricating any of these is the
primary harm. This protocol prevents it.

## 1. Build a source roster for THIS album

Pick concrete sources from `references/source-roster.md`, profiling each by
**type / orientation / reliability (1=best…4=weak)**. Aim for at least one
first-party source (liner notes / label) for discographic facts and ≥2
independent sources for any contested fact.

## 2. Breadth fan-out (then depth-deepen)

Fan out across these angles, one query cluster each:
1. **artist / genesis** — who made it, where they were in their arc
2. **recording / production** — sessions, studio, producer, engineer, dates
3. **the music itself** — tracks / movements, form, motifs, lyrics-as-text
4. **reception / criticism** — contemporary + retrospective critical view
5. **comparisons** — siblings in the discography; for classical, reference recordings
6. **cultural / historical context** — scene, era, influence

After the breadth pass, **depth-deepen** the angles that came back thin (iterative
deepening): re-query with the specifics you just learned (a producer's name, a
session city) to pull the next layer.

When web/search tools are available, use them for the fan-out. Offline, operate on
caller-supplied material and set `trace.research_mode = "offline_caller_supplied"`.

## 3. Clean, grade, triangulate → the claim→evidence map

- **Clean:** strip marketing copy and unsourced forum lore.
- **Grade:** assign each source a reliability 1–4 by type and track record.
- **Triangulate:** a discographic fact wanted at high confidence needs corroboration;
  note dissent in `claims[].dissent`.
- **Map:** every fact-class claim (`kind:"fact"`, `fact_class` ∈ track_list /
  personnel / recording_date / recording_venue / label / release_form / release_date /
  credit) carries ≥1 `source_id` present in `evidence[]`. Interpretation
  (`kind:"interpretation"`) is tagged separately and needs no source. This is exactly
  what `scripts/validate_backing.py` enforces.

## 4. Honest degradation (obscure / thin-info albums)

If public information is thin, **say so** — emit explicit "资料不足" / "公开资料有限"
in the prose and a `gaps[]` entry in the backing. **Never invent** a track,
musician, date, or venue to fill the gap or to reach the 10,000-字 floor. A short
honest review that passes the floor on real 汉字 beats a padded fabrication — and
the validator counts only 汉字, so padding with Latin cannot rescue a thin review.
