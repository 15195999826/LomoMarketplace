---
name: developing-hex-atb-battle
description: Provides context for hex-atb-battle framework validation project. Activates when discussing hex-atb-battle, improving logic-game-framework APIs, ATB battle implementation, or framework validation workflow. Guides whether to fix issues in framework vs application layer.
---

# Hex ATB Battle 开发上下文

## 核心原则

**这是框架验证项目**，目的是通过实际使用发现和修复 `@lomo/logic-game-framework` 的设计问题。

| 原则 | 说明 |
|------|------|
| 框架问题要修框架 | 发现 API 设计问题应修改 `packages/logic-game-framework/`，不要在应用层 workaround |
| 双向修改 | 同一 conversation 可能同时修改 `apps/` 和 `packages/` |
| 应用层可粗糙 | hex-atb-battle 代码风格不必完美，重点是验证框架 |

## 项目结构

```
apps/hex-atb-battle/src/
├── main.ts              # 入口，GameWorld + 主循环
├── battle/HexBattle.ts  # GameplayInstance 实现
├── actors/              # CharacterActor (含 ATB)
├── actions/             # MoveAction, DamageAction, HealAction
├── skills/              # Ability 配置 + Timeline 定义
├── config/              # 职业和技能配置
└── logger/              # 战斗日志
```

## 运行命令

```bash
cd apps/hex-atb-battle && pnpm dev    # Watch 模式
cd apps/hex-atb-battle && pnpm start  # 单次运行
# 或 VS Code F5 调试
```

## 修改决策流程

```
发现问题
    ↓
是框架 API 设计问题？ ──是──→ 修改 packages/logic-game-framework/
    │                         然后更新 apps/hex-atb-battle/ 使用
    否
    ↓
在 apps/hex-atb-battle/ 实现
```
