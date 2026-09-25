# Citation styles — read ONLY the block for the named style

A paper uses exactly one style per run. Read only the block the requirement names; do not
drag the other four through context. Each block gives the in-text form, the reference-list
form, and one worked reference example. `scripts/check_citations.py` encodes the structural
half of these rules (cross-reference resolution mode + identifier syntax). A requested style
NOT listed here is out of v1 scope — refuse with a scope message; never approximate it with
another style's formatting.

Supported in v1: **APA 7**, **MLA 9**, **Chicago (author-date)**, **IEEE**, **GB/T 7714**.

`check_citations.py --style` resolution modes (each style is keyed where that style puts
the year; the lead surname may be any script, e.g. Özdemir, 王某某):
- `apa`: `(Surname, YYYY)` / `Surname (YYYY)` / `Surname and Surname (YYYY)` ↔ entry
  `Surname, I. (YYYY).` — `(n.d.)`, `(in press)`, `(YYYY, Month D)` accepted. Same author +
  same year needs the a/b suffix in both places.
- `chicago`: `(Surname YYYY, page)` ↔ entry `Surname, First. YYYY.`
- `mla`: every Works Cited surname must be mentioned in the body; the in-text → Works
  Cited direction is not checked (see the MLA block).
- numeric (`ieee` / `gbt`): single `[n]` ↔ numbered entry `[n] …`. Grouped markers (`[1-3]`,
  `[1, 4]`, and the `[2]` implied by `[1]–[3]`) are not read, because a date `[2024-01-15]` or an
  interval `[0, 1]` has the same shape. Cite each entry at least once with its own `[n]`,
  where its claim is made; an entry cited only inside a group is reported as uncited.
An entry the script cannot key fails the gate: fix the entry's form, never delete it.

---

## APA 7 (author-date)
- In-text: `(Surname, YYYY)` parenthetical; `Surname (YYYY)` narrative; two authors
  `(Surname & Surname, YYYY)`; 3+ `(Surname et al., YYYY)`.
- Reference: `Surname, I. I. (YYYY). Title in sentence case. *Journal*, *vol*(issue), pages.
  https://doi.org/…` — hanging indent, DOI as an https link. The journal name AND the
  volume number are italic; the issue number in parentheses is roman (apastyle.apa.org).
- Example: `Jinek, M., Chylinski, K., Fonfara, I., Hauer, M., Doudna, J. A., & Charpentier,
  E. (2012). A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity.
  *Science*, *337*(6096), 816–821. https://doi.org/10.1126/science.1225829`

## MLA 9 (author-page)
- In-text: `(Surname page)` — no comma, no year in text.
- Works Cited: `Surname, First. "Title." *Container*, vol. #, no. #, YYYY, pp. #–#. DOI or
  URL.`
- Example: `Doudna, Jennifer A., and Emmanuelle Charpentier. "The New Frontier of Genome
  Engineering with CRISPR-Cas9." Science, vol. 346, no. 6213, 2014, 1258096.
  https://doi.org/10.1126/science.1258096`
- Gate: `check_citations.py --style mla` checks only that every Works Cited surname appears
  in the body. `(Surname page)` has the same shape as `(Figure 2)`, so a parenthetical cite
  with no Works Cited entry is NOT caught, and the verifier checks only listed entries.
  Before returning, confirm yourself that every `(Surname page)` has an entry.

## Chicago (author-date)
- In-text: `(Surname YYYY, page)`.
- Reference list: `Surname, First. YYYY. "Title." *Journal* vol (issue): pages. DOI.`
- Example: `Pickar-Oliver, Adrian, and Charles A. Gersbach. 2019. "The Next Generation of
  CRISPR–Cas Technologies and Applications." Nature Reviews Molecular Cell Biology 20 (8):
  490–507. https://doi.org/10.1038/s41580-019-0131-5`

## IEEE (numeric)
- In-text: bracketed number `[1]`, numbered in order of first appearance.
- Reference: `[1] I. Surname, "Title," *Journal*, vol. #, no. #, pp. #–#, YYYY, doi: …`
- Example: `[1] M. Jinek et al., "A programmable dual-RNA-guided DNA endonuclease," Science,
  vol. 337, no. 6096, pp. 816–821, 2012, doi: 10.1126/science.1225829.`

## GB/T 7714 (numeric)
- In-text: `[1]` superscript/bracketed number.
- 参考文献: `[1] 作者. 题名[文献类型标志]. 刊名, 年, 卷(期): 页码. DOI 或 URL 或 ISBN.`
  Literature-type tags: `[J]` journal, `[M]` monograph, `[D]` dissertation, `[C]`
  conference.
- Example: `[1] 王某某. 社交媒体使用与青少年心理健康的关系研究[J]. 心理学报, 2020, 52(3):
  100-110. https://doi.org/10.3724/SP.J.1041.2020.00100`
