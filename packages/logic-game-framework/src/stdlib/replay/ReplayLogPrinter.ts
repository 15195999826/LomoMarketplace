/**
 * ReplayLogPrinter - 战斗回放日志打印工具
 *
 * 将 IBattleRecord 转换为可读的日志格式，用于验证数据完整性。
 *
 * ## 使用方式
 *
 * ```typescript
 * import { ReplayLogPrinter } from '@lomo/logic-game-framework/stdlib';
 *
 * const record = JSON.parse(replayJson);
 * const log = ReplayLogPrinter.print(record);
 * console.log(log);
 * ```
 */

import type { GameEventBase } from '../../core/events/GameEvent.js';
import type { IBattleRecord, IActorInitData, IFrameData } from './ReplayTypes.js';

/**
 * 回放日志打印器
 */
export class ReplayLogPrinter {
  /**
   * 打印完整的回放日志
   *
   * @param record 战斗记录
   * @returns 格式化的日志字符串
   */
  static print(record: IBattleRecord): string {
    const printer = new ReplayLogPrinter(record);
    return printer.generate();
  }

  private readonly record: IBattleRecord;
  private readonly output: string[] = [];

  private constructor(record: IBattleRecord) {
    this.record = record;
  }

  private generate(): string {
    this.printHeader();
    this.printInitialState();
    this.printTimeline();
    this.printFooter();
    return this.output.join('\n');
  }

  // ========== 头部 ==========

  private printHeader(): void {
    this.output.push('='.repeat(70));
    this.output.push('Battle Replay Log');
    this.output.push('='.repeat(70));
    this.output.push('');
    this.output.push(`Version: ${this.record.version}`);
    this.output.push(`Battle ID: ${this.record.meta.battleId}`);
    this.output.push(`Recorded At: ${new Date(this.record.meta.recordedAt).toISOString()}`);
    this.output.push(`Tick Interval: ${this.record.meta.tickInterval}ms`);
    this.output.push(`Total Frames: ${this.record.meta.totalFrames}`);
    if (this.record.meta.result) {
      this.output.push(`Result: ${this.record.meta.result}`);
    }
    this.output.push('');
  }

  // ========== 初始状态 ==========

  private printInitialState(): void {
    this.output.push('-'.repeat(70));
    this.output.push('Initial State');
    this.output.push('-'.repeat(70));
    this.output.push('');

    // 打印配置
    if (Object.keys(this.record.configs).length > 0) {
      this.output.push('Configs:');
      for (const [key, value] of Object.entries(this.record.configs)) {
        this.output.push(`  ${key}: ${JSON.stringify(value)}`);
      }
      this.output.push('');
    }

    // 打印每个 Actor
    for (const actor of this.record.initialActors) {
      this.printActor(actor);
    }
  }

  private printActor(actor: IActorInitData): void {
    const teamLabel = typeof actor.team === 'number' ? `Team ${actor.team}` : actor.team;
    this.output.push(`Actor [${actor.id}] "${actor.displayName}" (${teamLabel})`);

    // 位置
    if (actor.position) {
      if (actor.position.hex) {
        const { q, r } = actor.position.hex;
        this.output.push(`  Position: hex(${q}, ${r})`);
      } else if (actor.position.world) {
        const { x, y, z } = actor.position.world;
        this.output.push(`  Position: world(${x}, ${y}, ${z})`);
      }
    }

    // 属性
    const attrs = Object.entries(actor.attributes)
      .map(([name, value]) => `${name}=${value}`)
      .join(', ');
    if (attrs) {
      this.output.push(`  Attributes: ${attrs}`);
    }

    // 技能
    if (actor.abilities.length > 0) {
      const abilities = actor.abilities.map((ab) => ab.configId).join(', ');
      this.output.push(`  Abilities: [${abilities}]`);
    }

    // Tag
    const tagCount = Object.keys(actor.tags).length;
    if (tagCount > 0) {
      const tags = Object.entries(actor.tags)
        .map(([tag, count]) => `${tag}:${count}`)
        .join(', ');
      this.output.push(`  Tags: ${tags}`);
    }

    this.output.push('');
  }

  // ========== 时间线 ==========

  private printTimeline(): void {
    this.output.push('-'.repeat(70));
    this.output.push('Timeline');
    this.output.push('-'.repeat(70));
    this.output.push('');

    if (this.record.timeline.length === 0) {
      this.output.push('  (No events recorded)');
      this.output.push('');
      return;
    }

    for (const frameData of this.record.timeline) {
      this.printFrame(frameData);
    }
  }

  private printFrame(frameData: IFrameData): void {
    const logicTime = frameData.frame * this.record.meta.tickInterval;
    this.output.push(`[Frame ${frameData.frame} | ${logicTime}ms]`);

    for (const event of frameData.events) {
      this.output.push(`  ${this.formatEvent(event)}`);
    }

    this.output.push('');
  }

  // ========== 事件格式化 ==========

  private formatEvent(event: GameEventBase): string {
    const kind = event.kind;

    // 使用 Record 类型方便访问任意字段
    const e = event as unknown as Record<string, unknown>;

    switch (kind) {
      // Actor 生命周期
      case 'actorSpawned': {
        const actor = e.actor as { id: string; displayName?: string };
        return `actorSpawned: [${actor.id}] "${actor.displayName ?? ''}" spawned`;
      }
      case 'actorDestroyed': {
        const reason = e.reason ? ` (${e.reason})` : '';
        return `actorDestroyed: [${e.actorId}] destroyed${reason}`;
      }

      // 属性变化
      case 'attributeChanged': {
        const actor = this.getActorName(e.actorId as string);
        return `attributeChanged: [${actor}] ${e.attribute}: ${e.oldValue} -> ${e.newValue}`;
      }

      // Ability 生命周期
      case 'abilityGranted': {
        const actor = this.getActorName(e.actorId as string);
        const ability = e.ability as { configId: string };
        return `abilityGranted: [${actor}] gained [${ability.configId}]`;
      }
      case 'abilityRemoved': {
        const actor = this.getActorName(e.actorId as string);
        return `abilityRemoved: [${actor}] lost [${e.abilityInstanceId}]`;
      }
      case 'abilityActivated': {
        const actor = this.getActorName(e.actorId as string);
        const target = e.target as { actorId?: string } | undefined;
        const targetStr = target?.actorId
          ? ` -> [${this.getActorName(target.actorId)}]`
          : '';
        return `abilityActivated: [${actor}] uses [${e.abilityConfigId}]${targetStr}`;
      }

      // Tag 变化
      case 'tagChanged': {
        const actor = this.getActorName(e.actorId as string);
        return `tagChanged: [${actor}] ${e.tag}: ${e.oldCount} -> ${e.newCount}`;
      }

      // 项目层事件（常见类型）
      case 'damage': {
        const source = e.sourceActorId
          ? this.getActorName(e.sourceActorId as string)
          : '?';
        const target = this.getActorName(e.targetActorId as string);
        const crit = e.isCritical ? ' [CRIT]' : '';
        return `damage: [${source}] deals ${e.damage} ${e.damageType ?? 'physical'} to [${target}]${crit}`;
      }
      case 'heal': {
        const source = e.sourceActorId
          ? this.getActorName(e.sourceActorId as string)
          : '?';
        const target = this.getActorName(e.targetActorId as string);
        return `heal: [${source}] heals [${target}] for ${e.healAmount} HP`;
      }
      case 'move': {
        const actor = this.getActorName(e.actorId as string);
        const fromHex = e.fromHex as { q: number; r: number } | undefined;
        const toHex = e.toHex as { q: number; r: number } | undefined;
        const from = fromHex ? `(${fromHex.q},${fromHex.r})` : '?';
        const to = toHex ? `(${toHex.q},${toHex.r})` : '?';
        return `move: [${actor}] ${from} -> ${to}`;
      }
      case 'death': {
        const actor = this.getActorName(e.actorId as string);
        const killer = e.killerActorId
          ? ` by [${this.getActorName(e.killerActorId as string)}]`
          : '';
        return `death: [${actor}] died${killer}`;
      }

      // 投射物事件
      case 'projectileLaunched': {
        const source = this.getActorName(e.sourceActorId as string);
        const target = e.targetActorId
          ? this.getActorName(e.targetActorId as string)
          : '?';
        return `projectileLaunched: [${e.projectileId}] ${source} -> ${target}`;
      }
      case 'projectileHit': {
        const target = this.getActorName(e.targetActorId as string);
        return `projectileHit: [${e.projectileId}] hit [${target}]`;
      }
      case 'projectileDespawn': {
        return `projectileDespawn: [${e.projectileId}] reason=${e.reason}`;
      }

      // 未知事件
      default: {
        const { kind: k, ...rest } = e;
        const restStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
        return `${k}${restStr}`;
      }
    }
  }

  // ========== 辅助方法 ==========

  private getActorName(actorId: string): string {
    const actor = this.record.initialActors.find((a) => a.id === actorId);
    return actor?.displayName ?? actorId;
  }

  // ========== 页脚 ==========

  private printFooter(): void {
    const totalEvents = this.record.timeline.reduce((sum, f) => sum + f.events.length, 0);
    this.output.push('='.repeat(70));
    this.output.push(`Summary: ${this.record.timeline.length} frames, ${totalEvents} events`);
    this.output.push('End of Replay');
    this.output.push('='.repeat(70));
  }
}
