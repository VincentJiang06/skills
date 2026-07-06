# Eval Exchange Spec

日期: 2026-07-02
状态: local draft
范围: 本机 skill 开发时的轻量文件交换规范。它不是 A2A 协议，不做自动 RPC、消息总线、agent 能力协商或跨机器兼容。

## 1. 目标

Claude 或其他 skill 创建 agent 继续作为 skill 生成和修改的主力；eval 必须由独立 agent 执行。人只负责把一次性 prompt 手动复制给对应 agent。

两个角色名称固定如下：

- `skill_tester`: 创建、修改或运行 skill 的一方，也就是被评测对象的生产者。
- `eval_tester`: 独立评测的一方，只读取 session 和 `skill-tester/` 产物，写评测结果。

所有交接通过 `eval_exchange/sessions/<session_id>/` 文件夹完成。每个测试 session 独立建目录，按时间和标签区分，防止多轮交流记录混在一起。

## 2. 顶层结构

```text
eval_exchange/
  SPEC.md
  sessions/
    20260702-153000+0800-humanizer-v1/
      SESSION.json
      prompts/
        skill-tester.md
        eval-tester-codex.md
        eval-tester-generic.md
      inputs/
        cases/
        references/
        hidden/
      skill-tester/
        produced/
        manifest.json
        notes.md
      eval-tester-runs/
        codex-20260702-154200+0800/
          status.json
          transcript.md
          score.json
          findings.json
          artifact-manifest.json
          artifacts/
      aggregate/
        summary.md
        score.json
        blocking-findings.json
      claude-readme.md
```

`SPEC.md` 是固定规范；`sessions/<session_id>/SESSION.json` 是某一次测试的事实源。

## 3. Session 命名

`session_id` 必须包含时间和可读标签：

```text
YYYYMMDD-HHMMSS+TZ-<skill-or-topic>-<short-label>
```

例子：

```text
20260702-153000+0800-humanizer-v1
20260702-161530+0800-skill-engineer-trigger-eval
```

规则：

- 不使用 `latest` 作为真实 session id。
- agent 写入时必须从 prompt 或 `SESSION.json` 读取精确 `session_id`。
- 每个输出 JSON 都必须带 `session_id`。
- eval tester run 也必须带时间：`<agent>-YYYYMMDD-HHMMSS+TZ`。
- 如果同一 session 下多次评测，新增 eval tester run 目录，不覆盖旧目录。

## 4. 不变量

1. Claude 或创建 skill 的 agent 是 `skill_tester`，不是最终评测者。
2. Codex / other agents 是 `eval_tester`，不修改 target skill 或 `skill-tester/` 输出，除非 session 明确授权。
3. 人只手动复制一次 prompt；prompt 只指向 session 目录，不内嵌答案。
4. eval tester 必须动态读取 `SESSION.json`、`skill-tester/manifest.json` 和声明的输入/输出。
5. 结果和过程必须落盘：status、transcript、score、findings、artifact manifest。
6. 缺文件、路径不一致、无法复现、无法判分时 fail closed，状态写 `blocked` 或 `fail`。
7. Claude 下一轮修改前必须读 `claude-readme.md` 和相关 eval tester run。

## 5. `SESSION.json`

最小形状：

```json
{
  "schema_version": "eval-exchange/v0",
  "session_id": "20260702-153000+0800-humanizer-v1",
  "created_at": "2026-07-02T15:30:00+08:00",
  "timezone": "Asia/Shanghai",
  "label": "humanizer v1 external eval",
  "session_root": "/Users/vince/playground/skill-developer/eval_exchange/sessions/20260702-153000+0800-humanizer-v1",
  "target": {
    "skill_dir": "/Users/vince/playground/skill-developer/skills/humanizer-academic",
    "skill_name": "humanizer-academic",
    "candidate_label": "claude-skill-tester-pass-1"
  },
  "roles": {
    "skill_tester": "claude",
    "eval_testers": ["codex"],
    "human_action": "manual_copy_paste_prompt_once"
  },
  "skill_tester_contract": {
    "produced_dir": "skill-tester/produced",
    "manifest_path": "skill-tester/manifest.json",
    "may_modify_target_skill": true,
    "must_not_write_eval_tester_runs": true
  },
  "eval_tester_contract": {
    "runs_dir": "eval-tester-runs",
    "must_read": [
      "SESSION.json",
      "skill-tester/manifest.json",
      "skill-tester/produced"
    ],
    "must_write": [
      "status.json",
      "transcript.md",
      "score.json",
      "findings.json",
      "artifact-manifest.json"
    ],
    "may_modify_target_skill": false,
    "fail_closed": true
  },
  "cases": [
    {
      "id": "case-001",
      "visibility": "skill_tester_visible",
      "input_path": "inputs/cases/case-001.md",
      "skill_tester_output_path": "skill-tester/produced/case-001/output.md",
      "expected_behavior": [
        "Preserve meaning",
        "Do not invent facts",
        "Abstain if the input is already acceptable"
      ],
      "scoring_dimensions": ["correctness", "instruction_following", "regression_safety"]
    }
  ],
  "open_probe_policy": {
    "enabled": true,
    "max_extra_cases_per_eval_tester": 5,
    "extra_cases_dir": "artifacts/extra-cases"
  },
  "scoring": {
    "pass_threshold": 0.85,
    "blocking_finding_severities": ["P0", "P1"],
    "dimensions": [
      { "name": "correctness", "weight": 0.4 },
      { "name": "instruction_following", "weight": 0.25 },
      { "name": "regression_safety", "weight": 0.2 },
      { "name": "evidence_quality", "weight": 0.15 }
    ]
  },
  "aggregation": {
    "method": "fail_if_any_blocking_finding",
    "aggregate_dir": "aggregate"
  },
  "next_reader": {
    "claude_entrypoint": "claude-readme.md",
    "required_claude_action": "read eval tester outputs before making the next skill change"
  }
}
```

## 6. Skill Tester 输出

Skill tester 至少写：

```text
skill-tester/
  produced/
    <case_id>/
      output.md
  manifest.json
  notes.md
```

`skill-tester/manifest.json`：

```json
{
  "session_id": "20260702-153000+0800-humanizer-v1",
  "skill_tester": "claude",
  "target_skill_dir": "/absolute/path/to/skill",
  "produced_cases": [
    {
      "case_id": "case-001",
      "output_path": "skill-tester/produced/case-001/output.md",
      "notes": "How the skill was applied or what changed."
    }
  ],
  "known_limitations": [],
  "ready_for_external_eval": true
}
```

Skill tester 不写 `eval-tester-runs/`，不预填 `score.json`，不替 eval tester 下结论。

## 7. Eval Tester 输出

每个 eval tester 创建一个新的 run 目录：

```text
eval-tester-runs/
  codex-20260702-154200+0800/
    status.json
    transcript.md
    score.json
    findings.json
    artifact-manifest.json
    artifacts/
```

`status.json`：

```json
{
  "session_id": "20260702-153000+0800-humanizer-v1",
  "agent_run_id": "codex-20260702-154200+0800",
  "agent": "codex",
  "status": "pass",
  "started_at": "2026-07-02T15:42:00+08:00",
  "finished_at": "2026-07-02T15:50:00+08:00",
  "session_path": "SESSION.json",
  "blocked_reason": null
}
```

`score.json`：

```json
{
  "session_id": "20260702-153000+0800-humanizer-v1",
  "agent_run_id": "codex-20260702-154200+0800",
  "overall_status": "pass",
  "overall_score": 0.91,
  "threshold": 0.85,
  "case_scores": [
    {
      "case_id": "case-001",
      "status": "pass",
      "score": 0.93,
      "dimension_scores": {
        "correctness": 0.95,
        "instruction_following": 0.9,
        "regression_safety": 0.95,
        "evidence_quality": 0.9
      }
    }
  ],
  "extra_probe_scores": []
}
```

`findings.json`：

```json
{
  "session_id": "20260702-153000+0800-humanizer-v1",
  "agent_run_id": "codex-20260702-154200+0800",
  "blocking_findings": [],
  "findings": [
    {
      "id": "F-001",
      "severity": "P2",
      "case_id": "case-001",
      "title": "Output is acceptable but weakly evidenced",
      "evidence": "Path or short excerpt from the produced artifact.",
      "reproduction": "Exact files and commands used.",
      "suggested_owner": "skill_tester"
    }
  ]
}
```

`transcript.md` 记录 eval tester 读了哪些文件、跑了哪些命令、如何判分、哪里无法判定。它不需要暴露隐藏推理，但必须足够让 Claude 复盘。

## 8. 多 Eval Tester

新增 agent 不改 skill tester 流程，只新增 eval tester run：

```text
eval-tester-runs/
  codex-20260702-154200+0800/
  attacker-20260702-155100+0800/
  regression-20260702-155800+0800/
  trigger-20260702-160300+0800/
```

推荐 eval tester 类型：

| type | 作用 | 输出 |
|---|---|---|
| `grader` | 按固定 cases 判分 | score + findings |
| `attacker` | 从 skill claims 和输入域生成额外 probes | extra cases + breakages |
| `regression` | 跑已有 deterministic harness / mutation probe | command logs + pass/fail |
| `fresh-reader` | 冷读 SKILL.md，判断能否正确调用 | comprehension findings |
| `trigger` | 判断该触发/不触发时是否加载 skill | precision/recall |

默认聚合规则：

- 任意 eval tester 有 P0/P1 blocking finding -> aggregate = fail。
- 任意 eval tester 因 spec 或文件缺失 blocked -> aggregate = blocked。
- 无 blocking finding 时才计算平均分。
- eval tester 之间冲突时，在 `aggregate/summary.md` 记录冲突，不强行调和。

## 9. 一次性复制 Prompt

`prompts/skill-tester.md` 应写成这种形状：

```md
You are the skill_tester, not the eval_tester.

Read:
1. `/absolute/path/to/eval_exchange/SPEC.md`
2. `/absolute/path/to/eval_exchange/sessions/<session_id>/SESSION.json`

Use the exact `session_id` from `SESSION.json`. Create or update the target skill
as requested by the session. Write only under `skill-tester/` unless the session
explicitly authorizes target skill edits.

Write:
- `skill-tester/manifest.json`
- `skill-tester/notes.md`
- case outputs under `skill-tester/produced/<case_id>/`

Do not write `eval-tester-runs/`, `aggregate/`, or final scores.
```

`prompts/eval-tester-codex.md` 应写成这种形状：

```md
You are the eval_tester, not the skill_tester.

Read:
1. `/absolute/path/to/eval_exchange/SPEC.md`
2. `/absolute/path/to/eval_exchange/sessions/<session_id>/SESSION.json`

Use the exact `session_id` from `SESSION.json`. Dynamically read the session
directory; do not rely on this prompt to contain cases or expected outputs.

Create one new directory under `eval-tester-runs/` named `codex-<YYYYMMDD-HHMMSS+TZ>`.
Do not modify the target skill, `skill-tester/`, or any previous eval tester run.

Evaluate the skill tester-produced artifacts against `SESSION.json`. Run
deterministic checks when declared. You may create extra probes only if
`open_probe_policy.enabled` is true.

Write:
- `status.json`
- `transcript.md`
- `score.json`
- `findings.json`
- `artifact-manifest.json`
- supporting files under `artifacts/`

Fail closed on missing files, inconsistent paths, non-reproducible checks, or
insufficient evidence. End by writing or appending the session's `claude-readme.md`.
```

这两个 prompt 只指向 session，不携带答案。

## 10. Claude 回读

`claude-readme.md` 是 skill tester 下一轮必须先读的文件：

```md
# Eval Result For Claude

Session: <session_id>
Aggregate status: pass | fail | blocked

Read these first:
1. aggregate/summary.md
2. aggregate/blocking-findings.json
3. eval-tester-runs/<agent_run_id>/findings.json
4. eval-tester-runs/<agent_run_id>/transcript.md

Required next action:
- If blocked: repair the session spec or missing artifacts, not the skill.
- If failed: fix the skill or skill tester output against blocking findings.
- If passed: proceed or request a harder eval session.
```

Claude 后续修复必须引用 `session_id` 和 eval tester `agent_run_id`。

## 11. Hidden / Held-Out Cases

`inputs/hidden/` 可选：

- `visibility: "eval_tester_only"`: skill tester 不应读取。
- `visibility: "skill_tester_visible"`: skill tester 和 eval tester 都可读取。
- `visibility: "generated_by_eval_tester"`: eval tester 根据 open probe policy 生成。

如果需要严格 holdout，在 skill tester prompt 中明确只读 `skill_tester_visible` cases，不读 `inputs/hidden`。

## 12. 后续接入 skill-engineer

未来 `skill-engineer` 只需要：

1. 创建 `eval_exchange/sessions/<session_id>/SESSION.json`。
2. 写 `prompts/skill-tester.md` 和 `prompts/eval-tester-codex.md`。
3. 让 Claude / skill tester 把产物写进 `skill-tester/`。
4. 在 build/report 里引用 eval tester outputs。

它不需要自动调用 Codex，也不需要实现 A2A。人手动把 prompt 投递给独立 eval tester 就够了。

## 13. 非目标

本地跑不需要这些：

- agent discovery
- capability negotiation
- message envelope
- direct tool invocation between agents
- long-lived mailbox
- network transport
- auth / signing

这里要的只是一个不会混 session 的文件夹约定。

## 14. Done

一次 session 完成，当且仅当：

- `SESSION.json` 存在且路径可解析。
- `session_id` 和目录名一致。
- `skill-tester/manifest.json` 标记 `ready_for_external_eval: true`。
- 至少一个 eval tester run 写完五个必需输出文件。
- `aggregate/summary.md` 或 `claude-readme.md` 明确给出 pass / fail / blocked。
- Claude 下一轮修改前先读取这些输出。
