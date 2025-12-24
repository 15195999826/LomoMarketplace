---
name: designing-inkmon
description: Guides the InkMon creature design process through multi-turn discussion. Use when user is in the InkMon creation workflow, discussing creature concepts, stats, evolution stage, or appearance design.
allowed-tools: Read, Write
---

# Designing InkMon

帮助用户通过多轮讨论设计新的 InkMon 生物。

---

## InkWorld 风格锚点词

所有 InkMon 共用 5 个风格锚点词：

| 锚点词 | 锁定的特征 |
|--------|-----------|
| `low poly` | 几何结构（低多边形） |
| `faceted` | 切面感 |
| `sharp edges` | 硬边 |
| `ink sketch texture` | 材质纹理（排线、墨线） |
| `non-reflective surface` | 无反射表面（哑光质感） |

---

## 进化阶段

每个 InkMon 必须指定进化阶段：

| 阶段 | 英文 | 特点 | BST 范围 |
|-----|------|------|---------|
| 幼年体 | baby | 可爱、圆润、简单 | 250-350 |
| 成熟体 | mature | 平衡、有力量感 | 350-450 |
| 成年体 | adult | 威严、复杂、完成感 | 450-550 |

**重要**：创建时需要用户指定阶段，不要预设。

---

## 设计流程

### 1. 确定阶段
- **首先询问用户**：这是 baby / mature / adult 中的哪个阶段？
- 阶段决定 BST 范围和设计风格

### 2. 概念讨论
- 确定灵感来源（基于什么动物/元素）
- 确定设计方向和风格
- 参考 [NAMING.md](NAMING.md) 确定命名

### 3. 属性确定
- 选择主属性和副属性
- 参考 [ELEMENTS.md](ELEMENTS.md) 了解属性克制
- 参考 [STATS.md](STATS.md) 分配六维数值

### 4. 生态设计
- 确定栖息地和食性
- 设计天敌/猎物关系
- 参考 [ECOLOGY.md](ECOLOGY.md)

### 5. 外观设计与提示词
- 确定设计特征和配色
- 根据 [CREATE-PROMPTS.md](CREATE-PROMPTS.md) 生成 design 提示词
- 提示词用于 AI 生成主概念图

### 6. JSON 输出
- 按固定 Schema 生成 InkMon JSON 文件
- 保存到 `data/inkmons/` 目录
- 参考 [templates/inkmon-schema.json](templates/inkmon-schema.json)

### 7. 验证与反馈循环

生成 JSON 后，执行验证并根据结果迭代：

```python
def design_inkmon():
    # 步骤 1-6: 设计流程
    stage = 确定阶段()
    concept = 概念讨论(stage)
    stats = 属性确定(concept)
    ecology = 生态设计(concept)
    prompts = 外观设计(concept)
    json_data = 生成JSON(stage, concept, stats, ecology, prompts)

    # 步骤 7: 验证与反馈循环
    while True:
        errors = validate(json_data)

        if errors:
            # 验证失败 → 返回相关步骤修正
            print(f"发现问题: {errors}")
            json_data = 修正问题步骤(errors)
            continue

        # 验证通过 → 请求用户确认
        user_feedback = 询问用户("设计是否满意？")

        if user_feedback.satisfied:
            break  # 完成设计
        else:
            # 用户不满意 → 返回调整
            json_data = 根据反馈调整(user_feedback.issues)
            continue

    保存JSON(json_data)
    return "设计完成"

def validate(json_data):
    errors = []
    if sum(stats) != bst:
        errors.append("BST 总和不等于六维数值之和 → 返回步骤3")
    if bst not in 阶段BST范围[stage]:
        errors.append("BST 超出阶段范围 → 返回步骤3")
    if element not in 有效属性列表:
        errors.append("属性无效 → 返回步骤3")
    if stage not in ["baby", "mature", "adult"]:
        errors.append("阶段无效 → 返回步骤1")
    if not 包含风格锚点词(prompts):
        errors.append("提示词缺少锚点词 → 返回步骤5")
    return errors
```

---

## 快速参考

| 文档 | 用途 |
|-----|------|
| [NAMING.md](NAMING.md) | 命名规范和示例 |
| [STATS.md](STATS.md) | 六维数值分配指南 |
| [EVOLUTION.md](EVOLUTION.md) | 进化设计原则 |
| [ELEMENTS.md](ELEMENTS.md) | 属性克制关系 |
| [ECOLOGY.md](ECOLOGY.md) | 生态关系设计 |
| [CREATE-PROMPTS.md](CREATE-PROMPTS.md) | 创建提示词模板 |
| [EVO-PROMPTS.md](EVO-PROMPTS.md) | 进化提示词模板 |
| [DEVO-PROMPTS.md](DEVO-PROMPTS.md) | 退化提示词模板 |
| [templates/inkmon-schema.json](templates/inkmon-schema.json) | JSON Schema |

---

## 设计原则

### 视觉识别度
- 每个 InkMon 应有独特的视觉特征
- 配色应与属性相符
- 进化链保持设计一致性

### 数值平衡
- BST 符合阶段对应的范围
- 有明显的强项和弱项
- 进化后数值合理增长

### 生态合理性
- 栖息地与属性匹配
- 食性符合设计概念
- 天敌/猎物关系逻辑自洽

---

## 输出格式

设计完成后，生成符合 Schema 的 JSON 文件：

```json
{
  "inkmon": {
    "name": "苔藓熊",
    "name_en": "MossBear",
    "dex_number": 1,
    "description": "栖息在森林深处的熊类 InkMon，身上覆盖着厚厚的苔藓。",
    "elements": { "primary": "grass", "secondary": null },
    "stats": { "hp": 80, "attack": 75, "defense": 70, "sp_attack": 55, "sp_defense": 65, "speed": 45, "bst": 390 },
    "design": {
      "base_animal": "熊",
      "features": ["苔藓皮毛", "水晶爪", "树根脚"],
      "color_palette": ["#228B22", "#8B4513", "#90EE90"],
      "rarity": "uncommon"
    },
    "evolution": {
      "stage": "mature",
      "evolves_from": "MossBaby",
      "evolves_to": [],
      "evolution_method": "level_25"
    },
    "ecology": {
      "habitat": "森林",
      "diet": "herbivore",
      "predators": [],
      "prey": []
    },
    "image_prompts": {
      "design": "Matching the style... (完整提示词)"
    }
  }
}
```

保存路径: `data/inkmons/<name_en>.json`

---

## 相关命令

| 命令 | 用途 |
|-----|------|
| `/inkmon create` | 创建新 InkMon（使用本 Skill） |
| `/inkmon evo <name>` | 为现有 InkMon 设计进化形态 |
| `/inkmon devo <name>` | 为现有 InkMon 设计退化形态 |

---

## 设计完成检查清单

### 基础信息
- [ ] 阶段已确定 (baby/mature/adult)
- [ ] 中英文名称符合规范
- [ ] 描述简洁有特色

### 属性与数值
- [ ] 主属性与设计概念匹配
- [ ] 副属性有合理理由（如有）
- [ ] BST 在阶段对应范围内
- [ ] 六维分布有明显强弱项

### 进化与生态
- [ ] 进化链设计合理
- [ ] 栖息地与属性匹配
- [ ] 食性符合设计概念

### 提示词生成
- [ ] 包含一致性约束 (Matching the style...)
- [ ] 包含世界观锚点 (InkMon from InkWorld)
- [ ] 包含 5 个风格锚点词
- [ ] 主体描述包含：名称、原型动物、独特特征、材质/装备
- [ ] 进化/退化时说明与原形态的关系
- [ ] 包含环境与背景 (stone pedestal, white background)
- [ ] 包含技术参数 (--ar 1:1 --Resolution 2K)