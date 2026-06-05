# Music source roster — type / orientation / reliability

Concrete source classes for album research. Reliability 1 = strongest for the fact
type, 4 = weakest. Match the source TYPE to the FACT it backs (first-party for
credits/dates; critic press for evaluation; never use a forum post as a fact source).

| Source class | `type` | Best for | Typical orientation | Reliability |
|---|---|---|---|---|
| Liner notes / booklet | `liner_notes` | personnel, recording date/venue, credits | first-party | 1 |
| Label / official release page | `label` | track list, release date, format, credits | first-party (promotional lean) | 1–2 |
| Metadata DB (MusicBrainz / Discogs-class) | `metadata_db` | track list, format, label, catalog № | community-curated | 2 |
| Critic press EN (Pitchfork / AllMusic / Gramophone / JazzTimes / RYM) | `critic_press` | evaluation, context, reception | publication editorial lean | 1–3 |
| Critic press 中文 (豆瓣音乐 / 乐评媒体) | `critic_press` | 中文 reception, local context | varies | 2–3 |
| Artist / producer interview | `interview` | genesis, intent, session detail | first-party, self-narrative | 2 |
| Academic musicology / score study | `musicology` | classical work analysis, performance practice | scholarly | 1 |
| Encyclopedia (Grove / 维基百科) | `encyclopedia` | dates, overview, cross-refs | tertiary | 2–3 |
| Caller-supplied material (offline mode) | `caller_supplied` | whatever the user provided | user-provided | 3 |

## Orientation matters

A measurement-of-evaluation is colored by the outlet. Note `evidence[].orientation`
so a glowing review from a label-affiliated outlet is weighted against an
independent critic. For contested facts, prefer corroboration across ≥2 independent
types and record dissent.

## Offline degradation

With no web access, the roster collapses to `caller_supplied` (+ any cached
knowledge the agent is *certain* of). Facts that cannot be grounded become `gaps[]`
and explicit 资料不足 in the prose — not invented specifics.
