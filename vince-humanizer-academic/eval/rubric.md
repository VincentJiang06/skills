# Evaluation Rubric

Use this rubric after generating rewritten outputs from `humanizer-academic`.

## Scoring dimensions

Score each dimension on a 1-5 scale.

### 1. Semantic fidelity

- `5`: Meaning, argument structure, evidence, and calibration are preserved almost exactly.
- `3`: Core meaning is preserved, but some nuance or emphasis shifts.
- `1`: Meaning drift, missing evidence, or unsupported additions.

### 2. Academic register

- `5`: Serious, restrained, publishable/reviewable academic prose.
- `3`: Mostly serious, but some lines feel flat, generic, or slightly casual.
- `1`: Noticeably chatty, sloganized, or unserious.

### 3. AI-pattern reduction

- `5`: Most obvious template signals are removed.
- `3`: Some cleanup, but visible scaffolding remains.
- `1`: Mostly synonym swapping; AI residue still dominates.

### 4. Structural repair

- `5`: Paragraph flow, transitions, and emphasis are materially improved.
- `3`: Sentence-level cleanup helps, but paragraph scaffolding remains.
- `1`: Structure remains mechanical or becomes less coherent.

### 5. Language fit

- `5`: Reads like native academic prose for that language.
- `3`: Generally acceptable, with occasional non-native or translated feel.
- `1`: Persistent non-native phrasing or register mismatch.

## Hard-fail conditions

Any of the following should be recorded as a failure regardless of aggregate score:

- invented facts, citations, quotations, or numbers
- removed necessary hedging or discipline-specific precision
- converted academic prose into casual commentary
- broke mixed-language terminology usage

## Suggested aggregate views

- `22-25`: strong
- `18-21`: usable with light review
- `14-17`: mixed
- `<14`: not ready
