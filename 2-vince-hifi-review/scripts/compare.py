#!/usr/bin/env python3
"""Deterministic transducer comparison: two FR files against a SHARED target ->
per-band 量感 delta, tilt delta, who-has-more-where, comparability guard.

Usage:
  python3 scripts/compare.py <fr_a.csv> <fr_b.csv> --target harman_ie_2019 \
      [--device-a A --device-b B --rig-a 711 --rig-b 711 --category-a iem --category-b tws]
"""
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fr_analyze import analyze  # noqa: E402

IN_EAR = {"iem", "tws"}


def band_of(bands, bid):
    for b in bands:
        if b["id"] == bid:
            return b
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fr_a")
    ap.add_argument("fr_b")
    ap.add_argument("--target", required=True)
    ap.add_argument("--device-a", dest="da", default="A")
    ap.add_argument("--device-b", dest="db", default="B")
    ap.add_argument("--rig-a", dest="ra", default="unknown")
    ap.add_argument("--rig-b", dest="rb", default="unknown")
    ap.add_argument("--category-a", dest="ca", default="iem")
    ap.add_argument("--category-b", dest="cb", default="iem")
    args = ap.parse_args()

    A = analyze(args.fr_a, args.target, args.ra, args.da, args.ca)
    B = analyze(args.fr_b, args.target, args.rb, args.db, args.cb)

    comparable, notes = True, []
    if (args.ca in IN_EAR) != (args.cb in IN_EAR):
        comparable = False
        notes.append("cross-rig: IEM/TWS (711) vs headphone (GRAS) not directly comparable")
    if args.ra != args.rb:
        notes.append("different measurer/rig (%s vs %s): cross-measurer variance applies" % (args.ra, args.rb))

    band_deltas, a_more, b_more, similar = [], [], [], []
    for ba in A["bands"]:
        bb = band_of(B["bands"], ba["id"])
        if bb is None:
            continue
        qd = ba["quanta"] - bb["quanta"]
        band_deltas.append({"id": ba["id"], "hz": ba["hz"], "a_quanta": ba["quanta"], "b_quanta": bb["quanta"],
                            "quanta_delta": qd, "dev_db_delta": round(ba["dev_db"] - bb["dev_db"], 1)})
        (a_more if qd >= 1 else b_more if qd <= -1 else similar).append(ba["id"])

    out = {
        "device_a": A["device"], "device_b": B["device"], "target": args.target,
        "comparable": comparable, "comparability_notes": notes,
        "signature_a": A["signature"]["label_en"], "signature_b": B["signature"]["label_en"],
        "tilt_a_db": A["tilt"]["tilt_db"], "tilt_b_db": B["tilt"]["tilt_db"],
        "tilt_delta_db": round(A["tilt"]["tilt_db"] - B["tilt"]["tilt_db"], 1),
        "band_deltas": band_deltas,
        "summary": {"a_more_in": a_more, "b_more_in": b_more, "similar_in": similar},
        "warnings": sorted(set(A["warnings"]) | set(B["warnings"])),
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
