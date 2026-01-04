/**
 * Vector3 - 3D 向量类
 *
 * 设计原则：
 * - 混合模式 API
 * - 默认方法返回新实例（安全）
 * - xxxSelf 方法原地修改（性能）
 */
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  // ========== 静态工厂方法 ==========

  /** 零向量 (0, 0, 0) */
  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  /** 单位向量 (1, 1, 1) */
  static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  /** X轴正方向 (1, 0, 0) */
  static right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  /** X轴负方向 (-1, 0, 0) */
  static left(): Vector3 {
    return new Vector3(-1, 0, 0);
  }

  /** Y轴正方向 (0, 1, 0) */
  static up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  /** Y轴负方向 (0, -1, 0) */
  static down(): Vector3 {
    return new Vector3(0, -1, 0);
  }

  /** Z轴正方向 (0, 0, 1) */
  static forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  /** Z轴负方向 (0, 0, -1) */
  static back(): Vector3 {
    return new Vector3(0, 0, -1);
  }

  /**
   * 从对象创建
   * @param obj 含有 x, y 的对象，z 可选（默认 0）
   */
  static from(obj: { x: number; y: number; z?: number }): Vector3 {
    return new Vector3(obj.x, obj.y, obj.z ?? 0);
  }

  /**
   * 从数组创建
   * @param arr [x, y, z?] 数组
   */
  static fromArray(arr: [number, number, number?]): Vector3 {
    return new Vector3(arr[0], arr[1], arr[2] ?? 0);
  }

  // ========== 不可变方法（返回新实例） ==========

  /** 复制 */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** 加法 */
  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /** 减法 */
  sub(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /** 标量乘法 */
  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  /** 分量乘法 */
  mul(v: Vector3): Vector3 {
    return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  /** 分量除法 */
  div(v: Vector3): Vector3 {
    return new Vector3(this.x / v.x, this.y / v.y, this.z / v.z);
  }

  /** 取反 */
  negate(): Vector3 {
    return new Vector3(-this.x, -this.y, -this.z);
  }

  /** 归一化 */
  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return Vector3.zero();
    return this.scale(1 / len);
  }

  /** 绝对值 */
  abs(): Vector3 {
    return new Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
  }

  /** 向下取整 */
  floor(): Vector3 {
    return new Vector3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
  }

  /** 向上取整 */
  ceil(): Vector3 {
    return new Vector3(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z));
  }

  /** 四舍五入 */
  round(): Vector3 {
    return new Vector3(Math.round(this.x), Math.round(this.y), Math.round(this.z));
  }

  // ========== 可变方法（原地修改） ==========

  /** 原地加法 */
  addSelf(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  /** 原地减法 */
  subSelf(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  /** 原地缩放 */
  scaleSelf(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  /** 原地分量乘法 */
  mulSelf(v: Vector3): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  /** 原地分量除法 */
  divSelf(v: Vector3): this {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }

  /** 原地取反 */
  negateSelf(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  /** 原地归一化 */
  normalizeSelf(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }

  /** 设置值 */
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /** 从另一个向量复制 */
  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  // ========== 计算方法（只读） ==========

  /** 点积 */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** 叉积 */
  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /** 长度 */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /** 长度平方（避免开方，用于比较） */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** 到另一向量的距离 */
  distanceTo(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** 距离平方（避免开方，用于比较） */
  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /** 与另一向量的夹角（弧度） */
  angleTo(v: Vector3): number {
    const denominator = Math.sqrt(this.lengthSquared() * v.lengthSquared());
    if (denominator === 0) return Math.PI / 2;
    const theta = this.dot(v) / denominator;
    return Math.acos(Math.max(-1, Math.min(1, theta)));
  }

  /** 线性插值 */
  lerp(v: Vector3, t: number): Vector3 {
    return new Vector3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  /** 分量最小值 */
  min(v: Vector3): Vector3 {
    return new Vector3(
      Math.min(this.x, v.x),
      Math.min(this.y, v.y),
      Math.min(this.z, v.z)
    );
  }

  /** 分量最大值 */
  max(v: Vector3): Vector3 {
    return new Vector3(
      Math.max(this.x, v.x),
      Math.max(this.y, v.y),
      Math.max(this.z, v.z)
    );
  }

  /** 限制在范围内 */
  clamp(min: Vector3, max: Vector3): Vector3 {
    return new Vector3(
      Math.max(min.x, Math.min(max.x, this.x)),
      Math.max(min.y, Math.min(max.y, this.y)),
      Math.max(min.z, Math.min(max.z, this.z))
    );
  }

  /** 是否近似相等 */
  equals(v: Vector3, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  /** 是否严格相等 */
  exactEquals(v: Vector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  /** 是否为零向量 */
  isZero(epsilon: number = 1e-6): boolean {
    return this.lengthSquared() < epsilon * epsilon;
  }

  // ========== 转换方法 ==========

  /** 转为数组 */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** 转为普通对象 */
  toObject(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  /** 转为字符串 */
  toString(): string {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }

  /** 获取 XY 分量 */
  get xy(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** 获取 XZ 分量 */
  get xz(): { x: number; z: number } {
    return { x: this.x, z: this.z };
  }

  /** 获取 YZ 分量 */
  get yz(): { y: number; z: number } {
    return { y: this.y, z: this.z };
  }
}
