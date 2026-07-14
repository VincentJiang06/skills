# Citation styles — read ONLY the block for the named style

A paper uses exactly one style per run. Read only the block the requirement names; do not
drag the other four through context. Each block gives the in-text form, the reference-list
form, and one worked reference example. `scripts/check_citations.py` encodes the structural
half of these rules (cross-reference resolution mode + identifier syntax). A requested style
NOT listed here is out of v1 scope — refuse with a scope message; never approximate it with
another style's formatting.

Supported in v1: **APA 7**, **MLA 9**, **Chicago (author-date)**, **IEEE**, **GB/T 7714**.

`check_citations.py --style` resolution modes:
- author-date (`apa` / `mla` / `chicago`): in-text `(Surname, YYYY)` ↔ reference keyed by
  leading surname + year.
- numeric (`ieee` / `gbt`): in-text `[n]` ↔ numbered reference entry `[n] …`.

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
- NOTE: `check_citations.py` resolves MLA in author-date mode (surname + year); a pure
  author-page paper still needs a datestamp in each reference entry for the structural
  cross-reference — a known v1 limitation recorded as growth debt.

## Chicago (author-date)
- In-text: `(Surname YYYY, page)`.
- Reference list: `Surname, First. YYYY. "Title." *Journal* vol (issue): pages. DOI.`
- Example: `Zhang, Feng. 2019. "Development of CRISPR-Cas Systems for Genome Editing."
  Nature Reviews Molecular Cell Biology 20: 490–507.
  https://doi.org/10.1038/s41580-019-0131-5`

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
