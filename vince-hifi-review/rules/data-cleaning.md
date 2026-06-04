# Data Cleaning & Normalization (Step 4 — mandatory)

Accuracy ≫ speed: this stage is not optional. Raw heterogeneous sources →
**canonical, deduplicated, vocabulary-normalized, provenance-tagged evidence set**.
Run in order.

## 1. Ingest
Wrap each raw item as a record: `source_id`, `tier`, `style-lean` (judged from the
*actual* content, using the registry `style_profile` as a prior), `freshness`
(measurement/post date), `lang`, and the raw text/values.

## 2. Dedup
Collapse syndicated or copy-pasted reviews (same text across sites, reposts of one
measurement) into a single claim that **keeps all contributing `source_id`s**.
Distinguish a genuine re-measurement from a re-post.

## 3. De-market
Drop manufacturer marketing copy, sponsored/affiliate hype, and unsubstantiated
superlatives. Keep only **evidence-bearing** claims: a measured value, or a
described *perceivable* attribute. "Reference-grade flagship clarity" → discard
unless tied to a measurement or a specific perception.

## 4. Normalize
Map free-text descriptors to canonical attributes via
`references/signature-glossary.md` (§5 normalization map). Bilingual: "厚/warm/lush
lower-mids" → `lower_mids_elevated`; "齿音/sibilant" → `lower_treble_peak`.

## 5. Reconcile scales
Convert reviewer-specific scales to a common direction+magnitude where possible
(stars, "8/10", "good/excellent" → elevated/neutral/reduced). If it cannot be
mapped cleanly, keep it qualitative — never fabricate a number.

## 6. Flag (don't delete)
Mark any source that contradicts the Tier-1 measurement or the majority consensus.
Down-weight low-tier and high-promo-risk sources. **Record dissent as a flagged
minority claim** (`dissent` field) — never silently average it away or delete it.

## 7. Preserve provenance
Every surviving claim keeps backward links to all contributing `source_id`s, plus
its provenance class (`measured | consensus | prior`) and a confidence seed.

**Output:** the canonical evidence set consumed by Step 5 (measure) and Step 6
(corroborate). If after cleaning there is no measurement at all, hand a
"review-consensus only" set forward and raise the objectivity-downgrade banner.
