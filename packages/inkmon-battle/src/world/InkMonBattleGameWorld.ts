/**
 * InkMonBattleGameWorld - InkMon 战斗的 GameWorld
 *
 * 继承框架 GameWorld，管理战斗实例的生命周期
 */

import { GameWorld, type GameWorldConfig } from '@lomo/logic-game-framework';

/**
 * InkMonBattleGameWorld 配置
 */
export interface InkMonBattleGameWorldConfig extends GameWorldConfig {
  // 预留：项目特定配置
}

/**
 * InkMonBattleGameWorld
 */
export class InkMonBattleGameWorld extends GameWorld {
  constructor(config: InkMonBattleGameWorldConfig = {}) {
    super(config);
  }

  /**
   * 覆盖 getInstance 以返回正确类型
   */
  static override getInstance(): InkMonBattleGameWorld {
    return super.getInstance() as InkMonBattleGameWorld;
  }
}
