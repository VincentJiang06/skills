# Visual / Browser Pass

Load at Step 2/4. The deterministic analyzer (`scripts/analyze.py`) proves what it
can from the markup; the visual pass completes the `needs_judgment` long tail —
runtime themes, background images, dynamic state — that static parsing cannot
resolve. Keep it **bounded** and make it **non-fatal**: if no renderer is
available, degrade and still emit the doc set.

## Render method by target type

| Target | Render | Notes |
|---|---|---|
| **H5 / web** (`.html`) | A headless/preview browser or screenshot tool at a mobile viewport (e.g. 375×812). | If a browser MCP/preview is connected, use it; otherwise screenshot-only → `--input-mode visual_estimate`. |
| **WeChat mini-program** (`.wxml`/`.wxss`) | WeChat DevTools automation (sibling skill **mp-cli-sup**) for screenshots + runtime probes — a plain browser cannot render it. | Pass the page's `.wxss` to `analyze.py --css` for the static numeric checks; use the screenshot for the visual long tail. |
| **No renderer available** | None. | Degrade: run static only, mark unresolved items `needs_judgment`, set `--input-mode visual_estimate` for screenshot/prose, and recommend supplying code. |

## What the visual pass catches (beyond static)

- Text over a **background image / gradient** (`bg_image`) — estimate contrast on
  the busiest region; recommend a scrim/overlay.
- **Runtime-themed** or locally-scoped CSS vars (`css_var_unresolved`) — judge the
  worst theme.
- **Dynamic / JS state** (`js_state`) — pressed/disabled/selected styles applied at
  runtime.
- Real **rendered size & spacing** under the actual viewport when the box was
  layout-dependent (`target_size_unresolved`).

Label every visual finding an **estimate** (the doc set carries `input_mode` and
tags the evidence). Never fabricate a precise ratio from a screenshot.

## Bounded

Audit only the **targeted** scope (`--pages` / `--selector`); with none, the
analyzer's bounded default (`--max-pages`) applies. Render at most the pages in
scope — this is designed for cheap, repeated, partial runs, so don't crawl the
whole project in one pass. Suggest the next area in `next_round_scope`.
