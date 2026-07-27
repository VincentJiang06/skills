# First-run setup — once per destination lifetime

Read this **only** if `~/.workspace-backup/config.json` does not exist, or a
configured destination has no `.workspace-backup-dest.json` marker. Every other
run for the life of the skill skips this file entirely.

## 1. Write the config

Do not ask the user to compose one from nothing — start from the measured
defaults for this machine and show them for confirmation:

* **state dir** `~/.workspace-backup`
* **source roots** `~/playground`, `~/experiment`, `~/WorkBuddy`
* **destinations**
  * `local-fixed` → `~/WorkspaceBackup`, `portable: false`, `removable: false`,
    `same_physical_disk_as_source: true`
  * `ext-5tb` → `/Volumes/5TBofData/WorkspaceBackup`, `portable: true`,
    `removable: true`, `may_be_offline: true`
* **exclusions** `node_modules/`, `.next/`, `dist/`, `build/`, `target/`,
  `.DS_Store`, `fsmonitor--daemon.ipc` — the last one is a UNIX SOCKET git's
  fsmonitor daemon leaves inside `.git/`. openrsync cannot recreate a socket
  and fails the whole unit with `mkstempsock: Invalid argument` (MEASURED
  2026-07-27: 4 of them across this workspace killed 2 units outright). A
  socket carries no data worth copying.
* **secret patterns** `.env`, `.env.*`, `*.pem`, `*.key`
* **delete_at_destination** `false`
* **revalidate_after_days** `0` — 0 means a Class A unit's content is
  re-verified on every run. Raise it if the steady-state cost becomes the reason
  the user stops running the backup; the number is recorded in every plan.

Note the exclusion list has teeth beyond the copy: a new top-level project whose
own name matches one of those patterns (`build/`, `target/`) is reported as an
UNCOVERED entry **naming the pattern that hid it**, so adding a pattern can
never silently drop a real project out of the backup.

`/Volumes/backkkup` is **not** offered as a destination and never will be — it
is the Time Machine store. `/Volumes/2TBofData` is not configured either: it
shares APFS container disk7 with backkkup, so a copy there is not an independent
copy.

## 2. Fill `known_units`

Run `inventory.py` once with `known_units: []`. Everything under each root comes
back as **UNCOVERED**. Show the list with each entry's measured properties —
size, is-it-a-repo, does-it-have-a-remote — and let the user say which belong.
Write the answers into `known_units`.

This is the one moment where the list is composed. After that, a new top-level
directory shows up as a single UNCOVERED line and is added by an explicit
answer, never automatically.

Two routing questions worth asking here, because they are open disputes rather
than settled facts, and whichever way they go the report must state which
behaviour is in effect:

* **musicplayer (17 GB, git repo with no remote, 91 dirty files).** Class A by
  the no-remote rule, and half the corpus. Three legal behaviours: both
  destinations / external only / excluded pending opt-in. The recommended
  default is **external only** — the local fixed directory is on the same
  physical disk as the source, so a 17 GB local copy buys protection against
  accidental deletion but nothing against the disk failure that is the reason to
  copy 17 GB in the first place.
* **The local fixed directory itself.** It is what the user asked for
  (本机固定目录+外置硬盘) and it defends against the most FREQUENT loss modes —
  an accidental delete, a bad refactor, a mistaken `rm -rf`. It does **not**
  defend against disk failure, and every run report says so on its line.

## 3. Clear the destination, THEN write the marker

Setup never guesses a destination. For each one:

1. `guard_destination.py --config … --dest-id …` must clear the path.
   * `REFUSED_TIME_MACHINE` / `REFUSED_INSIDE_SOURCE` → stop. There is no flag
     that overrides these, including in setup.
   * `OFFLINE` → the drive is not plugged in. Nothing to initialise; come back
     when it is. Do not create the directory.
2. Show the user the **exact resolved path** and get a yes in chat.
3. `init_destination.py --config … --dest-id … --confirm`

That writes exactly two things: the backup root directory and its marker. It
never copies data and never touches an existing marker.

## 4. The portable-destination secrets acknowledgement

Before the first copy to any destination marked `portable: true`, the run is
blocked with `PORTABLE_SECRETS_UNACKNOWLEDGED`.

Show the **actual count and the actual file list** — not a generic "contains
secrets?" prompt, and **not the number below**: read it out of `plan.json`'s
`secret_files`, which counts only the files routed to THAT destination.

For scale only, re-measured 2026-07-27 over the three configured roots with the
skill's own exclusion semantics: **34** files match `.env` / `.env.*` / `*.pem`
/ `*.key` (an earlier edition of this file said 20, which was wrong by 70% in
the direction that understates the user's exposure at a consent gate).

They are **preserved**, not excluded. Losing a working `.env` is a real and
common loss, and a restored workspace that does not run is a failed restore;
this is a local drive, not a public bucket. What changes is that they are
accounted for: every run report lists each one with its destination path, so the
user always knows what sensitive material now lives in a second, more losable
place.

Record it once:

```
init_destination.py --config … --dest-id ext-5tb --ack-secrets --confirm
```

## 5. Say what run 1 will cost — and what it will not

The first run is a full copy. No absolute duration may be promised: the external
enclosure's throughput has never been measured on this machine. Run 1 measures
bytes-per-second per unit into the ledger, and later runs quote that measurement
**with its date**.

## Re-entering this path later

* **Adding a destination** → run this for that destination only.
* **A reformatted drive** whose marker vanished is **not** silently
  re-initialised. It routes to a separate confirmation, because a reformat means
  every memo entry for that destination is void and the next run is a full copy.
  Say that in advance rather than performing it silently.
* **A drive that names another machine** (`FOREIGN_MACHINE`) needs
  `--adopt-foreign-marker` plus an explicit yes. Two machines writing one
  destination root corrupts both memos.
