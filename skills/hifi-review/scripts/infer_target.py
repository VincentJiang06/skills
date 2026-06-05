#!/usr/bin/env python3
"""Rig-aware target inference: given a device FR + the rig it was measured on,
rank the same-rig targets by how well the device's band profile matches each, and
guess which target it was tuned toward.

Usage:
  python3 scripts/infer_target.py <fr.csv> --rig bk5128|iec711|gras_43ag \
      [--device NAME --category iem]
"""
import argparse, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fr_analyze import parse_fr, band_avg, load_json  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fr")
    ap.add_argument("--rig", required=True)
    ap.add_argument("--device", default="")
    ap.add_argument("--category", default="")
    args = ap.parse_args()

    taxo = load_json("band-taxonomy.json")
    targets = load_json("targets.json")
    anchor = targets["anchor_band"]

    pts = parse_fr(args.fr)
    raw = {b["id"]: band_avg(pts, b["hz"][0], b["hz"][1]) for b in taxo["bands"]}
    if raw.get(anchor) is None:
        sys.exit("ERR_NO_ANCHOR: no data in %s" % anchor)
    center = raw[anchor]
    profile = {bid: raw[bid] - center for bid in raw if raw[bid] is not None}

    cands, rigs_seen = [], set()
    for tid, t in targets["targets"].items():
        rigs_seen.add(t.get("rig", "unknown"))
        if t.get("rig") != args.rig:
            continue
        tl = t["band_levels_db"]
        resid = [profile[bid] - tl[bid] for bid in tl if bid in profile]
        if not resid:
            continue
        rms = math.sqrt(sum(r * r for r in resid) / len(resid))
        bias = sum(resid) / len(resid)  # uniform brighter(+)/darker(-) vs target
        cands.append({"target": tid, "label": t["label"], "rms_db": round(rms, 2),
                      "bias_db": round(bias, 1), "confidence": t.get("confidence", "?"),
                      "applies_to": t.get("applies_to", [])})
    cands.sort(key=lambda c: c["rms_db"])

    if not cands:
        verdict = "no targets on rig '%s' (available rigs: %s) — cannot infer" % (
            args.rig, ", ".join(sorted(rigs_seen)))
        best = None
    else:
        best = cands[0]
        r = best["rms_db"]
        if r < 2.5:
            verdict = "looks tuned toward %s (close fit, RMS %.2f dB)" % (best["label"], r)
        elif r < 4.0:
            verdict = "loosely follows %s (RMS %.2f dB); not a tight match" % (best["label"], r)
        else:
            verdict = "no clear %s target match (closest %s, RMS %.2f dB)" % (args.rig, best["label"], r)

    out = {"device": args.device, "rig": args.rig, "category": args.category,
           "candidates": cands, "best_fit": best["target"] if best else "",
           "verdict": verdict}
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
