/**
 * HexAtbBattleGameWorld - 六边形 ATB 战斗的 GameWorld
 *
 * 继承框架 GameWorld，预留项目特定扩展点。
 *
 * @example
 * ```typescript
 * // 初始化
 * HexAtbBattleGameWorld.init({ debug: true });
 *
 * // 获取实例（类型正确）
 * const world = HexAtbBattleGameWorld.getInstance();
 * ```
 */

import { GameWorld, type GameWorldConfig } from '@lomo/logic-game-framework';

/**
 * HexAtbBattleGameWorld 配置
 */
export interface HexAtbBattleGameWorldConfig extends GameWorldConfig {
  // 预留：项目特定配置
  // hexGridSize?: number;
}

/**
 * HexAtbBattleGameWorld
 */
export class HexAtbBattleGameWorld extends GameWorld {
  constructor(config: HexAtbBattleGameWorldConfig = {}) {
    super(config);
    // 预留：项目特定初始化
  }

  /**
   * 覆盖 getInstance 以返回正确类型
   */
  static override getInstance(): HexAtbBattleGameWorld {
    return super.getInstance() as HexAtbBattleGameWorld;
  }

  // 预留：项目特定方法
  // getHexGrid(): HexGridModel { ... }
}
