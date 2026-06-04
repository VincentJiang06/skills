# Skyline and Media Workflow

Use this file for Skyline, Canvas, Camera preview, or media mock tasks.

## Skyline Snapshot

Skyline/native pages may allow route/pageData reads while element enumeration hangs.

Protocol:

1. Run `smoke-existing` without `--probe-elements`.
2. Treat route, pageStack, systemInfo, and pageData keys as valid partial evidence.
3. Only when uid interaction is required, run one bounded `snapshot` or `--probe-elements`.
4. If the CLI returns `SNAPSHOT_ELEMENT_ENUMERATION_TIMEOUT`, stop uid actions and report snapshot as the blocker.

## Canvas

Canvas work is experimental and evidence-first.

Use:

```bash
vince-mp media --connect '<json>' --action install --json
vince-mp media --connect '<json>' --action list --target canvas --json
vince-mp media --connect '<json>' --action canvas-export --canvas-id main --json
vince-mp media --connect '<json>' --action canvas-sample --canvas-id main --json
```

Prefer API event evidence, snapshot temp path, and pixel checksum. If Skyline/runtime lacks `canvasToTempFilePath` or `canvasGetImageData`, report unsupported/partial evidence instead of retrying blindly.

## Camera

Default Camera probing is metadata-only:

```bash
vince-mp media --connect '<json>' --action camera-probe --json
```

Camera mock is an explicit side effect. Require a fixture image or mock config:

```bash
vince-mp media --connect '<json>' --action camera-mock --fixture-image fixtures/camera.png --json
```

Restore after mock work:

```bash
vince-mp media --connect '<json>' --action restore --json
```

Do not collect real photos or frames unless the user explicitly asks and the report states that capture was enabled.
