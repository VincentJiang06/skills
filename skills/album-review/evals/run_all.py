#!/usr/bin/env python3
"""Re-runnable eval harness for album-review (stdlib only).

Imports the MECHANISM from scripts/check_review.py + scripts/validate_backing.py
(never a reimplemented copy) and runs every fixture case. Prints one
`PASS <case_id>` / `FAIL <case_id>` line per case and exits non-zero if any fail.

Usage: python3 evals/run_all.py
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIX = os.path.join(HERE, "fixtures")
SCH = os.path.join(ROOT, "schemas")

sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, HERE)
from check_review import cjk_count, check_review  # noqa: E402
from validate_backing import check as backing_check  # noqa: E402


def fx(name):
    return os.path.join(FIX, name)


def review_errs(md, klass="standard", backing=None):
    """Run the validator mechanism over a fixture review, return its error list."""
    text = open(fx(md), encoding="utf-8").read()
    return check_review(text, klass=klass, min_n=10000, max_n=15000,
                        backing_path=(fx(backing) if backing else ""))


def backing_errs(name):
    schema = json.load(open(os.path.join(SCH, "backing.schema.json")))
    doc = json.load(open(fx(name)))
    return backing_check(doc, schema)


def cli_fails_gracefully(script, *paths):
    """Run a validator CLI as a subprocess and assert it fails GRACEFULLY on an
    operational error path: nonzero exit (ship-blocking contract holds), a single
    clean `ERROR:` line on stderr, and NO raw Python traceback. Returns True iff all
    three hold."""
    r = subprocess.run(
        [sys.executable, os.path.join(ROOT, "scripts", script), *paths],
        capture_output=True, text=True,
    )
    return (r.returncode != 0
            and "ERROR:" in r.stderr
            and "Traceback" not in r.stderr)


# Each case: (id, predicate) where predicate() -> True means PASS.
def cases():
    c = []

    # --- length window (edges 1, 2, 9) ---
    c.append(("good_pop_12k",
              lambda: review_errs("good_pop_12k.md") == []))
    c.append(("under_floor_9999",
              lambda: any("length" in e and "below" in e for e in review_errs("under_floor_9999.md"))))
    c.append(("over_ceiling_15001",
              lambda: any("length" in e and "above" in e for e in review_errs("over_ceiling_15001.md"))))
    c.append(("cjk_padding_fails_floor",
              lambda: cjk_count(open(fx("cjk_padding_fails_floor.md"), encoding="utf-8").read()) == 500
              and any("length" in e and "below" in e for e in review_errs("cjk_padding_fails_floor.md"))))

    # --- section linter (edge 7-standard) ---
    c.append(("missing_section",
              lambda: any("missing section" in e for e in review_errs("missing_section.md"))))

    # --- classical work-vs-performance + reference recording (edge 5) ---
    c.append(("classical_workperf",
              lambda: review_errs("classical_workperf.md", klass="classical") == []))
    # genre mismatch (edge 7): a pop LP graded under the classical lens MUST fail
    # the work/performance/参考录音 requirement — the classical template is not satisfied
    # by a pop body, and (symmetrically) a symphony must not be graded as pop.
    c.append(("genre_mismatch_pop_under_classical",
              lambda: review_errs("genre_mismatch_pop.md", klass="classical") != []
              and review_errs("genre_mismatch_pop.md", klass="standard") == []))

    # --- non-standard release form (edge 8) ---
    c.append(("release_form_box",
              lambda: review_errs("release_form_box.md") == []))

    # --- obscure honest degradation (edge 6) ---
    c.append(("obscure_degraded",
              lambda: review_errs("obscure_degraded.md") == []
              and ("资料不足" in open(fx("obscure_degraded.md"), encoding="utf-8").read()
                   or "公开资料有限" in open(fx("obscure_degraded.md"), encoding="utf-8").read())))

    # --- backing traceability gate (edges 3, 4) ---
    c.append(("backing_good_passes",
              lambda: backing_errs("backing_good.json") == []))
    c.append(("untraced_fact",
              lambda: any("no source_id" in e for e in backing_errs("backing_untraced.json"))))
    c.append(("fabricated_evidence_ref",
              lambda: any("not in evidence" in e for e in backing_errs("backing_fabricated.json"))))
    c.append(("classical_backing_passes",
              lambda: backing_errs("backing_classical.json") == []))
    c.append(("obscure_backing_passes",
              lambda: backing_errs("backing_obscure.json") == []))

    # --- review + backing wired together (good full run) ---
    c.append(("review_with_backing_good",
              lambda: review_errs("good_pop_12k.md", backing="backing_good.json") == []))
    # a good review but with an untraced backing must FAIL via the --backing gate
    c.append(("review_with_untraced_backing_fails",
              lambda: any("backing:" in e for e in review_errs("good_pop_12k.md", backing="backing_untraced.json"))))

    # --- adjacent-skill routing (edge 10): the validator/skill produces NO review
    #     for adjacent inputs. We assert the CLI-level routing guard: an adjacent
    #     prompt fixture is marked out-of-scope and yields zero review files. ---
    c.append(("routing_adjacent",
              lambda: routing_adjacent_ok()))

    # --- error-path hygiene: operational failures must be graceful, not raw
    #     tracebacks. Both validators catch FileNotFoundError + json.JSONDecodeError,
    #     print one `ERROR:` line to stderr, and exit nonzero (contract preserved). ---
    # (a) missing file: a nonexistent path IS the fixture (no file to create). Both
    #     CLIs — review (.md) and backing (.json) — must degrade gracefully.
    c.append(("missing_file_graceful",
              lambda: cli_fails_gracefully("check_review.py", fx("__nonexistent__.md"))
              and cli_fails_gracefully("validate_backing.py", fx("__nonexistent__.json"))))
    # (b) malformed (non-JSON) backing: fixture malformed_backing.json. Caught both as
    #     a bare backing arg and when wired through check_review's --backing gate.
    c.append(("malformed_json_graceful",
              lambda: cli_fails_gracefully("validate_backing.py", fx("malformed_backing.json"))
              and cli_fails_gracefully("check_review.py", fx("good_pop_12k.md"),
                                       "--backing", fx("malformed_backing.json"))))

    return c


def routing_adjacent_ok():
    """Edge 10 — behavioral routing. The skill must NOT produce a 乐评 for adjacent
    inputs (耳机/DAC -> hifi-review; lyric translation; buy recs). Encoded as
    a labeled fixture: each adjacent prompt carries expected route != album-review,
    and the validator's route classifier agrees."""
    from check_review import classify_route
    cases = json.load(open(fx("routing_cases.json")))
    for entry in cases:
        if classify_route(entry["prompt"]) != entry["expected_route"]:
            return False
    # and at least one positive control routes TO album-review
    return any(classify_route(e["prompt"]) == "album-review"
               for e in cases if e["expected_route"] == "album-review")


def main():
    failed = 0
    total = 0
    for cid, pred in cases():
        total += 1
        try:
            ok = bool(pred())
        except Exception as e:  # a crash is a failure, not a pass
            ok = False
            print(f"FAIL {cid}  ({type(e).__name__}: {e})")
            failed += 1
            continue
        if ok:
            print(f"PASS {cid}")
        else:
            print(f"FAIL {cid}")
            failed += 1
    print(f"\nRESULT: {'GREEN' if failed == 0 else 'RED'}  ({total - failed}/{total} passed)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
