#!/usr/bin/env python3
"""Render a vetted HiFi review profile with the installed sound-dashboard CLI."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, help='Explicit dashboard profile JSON (five bands and five steps)')
    parser.add_argument('--evaluation', help='Existing evaluation JSON to run through the skill structure gate first')
    parser.add_argument('--jpeg', default='sound-dashboard.jpg')
    parser.add_argument('--output', help='Save bilingual intro and URL to this file')
    parser.add_argument('--format', choices=['json', 'markdown', 'url'], default='json')
    parser.add_argument('--no-image', action='store_true')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    try:
        profile = json.loads(Path(args.input).read_text(encoding='utf-8'))
        if args.evaluation:
            evaluation = json.loads(Path(args.evaluation).read_text(encoding='utf-8'))
            if evaluation.get('device_class') != 'transducer':
                raise ValueError('声音仪表盘只用于耳机/IEM/TWS，不把 DAC/amp 评价转换成耳机听感')
            if evaluation.get('device') != profile.get('name'):
                raise ValueError('评价的 device 必须与仪表盘 name 一致，避免把另一型号的结论套用到此图')
            validator = Path(__file__).with_name('validate_output.py')
            if not validator.is_file():
                raise ValueError('请从 hifi-review/scripts/sound_dashboard.py 调用，缺少既有评价验证器')
            result = subprocess.run([sys.executable, str(validator), args.evaluation], capture_output=True, text=True)
            if result.returncode:
                raise ValueError('评价结构校验失败：\n' + result.stdout + result.stderr)
        cli = os.environ.get('SOUND_DASHBOARD_CLI') or shutil.which('sound-dashboard')
        if not cli:
            raise ValueError('未安装 sound-dashboard；在 NFsounddashboard 项目执行 npm install && npm run build && npm link')
        cmd = [cli, '--input', args.input, '--format', args.format]
        cmd += ['--no-image'] if args.no_image else ['--jpeg', args.jpeg]
        if args.output:
            cmd += ['--output', args.output]
        if args.force:
            cmd.append('--force')
        return subprocess.run(cmd).returncode
    except (OSError, ValueError) as exc:
        print(f'sound-dashboard: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
