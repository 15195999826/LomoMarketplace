import { Actor } from '../entity/Actor.js';

/**
 * 游戏玩法状态提供者接口
 *
 * 定义了 Action/Ability 在执行过程中可以从上下文访问到的能力。
 * 这使得 Action 可以安全地获取运行时信息，而不需要对 gameplayState 进行猜测或强制类型转换。
 */
export interface IGameplayStateProvider {
  /** 获取当前所有存活的 Actor */
  readonly aliveActors: Actor[];

  /**
   * 根据 ID 获取 Actor 实例
   * @param id Actor ID
   */
  getActor(id: string): Actor | undefined;
}
