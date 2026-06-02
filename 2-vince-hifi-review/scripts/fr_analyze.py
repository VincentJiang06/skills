#!/usr/bin/env python3
"""Transducer objective engine: FR (freq,dB) + target -> band deviations, 量感, 风格."""
import argparse, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "references")


def load_json(name):
    with open(os.path.join(REF, name), encoding="utf-8") as f:
        return json.load(f)


def parse_fr(path):
    pts = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p for p in line.replace(",", " ").replace("\t", " ").split() if p]
            if len(parts) < 2:
                continue
            try:
                pts.append((float(parts[0]), float(parts[1])))
            except ValueError:
                continue
    if len(pts) < 8:
        sys.exit("ERR_FR_PARSE: <8 numeric points from %s" % path)
    pts.sort()
    return pts


def band_avg(pts, lo, hi):
    vals = [db for hz, db in pts if lo <= hz <= hi]
    return sum(vals) / len(vals) if vals else None


def to_quanta(dev, thr):
    a, s = abs(dev), (1 if dev >= 0 else -1)
    if a <= thr["neutral"]:
        return 0
    if a <= thr["slight"]:
        return s
    if a <= thr["notable"]:
        return s * 2
    return s * 3


def qlabel(taxo, q):
    for it in taxo["quanta_scale"]:
        if it["q"] == q:
            return it
    return {"zh": "?", "en": "?"}


def qof(bands, bid):
    for b in bands:
        if b["id"] == bid:
            return b["quanta"]
    return 0


def signature(bands):
    bass = (qof(bands, "sub_bass") + qof(bands, "mid_bass")) / 2.0
    mids = (qof(bands, "lower_mids") + qof(bands, "center_mids") + qof(bands, "upper_mids")) / 3.0
    treb = (qof(bands, "lower_treble") + qof(bands, "mid_treble") + qof(bands, "air")) / 3.0

    def L(zh, en, rule):
        return {"label_zh": zh, "label_en": en, "rule_fired": rule}

    if max(qof(bands, "sub_bass"), qof(bands, "mid_bass")) >= 2 and treb <= 0:
        return L("低频猛", "bass-heavy", "a bass band>=2 & treble<=0")
    if bass >= 1 and treb >= 1 and mids <= 0.5:
        return L("V 形", "V-shape", "bass>=1 & treble>=1 & mids<=0.5")
    if bass >= 1 and treb <= -0.5:
        return L("暖声", "warm", "bass>=1 & treble<=-0.5")
    if treb >= 1 and bass <= 0:
        return L("明亮", "bright", "treble>=1 & bass<=0")
    if qof(bands, "upper_mids") >= 1 and bass <= 0:
        return L("中频前倾", "mid-forward", "upper_mids>=1 & bass<=0")
    if treb <= -1:
        return L("暗声", "dark", "treble<=-1")
    if max(abs(bass), abs(mids), abs(treb)) <= 1:
        return L("均衡", "neutral", "all sections within +/-1")
    return L("混合", "mixed", "no dominant rule")


def feature_hint(hz, t):
    """Perceptual hint for a sharp peak/dip by center frequency."""
    if t == "peak":
        if hz < 250:
            return "中低频隆起 / boom"
        if hz < 1000:
            return "中频厚凸 / honky"
        if hz < 3000:
            return "中频突出 / forward"
        if hz < 5000:
            return "咬字突出 / presence-bite"
        if hz < 9000:
            return "齿音风险 / sibilance"
        if hz < 12000:
            return "刺耳 / treble-glare"
        return "高频毛刺 / sharp-air"
    if hz < 1000:
        return "中下盘凹陷 / scooped-lower"
    if hz < 3000:
        return "人声凹陷 / recessed-vocal"
    if hz < 6000:
        return "齿音抑制 / de-essed"
    return "高频凹陷 / dark-dip"


def detect_features(pts, prom):
    """Sharp peaks/dips that band-averaging hides: local extrema of the residual
    against a log-frequency smoothed baseline, exceeding +/- prominence (dB).
    Returns up to 5, strongest first."""
    n = len(pts)
    if n < 8:
        return []
    logf = [math.log10(h) for h, _ in pts]
    db = [d for _, d in pts]
    base = []
    for i in range(n):
        lo, hi = logf[i] - 0.2, logf[i] + 0.2   # ~2/3-octave window each side
        win = [db[j] for j in range(n) if lo <= logf[j] <= hi]
        base.append(sum(win) / len(win))
    resid = [db[i] - base[i] for i in range(n)]
    feats = []
    for i in range(1, n - 1):
        if resid[i] > prom and resid[i] >= resid[i - 1] and resid[i] >= resid[i + 1]:
            feats.append((pts[i][0], resid[i], "peak"))
        elif resid[i] < -prom and resid[i] <= resid[i - 1] and resid[i] <= resid[i + 1]:
            feats.append((pts[i][0], resid[i], "dip"))
    feats.sort(key=lambda f: -abs(f[1]))
    return [{"hz": round(hz, 1), "residual_db": round(r, 1), "type": t, "hint": feature_hint(hz, t)}
            for hz, r, t in feats[:5]]


def spectral_tilt(bands):
    """Continuous bass<->treble balance (a nuance complement to the discrete 风格
    label), plus low/high extension. Uses dev_db for precision."""
    dev = {b["id"]: b["dev_db"] for b in bands}

    def g(k):
        return dev.get(k, 0.0)

    bass = (g("sub_bass") + g("mid_bass")) / 2.0
    treb = (g("lower_treble") + g("mid_treble") + g("air")) / 3.0
    tilt = round(treb - bass, 1)
    if tilt <= -2:
        zh, en = "暖向", "warm-tilted"
    elif tilt >= 2:
        zh, en = "亮向", "bright-tilted"
    else:
        zh, en = "中性倾斜", "even"
    return {"tilt_db": tilt, "label_zh": zh, "label_en": en,
            "low_extension_db": round(g("sub_bass"), 1), "high_extension_db": round(g("air"), 1)}


def analyze(fr, target, rig="unknown", device="", category="iem"):
    taxo, targets = load_json("band-taxonomy.json"), load_json("targets.json")
    if target not in targets["targets"]:
        sys.exit("ERR_TARGET_UNKNOWN: %s" % target)
    tgt = targets["targets"][target]
    thr = targets["quanta_thresholds_db"]
    anchor = targets["anchor_band"]

    pts = parse_fr(fr)
    raw = {b["id"]: band_avg(pts, b["hz"][0], b["hz"][1]) for b in taxo["bands"]}
    if raw.get(anchor) is None:
        sys.exit("ERR_NO_ANCHOR: no data in %s" % anchor)
    offset = tgt["band_levels_db"][anchor] - raw[anchor]

    bands, warnings = [], []
    for b in taxo["bands"]:
        bid = b["id"]
        if raw[bid] is None:
            warnings.append("no_data_band:%s" % bid)
            continue
        dev = (raw[bid] + offset) - tgt["band_levels_db"][bid]
        q = to_quanta(dev, thr)
        lab = qlabel(taxo, q)
        bands.append({"id": bid, "hz": b["hz"], "dev_db": round(dev, 1), "quanta": q,
                      "label_zh": lab["zh"], "label_en": lab["en"]})
    prom = targets.get("peak_detection", {}).get("min_prominence_db", 3.0)
    return {"device": device, "category": category, "target": target,
            "rig": rig, "alignment": {"method": "anchor_%s" % anchor, "offset_db": round(offset, 1)},
            "bands": bands, "signature": signature(bands), "tilt": spectral_tilt(bands),
            "features": detect_features(pts, prom),
            "precision": "quantitative", "warnings": warnings}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fr")
    ap.add_argument("--target", required=True)
    ap.add_argument("--rig", default="unknown")
    ap.add_argument("--device", default="")
    ap.add_argument("--category", default="iem")
    args = ap.parse_args()
    out = analyze(args.fr, args.target, args.rig, args.device, args.category)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
