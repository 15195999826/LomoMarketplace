/**
 * ATBSystem - ATB 行动条系统
 *
 * InkMon 战斗系统的特定选择
 * - 每个单位有 atbGauge 属性，范围 0-maxGauge
 * - 每 tick 增加 speed * speedMultiplier * dt / 1000
 * - 达到 maxGauge 时获得行动权
 */

/**
 * ATB 配置
 */
export type ATBConfig = {
  /** 行动条满值（默认 1000） */
  maxGauge?: number;
  /** 全局速度倍率（默认 1） */
  speedMultiplier?: number;
};

/**
 * ATB 单位接口
 */
export interface IATBUnit {
  readonly id: string;
  /** ATB 条当前值 */
  atbGauge: number;
  /** 速度属性 */
  readonly speed: number;
  /** 是否正在行动（行动中不增长 ATB） */
  isActing: boolean;
  /** 是否存活 */
  readonly isActive: boolean;
}

/**
 * ATB System
 */
export class ATBSystem {
  /** 配置 */
  private config: Required<ATBConfig>;

  /** 已准备好行动的单位队列 */
  private readyQueue: string[] = [];

  /** 当前正在行动的单位 ID */
  private currentUnitId: string | null = null;

  /** 是否启用 */
  enabled: boolean = true;

  constructor(config: ATBConfig = {}) {
    this.config = {
      maxGauge: config.maxGauge ?? 1000,
      speedMultiplier: config.speedMultiplier ?? 1,
    };
  }

  /**
   * 每帧更新
   */
  tick(units: IATBUnit[], dt: number): void {
    if (!this.enabled) return;

    // 如果当前有单位在行动，不更新 ATB
    if (this.currentUnitId) return;

    // 更新所有单位的行动条
    for (const unit of units) {
      if (!unit.isActive) continue;
      if (unit.isActing) continue;

      // 计算 ATB 增量
      const increment = unit.speed * this.config.speedMultiplier * dt / 1000;
      unit.atbGauge = Math.min(unit.atbGauge + increment, this.config.maxGauge);

      // 检查是否已满
      if (unit.atbGauge >= this.config.maxGauge) {
        // 避免重复添加
        if (!this.readyQueue.includes(unit.id)) {
          this.readyQueue.push(unit.id);
        }
      }
    }

    // 如果有准备好的单位且没有当前行动单位，设置第一个为当前行动单位
    if (this.readyQueue.length > 0 && !this.currentUnitId) {
      this.currentUnitId = this.readyQueue[0];
    }
  }

  /**
   * 获取当前可行动的单位 ID
   */
  getCurrentUnitId(): string | null {
    return this.currentUnitId;
  }

  /**
   * 获取准备队列
   */
  getReadyQueue(): readonly string[] {
    return this.readyQueue;
  }

  /**
   * 消耗当前单位的行动权
   */
  consumeAction(): void {
    if (!this.currentUnitId) return;

    // 从队列中移除
    this.readyQueue = this.readyQueue.filter((id) => id !== this.currentUnitId);

    this.currentUnitId = null;

    // 设置下一个行动单位
    if (this.readyQueue.length > 0) {
      this.currentUnitId = this.readyQueue[0];
    }
  }

  /**
   * 重置指定单位的 ATB
   */
  resetUnitATB(unit: IATBUnit): void {
    unit.atbGauge = 0;
  }

  /**
   * 获取所有单位的 ATB 进度
   */
  getATBProgress(units: IATBUnit[]): Map<string, number> {
    const result = new Map<string, number>();

    for (const unit of units) {
      if (!unit.isActive) continue;
      result.set(unit.id, unit.atbGauge / this.config.maxGauge);
    }

    return result;
  }

  /**
   * 预测下一个行动的单位
   */
  predictNextUnit(units: IATBUnit[]): string | undefined {
    if (this.readyQueue.length > 0) {
      return this.readyQueue[0];
    }

    let fastestUnit: IATBUnit | undefined;
    let fastestTime = Infinity;

    for (const unit of units) {
      if (!unit.isActive) continue;
      if (unit.speed <= 0) continue;

      const remaining = this.config.maxGauge - unit.atbGauge;
      const timeToFull = remaining / (unit.speed * this.config.speedMultiplier);

      if (timeToFull < fastestTime) {
        fastestTime = timeToFull;
        fastestUnit = unit;
      }
    }

    return fastestUnit?.id;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<ATBConfig>> {
    return this.config;
  }

  /**
   * 清除所有状态
   */
  clear(): void {
    this.readyQueue = [];
    this.currentUnitId = null;
  }
}
