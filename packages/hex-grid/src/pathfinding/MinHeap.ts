/**
 * MinHeap - 带索引映射的最小堆
 *
 * 用于 A* 算法的 OpenList，支持 O(1) 查找和 O(log n) 更新
 *
 * 参考: UE GraphAStar.h FOpenList
 */

/**
 * 带索引映射的最小堆
 *
 * T 必须是对象引用，以便在 Map 中作为 Key
 */
export class MinHeap<T extends object> {
  private heap: T[] = [];
  /** 记录对象在堆中的索引：Obj -> Index */
  private indexMap: Map<T, number> = new Map();
  private compare: (a: T, b: T) => number;

  /**
   * @param compare 比较函数，返回负数表示 a < b
   */
  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  /** 堆中元素数量 */
  get size(): number {
    return this.heap.length;
  }

  /** 堆是否为空 */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** 查看堆顶元素（不移除） */
  peek(): T | undefined {
    return this.heap[0];
  }

  /** 检查元素是否在堆中 */
  contains(item: T): boolean {
    return this.indexMap.has(item);
  }

  /**
   * 插入元素
   */
  push(item: T): void {
    this.heap.push(item);
    this.indexMap.set(item, this.heap.length - 1);
    this.siftUp(this.heap.length - 1);
  }

  /**
   * 弹出堆顶元素（最小元素）
   */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const result = this.heap[0];
    const last = this.heap.pop()!;

    this.indexMap.delete(result);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.indexMap.set(last, 0);
      this.siftDown(0);
    }

    return result;
  }

  /**
   * 更新元素优先级 (O(log n))
   *
   * 当元素的比较键值改变后调用此方法重新调整位置
   * A* 中 Key 只会减小（发现更优路径），理论上只需 siftUp
   * 但 siftDown 也调用以保证通用性（开销可忽略，最多一次比较即返回）
   */
  update(item: T): void {
    const index = this.indexMap.get(item);
    if (index === undefined) return;

    this.siftUp(index);
    this.siftDown(index);
  }

  /**
   * 清空堆
   */
  clear(): void {
    this.heap = [];
    this.indexMap.clear();
  }

  /**
   * 上浮操作
   */
  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parent]) >= 0) break;

      this.swap(index, parent);
      index = parent;
    }
  }

  /**
   * 下沉操作
   */
  private siftDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      this.swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * 交换两个元素并更新索引映射
   */
  private swap(i: number, j: number): void {
    const a = this.heap[i];
    const b = this.heap[j];

    this.heap[i] = b;
    this.heap[j] = a;

    this.indexMap.set(a, j);
    this.indexMap.set(b, i);
  }
}
