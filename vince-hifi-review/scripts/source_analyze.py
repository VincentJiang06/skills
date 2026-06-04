#!/usr/bin/env python3
"""Source-gear engine: measured metrics -> competence tier + system matching."""
import argparse, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "references")


def load_json(name):
    with open(os.path.join(REF, name), encoding="utf-8") as f:
        return json.load(f)


def tier_for(sinad, tiers):
    for t in tiers:  # ordered high -> low
        if sinad >= t["min_sinad"]:
            return t["tier"]
    return tiers[-1]["tier"]


def parse_power(s):
    out = {}
    for pair in s.split(","):
        if ":" in pair:
            load, mw = pair.split(":")
            out[float(load)] = float(mw)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--device", default="")
    ap.add_argument("--class", dest="klass", default="dac")
    ap.add_argument("--sinad", type=float, required=True)
    ap.add_argument("--thdn", type=float, default=0.0)
    ap.add_argument("--snr", type=float, default=0.0)
    ap.add_argument("--zout", type=float, required=True)
    ap.add_argument("--power", default="")             # "load:mW,load:mW"
    ap.add_argument("--target-z", type=float, dest="tz", default=0.0)
    ap.add_argument("--target-sens", type=float, dest="tsens", default=0.0)  # dB/mW
    args = ap.parse_args()

    cfg = load_json("source-gear-thresholds.json")
    tier = tier_for(args.sinad, cfg["competence_tiers_by_sinad_db"])
    warnings = []

    sm = {"target_z_ohm": args.tz, "damping_factor": 0.0, "damping_ok": False,
          "max_spl_db": 0.0, "drives_adequately": False, "hiss_risk": "unknown"}
    if args.tz > 0:
        df = round(args.tz / args.zout, 1) if args.zout > 0 else 9999.0
        sm["damping_factor"] = df
        sm["damping_ok"] = args.zout <= args.tz / cfg["output_impedance_rule"]["damping_factor_min"]
        if not sm["damping_ok"]:
            warnings.append("high_output_impedance_vs_load")
        if args.tsens > 0 and args.power:
            pw = parse_power(args.power)
            cand = [l for l in pw if l >= args.tz] or list(pw.keys())
            if cand:
                load = min(cand, key=lambda l: abs(l - args.tz))
                mw = pw[load]
                sm["max_spl_db"] = round(args.tsens + 10 * math.log10(mw), 1)
                sm["drives_adequately"] = sm["max_spl_db"] >= cfg["drive_target_spl_db"]
                if not sm["drives_adequately"]:
                    warnings.append("insufficient_power_for_%s_ohm" % int(args.tz))
        hr = cfg.get("hiss_risk_rule", {})
        if args.tsens >= hr.get("high_if_target_sens_db_mw_gte", 1e9) and args.snr and args.snr < hr.get("and_snr_db_lt", 0):
            sm["hiss_risk"] = "high"
        elif args.tsens >= 110:
            sm["hiss_risk"] = "medium"
        else:
            sm["hiss_risk"] = "low"
        if args.tsens > 0:
            sm["target_sens_db_mw"] = args.tsens

    out = {"device": args.device, "class": args.klass,
           "measured": {"sinad_db": args.sinad, "thdn_pct": args.thdn, "snr_db": args.snr, "zout_ohm": args.zout},
           "competence_tier": tier, "system_matching": sm, "warnings": warnings}
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
