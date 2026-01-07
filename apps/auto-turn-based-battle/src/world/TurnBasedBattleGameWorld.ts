/**
 * TurnBasedBattleGameWorld - 回合制战斗的 GameWorld
 *
 * 继承框架 GameWorld，预留项目特定扩展点。
 *
 * @example
 * ```typescript
 * // 初始化
 * TurnBasedBattleGameWorld.init({ debug: true });
 *
 * // 获取实例（类型正确）
 * const world = TurnBasedBattleGameWorld.getInstance();
 *
 * // 创建战斗实例
 * const battle = world.createInstance(() => new TurnBasedBattle('battle-001'));
 * ```
 */

import { GameWorld, type GameWorldConfig } from '@lomo/logic-game-framework';

/**
 * TurnBasedBattleGameWorld 配置
 */
export interface TurnBasedBattleGameWorldConfig extends GameWorldConfig {
  /** 默认最大回合数 */
  defaultMaxRounds?: number;
  /** 是否启用战斗日志 */
  enableBattleLog?: boolean;
}

/**
 * TurnBasedBattleGameWorld
 */
export class TurnBasedBattleGameWorld extends GameWorld {
  /** 默认最大回合数 */
  readonly defaultMaxRounds: number;

  /** 是否启用战斗日志 */
  readonly enableBattleLog: boolean;

  constructor(config: TurnBasedBattleGameWorldConfig = {}) {
    super(config);
    this.defaultMaxRounds = config.defaultMaxRounds ?? 100;
    this.enableBattleLog = config.enableBattleLog ?? true;
  }

  /**
   * 覆盖 getInstance 以返回正确类型
   */
  static override getInstance(): TurnBasedBattleGameWorld {
    return super.getInstance() as TurnBasedBattleGameWorld;
  }

  /**
   * 覆盖 init 以支持扩展配置
   */
  static override init<T extends GameWorld>(
    this: new (config: GameWorldConfig) => T,
    config: TurnBasedBattleGameWorldConfig = {}
  ): T {
    return super.init.call(this, config) as T;
  }
}
