/**
 * Vector2 - 2D 向量类
 *
 * 设计原则与 Vector3 一致：
 * - 混合模式 API
 * - 默认方法返回新实例（安全）
 * - xxxSelf 方法原地修改（性能）
 */

import { Vector3 } from './Vector3.js';

export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  // ========== 静态工厂方法 ==========

  /** 零向量 (0, 0) */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /** 单位向量 (1, 1) */
  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  /** X轴正方向 (1, 0) */
  static right(): Vector2 {
    return new Vector2(1, 0);
  }

  /** X轴负方向 (-1, 0) */
  static left(): Vector2 {
    return new Vector2(-1, 0);
  }

  /** Y轴正方向 (0, 1) */
  static up(): Vector2 {
    return new Vector2(0, 1);
  }

  /** Y轴负方向 (0, -1) */
  static down(): Vector2 {
    return new Vector2(0, -1);
  }

  /**
   * 从对象创建
   */
  static from(obj: { x: number; y: number }): Vector2 {
    return new Vector2(obj.x, obj.y);
  }

  /**
   * 从数组创建
   */
  static fromArray(arr: [number, number]): Vector2 {
    return new Vector2(arr[0], arr[1]);
  }

  /**
   * 从角度创建方向向量
   * @param radians 弧度
   * @param length 长度（默认 1）
   */
  static fromAngle(radians: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  // ========== 不可变方法（返回新实例） ==========

  /** 复制 */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** 加法 */
  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /** 减法 */
  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /** 标量乘法 */
  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  /** 分量乘法 */
  mul(v: Vector2): Vector2 {
    return new Vector2(this.x * v.x, this.y * v.y);
  }

  /** 分量除法 */
  div(v: Vector2): Vector2 {
    return new Vector2(this.x / v.x, this.y / v.y);
  }

  /** 取反 */
  negate(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  /** 归一化 */
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return Vector2.zero();
    return this.scale(1 / len);
  }

  /** 绝对值 */
  abs(): Vector2 {
    return new Vector2(Math.abs(this.x), Math.abs(this.y));
  }

  /** 向下取整 */
  floor(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

  /** 向上取整 */
  ceil(): Vector2 {
    return new Vector2(Math.ceil(this.x), Math.ceil(this.y));
  }

  /** 四舍五入 */
  round(): Vector2 {
    return new Vector2(Math.round(this.x), Math.round(this.y));
  }

  /** 旋转（2D 特有） */
  rotate(radians: number): Vector2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  /** 垂直向量（逆时针旋转 90 度） */
  perpendicular(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  // ========== 可变方法（原地修改） ==========

  /** 原地加法 */
  addSelf(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** 原地减法 */
  subSelf(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** 原地缩放 */
  scaleSelf(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** 原地分量乘法 */
  mulSelf(v: Vector2): this {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }

  /** 原地分量除法 */
  divSelf(v: Vector2): this {
    this.x /= v.x;
    this.y /= v.y;
    return this;
  }

  /** 原地取反 */
  negateSelf(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /** 原地归一化 */
  normalizeSelf(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /** 原地旋转 */
  rotateSelf(radians: number): this {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  /** 设置值 */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** 从另一个向量复制 */
  copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  // ========== 计算方法（只读） ==========

  /** 点积 */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** 叉积（2D 返回标量，表示 z 分量） */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /** 长度 */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 长度平方 */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** 到另一向量的距离 */
  distanceTo(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 距离平方 */
  distanceToSquared(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /** 向量角度（相对于正 X 轴） */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** 到另一向量的角度（有符号） */
  angleTo(v: Vector2): number {
    return Math.atan2(this.cross(v), this.dot(v));
  }

  /** 线性插值 */
  lerp(v: Vector2, t: number): Vector2 {
    return new Vector2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  /** 分量最小值 */
  min(v: Vector2): Vector2 {
    return new Vector2(Math.min(this.x, v.x), Math.min(this.y, v.y));
  }

  /** 分量最大值 */
  max(v: Vector2): Vector2 {
    return new Vector2(Math.max(this.x, v.x), Math.max(this.y, v.y));
  }

  /** 限制在范围内 */
  clamp(min: Vector2, max: Vector2): Vector2 {
    return new Vector2(
      Math.max(min.x, Math.min(max.x, this.x)),
      Math.max(min.y, Math.min(max.y, this.y))
    );
  }

  /** 是否近似相等 */
  equals(v: Vector2, epsilon: number = 1e-6): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /** 是否严格相等 */
  exactEquals(v: Vector2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /** 是否为零向量 */
  isZero(epsilon: number = 1e-6): boolean {
    return this.lengthSquared() < epsilon * epsilon;
  }

  // ========== 转换方法 ==========

  /** 转为 Vector3（z 默认为 0） */
  toVector3(z: number = 0): Vector3 {
    return new Vector3(this.x, this.y, z);
  }

  /** 转为数组 */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /** 转为普通对象 */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** 转为字符串 */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }
}
