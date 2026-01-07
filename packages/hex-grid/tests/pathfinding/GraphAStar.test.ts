import { describe, it, expect } from 'vitest';
import { GraphAStar } from '../../src/pathfinding/GraphAStar.js';
import { PathfindingResult } from '../../src/pathfinding/types.js';
import type { IGraph, IPathFilter } from '../../src/pathfinding/types.js';

/**
 * Simple grid graph for testing
 *
 * Grid layout (5x5):
 *   0  1  2  3  4
 *   5  6  7  8  9
 *  10 11 12 13 14
 *  15 16 17 18 19
 *  20 21 22 23 24
 */
class SimpleGridGraph implements IGraph<number> {
  constructor(
    private width: number,
    private height: number,
    private blocked: Set<number> = new Set()
  ) {}

  isValidRef(nodeRef: number): boolean {
    return nodeRef >= 0 && nodeRef < this.width * this.height;
  }

  getKey(nodeRef: number): string {
    return nodeRef.toString();
  }

  getNeighbors(nodeRef: number): number[] {
    const x = nodeRef % this.width;
    const y = Math.floor(nodeRef / this.width);
    const neighbors: number[] = [];

    // 4-directional neighbors
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        neighbors.push(ny * this.width + nx);
      }
    }

    return neighbors;
  }

  block(nodeRef: number): void {
    this.blocked.add(nodeRef);
  }

  isBlocked(nodeRef: number): boolean {
    return this.blocked.has(nodeRef);
  }
}

class SimplePathFilter implements IPathFilter<number> {
  constructor(
    private graph: SimpleGridGraph,
    private options: {
      heuristicScale?: number;
      costLimit?: number;
      wantsPartialSolution?: boolean;
      includeStartNode?: boolean;
    } = {}
  ) {}

  getHeuristicScale(): number {
    return this.options.heuristicScale ?? 1.0;
  }

  getHeuristicCost(start: number, end: number): number {
    // Manhattan distance
    const graph = this.graph as any;
    const width = graph.width;
    const x1 = start % width;
    const y1 = Math.floor(start / width);
    const x2 = end % width;
    const y2 = Math.floor(end / width);
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  getTraversalCost(_start: number, _end: number): number {
    return 1.0;
  }

  isTraversalAllowed(_from: number, to: number): boolean {
    return !this.graph.isBlocked(to);
  }

  wantsPartialSolution(): boolean {
    return this.options.wantsPartialSolution ?? true;
  }

  getCostLimit(): number | undefined {
    return this.options.costLimit;
  }

  shouldIncludeStartNodeInPath(): boolean {
    return this.options.includeStartNode ?? false;
  }
}

describe('GraphAStar', () => {
  describe('findPath - basic', () => {
    it('should find path on empty grid', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      // Path from top-left to bottom-right
      const result = pathfinder.findPath(0, 24, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path[result.path.length - 1]).toBe(24);
      expect(result.totalCost).toBe(8); // Manhattan distance
    });

    it('should return empty path when start equals end', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.findPath(12, 12, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.path).toEqual([]);
      expect(result.totalCost).toBe(0);
    });

    it('should include start node when configured', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph, { includeStartNode: true });

      const result = pathfinder.findPath(0, 4, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.path[0]).toBe(0); // Start node included
      expect(result.path[result.path.length - 1]).toBe(4);
    });

    it('should find optimal path', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      // Path from 0 to 4 (same row)
      const result = pathfinder.findPath(0, 4, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.totalCost).toBe(4); // Exactly 4 steps
    });
  });

  describe('findPath - edge cases', () => {
    it('should return SearchFail for invalid start', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.findPath(-1, 24, filter);

      expect(result.result).toBe(PathfindingResult.SearchFail);
      expect(result.path).toEqual([]);
    });

    it('should return SearchFail for invalid end', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.findPath(0, 100, filter);

      expect(result.result).toBe(PathfindingResult.SearchFail);
    });

    it('should return GoalUnreachable for blocked end', () => {
      const graph = new SimpleGridGraph(5, 5);
      graph.block(24); // Block destination
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.findPath(0, 24, filter);

      expect(result.result).toBe(PathfindingResult.GoalUnreachable);
    });

    it('should return GoalUnreachable when path is blocked', () => {
      const graph = new SimpleGridGraph(5, 5);
      // Create a wall that completely blocks the path
      // Block column 2
      for (let y = 0; y < 5; y++) {
        graph.block(y * 5 + 2);
      }
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph, { wantsPartialSolution: false });

      const result = pathfinder.findPath(0, 4, filter);

      expect(result.result).toBe(PathfindingResult.GoalUnreachable);
    });

    it('should return partial solution when configured', () => {
      const graph = new SimpleGridGraph(5, 5);
      // Block column 2
      for (let y = 0; y < 5; y++) {
        graph.block(y * 5 + 2);
      }
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph, { wantsPartialSolution: true });

      const result = pathfinder.findPath(0, 4, filter);

      expect(result.result).toBe(PathfindingResult.GoalUnreachable);
      expect(result.path.length).toBeGreaterThan(0); // Has partial path
    });
  });

  describe('findPath - cost limit', () => {
    it('should respect cost limit', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph, { costLimit: 2 });

      // Path from 0 to 24 requires 8 steps, but limit is 2
      const result = pathfinder.findPath(0, 24, filter);

      expect(result.result).toBe(PathfindingResult.GoalUnreachable);
      // Partial solution should have cost <= 2
      expect(result.totalCost).toBeLessThanOrEqual(2);
    });
  });

  describe('findPath - heuristic scale', () => {
    it('should work with different heuristic scales', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);

      // Scale 0 = Dijkstra
      const dijkstra = new SimplePathFilter(graph, { heuristicScale: 0 });
      const resultDijkstra = pathfinder.findPath(0, 24, dijkstra);

      // Scale 1 = Standard A*
      const astar = new SimplePathFilter(graph, { heuristicScale: 1 });
      const resultAstar = pathfinder.findPath(0, 24, astar);

      // Scale 2 = Greedy
      const greedy = new SimplePathFilter(graph, { heuristicScale: 2 });
      const resultGreedy = pathfinder.findPath(0, 24, greedy);

      // All should find a path
      expect(resultDijkstra.result).toBe(PathfindingResult.SearchSuccess);
      expect(resultAstar.result).toBe(PathfindingResult.SearchSuccess);
      expect(resultGreedy.result).toBe(PathfindingResult.SearchSuccess);

      // All should have same cost (optimal path exists)
      expect(resultDijkstra.totalCost).toBe(8);
      expect(resultAstar.totalCost).toBe(8);
      expect(resultGreedy.totalCost).toBe(8);

      // Dijkstra typically searches more nodes than A*
      expect(resultDijkstra.nodesSearched).toBeGreaterThanOrEqual(resultAstar.nodesSearched);
    });
  });

  describe('findPath - path around obstacles', () => {
    it('should find path around single obstacle', () => {
      const graph = new SimpleGridGraph(5, 5);
      // Block center
      graph.block(12);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      // From 7 to 17 (would go through 12 if not blocked)
      const result = pathfinder.findPath(7, 17, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.path).not.toContain(12); // Should avoid blocked cell
    });

    it('should find path through maze', () => {
      const graph = new SimpleGridGraph(5, 5);
      // Create a maze-like structure:
      // S . # . .
      // . . # . .
      // . . # . .
      // . . . . .
      // . . . . E
      graph.block(2);
      graph.block(7);
      graph.block(12);

      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.findPath(0, 24, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.path).not.toContain(2);
      expect(result.path).not.toContain(7);
      expect(result.path).not.toContain(12);
    });
  });

  describe('floodFrom', () => {
    it('should find all reachable nodes', () => {
      const graph = new SimpleGridGraph(3, 3);
      // 0 1 2
      // 3 4 5
      // 6 7 8
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.floodFrom(4, filter); // Center

      // All 9 nodes should be reachable
      for (let i = 0; i < 9; i++) {
        expect(result.isReachable(i)).toBe(true);
      }
    });

    it('should respect cost limit in flood', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph, { costLimit: 2 });

      const result = pathfinder.floodFrom(12, filter); // Center

      // Only nodes within 2 steps should be reachable
      expect(result.isReachable(12)).toBe(true); // Center (0)
      expect(result.isReachable(7)).toBe(true);  // Up (1)
      expect(result.isReachable(17)).toBe(true); // Down (1)
      expect(result.isReachable(11)).toBe(true); // Left (1)
      expect(result.isReachable(13)).toBe(true); // Right (1)
      expect(result.isReachable(2)).toBe(true);  // Up-Up (2)

      // Nodes beyond 2 steps should not be reachable
      expect(result.isReachable(0)).toBe(false); // Top-left corner (4 steps)
    });

    it('should return correct costs', () => {
      const graph = new SimpleGridGraph(3, 3);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.floodFrom(4, filter); // Center

      expect(result.getCostTo(4)).toBe(0); // Start
      expect(result.getCostTo(1)).toBe(1); // Adjacent
      expect(result.getCostTo(3)).toBe(1); // Adjacent
      expect(result.getCostTo(5)).toBe(1); // Adjacent
      expect(result.getCostTo(7)).toBe(1); // Adjacent
      expect(result.getCostTo(0)).toBe(2); // Corner
      expect(result.getCostTo(2)).toBe(2); // Corner
      expect(result.getCostTo(6)).toBe(2); // Corner
      expect(result.getCostTo(8)).toBe(2); // Corner
    });

    it('should return correct paths', () => {
      const graph = new SimpleGridGraph(3, 3);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.floodFrom(4, filter); // Center

      const pathToCorner = result.getPathTo(0);
      expect(pathToCorner.length).toBe(3); // 4 -> intermediate -> 0
      expect(pathToCorner[0]).toBe(4); // Starts at center
      expect(pathToCorner[pathToCorner.length - 1]).toBe(0); // Ends at corner
    });

    it('should handle blocked areas', () => {
      const graph = new SimpleGridGraph(3, 3);
      // Block middle row
      graph.block(3);
      graph.block(5);

      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.floodFrom(4, filter); // Center

      expect(result.isReachable(4)).toBe(true);  // Start
      expect(result.isReachable(1)).toBe(true);  // Up
      expect(result.isReachable(7)).toBe(true);  // Down
      expect(result.isReachable(3)).toBe(false); // Blocked
      expect(result.isReachable(5)).toBe(false); // Blocked
      expect(result.isReachable(0)).toBe(true);  // Can reach via top
      expect(result.isReachable(6)).toBe(true);  // Can reach via bottom
    });

    it('should return Infinity for unreachable nodes', () => {
      const graph = new SimpleGridGraph(3, 3);
      graph.block(3);
      graph.block(5);

      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.floodFrom(4, filter);

      expect(result.getCostTo(3)).toBe(Infinity);
      expect(result.getCostTo(5)).toBe(Infinity);
    });

    it('should return empty path for unreachable nodes', () => {
      const graph = new SimpleGridGraph(3, 3);
      graph.block(3);

      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      const result = pathfinder.floodFrom(4, filter);

      expect(result.getPathTo(3)).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should allow reuse after reset', () => {
      const graph = new SimpleGridGraph(5, 5);
      const pathfinder = new GraphAStar(graph);
      const filter = new SimplePathFilter(graph);

      // First search
      const result1 = pathfinder.findPath(0, 24, filter);
      expect(result1.result).toBe(PathfindingResult.SearchSuccess);

      // Second search without explicit reset (findPath calls reset internally)
      const result2 = pathfinder.findPath(24, 0, filter);
      expect(result2.result).toBe(PathfindingResult.SearchSuccess);
    });
  });

  describe('onNodeVisited callback', () => {
    it('should call callback for each visited node', () => {
      const graph = new SimpleGridGraph(3, 3);
      const visited: number[] = [];
      const pathfinder = new GraphAStar(graph, {
        onNodeVisited: (node) => visited.push(node),
      });
      const filter = new SimplePathFilter(graph);

      pathfinder.findPath(0, 8, filter);

      expect(visited.length).toBeGreaterThan(0);
      expect(visited).toContain(0); // Start should be visited
    });
  });
});
