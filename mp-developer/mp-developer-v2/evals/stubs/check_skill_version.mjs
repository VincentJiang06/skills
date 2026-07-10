// RED stub — always claims in-sync so the version cases fail before the real check_skill_version.mjs.
export function reconcile() { return { status: 'in-sync', vendored: '0.2.5', ideVersion: '0.2.5', ideDir: null, message: '__stub', exit: 0 } }
// F1 regression: a wrong stub that ignores the override (returns the /Applications fallback) and
// always reconciles in-sync — so C20 fails in red before the real exclusive-override fix.
export function resolveCandidates() { return ['/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/miniprogram-dev-skill'] }
export function reconcileFromDisk() { return { status: 'in-sync', vendored: '0.2.5', ideVersion: '0.2.5', ideDir: '/Applications', message: '__stub', exit: 0 } }
