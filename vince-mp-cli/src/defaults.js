import fs from "node:fs";

export function defaultWechatCliPath(platform = process.platform) {
  if (platform === "darwin") {
    return "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
  }
  if (platform === "win32") {
    return "C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat";
  }

  const linuxCandidates = [
    "/opt/apps/io.github.msojocs.wechat-devtools-linux/files/bin/bin/wechat-devtools-cli",
    "/usr/share/wechat-devtools/bin/cli",
    "/usr/local/bin/wechat-devtools-cli",
  ];
  return linuxCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
