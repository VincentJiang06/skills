# pdf-export — PDF Conversion Configuration

**Load this file only when the user has requested PDF output** (confirmed in Phase 0 or explicitly during Phase 2). For Markdown-only output, format rules in `rules/templates.md` are sufficient.

> **INPUT vs OUTPUT — two different jobs.** *Reading* course PDFs (input) goes
> through the `/pdf` skill (see Global Rule #1 / `phase-cover.md`). *Generating*
> the notes PDF (output) is a separate job done with **pandoc + xelatex**,
> configured below. This file governs OUTPUT only.

---

## When to generate PDF

After `revision-notes.md` (and the optional `quick-reference.md`) is complete,
generate the output PDF with **pandoc** using the **xelatex** engine, per the
configuration below. Pandoc/xelatex is the output engine for the notes PDF
(xelatex is required for reliable CJK — see the Chinese/mixed section). The
`/pdf` skill is for reading input PDFs, not for producing this output.

---

## Detecting document language

Before generating PDF, check the study notes language:
- **English only:** use the standard Latin font stack. No special configuration needed.
- **Chinese only or mixed Chinese/English:** apply the CJK font configuration below. Without it, Chinese characters will render as blank boxes or tofu (□□□).

---

## Font stack for English-only documents

Pandoc default is sufficient. Recommended explicit config:

```yaml
# pandoc front matter or --variable flags
mainfont: "Georgia"
monofont: "Courier New"
```

---

## Font stack for Chinese or mixed documents

CJK fonts must be explicitly set. Use `xelatex` as the PDF engine (not `pdflatex`):

```yaml
# pandoc YAML front matter
mainfont: "Noto Serif"          # Latin body text
CJKmainfont: "Noto Serif CJK SC"  # Chinese body text (SC = Simplified; TC = Traditional)
monofont: "Noto Sans Mono"      # Code blocks
sansfont: "Noto Sans"
CJKsansfont: "Noto Sans CJK SC"
```

Equivalent pandoc command:
```bash
pandoc revision-notes.md -o revision-notes.pdf \
  --pdf-engine=xelatex \
  -V mainfont="Noto Serif" \
  -V CJKmainfont="Noto Serif CJK SC" \
  -V monofont="Noto Sans Mono"
```

**Fallback fonts by platform** (if Noto is not installed):

| Platform | Chinese body | Chinese sans | Code |
|---|---|---|---|
| macOS | PingFang SC / STSong | PingFang SC | Menlo |
| Windows | SimSun / NSimSun | Microsoft YaHei | Consolas |
| Linux | Noto Serif CJK SC | Noto Sans CJK SC | DejaVu Sans Mono |

To check available fonts:
```bash
# macOS / Linux
fc-list :lang=zh | head -20

# or via pandoc
pandoc --list-fonts 2>/dev/null | grep -i "cjk\|song\|hei\|ping"
```

---

## Complete pandoc command for Chinese or mixed documents

Use this as the definitive template. The flags below address the most common failure modes (tofu characters, cramped lines, broken paragraphs):

```bash
pandoc revision-notes.md -o revision-notes.pdf \
  --pdf-engine=xelatex \
  -V mainfont="Noto Serif" \
  -V CJKmainfont="Noto Serif CJK SC" \
  -V monofont="Noto Sans Mono" \
  -V fontsize=11pt \
  -V geometry="margin=2.5cm" \
  -V linestretch=1.8 \
  -V parskip=6pt \
  -V CJKoptions="AutoFakeBold=2,AutoFakeSlant=0.2" \
  --listings
```

**Why each flag:**

| Flag | Value | Reason |
|------|-------|--------|
| `--pdf-engine=xelatex` | — | Only xelatex handles CJK reliably; pdflatex will break |
| `linestretch` | `1.8` | Chinese characters are visually denser than Latin; 1.4 feels cramped, 1.8 is comfortable for reading |
| `parskip` | `6pt` | Adds breathing room between paragraphs — without this, paragraph breaks are invisible in dense Chinese text |
| `geometry` | `margin=2.5cm` | Prevents lines from running too long; CJK at full width is hard to read |
| `fontsize` | `11pt` | 10pt is too small for Chinese body text |
| `CJKoptions` | `AutoFakeBold` | Makes bold (`**text**`) actually render as bold in Chinese; without it, bold markup is silently ignored |
| `--listings` | — | Better code block handling; prevents CJK in comments from breaking the PDF |

---

## Tuning linestretch by content type

| Content type | Recommended `linestretch` |
|---|---|
| Chinese-only body text | `1.8` |
| Mixed Chinese + English | `1.8` |
| Chinese + dense math/formulas | `2.0` (formulas need extra vertical space) |
| English-only | `1.3` (pandoc default is fine) |

If the user reports "lines are too close together", increase `linestretch` by 0.2 increments. If they report "too much whitespace", decrease by 0.1.

---

## YAML front matter alternative

Embed settings directly in the Markdown file to avoid long command lines:

```yaml
---
title: "[Course Name] — Revision Notes"
mainfont: "Noto Serif"
CJKmainfont: "Noto Serif CJK SC"
monofont: "Noto Sans Mono"
fontsize: 11pt
geometry: "margin=2.5cm"
linestretch: 1.8
parskip: 6pt
CJKoptions: "AutoFakeBold=2,AutoFakeSlant=0.2"
---
```

Then run simply:
```bash
pandoc revision-notes.md -o revision-notes.pdf --pdf-engine=xelatex --listings
```

---

## Format-specific notes

### LaTeX formulas
Use standard notation only — no custom packages. `amsmath` is available by default in pandoc's LaTeX template. CJK text mixed into formula environments (e.g. Chinese variable names) will break — keep all formula content in Latin/Greek.

### Tables
Max 5 columns; keep cell content narrow. CJK text in table cells is wider than Latin — reduce column count further if cells contain Chinese. Long Chinese strings in table cells will overflow; break them with `<br>` if needed.

### Code blocks
The `--listings` flag handles code blocks correctly. CJK characters inside code blocks may still break — if course code contains Chinese comments, test the PDF output early and consider stripping comments for the PDF version.

### Page breaks
Horizontal rules (`---`) act as page break hints. Insert before each lecture section for clean PDF pagination.
