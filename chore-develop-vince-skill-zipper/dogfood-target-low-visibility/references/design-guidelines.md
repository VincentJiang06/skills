# 低可见度现场工人移动端 UI 设计规范

> **Design Philosophy: Multisensory Certainty (多感官确定性)**
>
> In low-visibility and high-interference environments, the UI must create certainty
> through visual, haptic, and audio channels simultaneously, allowing workers to
> complete tasks even when they cannot see clearly, hear fully, or tap precisely.

---

## 1. Core Design Principles (G0-G11)

### G0. Default to Low Visibility
Low visibility is NOT an edge case. Assume the user cannot see clearly, cannot look long, cannot see completely.

- **Wrong**: Dark mode is an optional skin.
- **Right**: Dark, high-contrast, strong feedback is core capability.

### G1. One Decision Per Screen
One screen solves at most one primary judgment:
- What is this task?
- Which option should I select?
- Do I confirm submission?
- Is the system done?

Never require reading + selecting + filling + judging + submitting on one screen.

### G2. Large Buttons, Large Cards, Large Spacing
Under low visibility with gloves, controls must exceed normal mobile minimums:
- **Minimum**: 48x48dp (Android) / 44x44pt (iOS)
- **Recommended primary button**: 64-80dp height
- **Recommended option card**: 72dp+ height
- **Target spacing**: 8-12dp minimum
- **Dangerous actions**: Must be visually and spatially isolated

### G3. Stable Layout, Spatial Memory
Users cannot re-discover buttons each time. All frequent controls must stay in fixed positions:
- **Top**: Task name + current status
- **Center**: Main selection area
- **Bottom**: Back/Undo/Confirm
- **Corners**: Settings, Help, Sound/Vibration status

### G4. Synchronized Visual, Haptic, Audio Confirmation
Every critical action must have at least two feedback channels. Submissions, errors, and dangerous actions must have three:
- **Tap**: Visual press state + light haptic tick
- **Select**: Highlight + checkmark + short tone or spoken label
- **Submit success**: Success page + double haptic pulse + success tone or "submitted"
- **Error**: Error banner near problem + distinct haptic rhythm + error tone or short instruction
- **Dangerous action**: Separate page + strong controlled haptic + warning tone + optional voice

### G5. No Single-Sense Dependency
- No color-only state indication
- No audio-only feedback
- No haptic-only confirmation
- No icon-only action controls
- No text-only critical labels

### G6. Confirm Selection Before Submitting
Quick selection ≠ instant submission. Recommended flow:
`Tap option → persistent highlight → system reads back selection → user confirms`

### G7. Dangerous Actions Are Isolated
Dangerous, irreversible, or high-cost actions (shutdown, delete, scrap, close task, confirm danger, submit anomaly, dismiss alarm) must:
- Use a separate confirmation screen
- Show consequence readback
- Use long-press or second confirmation
- Never sit adjacent to normal action buttons

### G8. Use Field Task Language
No backend system terminology:
- **Wrong**: "Create Incident Record" → **Right**: "上报异常"
- **Wrong**: "Workflow Transition" → **Right**: "进入下一步"
- **Wrong**: "Asset Status Update" → **Right**: "更新设备状态"

### G9. Feedback Must Be Reviewable
Before submission, show a selection summary:
```
You will submit:
Equipment: A-102
Status: Abnormal
Action: Notify maintenance
```
After submission, show results:
```
Submitted
ID: #48392
Status: Pending maintenance
[Undo] [Return to task]
```

### G10. Settings Must Be Field-Adjustable
At minimum, support:
- Font size (70-400%)
- Button size (50-200%)
- Dark / High-contrast themes
- Sound on/off and volume
- Vibration intensity
- Left/right hand button position
- Voice readback on/off

### G11. Test Under Field Conditions
Testing must cover: low light, high glare, noise, gloves, wet hands, one-handed, walking, time pressure, weak network/offline, sound off, vibration off, large text, high contrast, screen reader.

---

## 2. Information Architecture & Flow

### 2.1 Max Navigation Depth
Maximum 3 levels:
- Level 1: Task list / current task
- Level 2: Selection page
- Level 3: Confirmation / result page

**Never**: Task → Category → Subcategory → Detail → Settings → Popup → Sub-popup

### 2.2 Standard Flow Template
```
[Task Header]
Check Equipment A-102
Current step: Select inspection result

[Large Option Cards]
✅ Normal — No action needed
⚠️ Abnormal — Problem found, need to record
⛔ Dangerous — Risk present, need immediate action

[Bottom Bar]
Back                          Confirm Selection
```

### 2.3 Pre-Submit Readback
```
You selected:
Equipment: A-102
Result: Abnormal
Next: Record issue and notify maintenance

Back to modify              Confirm Submit
```

### 2.4 Post-Submit Result
```
Submitted
Equipment A-102 marked as Abnormal
Maintenance notification created

Undo                          Next Item
```

---

## 3. Layout Specification

### 3.1 Screen Structure
```
┌──────────────────────┐
│ Top Task Zone         │
│ Task name / Object    │
│ Current step / Status │
├──────────────────────┤
│ Main Content Zone     │
│ Large options / Input │
│ Scan / Photo          │
├──────────────────────┤
│ Selection Readback    │
├──────────────────────┤
│ Fixed Bottom Action   │
│ Back/Undo    Confirm  │
└──────────────────────┘
```

### 3.2 Top Zone Must-Haves
- Task name
- Object name
- Current location / step
- Network status (online/offline)
- Sound/vibration status when relevant

**Must NOT have**: Multiple small icon buttons, long explanations

### 3.3 Center Zone Must-Haves
- 2-4 large option cards
- OR one large input control
- OR scan/photo entry point
- OR one clear status judgment

**Must NOT have**: Dense lists, multi-column layouts, small radios, small checkboxes, icon-only grids, horizontal scrolling

### 3.4 Bottom Zone Rules
- Fixed position, never scrolls away
- Left: Back / Cancel / Undo
- Right: Confirm / Submit / Next
- Support left-right mirroring for handedness
- Primary action position never changes between screens

---

## 4. Touch Interaction Specification

### 4.1 Size Standards
| Element | Minimum | Recommended |
|---------|---------|-------------|
| Any touch target (Android) | 48x48dp | 56dp+ |
| Any touch target (iOS) | 44x44pt | 56pt+ |
| Primary button | 56dp | 64-80dp |
| Option card | 64dp | 72-96dp |
| Spacing between targets | 8dp | 12-16dp |

### 4.2 Hit Area vs Visual Size
Visual size can be smaller than hit area. Example: 24dp icon with 48dp+ hit region.

### 4.3 Forbidden Gestures for Critical Actions
- Swipe
- Pinch zoom
- Long-distance drag
- Small-area drag
- Hidden menus (without clear affordance)
- Long press without progress indicator

Long press ONLY for dangerous action confirmation, and must show progress.

### 4.4 Gloves Mode
- Increase all button heights by 20%
- Increase spacing by 25%
- Reduce list density (50% fewer items)
- Disable small drag controls
- Prefer large cards and large keypads
- Reduce input fields
- Reduce scrollable areas

### 4.5 Single-Hand Mode
Support: left-hand mode, right-hand mode, bottom thumb-zone primary operations.

---

## 5. Visual Design Specification

### 5.1 Typography
| Element | Size | Weight |
|---------|------|--------|
| Page title | 22-28sp | Bold |
| Task status | 18-22sp | Medium/Bold |
| Option label | 20-26sp | Bold |
| Option description | 16-20sp | Regular |
| Button label | 18-22sp | Bold |
| Readback text | 18-22sp | Bold |
| Error text | 18-22sp | Bold |

Text must work at 200% scale.

### 5.2 Contrast Requirements
| Element | Minimum Ratio |
|---------|--------------|
| Normal text | 4.5:1 |
| Large text (≥18pt bold or ≥24pt) | 3:1 |
| UI components and graphics | 3:1 |
| Critical states (preferred) | 7:1 |

### 5.3 Color Semantics (Always Multi-Channel)
| State | Color | Icon | Text | Shape |
|-------|-------|------|------|-------|
| Normal | Green | ✅ | "正常" | — |
| Abnormal | Yellow/Orange | ⚠️ | "异常" | — |
| Danger | Red | ⛔ | "危险" | Distinct card border |
| Completed | Blue/Green | ✔ | "已完成" | — |
| Offline | Gray/Blue | ☁ | "待上传" | — |

Color MUST NOT be the only distinguishing feature. Always pair with icon + text.

### 5.4 Theme Support
| Theme | Use Case |
|-------|----------|
| High-Contrast Light | Bright daylight, outdoor, max readability |
| High-Contrast Dark | Low light, night, reduce glare |
| Low-Light Black | Extremely low visibility, tunnels, night inspection |
| Standard Light | Normal indoor |
| Standard Dark | Normal low light |

---

## 6. Component Specifications

### 6.1 Task Header
Purpose: Tell user current task and location.

**Must contain**: Task name, object name, step indicator, status, offline/sync status.
**Must NOT contain**: Long explanations, complex navigation, multiple small icon buttons.

### 6.2 Option Card
Purpose: Quick selection from 2-4 options.

Properties:
- Full card is clickable
- Min height: 72dp, preferred: 80-96dp
- Label: 20-26sp bold
- Icon + text label + optional description
- Selected state: thick border + background change + checkmark + haptic tick + short tone

### 6.3 Bottom Action Bar
- Fixed position
- Primary button: 64-80dp height
- Secondary button: 56-64dp height
- Supports left/right mirroring
- Primary action position never changes

### 6.4 Readback Bar
- Persistent after selection
- Screen-reader accessible
- Optional voice readback
- High contrast

### 6.5 Safety Confirmation Page
For dangerous/irreversible operations:
- Separate screen (never inline)
- Shows consequence
- Requires long-press with progress indicator
- Distinct confirmation feedback
- No adjacent danger and normal buttons

### 6.6 Error Banner
- High contrast, appears near problem area
- Includes action instruction (not just "Invalid")
- Distinct haptic rhythm
- Error tone or spoken instruction
- Must not auto-dismiss too quickly

**Wrong**: "输入无效"
**Right**: "请选择故障类型后再提交"

### 6.7 Success Screen
- Large success label
- Clear result summary
- Undo or modify available
- Haptic: medium double pulse
- Sound: short upward tone or "completed"

### 6.8 Offline Badge
- Visible badge with text "已保存，待上传"
- Never use spinner only
- Sync result feedback required

---

## 7. Multisensory Feedback System

### 7.1 Feedback Matrix

| Event | Visual | Haptic | Audio | Voice |
|-------|--------|--------|-------|-------|
| Tap normal button | Press state | Light tick | Short click | No |
| Select option | Highlight + checkmark + thick border | Light tick | Short confirm tone | "已选择：X" |
| Deselect | Remove highlight | Light tick | Short low tone | "已取消选择" |
| Submitting | Loading + status text | None/light | None | No |
| Submit success | Success page/banner | Medium double pulse | Success tone | "已提交" |
| Error | Error banner + action instruction | Distinct rhythm | Error tone | "{instruction}" |
| Dangerous action | Separate page + warning | Strong controlled | Warning tone | "危险操作，请确认" |
| Offline save | Pending upload badge | Light tick | Short tone | "已保存，待上传" |
| Sync complete | Uploaded status | Light tick | Success tone | Optional |

### 7.2 Haptic Rules
- Less is more — excessive vibration is annoying
- Haptic must sync with visual and audio
- Avoid legacy one-shot buzzy vibrations
- Never use same pattern for success and error

### 7.3 Audio Rules
- Sounds must be short
- Must be toggleable off
- Cannot replace visual and haptic
- Error and success tones must be distinctly different
- Voice reads only key semantics, not long instructions

---

## 8. Content Design

### 8.1 Language Must Be Field-Task Language
- Verbs first: "检查设备", "上报异常", "确认提交", "重新扫描"
- Never system jargon: no "状态管理", "流程切换", "资产事件"
- Primary labels: 2-6 Chinese characters preferred

### 8.2 Icon Rules
- Critical actions: NEVER icon-only
- Always pair with text label
- Use culturally recognizable symbols
- Avoid abstract icons for domain-specific tasks

---

## 9. Error Prevention & Recovery

### 9.1 Priority Order
Prevent error > Pre-submit review > Post-submit undo > Post-error explanation

### 9.2 Pre-Submit Review Checklist
All important submissions must show: object, selection, consequence, next step.

### 9.3 Disabled Button Must Explain Why
**Wrong**: Gray disabled submit button
**Right**: "请选择异常类型后提交" + [提交]

### 9.4 Undo Strategy
- Normal actions: allow undo within result screen
- Submitted reports: allow modify or append correction
- Destructive actions: require confirmation before action
- Irreversible actions: show consequence before confirmation

---

## 10. Anti-Patterns (Do NOT Use)

- Small icon-only buttons
- Multiple equal-weight primary buttons
- Color as the only state indicator
- Select-to-submit without confirmation
- Dangerous button adjacent to normal button
- Long toast as sole feedback
- Error message only saying "Invalid"
- Undo hidden in menus
- Small radio/checkbox as primary selection
- Low-contrast gray text
- Thin border-only selection indication
- Complex gestures for critical actions
- Horizontal scrolling required
- Deep nested navigation (>3 levels)
- Modal-on-modal dialogs
- Long instructional text
- Button position changes between screens
- Audio feedback cannot be turned off
- Vibration feedback cannot be adjusted
- Spinner as only offline feedback

---

## 11. Testing Acceptance Criteria

### 11.1 Core Metrics
| Metric | Target |
|--------|--------|
| Task success rate | ≥ 95% |
| Critical error rate (dangerous actions) | 0 |
| Mis-tap rate (normal) | ≤ 2% |
| Mis-tap rate (glove + low light) | ≤ 5% |
| Time to complete simple selection | 2-4 taps |
| Recovery success | ≥ 95% |
| Subjective confidence | Worker can state what was selected and submitted |

### 11.2 Required Test Conditions
Normal indoor, low light, high glare, noise, gloves, single hand, walking, wet/dirty hands, time pressure, weak network/offline, sound off, vibration off, large text, high contrast, screen reader.

### 11.3 Required Test Tasks
Select normal and submit, select abnormal and modify, undo wrong selection, submit abnormal and view result, cancel dangerous action, confirm dangerous action, rescan after failed scan, offline submit and sync, switch to high contrast, switch left-hand mode, complete with sound off, complete with vibration off.
