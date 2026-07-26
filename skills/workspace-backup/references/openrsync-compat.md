# openrsync compatibility — MEASURED, not inherited

**Measured on:** 2026-07-27, macOS darwin 25.5.0, Apple Silicon.
**Re-measured 2026-07-27 (repair):** the first edition of this file concluded
that openrsync cannot preserve extended attributes and therefore routed
"fidelity" units to `/usr/bin/ditto`. **That conclusion was wrong.** `-E` is
accepted by this binary and preserves both extended attributes and resource
forks, at exit 0, together with the full flag set `copy.py` emits — exclusions
included. The ditto branch has been removed; see "Extended attributes" below.

**Banner it was measured against:**

```
$ /usr/bin/rsync --version
openrsync: protocol version 29
rsync version 2.6.9 compatible
```

**`/opt/homebrew/bin/rsync` is ABSENT on this machine.** Every row below is the
recorded exit code of an actual invocation on this Mac, not general knowledge
about rsync. This file is the human-readable record of that measurement; the
executed source of truth is `copy.py`'s `ALLOWED_FLAGS_OPENRSYNC` /
`DENIED_FLAGS` constants, and an eval (`L0-06`) asserts the two agree. **Do not
edit this table to change behaviour** — it documents a measurement, and changing
the measurement means re-running it and re-dating this header.

## Flag matrix

| flag | verdict | note |
|---|---|---|
| `-a` | ACCEPTED | exit 0; implies recursion. This is the workhorse. |
| `-E` | ACCEPTED | exit 0 — **and it preserves extended attributes AND the resource fork.** Measured: `xattr -w com.test.mark VAL s/sub/f.txt` + a 16-byte `..namedfork/rsrc`, then `rsync -a -E --itemize-changes --stats --numeric-ids --delete --exclude-from=ex.txt s/ d/` → exit 0, empty stderr, `xattr -l d/sub/f.txt` lists `com.apple.ResourceFork` and `com.test.mark`, the resource fork is 16 bytes, and `node_modules/` is still excluded. **Two traps, both measured:** on **GNU** rsync `-E` means `--executability`, not xattrs (there the flag is `-X`), so the flag is chosen per detected copier and then PROBED at runtime; and `-aE` in the FILE→FILE form (`rsync -aE s/f.txt d/f.txt`) preserves nothing — only the directory form works, which is the form `copy.py` builds. |
| `--extended-attributes` | ACCEPTED | exit 0 on this build (the long form of `-E`). `copy.py` emits the short form, which is what the eval executes. |
| `-H` | ACCEPTED | exit 0 |
| `--hard-links` | ACCEPTED | exit 0 |
| `--numeric-ids` | ACCEPTED | exit 0 |
| `--delete` | ACCEPTED | exit 0 **only together with `-a`/`-r`/`--dirs`**. Alone it exits 1: `rsync: --delete does not work without --recursive or --dirs`. |
| `--exclude` | ACCEPTED | exit 0 |
| `--exclude-from` | ACCEPTED | exit 0; both `--exclude-from=FILE` and the two-token form. Directory patterns (`node_modules/`, `.git/`) verified to actually exclude. |
| `--dry-run` | ACCEPTED | exit 0 |
| `-n` | ACCEPTED | exit 0 |
| `--stats` | ACCEPTED | exit 0 |
| `--itemize-changes` | ACCEPTED | exit 0; `>f+++++++ path` marks a transferred file, `cd+++++++ path/` a created directory. This is how `copy.py` counts bytes moved — a byte count taken from itemize does not depend on parsing a human-readable `--stats` suffix. |
| `--out-format` | ACCEPTED | exit 0 |
| `--link-dest` | ACCEPTED | exit 0 (the v2 generational-snapshot candidate is technically available) |
| `--checksum` | ACCEPTED | exit 0 |
| `--partial` | ACCEPTED | exit 0 |
| `--partial-dir` | ACCEPTED | exit 0 |
| `-P` | ACCEPTED | exit 0 |
| `--times` / `-t` / `--perms` / `--links` / `-l` | ACCEPTED | exit 0 |
| `--devices` / `--specials` / `--group` / `--owner` / `--no-owner` | ACCEPTED | exit 0 |
| `--safe-links` / `--one-file-system` / `-x` | ACCEPTED | exit 0 |
| `-v` / `-q` | ACCEPTED | exit 0 |
| `-A` | REJECTED | exit 1 — `rsync: invalid option -- A` |
| `-X` | REJECTED | exit 1 — `rsync: invalid option -- X` |
| `--xattrs` | REJECTED | exit 1 — `rsync: unrecognized option '--xattrs'` |
| `--acls` | REJECTED | exit 1 — `rsync: unrecognized option '--acls'` |
| `-N` | REJECTED | exit 1 — `rsync: invalid option -- N` |
| `--info=` | REJECTED | exit 1 for every value tried, including `--info=progress2` and `--info=stats2` — `rsync: unrecognized option`. Denied as a PREFIX so no later refactor can reintroduce `progress2` via a `stats2` that happened to look harmless. |

**Consequence.** The invocation every macOS backup tutorial gives —
`rsync -aHAX --delete --info=progress2 --exclude=node_modules` — **exits 1 on
this machine.** That is why this skill detects the copier from `rsync --version`
at runtime and emits only measured-accepted flags, instead of assuming GNU rsync
and instead of requiring `brew install rsync` (a backup tool that needs the
network to be installed cannot run in the situation it exists for).

## Extended attributes: `-a` drops them silently, `-a -E` keeps them

The dangerous line is the first one, because it exits **0**.

```
$ xattr -w com.test.mark VAL s/sub/f.txt
$ printf 'RESOURCEFORKDATA' > s/sub/f.txt/..namedfork/rsrc
$ /usr/bin/rsync -a  s/ d1/  ; echo $?     # 0
$ xattr -l d1/sub/f.txt                     # (empty)  <- xattrs and fork GONE
$ /usr/bin/rsync -aE s/ d2/  ; echo $?     # 0
$ xattr -l d2/sub/f.txt                     # com.apple.ResourceFork, com.test.mark
$ wc -c < d2/sub/f.txt/..namedfork/rsrc     # 16
```

A mirror made with plain `rsync -a` on this machine is **not** byte-for-byte
identical: Finder tags, quarantine flags and any xattr-borne metadata are gone,
silently, at exit 0. Negligible for source code; not negligible for design
assets.

So:

* `copy.py` emits the xattr flag for **every** unit — `-E` on the openrsync
  branch, `-X` on the GNU branch — after PROBING it against the real binary in
  that run. There is exactly one copy path, so the exclusion list applies
  everywhere and the report's exclusion claims are true for every unit.
* if the probe fails, the run continues WITHOUT the flag, journals
  `xattr_flag_unsupported`, and the report carries an `XATTRS_NOT_PRESERVED`
  anomaly. It never claims fidelity it did not achieve.
* `verify.py` compares the extended-attribute NAMES of up to 8 sampled files per
  unit at L3/L4. A data-fork SHA-256 is identical for a file that arrived with
  its metadata and one that arrived stripped, so without this check no verify
  level could see a fidelity regression at all.
* `config.json`'s `fidelity_units` key is **obsolete** and ignored: every unit
  now gets the same fidelity. It is accepted for backward compatibility.

### Why the ditto branch was removed

The first edition of this file concluded that xattr fidelity required
`/usr/bin/ditto`, and units listed in `fidelity_units` were routed there.
`ditto` has **no exclude mechanism**, so those units — the ones the user flagged
as most valuable — were copied WHOLE, `node_modules` included, while the space
verdict, the journalled byte count and the report's EXCLUSIONS line all
continued to assert that the exclusions applied. Measured cost of the branch:
a 9,000× undercount at the space gate in a 9 MB fixture. `ditto` also exits 1
("Permission denied") on any file carrying a `deny delete` ACL, where
`rsync -aE` exits 0 — a unit that could never be copied and therefore never be
verified. Both problems dissolve with `-E`.

## Behaviour when this rots

A macOS update can change the binary, or the user can `brew install rsync`.
`copy.py` re-detects on every run:

* banner contains `openrsync` → openrsync branch (the table above);
* `rsync version 3.x` / `protocol version 3x` → GNU branch (`-H -A -X` become
  legal there, `--info=` stays denied because nothing in this skill needs it);
* anything else → **refuse and say so**. The skill does not guess a flag set;
  an unrecognised banner is a finding, not a default.

Re-measure and re-date this header after any such change; do not patch it from
memory.
