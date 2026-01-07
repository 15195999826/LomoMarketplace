# Auto Turn-Based Battle

`@lomo/logic-game-framework` 框架验证项目 - 回合制自走棋战斗演示

## 📖 概述

本项目参考 UE 项目中的 `TurnBasedAutoChessInstance` 设计，实现了一个回合制自走棋战斗系统。所有角色由 AI 驱动，无需玩家输入。

### 核心设计模式：状态机 + 信号等待

```
Stage（阶段）:
  GameStart → NewRound → CharacterGetTurn → BeforeReleaseAbility
           → ReleaseAbility → AfterReleaseAbility → CharacterEndTurn
           → RoundEnd → ... → GameOver

StageStatus（状态）:
  Enter → Idle → Pending

WaitSignal（信号）:
  用于等待异步操作完成（表演、动画等）
```

## 🎮 战斗机制

### 回合流程

1. **NewRound**: 新回合开始，按速度排序行动队列
2. **CharacterGetTurn**: 角色获得行动权
3. **BeforeReleaseAbility**: 技能释放前（借机攻击等）
4. **ReleaseAbility**: 执行技能/行动
5. **AfterReleaseAbility**: 技能释放后处理
6. **CharacterEndTurn**: 角色结束行动（或继续行动）
7. **RoundEnd**: 回合结束，清理死亡角色

### 角色属性

| 属性 | 说明 |
|------|------|
| HP / MaxHP | 生命值 |
| ATK | 攻击力 |
| DEF | 防御力 |
| Speed | 速度（决定行动顺序） |
| ActionPoint | 行动点（每回合可执行多次行动） |
| Stamina | 精力（移动消耗） |
| CritRate / CritDamage | 暴击率/暴击伤害 |

### 职业

| 职业 | 特点 | 默认技能 |
|------|------|----------|
| Warrior | 高 HP、高防御，近战 | HeavyStrike |
| Archer | 远程攻击，中等属性 | PrecisionShot |
| Mage | 高攻击、低 HP，远程 AOE | Fireball |
| Priest | 治疗能力，低攻击 | Heal |
| Assassin | 高速、高暴击，低 HP | Backstab |
| Knight | 高机动性，均衡属性 | Charge |

## 🚀 运行

```bash
# 安装依赖
pnpm install

# 运行演示（watch 模式）
pnpm dev

# 单次运行
pnpm start
```

## 📁 项目结构

```
auto-turn-based-battle/
├── src/
│   ├── actors/
│   │   └── BattleUnit.ts      # 战斗单位 Actor
│   ├── ai/
│   │   └── SimpleAI.ts        # 简单 AI 决策系统
│   ├── battle/
│   │   ├── BattleStage.ts     # 阶段枚举定义
│   │   ├── BattleContext.ts   # 战斗上下文
│   │   └── TurnBasedBattle.ts # 回合制战斗实例（核心）
│   ├── config/
│   │   └── UnitConfig.ts      # 单位/技能配置
│   ├── logger/
│   │   └── BattleLogger.ts    # 战斗日志器
│   ├── world/
│   │   └── TurnBasedBattleGameWorld.ts
│   └── main.ts                # 入口文件
├── package.json
└── tsconfig.json
```

## 🔧 核心类

### TurnBasedBattle

回合制战斗实例，继承自 `GameplayInstance`，实现状态机驱动的战斗流程。

```typescript
const battle = new TurnBasedBattle('battle-001', {
  maxRounds: 50,
  enableLog: true,
  verboseLog: true,
});

// 添加单位
battle.addToTeamA(warrior);
battle.addToTeamB(knight);

// 开始战斗
battle.start();

// 主循环
while (world.hasRunningInstances) {
  world.tickAll(100);
}
```

### SimpleAI

基于评估的 AI 决策系统，优先级：
1. 治疗（如果是牧师且队友需要治疗）
2. 攻击（如果敌人在范围内）
3. 移动（如果需要接近敌人）
4. 待机

## 📝 参考

- 原始设计: `TurnBasedAutoChessInstance.h/.cpp`
- 框架: `@lomo/logic-game-framework`
- 另一个验证项目: `hex-atb-battle` (ATB 战斗模式)