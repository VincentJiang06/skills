#!/usr/bin/env python3
"""
Audit a skill folder against the subset of skill-creator rules we can validate
without external dependencies.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ALLOWED_FRONTMATTER_KEYS = {"name", "description", "license", "allowed-tools", "metadata"}
DISALLOWED_FILENAMES = {"README.md", "CHANGELOG.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md"}


def parse_frontmatter(skill_md: str) -> tuple[dict[str, object], list[str]]:
    problems: list[str] = []
    if not skill_md.startswith("---\n"):
        return {}, ["SKILL.md does not start with YAML frontmatter."]

    match = re.match(r"^---\n(.*?)\n---\n", skill_md, re.DOTALL)
    if not match:
        return {}, ["SKILL.md frontmatter is malformed."]

    block = match.group(1).splitlines()
    data: dict[str, object] = {}
    current_key: str | None = None
    for line in block:
        if re.match(r"^[A-Za-z0-9_-]+:\s*.*$", line):
            key, raw = line.split(":", 1)
            key = key.strip()
            raw = raw.strip()
            if raw == "|":
                data[key] = ""
                current_key = key
            elif raw:
                data[key] = raw
                current_key = None
            else:
                data[key] = []
                current_key = key
        elif re.match(r"^\s+-\s+", line) and current_key:
            if not isinstance(data[current_key], list):
                data[current_key] = []
            data[current_key].append(re.sub(r"^\s+-\s+", "", line))
        elif line.startswith("  ") and current_key and isinstance(data.get(current_key), str):
            data[current_key] += (("\n" if data[current_key] else "") + line.strip())
        elif line.strip():
            problems.append(f"Unparsed frontmatter line: {line}")
    return data, problems


def audit(skill_dir: Path) -> dict[str, object]:
    problems: list[str] = []
    warnings: list[str] = []
    checks: list[dict[str, object]] = []

    def record(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "passed": passed, "detail": detail})
        if not passed:
            problems.append(f"{name}: {detail}")

    skill_md_path = skill_dir / "SKILL.md"
    record("skill_md_exists", skill_md_path.exists(), "SKILL.md present" if skill_md_path.exists() else "SKILL.md missing")
    if not skill_md_path.exists():
        return {"passed": False, "checks": checks, "problems": problems, "warnings": warnings}

    skill_md = skill_md_path.read_text()
    frontmatter, fm_problems = parse_frontmatter(skill_md)
    record("frontmatter_parse", not fm_problems, "frontmatter parsed" if not fm_problems else "; ".join(fm_problems))

    if frontmatter:
        unexpected = sorted(set(frontmatter.keys()) - ALLOWED_FRONTMATTER_KEYS)
        record(
            "frontmatter_keys",
            not unexpected,
            "only allowed keys used" if not unexpected else f"unexpected keys: {unexpected}",
        )

        name = str(frontmatter.get("name", "")).strip()
        record(
            "name_present",
            bool(name),
            f"name={name!r}" if name else "name missing",
        )
        if name:
            record(
                "name_format",
                bool(re.match(r"^[a-z0-9-]+$", name)) and "--" not in name and not name.startswith("-") and not name.endswith("-"),
                "hyphen-case valid" if re.match(r"^[a-z0-9-]+$", name) else "name must be hyphen-case",
            )
            record(
                "name_length",
                len(name) <= 64,
                f"length={len(name)}",
            )

        description = str(frontmatter.get("description", "")).strip()
        record(
            "description_present",
            bool(description),
            "description present" if description else "description missing",
        )
        if description:
            record(
                "description_length",
                len(description) <= 1024,
                f"length={len(description)}",
            )

    linked_paths = []
    for target in re.findall(r"\(([^)]+)\)", skill_md):
        if target.startswith("http://") or target.startswith("https://") or target.startswith("../"):
            continue
        linked_paths.append(target)
    missing_links = [target for target in linked_paths if not (skill_dir / target).exists()]
    record(
        "linked_references_exist",
        not missing_links,
        "all linked relative files exist" if not missing_links else f"missing: {missing_links}",
    )

    agents_yaml = skill_dir / "agents" / "openai.yaml"
    record("agents_yaml_exists", agents_yaml.exists(), "agents/openai.yaml present" if agents_yaml.exists() else "agents/openai.yaml missing")
    if agents_yaml.exists():
        yaml_text = agents_yaml.read_text()
        for field in ["display_name", "short_description", "default_prompt"]:
            match = re.search(rf"{field}:\s*\"([^\"]+)\"", yaml_text)
            record(
                f"agents_yaml_{field}",
                bool(match),
                f"{field} present" if match else f"{field} missing",
            )
            if field == "default_prompt" and match:
                skill_name = str(frontmatter.get("name", "")).strip()
                record(
                    "agents_yaml_default_prompt_mentions_skill",
                    f"${skill_name}" in match.group(1),
                    "default prompt mentions skill" if f"${skill_name}" in match.group(1) else "default prompt missing $skill-name",
                )

    disallowed = [str(path.relative_to(skill_dir)) for path in skill_dir.rglob("*") if path.is_file() and path.name in DISALLOWED_FILENAMES]
    record(
        "no_auxiliary_docs_inside_skill",
        not disallowed,
        "no extra docs inside skill folder" if not disallowed else f"found disallowed docs: {disallowed}",
    )

    refs_dir = skill_dir / "references"
    if not refs_dir.exists():
        warnings.append("No references/ directory found. This is allowed, but this skill appears to rely on references.")

    scripts_dir = skill_dir / "scripts"
    if not scripts_dir.exists():
        warnings.append("No scripts/ directory inside the skill folder. This is optional.")

    return {
        "passed": not problems,
        "checks": checks,
        "problems": problems,
        "warnings": warnings,
    }


def write_markdown(report: dict[str, object], out_path: Path) -> None:
    lines = ["# Skill Structure Audit", ""]
    lines.append(f"- Passed: `{report['passed']}`")
    lines.append(f"- Problems: {len(report['problems'])}")
    lines.append(f"- Warnings: {len(report['warnings'])}")
    lines.append("")
    lines.append("## Checks")
    lines.append("")
    for check in report["checks"]:
        status = "PASS" if check["passed"] else "FAIL"
        lines.append(f"- `{status}` {check['name']}: {check['detail']}")
    if report["warnings"]:
        lines.append("")
        lines.append("## Warnings")
        lines.append("")
        for warning in report["warnings"]:
            lines.append(f"- {warning}")
    out_path.write_text("\n".join(lines) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill", default="humanizer-academic")
    parser.add_argument("--json-out", default="eval/results/skill-structure-audit.json")
    parser.add_argument("--md-out", default="eval/results/skill-structure-audit.md")
    args = parser.parse_args()

    root = Path.cwd()
    report = audit(root / args.skill)
    json_path = root / args.json_out
    md_path = root / args.md_out
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    write_markdown(report, md_path)
    print(f"Wrote {args.json_out}")
    print(f"Wrote {args.md_out}")
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
