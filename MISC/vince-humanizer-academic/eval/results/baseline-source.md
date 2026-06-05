# Baseline Evaluation Report

This report scores the source papers before any rewriting.
The numbers below are heuristic AI-signal counts derived from the skill's English and Chinese rule families.

## Summary

- Documents: 10
- Languages: {'zh': 5, 'en': 5}
- Model families: {'GPT': 2, 'Grok': 2, 'Kimi': 2, 'Mimo': 2, 'Minimax': 2}
- Top categories: [('scaffolding', 28), ('style_residue', 23), ('inflation', 21), ('dash_drama', 19), ('ai_vocab', 19), ('promotional', 17), ('superficial_analysis', 16), ('negative_parallelism', 7), ('nominalization', 5), ('sentence_shape', 5)]

## Ranking by AI-signal density

| Rank | Doc | Model | Lang | Hits | Hits/1k tokens |
| --- | --- | --- | --- | ---: | ---: |
| 1 | gpt-zh | GPT | zh | 24 | 6.05 |
| 2 | grok-en | Grok | en | 12 | 6.04 |
| 3 | minimax-en | Minimax | en | 42 | 5.67 |
| 4 | kimi-en | Kimi | en | 24 | 4.41 |
| 5 | mimo-en | Mimo | en | 13 | 3.89 |
| 6 | gpt-en | GPT | en | 8 | 3.38 |
| 7 | grok-zh | Grok | zh | 9 | 3.19 |
| 8 | mimo-zh | Mimo | zh | 11 | 2.07 |
| 9 | kimi-zh | Kimi | zh | 12 | 1.54 |
| 10 | minimax-zh | Minimax | zh | 14 | 1.43 |

## Per-document notes

### gpt-zh

- Path: `eval/AIgenPapers/GPT Chi.md`
- Tokens: 3970
- Total hits: 24
- Hits per 1k tokens: 6.05
- Top categories: [('dash_drama', 8), ('scaffolding', 8), ('negative_parallelism', 5), ('surface_analysis', 3)]
- Example matches:
  - dash_drama: 是传统物流和贸易中心地位继续受区域竞争挤压，IMF 也明确指出，香港传统增长动力——尤其物流与贸易角色——正在承压。未来五年的香港，若不能持续吸引人才、提高劳动生产率并推进产业升级，增长中枢就很容易被这些结构性因素往下拉。 外部环境则构成另一
  - negative_parallelism: 摘要 如果把 2021 年到 2025 年视为一个完整周期，香港经济的关键词并不是单纯的“疫后复苏”，而是“在连续冲击中重组增长模式”。这五年里，香港先经历了 2021 年由外贸和政策支持带动的强劲反弹，随后在 2022 年因疫情反复与外部金融收紧再度收缩；2023
  - scaffolding: 撑，内需则显得偏弱；到 2025 年，金融市场、科技相关服务、访港旅游和货物出口同时改善，经济增速回升到 3.5%。但与此同时，商业地产疲弱、人口老龄化、劳动力供给趋紧、传统物流竞争力受压，以及财政对土地与资产市场收入的依赖下降，都说明香港已很

### grok-en

- Path: `eval/AIgenPapers/Grok Eng.md`
- Tokens: 1988
- Total hits: 12
- Hits per 1k tokens: 6.04
- Top categories: [('inflation', 4), ('superficial_analysis', 4), ('style_residue', 3), ('ai_vocab', 1)]
- Example matches:
  - inflation: hancements, and GBA initiatives, played pivotal roles in stabilizing the business environment and fostering cross-border synerg
  - superficial_analysis: es. Productivity lagged regional peers, highlighting needs for I&T and human capital upgrades. **4. Prospects for the Next Five Y
  - ai_vocab: tabilizing the business environment and fostering cross-border synergies. Looking ahead to 2026–2030, the economy is projected

### minimax-en

- Path: `eval/AIgenPapers/Minimax Eng.md`
- Tokens: 7405
- Total hits: 42
- Hits per 1k tokens: 5.67
- Top categories: [('inflation', 8), ('promotional', 8), ('superficial_analysis', 8), ('ai_vocab', 8), ('style_residue', 8)]
- Example matches:
  - inflation: global economic landscape, serving as a pivotal gateway between Mainland China and international markets while maintaining its
  - promotional: d its policy stance toward developing a vibrant virtual assets sector, and the Securities and Futures Commission implemented a
  - superficial_analysis: offered returns tied to the local CPI, underscoring the commitment to maintaining price stability while providing some protection a

### kimi-en

- Path: `eval/AIgenPapers/Kimi Eng.md`
- Tokens: 5439
- Total hits: 24
- Hits per 1k tokens: 4.41
- Top categories: [('ai_vocab', 8), ('promotional', 6), ('style_residue', 5), ('inflation', 3), ('superficial_analysis', 2)]
- Example matches:
  - inflation: challenging start to a new decade and a crucial window for repositioning and pursuing high-quality development under the suppor
  - promotional: and capital inflows. Hong Kong needs to enhance its own competitiveness and reduce excessive dependence on Mainland economic cy
  - superficial_analysis: to institutional bookbuilding tranches, ensuring price discovery is led by professional institutions ; - Public su

### mimo-en

- Path: `eval/AIgenPapers/Mimo Eng.md`
- Tokens: 3346
- Total hits: 13
- Hits per 1k tokens: 3.89
- Top categories: [('inflation', 6), ('promotional', 2), ('superficial_analysis', 2), ('ai_vocab', 2), ('sentence_shape', 1)]
- Example matches:
  - inflation: nd Structural Fine-tuning**. 2023 was a pivotal year for Hong Kong's full return to normalcy. The full resumption of travel wit
  - promotional: Vision" to expand economic capacity and enhance long-term competitiveness. - **Maintaining the Linked Exchange Rate System
  - superficial_analysis: tractiveness to talent and enterprises. Ensuring that the fruits of economic growth benefit citizens across all strata more equi

### gpt-en

- Path: `eval/AIgenPapers/GPT Eng.md`
- Tokens: 2369
- Total hits: 8
- Hits per 1k tokens: 3.38
- Top categories: [('sentence_shape', 4), ('style_residue', 3), ('promotional', 1)]
- Example matches:
  - promotional: xpenditure surged by 7.4%, indicating a powerful rebound in household activity and service demand. Full-year visitor arrivals re
  - sentence_shape: was. ### III. Prospects for 2026–2030 Taken together, official and IMF forecasts point to a moderate-growth future. The government e
  - style_residue: years will remain international finance—but in a more diversified form. With bank deposits above HK$19 trillion, substan

### grok-zh

- Path: `eval/AIgenPapers/Grok Chi.md`
- Tokens: 2820
- Total hits: 9
- Hits per 1k tokens: 3.19
- Top categories: [('dash_drama', 8), ('nominalization', 1)]
- Example matches:
  - dash_drama: 题（如高房价和人口老化）影响。到2025年，经济强劲反弹，实际GDP增长3.5%——自2021年以来最高，并实现连续第三年扩张。这一韧性凸显香港的适应能力，由政策稳定和与内地深化联系所支撑。 本文结构如下：第2节详细回顾2021–2025
  - nominalization: 全法》、第23条立法、CEPA升级及大湾区举措，在稳定营商环境和促进跨境协同方面发挥关键作用。 展望2026–2030年，经济预计实现年均实际GDP增长3%，与国家“十五五”规划对接，并由创新科技（I&T）投资、北部都会区发展及持续外部需求支撑。

### mimo-zh

- Path: `eval/AIgenPapers/Mimo Chi.md`
- Tokens: 5318
- Total hits: 11
- Hits per 1k tokens: 2.07
- Top categories: [('scaffolding', 8), ('negative_parallelism', 2), ('officialese', 1)]
- Example matches:
  - negative_parallelism: 都会区成为新经济地理支点**：北部都会区从规划进入大规模建设和产业导入阶段。它将不仅仅是一个居住新城，更将成为香港融入国家创新体系、与深圳协同发展的“桥头堡”。深港科技创新合作区（河套区）将实现“一区两园”的深度协同，在人员、物资、资金、数据跨境流动方面进行制度创
  - scaffolding: 固的增长轨道，其传统国际金融、贸易与航运中心地位在国家支持与自身调整中得到巩固，同时创新科技等新经济领域也取得初步发展。论文进一步基于现有规划与宏观趋势，对2026至2030年香港经济的发展前景、潜在增长路径、主要风险及战略方向进行了前瞻性探讨
  - officialese: 缘政治紧张局势升温，特别是中美关系的不确定性，对香港作为国际商业枢纽的角色构成潜在挑战。在此背景下，全年经济增长放缓至3.2%。尽管下半年随着防疫措施放宽，经济活动有所恢复，但全年访港旅客人数仍处于低位，经济复苏动能受到抑制。 - **2023-2

### kimi-zh

- Path: `eval/AIgenPapers/Kimi Chi.md`
- Tokens: 7797
- Total hits: 12
- Hits per 1k tokens: 1.54
- Top categories: [('scaffolding', 4), ('style_residue', 4), ('dash_drama', 3), ('nominalization', 1)]
- Example matches:
  - dash_drama: 政策制定者关注的焦点。2020年至2029年这一时期对香港而言具有特殊的历史意义——这既是一个充满挑战的十年开端，也是香港在国家"十四五"规划支持下重新定位、谋求高质量发展的关键窗口期。 过去五年（2020-2024年），香港经济经历了前所未
  - scaffolding: po-2025/)。这一系列剧烈波动考验着香港经济的抗压能力和复苏韧性。 与此同时，香港特区政府积极推出了一系列稳经济、惠民生的政策措施。2024年2月，政府宣布全面取消实施超过十年的楼市"辣招"（包括针对非永久居民的买家印花税、第二套房的额
  - nominalization: 香港过去五年的经济发展历程，深入剖析当前经济现状，并基于现有政策框架和宏观趋势，对未来五年的发展前景进行科学预测，为相关研究和政策制定提供参考。 --- ### 第二章 过去五年经济发展回顾（2020-2024） #### 2.1 宏观经济表现：从衰退到复苏 香港经济在过去五年经

### minimax-zh

- Path: `eval/AIgenPapers/Minimax Chi.md`
- Tokens: 9768
- Total hits: 14
- Hits per 1k tokens: 1.43
- Top categories: [('scaffolding', 8), ('officialese', 3), ('nominalization', 3)]
- Example matches:
  - scaffolding: 结提供了坚实的法律保障。 从经济影响角度看，国安法的实施产生了积极正面的效应。首先，该法有效遏制了危害国家安全的违法犯罪活动，为中国香港社会稳定和经济发展创造了良好环境。在此之前，中国香港社会动荡加剧，严重影响了投资信心和消费意愿，多家国际评
  - officialese: 击，中美战略博弈的加剧也使得中国香港作为中美经贸联系中介的角色面临新的变数。 在此背景下，全面回顾和分析中国香港过去五年的经济发展历程，深入研判未来五年的发展趋势和挑战，对于理解中国香港经济的内在韧性、把握其发展机遇、制定科学的政策建议，都具有重要
  - nominalization: 济发展轨迹，涵盖宏观经济表现、重点产业发展、政策实施效果等核心议题，并在此基础上对2025至2029年的经济发展前景进行前瞻性研判。研究发现，中国香港在经历短期波动后正逐步走向稳定复苏轨道，未来五年将是中国香港深度融入国家发展大局、培育新经济增长动能的关键时期。本报告建议中国香港

