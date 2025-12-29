/**
 * HexUtils - 六边形网格算法工具
 *
 * 包含距离计算、邻居获取、范围、线段等算法
 */

import {
  type AxialCoord,
  type CubeCoord,
  axialToCube,
  cubeToAxial,
  hexAdd,
  cubeRound,
} from './HexCoord.js';

// ========== 方向常量 ==========

/**
 * 6 个邻居方向 (Cube 坐标)
 * 顺序: 右、右上、左上、左、左下、右下
 */
export const CUBE_DIRECTIONS: readonly CubeCoord[] = [
  { q: 1, r: 0, s: -1 },   // 0: 右
  { q: 1, r: -1, s: 0 },   // 1: 右上
  { q: 0, r: -1, s: 1 },   // 2: 左上
  { q: -1, r: 0, s: 1 },   // 3: 左
  { q: -1, r: 1, s: 0 },   // 4: 左下
  { q: 0, r: 1, s: -1 },   // 5: 右下
] as const;

/**
 * 6 个邻居方向 (Axial 坐标)
 */
export const AXIAL_DIRECTIONS: readonly AxialCoord[] = CUBE_DIRECTIONS.map(cubeToAxial);

/**
 * 6 个对角方向 (Cube 坐标，距离=2)
 */
export const CUBE_DIAGONALS: readonly CubeCoord[] = [
  { q: 2, r: -1, s: -1 },
  { q: 1, r: 1, s: -2 },
  { q: -1, r: 2, s: -1 },
  { q: -2, r: 1, s: 1 },
  { q: -1, r: -1, s: 2 },
  { q: 1, r: -2, s: 1 },
] as const;

// ========== 距离计算 ==========

/**
 * 计算两个六边形之间的距离
 */
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.q - bc.q),
    Math.abs(ac.r - bc.r),
    Math.abs(ac.s - bc.s)
  );
}

/**
 * 计算 Cube 坐标距离
 */
export function cubeDistance(a: CubeCoord, b: CubeCoord): number {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(a.s - b.s)
  );
}

// ========== 邻居 ==========

/**
 * 获取指定方向的邻居
 * @param coord 中心坐标
 * @param direction 方向索引 (0-5)
 */
export function hexNeighbor(coord: AxialCoord, direction: number): AxialCoord {
  const dir = AXIAL_DIRECTIONS[direction % 6];
  return hexAdd(coord, dir);
}

/**
 * 获取所有 6 个邻居
 */
export function hexNeighbors(coord: AxialCoord): AxialCoord[] {
  return AXIAL_DIRECTIONS.map((dir) => hexAdd(coord, dir));
}

/**
 * 获取对角邻居（距离=2）
 */
export function hexDiagonalNeighbor(coord: AxialCoord, direction: number): AxialCoord {
  const dir = CUBE_DIAGONALS[direction % 6];
  return hexAdd(coord, cubeToAxial(dir));
}

// ========== 范围 ==========

/**
 * 获取指定范围内的所有六边形
 * @param center 中心坐标
 * @param radius 半径（包含边界）
 */
export function hexRange(center: AxialCoord, radius: number): AxialCoord[] {
  const results: AxialCoord[] = [];

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }

  return results;
}

/**
 * 获取指定距离的环形（距离恰好等于 radius）
 * @param center 中心坐标
 * @param radius 半径
 */
export function hexRing(center: AxialCoord, radius: number): AxialCoord[] {
  if (radius === 0) {
    return [center];
  }

  const results: AxialCoord[] = [];

  // 从起点开始（中心 + radius * direction[4]）
  let hex = hexAdd(center, { q: -radius, r: radius });

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(hex);
      hex = hexNeighbor(hex, i);
    }
  }

  return results;
}

/**
 * 获取螺旋形（从内到外的所有六边形）
 * @param center 中心坐标
 * @param radius 最大半径
 */
export function hexSpiral(center: AxialCoord, radius: number): AxialCoord[] {
  const results: AxialCoord[] = [center];

  for (let r = 1; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }

  return results;
}

// ========== 线段 ==========

/**
 * 线性插值
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Cube 坐标线性插值
 */
function cubeLerp(a: CubeCoord, b: CubeCoord, t: number): CubeCoord {
  return {
    q: lerp(a.q, b.q, t),
    r: lerp(a.r, b.r, t),
    s: lerp(a.s, b.s, t),
  };
}

/**
 * 绘制从 a 到 b 的直线（包含两端点）
 * 使用 Bresenham 类似算法
 */
export function hexLineDraw(from: AxialCoord, to: AxialCoord): AxialCoord[] {
  const n = hexDistance(from, to);
  if (n === 0) {
    return [from];
  }

  const fromCube = axialToCube(from);
  const toCube = axialToCube(to);

  // 添加小偏移避免边界歧义
  const nudge = 1e-6;
  const nudgedFrom: CubeCoord = {
    q: fromCube.q + nudge,
    r: fromCube.r + nudge,
    s: fromCube.s - 2 * nudge,
  };

  const results: AxialCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const lerped = cubeLerp(nudgedFrom, toCube, t);
    const rounded = cubeRound(lerped.q, lerped.r, lerped.s);
    results.push(cubeToAxial(rounded));
  }

  return results;
}

// ========== 旋转 ==========

/**
 * 绕原点顺时针旋转 60°
 * 使用 +0 规范化 -0
 */
export function hexRotateRight(coord: AxialCoord): AxialCoord {
  const c = axialToCube(coord);
  return cubeToAxial({ q: -c.r + 0, r: -c.s + 0, s: -c.q + 0 });
}

/**
 * 绕原点逆时针旋转 60°
 * 使用 +0 规范化 -0
 */
export function hexRotateLeft(coord: AxialCoord): AxialCoord {
  const c = axialToCube(coord);
  return cubeToAxial({ q: -c.s + 0, r: -c.q + 0, s: -c.r + 0 });
}

/**
 * 绕指定中心顺时针旋转 60°
 */
export function hexRotateAroundRight(coord: AxialCoord, center: AxialCoord): AxialCoord {
  const relative = { q: coord.q - center.q, r: coord.r - center.r };
  const rotated = hexRotateRight(relative);
  return { q: rotated.q + center.q, r: rotated.r + center.r };
}

/**
 * 绕指定中心逆时针旋转 60°
 */
export function hexRotateAroundLeft(coord: AxialCoord, center: AxialCoord): AxialCoord {
  const relative = { q: coord.q - center.q, r: coord.r - center.r };
  const rotated = hexRotateLeft(relative);
  return { q: rotated.q + center.q, r: rotated.r + center.r };
}

// ========== 反射 ==========

/**
 * 沿 q 轴反射
 */
export function hexReflectQ(coord: AxialCoord): AxialCoord {
  const c = axialToCube(coord);
  return cubeToAxial({ q: c.q, r: c.s, s: c.r });
}

/**
 * 沿 r 轴反射
 */
export function hexReflectR(coord: AxialCoord): AxialCoord {
  const c = axialToCube(coord);
  return cubeToAxial({ q: c.s, r: c.r, s: c.q });
}

/**
 * 沿 s 轴反射
 */
export function hexReflectS(coord: AxialCoord): AxialCoord {
  const c = axialToCube(coord);
  return cubeToAxial({ q: c.r, r: c.q, s: c.s });
}
