/**
 * GameWorld 顶层容器
 *
 * 单例模式，管理所有 GameplayInstance
 * 提供全局配置和初始化
 *
 * ## 继承支持
 *
 * GameWorld 支持继承，子类可以扩展配置和功能：
 *
 * ```typescript
 * interface HexGameWorldConfig extends GameWorldConfig {
 *   gridSize: number;
 * }
 *
 * class HexGameWorld extends GameWorld {
 *   readonly hexGrid: HexGrid;
 *
 *   constructor(config: HexGameWorldConfig) {
 *     super(config);
 *     this.hexGrid = new HexGrid(config.gridSize);
 *   }
 *
 *   // 子类需要覆盖 getInstance 以返回正确类型
 *   static override getInstance(): HexGameWorld {
 *     return super.getInstance() as HexGameWorld;
 *   }
 * }
 *
 * // 使用
 * HexGameWorld.init({ gridSize: 10 });
 * HexGameWorld.getInstance().hexGrid; // ✅ 类型正确
 * ```
 */

import { getLogger, setLogger, type ILogger, ConsoleLogger } from '../utils/Logger.js';
import type { GameplayInstance } from './GameplayInstance.js';
import {
  EventProcessor,
  type EventProcessorConfig,
} from '../events/EventProcessor.js';
import { EventCollector } from '../events/EventCollector.js';

/**
 * GameWorld 配置
 */
export interface GameWorldConfig {
  /** 自定义 Logger */
  logger?: ILogger;
  /** 是否开启调试模式 */
  debug?: boolean;
  /** EventProcessor 配置 */
  eventProcessor?: EventProcessorConfig;
}

/**
 * GameWorld 单例
 */
export class GameWorld {
  protected static _instance: GameWorld | null = null;

  /** 玩法实例存储 */
  private instances: Map<string, GameplayInstance> = new Map();

  /** 配置 */
  protected config: GameWorldConfig;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 事件处理器 - 框架核心单例资源 */
  readonly eventProcessor: EventProcessor;

  /** 事件收集器 - 框架核心单例资源 */
  readonly eventCollector: EventCollector;

  constructor(config: GameWorldConfig = {}) {
    this.config = config;
    this.eventProcessor = new EventProcessor(config.eventProcessor);
    this.eventCollector = new EventCollector();
  }

  // ========== 单例管理 ==========

  /**
   * 获取 GameWorld 单例
   *
   * 注意：如果未初始化会抛出错误，请确保先调用 init()
   *
   * 子类应覆盖此方法以返回正确类型：
   * ```typescript
   * static override getInstance(): HexGameWorld {
   *   return super.getInstance() as HexGameWorld;
   * }
   * ```
   */
  static getInstance(): GameWorld {
    if (!GameWorld._instance) {
      throw new Error('GameWorld not initialized. Call GameWorld.init() first.');
    }
    return GameWorld._instance;
  }

  /**
   * 初始化 GameWorld
   *
   * 支持子类继承：子类调用 `SubClass.init()` 会创建子类实例。
   *
   * @param config 配置对象
   * @returns GameWorld 实例（子类调用时返回子类实例）
   *
   * @example
   * ```typescript
   * // 基类使用
   * GameWorld.init({ debug: true });
   *
   * // 子类使用
   * HexGameWorld.init({ debug: true, gridSize: 10 });
   * ```
   */
  static init<T extends GameWorld>(
    this: new (config: GameWorldConfig) => T,
    config: GameWorldConfig = {}
  ): T {
    if (GameWorld._instance) {
      getLogger().warn('GameWorld already initialized, reinitializing...');
      GameWorld._instance.shutdown();
    }

    const instance = new this(config);
    GameWorld._instance = instance;
    instance.initialize();
    return instance;
  }

  /**
   * 销毁 GameWorld 单例
   * 主要用于测试
   */
  static destroy(): void {
    if (GameWorld._instance) {
      GameWorld._instance.shutdown();
      GameWorld._instance = null;
    }
  }

  /**
   * 内部初始化
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    // 设置 Logger
    if (this.config.logger) {
      setLogger(this.config.logger);
    } else {
      setLogger(new ConsoleLogger(this.config.debug ? '[BattleFramework:DEBUG]' : '[BattleFramework]'));
    }

    this.initialized = true;
    getLogger().info('GameWorld initialized');
  }

  /**
   * 关闭 GameWorld
   */
  private shutdown(): void {
    // 结束所有实例
    for (const instance of this.instances.values()) {
      instance.end();
    }
    this.instances.clear();

    this.initialized = false;
    getLogger().info('GameWorld shutdown');
  }

  // ========== 实例管理 ==========

  /**
   * 创建并注册玩法实例
   * @param factory 工厂函数，创建具体的 GameplayInstance
   */
  createInstance<T extends GameplayInstance>(factory: () => T): T {
    const instance = factory();

    if (this.instances.has(instance.id)) {
      getLogger().warn(`Instance already exists: ${instance.id}`);
      return this.instances.get(instance.id) as T;
    }

    this.instances.set(instance.id, instance);
    getLogger().debug(`Instance created: ${instance.id} (${instance.type})`);

    return instance;
  }

  /**
   * 获取玩法实例
   */
  getInstance<T extends GameplayInstance>(id: string): T | undefined {
    return this.instances.get(id) as T | undefined;
  }

  /**
   * 获取所有实例
   */
  getInstances(): readonly GameplayInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 按类型获取实例
   */
  getInstancesByType<T extends GameplayInstance>(type: string): T[] {
    return Array.from(this.instances.values()).filter((i) => i.type === type) as T[];
  }

  /**
   * 销毁玩法实例
   */
  destroyInstance(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    instance.end();
    this.instances.delete(id);
    getLogger().debug(`Instance destroyed: ${id}`);

    return true;
  }

  /**
   * 销毁所有实例
   */
  destroyAllInstances(): void {
    for (const instance of this.instances.values()) {
      instance.end();
    }
    this.instances.clear();
    getLogger().debug('All instances destroyed');
  }

  // ========== 全局操作 ==========

  /**
   * 推进所有运行中的实例
   * @param dt 时间增量
   */
  tickAll(dt: number): void {
    for (const instance of this.instances.values()) {
      if (instance.isRunning) {
        instance.tick(dt);
      }
    }
    // 帧结束：flush 所有事件
    this.eventCollector.flush();
  }

  /**
   * 获取实例数量
   */
  get instanceCount(): number {
    return this.instances.size;
  }

  /**
   * 是否有运行中的实例
   */
  get hasRunningInstances(): boolean {
    for (const instance of this.instances.values()) {
      if (instance.isRunning) {
        return true;
      }
    }
    return false;
  }

  // ========== 调试支持 ==========

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      initialized: this.initialized,
      instanceCount: this.instances.size,
      instances: Array.from(this.instances.values()).map((i) => ({
        id: i.id,
        type: i.type,
        state: i.state,
        actorCount: i.actorCount,
      })),
    };
  }
}
