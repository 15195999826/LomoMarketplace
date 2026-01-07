/**
 * TypeEffectiveness 测试
 *
 * 测试属性相克表和相关工具函数
 */

import { describe, it, expect } from 'vitest';
import {
  TYPE_CHART,
  getEffectivenessLevel,
  getEffectivenessText,
} from '../../src/types/TypeEffectiveness.js';
import { calculateTypeMultiplier, hasSTAB } from '../../src/actions/DamageAction.js';

describe('TYPE_CHART', () => {
  it('应该包含所有 14 种属性', () => {
    const elements = Object.keys(TYPE_CHART);
    expect(elements).toHaveLength(14);
    expect(elements).toContain('fire');
    expect(elements).toContain('water');
    expect(elements).toContain('grass');
    expect(elements).toContain('dragon');
  });

  it('火克草 (2x)', () => {
    expect(TYPE_CHART.fire.grass).toBe(2);
  });

  it('水克火 (2x)', () => {
    expect(TYPE_CHART.water.fire).toBe(2);
  });

  it('草克水 (2x)', () => {
    expect(TYPE_CHART.grass.water).toBe(2);
  });

  it('电对地免疫 (0x)', () => {
    expect(TYPE_CHART.electric.ground).toBe(0);
  });

  it('地对飞免疫 (0x)', () => {
    expect(TYPE_CHART.ground.flying).toBe(0);
  });

  it('毒对钢免疫 (0x)', () => {
    expect(TYPE_CHART.poison.steel).toBe(0);
  });

  it('龙克龙 (2x)', () => {
    expect(TYPE_CHART.dragon.dragon).toBe(2);
  });

  it('钢克冰 (2x)', () => {
    expect(TYPE_CHART.steel.ice).toBe(2);
  });
});

describe('getEffectivenessLevel', () => {
  it('倍率 2.0 应返回 super_effective', () => {
    expect(getEffectivenessLevel(2)).toBe('super_effective');
  });

  it('倍率 4.0 (双属性克制) 应返回 super_effective', () => {
    expect(getEffectivenessLevel(4)).toBe('super_effective');
  });

  it('倍率 1.0 应返回 neutral', () => {
    expect(getEffectivenessLevel(1)).toBe('neutral');
  });

  it('倍率 0.5 应返回 not_very_effective', () => {
    expect(getEffectivenessLevel(0.5)).toBe('not_very_effective');
  });

  it('倍率 0.25 (双属性抵抗) 应返回 not_very_effective', () => {
    expect(getEffectivenessLevel(0.25)).toBe('not_very_effective');
  });

  it('倍率 0 应返回 immune', () => {
    expect(getEffectivenessLevel(0)).toBe('immune');
  });
});

describe('getEffectivenessText', () => {
  it('super_effective 应返回中文描述', () => {
    expect(getEffectivenessText('super_effective')).toBe('效果拔群!');
  });

  it('not_very_effective 应返回中文描述', () => {
    expect(getEffectivenessText('not_very_effective')).toBe('效果不佳');
  });

  it('immune 应返回中文描述', () => {
    expect(getEffectivenessText('immune')).toBe('无效');
  });

  it('neutral 应返回空字符串', () => {
    expect(getEffectivenessText('neutral')).toBe('');
  });
});

describe('calculateTypeMultiplier', () => {
  it('单属性克制：火攻击草 = 2x', () => {
    expect(calculateTypeMultiplier('fire', ['grass'])).toBe(2);
  });

  it('单属性抵抗：火攻击水 = 0.5x', () => {
    expect(calculateTypeMultiplier('fire', ['water'])).toBe(0.5);
  });

  it('单属性免疫：电攻击地 = 0x', () => {
    expect(calculateTypeMultiplier('electric', ['ground'])).toBe(0);
  });

  it('双属性叠加克制：冰攻击草/飞 = 4x', () => {
    // 冰克草 2x, 冰克飞 2x => 4x
    expect(calculateTypeMultiplier('ice', ['grass', 'flying'])).toBe(4);
  });

  it('双属性叠加抵抗：火攻击水/龙 = 0.25x', () => {
    // 火攻水 0.5x, 火攻龙 0.5x => 0.25x
    expect(calculateTypeMultiplier('fire', ['water', 'dragon'])).toBe(0.25);
  });

  it('双属性一个克制一个抵抗：火攻击草/水 = 1x', () => {
    // 火克草 2x, 火被水抵抗 0.5x => 1x
    expect(calculateTypeMultiplier('fire', ['grass', 'water'])).toBe(1);
  });

  it('双属性其中一个免疫：电攻击水/地 = 0x', () => {
    // 电克水 2x, 但电对地免疫 0x => 0x
    expect(calculateTypeMultiplier('electric', ['water', 'ground'])).toBe(0);
  });

  it('空属性列表应返回 1x', () => {
    expect(calculateTypeMultiplier('fire', [])).toBe(1);
  });
});

describe('hasSTAB', () => {
  it('攻击属性与单属性 InkMon 主属性相同应返回 true', () => {
    expect(hasSTAB('fire', ['fire'])).toBe(true);
  });

  it('攻击属性与双属性 InkMon 主属性相同应返回 true', () => {
    expect(hasSTAB('fire', ['fire', 'flying'])).toBe(true);
  });

  it('攻击属性与双属性 InkMon 副属性相同应返回 true', () => {
    expect(hasSTAB('flying', ['fire', 'flying'])).toBe(true);
  });

  it('攻击属性与 InkMon 属性都不同应返回 false', () => {
    expect(hasSTAB('water', ['fire', 'flying'])).toBe(false);
  });

  it('空属性列表应返回 false', () => {
    expect(hasSTAB('fire', [])).toBe(false);
  });
});
