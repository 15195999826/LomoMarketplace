/**
 * @lomo/core - 核心数学库
 *
 * 提供 Vector2、Vector3 和数学工具函数
 */

export { Vector2 } from './math/Vector2.js';
export { Vector3 } from './math/Vector3.js';
export * from './math/MathUtils.js';

// 也导出 math 子模块的所有内容
export * as math from './math/index.js';
