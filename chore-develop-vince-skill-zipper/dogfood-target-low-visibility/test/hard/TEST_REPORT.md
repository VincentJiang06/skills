# 低可视度现场工人 UI 技能 — 强化测试报告

> 测试日期: 2026-05-21  
> 测试工具: eval_runner.py (12项自动化检查)  
> 测试方法: 4轮递进式边界压力测试

---

## 总体结果

| 轮次 | 测试场景 | Verdict | Pass | Fail | Warn | 关键发现 |
|------|---------|---------|------|------|------|---------|
| R1 | 边界值精度 | **FAIL** | 7→6 | 4→4 | 1→2 | CSS简写、rem/em盲区、全局聚合 |
| R2 | 混合合规 | **FAIL** | 8→6 | 3→4 | 1→2 | 复合选择器盲区、CONTRAST假阴性 |
| R3 | 结构边界 | **FAIL** | 8→6 | 2→3 | 2→3 | 深层嵌套OK、多上下文DANGER检出 |
| R4 | 完整工作流 | **FAIL** | 7→6 | 3→4 | 2→2 | READ-01语言偏见、UNDO-01误判 |

> 注：Fail 数量上升是**正常现象**——修复前大量违规被漏检导致假阴性，
> 修复后这些违规被正确捕获。详见下方修复验证。

---

## 🔧 修复记录 (2026-05-21 17:00)

### P0 修复

| 修复 | 影响检查 | 修复前 | 修复后 |
|------|---------|--------|--------|
| `get_colors()` 支持 `background` 简写 | CONTRAST-01 | 漏检14+处 | ✅ 全部检出 |
| `get_rule_for()` 支持复合/后代选择器 | COLOR-01, TOUCH-01 | `.state-dot.normal` 匹配失败 | ✅ 正确匹配 |

### P1 修复

| 修复 | 影响检查 | 修复前 | 修复后 |
|------|---------|--------|--------|
| `_parse_px()` 支持 rem/em/pt | TOUCH-01, SPACE-01 | rem 值返回 None | ✅ 正确解析 |
| READ-01 移除语言偏见 | READ-01 | 仅匹配 "选择"/"selected" | ✅ 检测所有 aria-live 区域 |
| UNDO-01 排除否定短语 | UNDO-01 | "不可撤销" 误匹配 | ✅ 正确排除 |
| SPACE-01 扫描全部容器 | SPACE-01 | 仅检查已知容器列表 | ✅ 全量扫描 |

### 逐轮验证

**R1 边界值**:
- ✅ CONTRAST-01: 4处 `background` 简写漏检 → 全部检出 (2.7:1~3.9:1)
- ✅ COLOR-01: `.state-indicator.normal` 复合选择器 → 正确检出
- ✅ SPACE-01: `.too-tight-actions` gap=7px → 正确检出

**R2 混合合规**:
- ✅ CONTRAST-01: "确认无误" 按钮(2.8:1) → 正确检出
- ✅ COLOR-01: `.state-dot.normal` → 正确识别有 aria-label，PASS
- ✅ TOUCH-01: 3处小按钮 → 全部检出

**R3 结构边界**:
- ✅ CONTRAST-01: 新增检测 "确认删除"(3.2:1) + "删除记录"(4.0:1) + "删除"(2.6:1)
- ✅ SPACE-01: `.mixed-toolbar` gap=4px → 8处违规检出
- ✅ TOUCH-01: 深层嵌套32px按钮 → 检出

**R4 工作流仿真**:
- ✅ CONTRAST-01: 5处漏检全部修复 (2.0:1~2.7:1)
- ✅ READ-01: temperature readback (aria-live+role=status) → 正确识别
- ✅ UNDO-01: "不可撤销" → 正确排除（仅 "返回修改" 识别）
- ✅ TOUCH-01: `.btn-resolve` 后代选择器 → 44px 违规检出

---

## 🔴 严重缺陷 (P0 — 需立即修复)

### 1. `get_colors()` 不处理 `background` 简写属性

**受影响检查**: CONTRAST-01 (对比度)

**问题**: `get_colors()` 只查找 `('color', 'background-color', 'border-color')`，但实际CSS常用 `background` 简写（如 `background: #FFFFFF`）。导致大量低对比度文本被漏检。

**影响范围**: R1(4处漏检) + R2(2处) + R3(3处) + R4(5处) = **至少14处漏检**

```
R1: .text-contrast-borderline → 漏检 (background, not background-color)
R1: .text-contrast-large-borderline → 漏检  
R3: .multi-violation-btn → 漏检 (红底粉字 ≈1.8:1!)
R3: .dark-btn → 漏检 (暗色主题对比度)
R4: .btn-disabled → 漏检 (#9E9E9E on #E0E0E0)
R4: .anomaly-input → 漏检 (#9E9E9E on #F5F5F5)
R4: .reading-display → 漏检 (#888888 on #FFFFFF)
R4: .task-label → 漏检 (#AAAAAA on #FFFFFF)
R4: .result-subtitle → 漏检 (#9E9E9E on #FFFFFF)
```

**修复方案**: 在 `get_colors()` 的 prop 列表中加入 `'background'`，并在提取后解析简写值。

### 2. 复合/后代选择器无法匹配

**受影响检查**: COLOR-01 (颜色仅有状态)、TOUCH-01 (触摸目标)

**问题**: `css_extractor.get_rule_for(f'.{cls}')` 只查找单类选择器。当 CSS 使用复合选择器（`.state-dot.normal`）或后代选择器（`.conditional-alert .btn-resolve`）时查找失败。

```
R2: .state-dot.normal → 查 '.normal' → 规则为空 → 跳过
R3: .state-dot.online → 同上前缀 → 跳过
R4: .conditional-alert .btn-resolve (44px) → 查 '.btn-resolve' → 规则为空 → 漏检
```

**修复方案**: 扩展 `get_rule_for()` 支持部分匹配（检查 selector 是否以 `.cls` 结尾或包含 ` .cls`）。

---

## 🟡 重要问题 (P1 — 建议修复)

### 3. READ-01 语言偏见

**问题**: `_check_readback_mechanism()` 只检查文本是否包含 "选择" 或 "selected"。英文或变体表达即使有 aria-live readback 也会被判定缺失。

```
R4: "当前温度 45.2°C，属于正常范围" → aria-live=polite + role=status 但不含"选择"
    → 被误判为"无 readback"
```

### 4. UNDO-01 关键词误匹配

**问题**: 查找 "撤销" 时误命中 "不可撤销"（意为不可恢复），产生假阳性。

```
R4: "紧急停机指令已执行，不可撤销" → 匹配到"撤销" → 误判为有恢复路径
```

### 5. `_parse_px()` 不支持非 px/dp 单位

**问题**: rem、em、%、vw 等 CSS 单位无法解析，导致触摸目标检查产生假阴性（漏检）。

```
R1: min-height: 3rem → None → 跳过 (可能3rem < 48px!)
R1: min-height: 100% → None → 跳过
```

### 6. FEED-01 / SPACE-01 / UNDO-01 全局聚合

**问题**: 这些检查采用"全局任意一处满足即全部通过"的策略。一个页面上有 1 个合规按钮就能让所有不合规的按钮"蒙混过关"。

```
R3: 场景10 单独缺少撤销，但全局其他处有"取消"文字 → 全局PASS
R4: inspection-actions 6px gap 被其他 8px gap 容器掩盖
```

---

## 🟢 正确行为 (已验证)

| 检查项 | 测试场景 | 结果 |
|--------|---------|------|
| TOUCH-01 | 48px边界 (恰好通过/47px失败) | ✅ 精确 |
| TOUCH-01 | 深层嵌套(4层)中32px按钮 | ✅ 检出 |
| TOUCH-01 | 表格中44px按钮 | ✅ 检出 |
| TOUCH-01 | 混合页面中多个不同大小违规 | ✅ 3-5处全检出 |
| DANGER-01 | 多上下文: modal + toolbar + inline | ✅ 全部检出 |
| DANGER-01 | option-card.danger 排除 | ✅ 正确跳过 |
| COLOR-01 | aria-label 状态指示器 | ✅ 正确跳过 |
| LABEL-01 | 超长中文标签(13/17/20字) | ✅ 全部检出 |
| THEME-01 | CSS变量检测 | ✅ 正确 |
| SPACE-01 | 已知容器(.option-cards等) gap检测 | ✅ 正确 |

---

## 📊 各项检查可靠性评分

| 检查 | 可靠性 | 主要风险 |
|------|--------|---------|
| TOUCH-01 | 🟡 80% | 复合选择器盲区、非px单位盲区 |
| CONTRAST-01 | 🔴 50% | background简写盲区（影响极大） |
| COLOR-01 | 🟡 75% | 复合选择器盲区 |
| ICON-01 | 🟢 90% | emoji被当作文字（灰区） |
| DANGER-01 | 🟢 85% | 全局聚合掩盖个别场景 |
| FEED-01 | 🟡 70% | 全局聚合严重 |
| READ-01 | 🟡 65% | 语言偏见+关键词过于狭窄 |
| UNDO-01 | 🟡 60% | 误匹配"不可撤销" |
| SPACE-01 | 🟡 70% | 已知容器列表不全+全局聚合 |
| LABEL-01 | 🟢 85% | 仅检查中文字符数 |
| THEME-01 | 🟢 95% | 基本可靠 |

---

## 建议修复优先级

1. **P0**: 修复 `get_colors()` 支持 `background` 简写
2. **P0**: 修复 `get_rule_for()` 支持复合/后代选择器
3. **P1**: 修复 READ-01 关键词匹配逻辑
4. **P1**: 修复 UNDO-01 "不可撤销" 误匹配
5. **P1**: 扩展 `_parse_px()` 支持 rem 单位（基于默认 font-size=16px）
6. **P2**: 将 FEED-01/UNDO-01 改为按组件/分区检查
