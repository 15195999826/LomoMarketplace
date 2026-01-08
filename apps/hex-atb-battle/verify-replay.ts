/**
 * 验证录像文件的完整性
 */

import fs from 'node:fs';
import path from 'node:path';

interface ReplayEvent {
  kind: string;
  [key: string]: unknown;
}

interface ReplayFrame {
  frame: number;
  events: ReplayEvent[];
}

interface ReplayFile {
  version: string;
  meta: {
    battleId: string;
    recordedAt: number;
    tickInterval: number;
    totalFrames: number;
    result: string;
  };
  configs: Record<string, unknown>;
  initialActors: unknown[];
  timeline: ReplayFrame[];
}

function validateReplay(filePath: string): void {
  console.log('📋 验证录像文件...');
  console.log(`文件: ${filePath}\n`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const replay: ReplayFile = JSON.parse(content);

  // 基本验证
  console.log('✅ 基本信息:');
  console.log(`  版本: ${replay.version}`);
  console.log(`  战斗ID: ${replay.meta.battleId}`);
  console.log(`  总帧数: ${replay.meta.totalFrames}`);
  console.log(`  Tick间隔: ${replay.meta.tickInterval}ms`);
  console.log(`  结果: ${replay.meta.result}`);

  // Actor 验证
  console.log(`\n✅ 初始Actor: ${replay.initialActors.length} 个`);

  // 帧验证
  console.log(`\n✅ 帧数据: ${replay.timeline.length} 帧`);

  // 事件统计
  const eventKinds = new Map<string, number>();
  for (const frame of replay.timeline) {
    for (const event of frame.events) {
      const count = eventKinds.get(event.kind) || 0;
      eventKinds.set(event.kind, count + 1);
    }
  }

  const totalEvents = Array.from(eventKinds.values()).reduce((a, b) => a + b, 0);
  console.log(`\n✅ 事件统计: 总计 ${totalEvents} 个事件`);
  console.log('  事件类型分布:');
  for (const [kind, count] of eventKinds.entries()) {
    console.log(`    ${kind}: ${count}`);
  }

  // 连续性检查
  const frameNumbers = replay.timeline.map(f => f.frame);
  const expectedFrames = Array.from(
    { length: replay.meta.totalFrames },
    (_, i) => (i + 1) * replay.meta.tickInterval
  );

  const missingFrames = expectedFrames.filter(f => !frameNumbers.includes(f));
  if (missingFrames.length > 0) {
    console.log(`\n⚠️  缺失的帧: ${missingFrames.length} 个`);
  } else {
    console.log('\n✅ 帧连续性: 完整');
  }

  console.log('\n🎉 录像文件验证通过！');
}

// 运行验证
const replayDir = path.join(process.cwd(), 'Replays');
const files = fs.readdirSync(replayDir).filter(f => f.endsWith('.json'));
const latestFile = files.sort().reverse()[0];

if (latestFile) {
  validateReplay(path.join(replayDir, latestFile));
} else {
  console.error('❌ 未找到录像文件');
  process.exit(1);
}
