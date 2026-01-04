/**
 * MathUtils - 数学工具函数
 */

/** 角度转弧度常量 */
export const DEG_TO_RAD = Math.PI / 180;

/** 弧度转角度常量 */
export const RAD_TO_DEG = 180 / Math.PI;

/** 两倍 PI */
export const TWO_PI = Math.PI * 2;

/** 半 PI */
export const HALF_PI = Math.PI / 2;

/**
 * 角度转弧度
 */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * 弧度转角度
 */
export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

/**
 * 限制值在范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 限制值在 0-1 范围内
 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * 线性插值
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 反向线性插值（求 t）
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/**
 * 重映射值从一个范围到另一个范围
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

/**
 * 平滑步进（Hermite 插值）
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * 更平滑的步进（Perlin 改进版）
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 近似相等
 */
export function approxEquals(a: number, b: number, epsilon: number = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * 符号函数
 */
export function sign(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/**
 * 模运算（始终返回正数）
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * 将角度规范化到 [-PI, PI] 范围
 */
export function normalizeAngle(radians: number): number {
  return mod(radians + Math.PI, TWO_PI) - Math.PI;
}

/**
 * 计算两个角度之间的最短差值
 */
export function angleDifference(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * 角度插值（走最短路径）
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const diff = angleDifference(from, to);
  return from + diff * t;
}

/**
 * 随机整数 [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机浮点数 [min, max)
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 判断是否为 2 的幂
 */
export function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

/**
 * 向上取到最近的 2 的幂
 */
export function nextPowerOfTwo(value: number): number {
  if (value <= 0) return 1;
  value--;
  value |= value >> 1;
  value |= value >> 2;
  value |= value >> 4;
  value |= value >> 8;
  value |= value >> 16;
  return value + 1;
}
