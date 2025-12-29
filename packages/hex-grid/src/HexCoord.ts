/**
 * HexCoord - 六边形坐标系统
 *
 * 使用 Axial 坐标作为主要存储格式
 * 需要算法计算时转换为 Cube 坐标
 *
 * 参考: https://www.redblobgames.com/grids/hexagons/
 */

/**
 * Axial 坐标（主要使用）
 * q: 列方向
 * r: 行方向
 */
export type AxialCoord = {
  readonly q: number;
  readonly r: number;
};

/**
 * Cube 坐标（算法计算用）
 * 约束: q + r + s = 0
 */
export type CubeCoord = {
  readonly q: number;
  readonly r: number;
  readonly s: number;
};

/**
 * 像素坐标
 */
export type PixelCoord = {
  readonly x: number;
  readonly y: number;
};

// ========== 坐标创建 ==========

/**
 * 创建 Axial 坐标
 */
export function axial(q: number, r: number): AxialCoord {
  return { q, r };
}

/**
 * 创建 Cube 坐标
 */
export function cube(q: number, r: number, s: number): CubeCoord {
  if (Math.round(q + r + s) !== 0) {
    throw new Error(`Invalid cube coordinates: q + r + s must equal 0, got ${q + r + s}`);
  }
  return { q, r, s };
}

// ========== 坐标转换 ==========

/**
 * Axial 转 Cube
 */
export function axialToCube(coord: AxialCoord): CubeCoord {
  return {
    q: coord.q,
    r: coord.r,
    s: -coord.q - coord.r,
  };
}

/**
 * Cube 转 Axial
 * 使用 +0 来规范化 -0 为 0
 */
export function cubeToAxial(coord: CubeCoord): AxialCoord {
  return {
    q: coord.q + 0,
    r: coord.r + 0,
  };
}

/**
 * Cube 坐标取整（用于像素转六边形）
 * 使用最大误差修正法保证 q + r + s = 0
 */
export function cubeRound(q: number, r: number, s: number): CubeCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  // 修正误差最大的分量
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

// ========== 像素转换 (Flat-top 布局) ==========

/**
 * 六边形转像素坐标 (Flat-top)
 * @param coord Axial 坐标
 * @param size 六边形大小（中心到顶点的距离）
 */
export function hexToPixel(coord: AxialCoord, size: number): PixelCoord {
  const x = size * ((3 / 2) * coord.q);
  const y = size * ((Math.sqrt(3) / 2) * coord.q + Math.sqrt(3) * coord.r);
  return { x, y };
}

/**
 * 像素坐标转六边形 (Flat-top)
 * @param x 像素 x 坐标
 * @param y 像素 y 坐标
 * @param size 六边形大小
 */
export function pixelToHex(x: number, y: number, size: number): AxialCoord {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;
  const s = -q - r;

  // 使用 cube rounding 然后转回 axial
  const rounded = cubeRound(q, r, s);
  return cubeToAxial(rounded);
}

// ========== 工具函数 ==========

/**
 * 坐标相等判断
 */
export function hexEquals(a: AxialCoord, b: AxialCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * 坐标哈希（用于 Map/Set 的 key）
 */
export function hexKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

/**
 * 从 key 解析坐标
 */
export function parseHexKey(key: string): AxialCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/**
 * 坐标加法
 */
export function hexAdd(a: AxialCoord, b: AxialCoord): AxialCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

/**
 * 坐标减法
 */
export function hexSubtract(a: AxialCoord, b: AxialCoord): AxialCoord {
  return { q: a.q - b.q, r: a.r - b.r };
}

/**
 * 坐标缩放
 */
export function hexScale(coord: AxialCoord, factor: number): AxialCoord {
  return { q: coord.q * factor, r: coord.r * factor };
}
