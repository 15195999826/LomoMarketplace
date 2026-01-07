import { describe, it, expect } from 'vitest';
import { MinHeap } from '../../src/pathfinding/MinHeap.js';

interface TestNode {
  id: string;
  priority: number;
}

describe('MinHeap', () => {
  const createHeap = () => new MinHeap<TestNode>((a, b) => a.priority - b.priority);

  describe('basic operations', () => {
    it('should start empty', () => {
      const heap = createHeap();
      expect(heap.isEmpty()).toBe(true);
      expect(heap.size).toBe(0);
      expect(heap.peek()).toBeUndefined();
      expect(heap.pop()).toBeUndefined();
    });

    it('should push and pop single element', () => {
      const heap = createHeap();
      const node = { id: 'a', priority: 10 };

      heap.push(node);
      expect(heap.isEmpty()).toBe(false);
      expect(heap.size).toBe(1);
      expect(heap.peek()).toBe(node);

      const popped = heap.pop();
      expect(popped).toBe(node);
      expect(heap.isEmpty()).toBe(true);
    });

    it('should maintain min-heap property', () => {
      const heap = createHeap();
      const nodes = [
        { id: 'c', priority: 30 },
        { id: 'a', priority: 10 },
        { id: 'b', priority: 20 },
        { id: 'e', priority: 50 },
        { id: 'd', priority: 40 },
      ];

      for (const node of nodes) {
        heap.push(node);
      }

      expect(heap.size).toBe(5);

      // Pop should return in priority order
      expect(heap.pop()?.id).toBe('a'); // 10
      expect(heap.pop()?.id).toBe('b'); // 20
      expect(heap.pop()?.id).toBe('c'); // 30
      expect(heap.pop()?.id).toBe('d'); // 40
      expect(heap.pop()?.id).toBe('e'); // 50
      expect(heap.isEmpty()).toBe(true);
    });

    it('should handle duplicate priorities', () => {
      const heap = createHeap();
      const nodeA = { id: 'a', priority: 10 };
      const nodeB = { id: 'b', priority: 10 };
      const nodeC = { id: 'c', priority: 10 };

      heap.push(nodeA);
      heap.push(nodeB);
      heap.push(nodeC);

      expect(heap.size).toBe(3);

      // All have same priority, order doesn't matter but all should be returned
      const results = [heap.pop(), heap.pop(), heap.pop()];
      expect(results).toContain(nodeA);
      expect(results).toContain(nodeB);
      expect(results).toContain(nodeC);
    });
  });

  describe('contains', () => {
    it('should correctly check if element exists', () => {
      const heap = createHeap();
      const nodeA = { id: 'a', priority: 10 };
      const nodeB = { id: 'b', priority: 20 };
      const nodeC = { id: 'c', priority: 30 };

      heap.push(nodeA);
      heap.push(nodeB);

      expect(heap.contains(nodeA)).toBe(true);
      expect(heap.contains(nodeB)).toBe(true);
      expect(heap.contains(nodeC)).toBe(false);

      heap.pop();
      expect(heap.contains(nodeA)).toBe(false);
      expect(heap.contains(nodeB)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update element priority (decrease key)', () => {
      const heap = createHeap();
      const nodeA = { id: 'a', priority: 30 };
      const nodeB = { id: 'b', priority: 20 };
      const nodeC = { id: 'c', priority: 10 };

      heap.push(nodeA);
      heap.push(nodeB);
      heap.push(nodeC);

      // nodeA has highest priority (30), should be last
      expect(heap.peek()?.id).toBe('c'); // 10 is min

      // Decrease nodeA's priority to make it the new min
      nodeA.priority = 5;
      heap.update(nodeA);

      expect(heap.peek()?.id).toBe('a'); // Now 5 is min
      expect(heap.pop()?.id).toBe('a');
      expect(heap.pop()?.id).toBe('c');
      expect(heap.pop()?.id).toBe('b');
    });

    it('should handle update of non-existent element gracefully', () => {
      const heap = createHeap();
      const nodeA = { id: 'a', priority: 10 };
      const nodeB = { id: 'b', priority: 20 };

      heap.push(nodeA);

      // Update non-existent element should do nothing
      heap.update(nodeB);

      expect(heap.size).toBe(1);
      expect(heap.peek()).toBe(nodeA);
    });

    it('should maintain heap property after multiple updates', () => {
      const heap = createHeap();
      const nodes = [
        { id: 'a', priority: 50 },
        { id: 'b', priority: 40 },
        { id: 'c', priority: 30 },
        { id: 'd', priority: 20 },
        { id: 'e', priority: 10 },
      ];

      for (const node of nodes) {
        heap.push(node);
      }

      // Reverse all priorities
      nodes[0].priority = 10; // a: 50 -> 10
      nodes[1].priority = 20; // b: 40 -> 20
      nodes[2].priority = 30; // c: stays 30
      nodes[3].priority = 40; // d: 20 -> 40
      nodes[4].priority = 50; // e: 10 -> 50

      for (const node of nodes) {
        heap.update(node);
      }

      // Now order should be a, b, c, d, e
      expect(heap.pop()?.id).toBe('a');
      expect(heap.pop()?.id).toBe('b');
      expect(heap.pop()?.id).toBe('c');
      expect(heap.pop()?.id).toBe('d');
      expect(heap.pop()?.id).toBe('e');
    });
  });

  describe('clear', () => {
    it('should clear all elements', () => {
      const heap = createHeap();
      heap.push({ id: 'a', priority: 10 });
      heap.push({ id: 'b', priority: 20 });
      heap.push({ id: 'c', priority: 30 });

      expect(heap.size).toBe(3);

      heap.clear();

      expect(heap.isEmpty()).toBe(true);
      expect(heap.size).toBe(0);
      expect(heap.peek()).toBeUndefined();
    });
  });

  describe('stress test', () => {
    it('should handle large number of elements', () => {
      const heap = createHeap();
      const count = 1000;

      // Push in random order
      const nodes: TestNode[] = [];
      for (let i = 0; i < count; i++) {
        nodes.push({ id: `node-${i}`, priority: Math.random() * 10000 });
      }

      for (const node of nodes) {
        heap.push(node);
      }

      expect(heap.size).toBe(count);

      // Pop all and verify order
      let lastPriority = -Infinity;
      while (!heap.isEmpty()) {
        const node = heap.pop()!;
        expect(node.priority).toBeGreaterThanOrEqual(lastPriority);
        lastPriority = node.priority;
      }
    });
  });
});
