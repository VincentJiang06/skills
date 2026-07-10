#!/usr/bin/env node
// automator-escape-hatch.mjs — the ENTIRE Door-B automator path, hardcoded, no wrapper CLI.
// Use ONLY to bootstrap a standalone/CI automation script outside the agent loop. For interactive
// work use Door A (`wechatide`) — it already reuses the IDE connection and covers real-device.
// See references/two-transports.md.
//
// Prereq: DevTools → 设置 → 安全设置 → 服务端口 (+ HTTP 调试 / 自动化测试) enabled, and open the port:
//   /Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project <projectPath> --auto-port 9420
// Install the (frozen 0.12.1) SDK in your script project:  npm i miniprogram-automator
//
//   node scripts/automator-escape-hatch.mjs [ws://127.0.0.1:9420]

const wsEndpoint = process.argv[2] || 'ws://127.0.0.1:9420'

let automator
try {
  automator = (await import('miniprogram-automator')).default
} catch {
  console.error('miniprogram-automator not installed. This is an OPTIONAL escape hatch — run `npm i miniprogram-automator` in your script project first. Normal work should use Door A (wechatide).')
  process.exit(2)
}

const mp = await automator.connect({ wsEndpoint })   // attach to the already-running DevTools
try {
  const page = await mp.currentPage()
  console.log(JSON.stringify({ route: page.path, query: page.query, data: await page.data() }, null, 2))

  // Example interaction (selector-based, same idiom as Door A):
  // const btn = await page.$('.submit-btn'); if (btn) await btn.tap()
  // await page.waitFor(300); console.log(await page.data())

  // Real device instead of simulator: `await mp.remote()` prints a QR; after scan the same API drives it.
  // (screenshot() stays simulator-only — capture on-device via the app's canvasToTempFilePath.)
} finally {
  await mp.disconnect()   // leaves DevTools open; mp.close() would also close the project window
}
