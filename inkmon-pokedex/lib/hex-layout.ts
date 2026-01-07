/**
 * Hex Layout Utilities - 六边形网格坐标与布局工具
 *
 * 提取自 components/world/HexagonGrid.tsx
 * 供 BattleStage 等战斗相关组件复用
 *
 * 使用 Pointy-top 六边形布局（与 @lomo/hex-grid 框架一致）
 */

// 六边形基础尺寸 (pointy-top 尖顶六边形)
export const HEX_LAYOUT = {
  width: 100,           // 六边形宽度（尖顶到平底的距离）
  height: 86,           // 六边形高度（平边之间的距离）
  horizSpacing: 87,     // 水平间距 = width * sqrt(3)/2
  vertSpacing: 75,      // 垂直间距 = height * 3/4
} as const;

/**
 * 将六边形坐标转换为像素位置 (point-top 布局)
 *
 * @param q - 六边形轴向坐标 q
 * @param r - 六边形轴向坐标 r
 * @returns 像素坐标 { x, y }
 */
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  // pointy-top 布局公式
  const x = HEX_LAYOUT.horizSpacing * (q + r / 2);
  const y = HEX_LAYOUT.vertSpacing * r;
  return { x, y };
}

/**
 * 生成指定半径范围内的六边形坐标列表
 *
 * @param radius - 网格半径（从中心 (0,0) 到边缘的距离）
 * @returns 六边形坐标数组 [{q, r}, ...]
 */
export function generateHexGrid(radius: number): { q: number; r: number }[] {
  const hexes: { q: number; r: number }[] = [];

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }

  return hexes;
}

/**
 * 计算网格边界和中心偏移
 *
 * @param positions - 六边形坐标列表
 * @returns 边界信息和居中偏移
 */
export function calculateGridBounds(
  positions: { q: number; r: number }[]
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pos of positions) {
    const pixel = hexToPixel(pos.q, pos.r);
    minX = Math.min(minX, pixel.x);
    maxX = Math.max(maxX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxY = Math.max(maxY, pixel.y);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX + HEX_LAYOUT.width;
  const height = maxY - minY + HEX_LAYOUT.height;

  return { minX, maxX, minY, maxY, centerX, centerY, width, height };
}

/**
 * 将六边形坐标居中偏移到画布中心
 *
 * @param q - 六边形 q 坐标
 * @param r - 六边形 r 坐标
 * @param canvasWidth - 画布宽度
 * @param canvasHeight - 画布高度
 * @param gridBounds - 网格边界信息
 * @returns 居中后的像素坐标
 */
export function hexToCenteredPixel(
  q: number,
  r: number,
  canvasWidth: number,
  canvasHeight: number,
  gridBounds: ReturnType<typeof calculateGridBounds>
): { x: number; y: number } {
  const pixel = hexToPixel(q, r);
  return {
    x: pixel.x - gridBounds.minX + (canvasWidth - gridBounds.width) / 2,
    y: pixel.y - gridBounds.minY + (canvasHeight - gridBounds.height) / 2,
  };
}
