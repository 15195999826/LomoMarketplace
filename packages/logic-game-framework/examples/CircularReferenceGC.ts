/**
 * 循环引用与 GC 演示
 *
 * 本示例展示 JavaScript 的标记-清除 GC 如何正确处理循环引用。
 *
 * 运行方式：
 * ```bash
 * # 需要 --expose-gc 来手动触发 GC
 * npx tsx --expose-gc examples/CircularReferenceGC.ts
 * ```
 *
 * 预期输出：
 * - 创建对象时会打印创建信息
 * - GC 后会打印回收信息
 * - 证明循环引用不会阻止 GC
 */

// ============================================================
// FinalizationRegistry: 用于观察对象何时被 GC
// ============================================================

const registry = new FinalizationRegistry<string>((heldValue) => {
  console.log(`🗑️  [GC] ${heldValue} 已被垃圾回收`);
});

// ============================================================
// 模拟 BattleUnit 和 AbilitySet 的循环引用关系
// ============================================================

class MockAbilitySet {
  // 持有 owner 的引用 → 形成循环引用
  owner: MockBattleUnit;

  constructor(owner: MockBattleUnit) {
    this.owner = owner;
    console.log(`   📦 AbilitySet 创建，持有 owner: ${owner.name}`);
  }
}

class MockBattleUnit {
  abilitySet?: MockAbilitySet;
  name: string;

  constructor(name: string) {
    this.name = name;
    console.log(`   ⚔️  BattleUnit 创建: ${name}`);
  }
}

// ============================================================
// 测试函数
// ============================================================

function createUnitsInScope(): void {
  console.log('\n📍 进入函数作用域，创建对象...');

  const unit1 = new MockBattleUnit('勇者');
  unit1.abilitySet = new MockAbilitySet(unit1);

  const unit2 = new MockBattleUnit('法师');
  unit2.abilitySet = new MockAbilitySet(unit2);

  // 注册到 FinalizationRegistry 以观察 GC
  registry.register(unit1, 'BattleUnit[勇者]');
  registry.register(unit1.abilitySet, 'AbilitySet[勇者]');
  registry.register(unit2, 'BattleUnit[法师]');
  registry.register(unit2.abilitySet, 'AbilitySet[法师]');

  console.log('\n📊 当前内存状态：');
  console.log('   unit1 ←→ unit1.abilitySet (循环引用)');
  console.log('   unit2 ←→ unit2.abilitySet (循环引用)');

  console.log('\n📍 即将离开函数作用域...');
  // 函数结束后，unit1 和 unit2 超出作用域
  // 虽然存在循环引用，但从根对象不可达
}

// 全局持有的对象（用于对比）
let globalUnit: MockBattleUnit | null = null;

function createGlobalUnit(): void {
  console.log('\n📍 创建全局持有的对象...');

  globalUnit = new MockBattleUnit('全局Boss');
  globalUnit.abilitySet = new MockAbilitySet(globalUnit);

  registry.register(globalUnit, 'BattleUnit[全局Boss]');
  registry.register(globalUnit.abilitySet, 'AbilitySet[全局Boss]');

  console.log('   ⚠️  globalUnit 被全局变量持有，不会被 GC');
}

// ============================================================
// 主程序
// ============================================================

async function main(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('🔬 循环引用与 GC 演示');
  console.log('═'.repeat(60));

  // 检查是否有 gc 函数
  const gc = (globalThis as any).gc;
  if (!gc) {
    console.log('\n⚠️  警告: 未检测到 gc() 函数');
    console.log('   请使用以下命令运行：');
    console.log('   npx tsx --expose-gc examples/CircularReferenceGC.ts');
    console.log('\n   将使用自然 GC（可能需要等待较长时间）\n');
  }

  // 第一步：在函数作用域内创建循环引用对象
  createUnitsInScope();

  console.log('\n📍 已离开函数作用域');
  console.log('   unit1, unit2 变量已不可达');
  console.log('   但对象仍在内存中（等待 GC）');

  // 第二步：创建全局持有的对象
  createGlobalUnit();

  // 第三步：触发 GC
  console.log('\n' + '─'.repeat(60));
  console.log('🚀 触发垃圾回收...');
  console.log('─'.repeat(60));

  if (gc) {
    // 手动触发 GC
    gc();
    // 给 FinalizationRegistry 一些时间处理回调
    await sleep(100);
    gc();
    await sleep(100);
  } else {
    // 尝试通过分配大量内存来触发自然 GC
    console.log('   尝试通过内存分配触发自然 GC...');
    for (let i = 0; i < 10; i++) {
      const _ = new Array(1000000).fill(i);
      await sleep(50);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 GC 后状态分析');
  console.log('─'.repeat(60));
  console.log('   ✅ 勇者、法师：应该已被回收（循环引用不影响 GC）');
  console.log('   ❌ 全局Boss：不会被回收（被全局变量持有）');

  // 第四步：释放全局引用
  console.log('\n' + '─'.repeat(60));
  console.log('🔓 释放全局引用...');
  console.log('─'.repeat(60));

  globalUnit = null;
  console.log('   globalUnit = null');

  if (gc) {
    gc();
    await sleep(100);
    gc();
    await sleep(100);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✨ 演示结束');
  console.log('═'.repeat(60));
  console.log('\n结论：');
  console.log('1. 循环引用本身不会导致内存泄漏');
  console.log('2. 只要对象从根对象不可达，就会被 GC 回收');
  console.log('3. 全局变量持有的对象不会被回收，直到引用被清除\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 运行主程序
main().catch(console.error);
