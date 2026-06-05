# 低能见度审计交接文档 — <target>

<!--
  Shape of the report.md that scripts/audit.py emits beside audit.json.
  Rendered automatically by scripts/emit_docs.render_markdown — this template
  documents the contract for an implementer agent reading the output.
  The skill produces this; it never edits the target. An implementer applies it.
-->

- 模式: <static | visual_estimate>  |  文件: <analyzed files>  |  选择器: <selector?>
- 结论: **<issues_found | clean>**  |  最低分 <worst_score>/100  |  critical N · major N · minor N  |  待判定 N
> 未找到的页面: <missing pages, if any>

## Findings（按严重度）
### critical (k)
- `<rule>` @ <file> <location> — measured X / need Y
### major (k)
- ...
### minor (k)
- ...
（clean 时：无 — 该范围内未发现低能见度问题。）

## 修改建议（交给实现 agent，本技能不直接改文件）
- [F1] <precise, build-ready recommendation>  (assets/fix-snippets.html#<rule>)
- ...

## 待判定（需视觉/浏览器二次确认）
- `<reason>` @ <file> <location> — <how to complete in the visual pass>

## 下一轮建议范围
<a suggested --pages/--selector scope for the next cheap re-run>
