import { describe, it, expect } from 'vitest';
import { HexGridModel } from '../../src/HexGridModel.js';
import { axial, hexDistance } from '../../src/index.js';
import { GraphAStar } from '../../src/pathfinding/GraphAStar.js';
import { HexGridGraph } from '../../src/pathfinding/HexGridGraph.js';
import { HexPathFilter } from '../../src/pathfinding/HexPathFilter.js';
import { PathfindingResult } from '../../src/pathfinding/types.js';
import type { AxialCoord } from '../../src/HexCoord.js';

describe('HexGrid Pathfinding Integration', () => {
  describe('HexGridGraph', () => {
    it('should correctly validate refs', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const graph = new HexGridGraph(grid);

      expect(graph.isValidRef(axial(0, 0))).toBe(true);
      expect(graph.isValidRef(axial(100, 100))).toBe(false);
    });

    it('should return consistent keys', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const graph = new HexGridGraph(grid);

      const coord1 = axial(1, 2);
      const coord2 = axial(1, 2);
      const coord3 = axial(2, 1);

      expect(graph.getKey(coord1)).toBe(graph.getKey(coord2));
      expect(graph.getKey(coord1)).not.toBe(graph.getKey(coord3));
    });

    it('should return valid neighbors', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const graph = new HexGridGraph(grid);

      const neighbors = graph.getNeighbors(axial(0, 0));

      // All returned neighbors should be valid
      for (const neighbor of neighbors) {
        expect(graph.isValidRef(neighbor)).toBe(true);
      }

      // Should have 6 neighbors (or less at edges)
      expect(neighbors.length).toBeLessThanOrEqual(6);
      expect(neighbors.length).toBeGreaterThan(0);
    });
  });

  describe('HexPathFilter', () => {
    it('should use hex distance for heuristic', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const filter = new HexPathFilter(grid);

      const start = axial(0, 0);
      const end = axial(2, 2);

      const heuristic = filter.getHeuristicCost(start, end);
      const actualDistance = hexDistance(start, end);

      expect(heuristic).toBe(actualDistance);
    });

    it('should respect terrain blocking', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const target = axial(1, 1);
      grid.updateTile(target, { terrain: 'blocked' });

      const filter = new HexPathFilter(grid);

      expect(filter.isTraversalAllowed(axial(0, 0), target)).toBe(false);
    });

    it('should respect occupant blocking', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const target = axial(1, 1);
      grid.placeOccupant(target, { id: 'unit-1' });

      const filter = new HexPathFilter(grid);

      expect(filter.isTraversalAllowed(axial(0, 0), target)).toBe(false);
    });

    it('should allow disabling occupant blocking', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const target = axial(1, 1);
      grid.placeOccupant(target, { id: 'unit-1' });

      const filter = new HexPathFilter(grid, { blockOccupied: false });

      expect(filter.isTraversalAllowed(axial(0, 0), target)).toBe(true);
    });

    it('should apply height penalty', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const from = axial(0, 0);
      const to = axial(1, 0);

      grid.updateTile(from, { height: 0 });
      grid.updateTile(to, { height: 3 });

      const filterWithPenalty = new HexPathFilter(grid, { heightPenalty: 2.0 });
      const filterNoPenalty = new HexPathFilter(grid, { heightPenalty: 0 });

      const costWithPenalty = filterWithPenalty.getTraversalCost(from, to);
      const costNoPenalty = filterNoPenalty.getTraversalCost(from, to);

      // Height diff = 3, penalty = 2.0, so extra cost = 6
      expect(costWithPenalty).toBeGreaterThan(costNoPenalty);
      expect(costWithPenalty - costNoPenalty).toBeCloseTo(6);
    });

    it('should apply custom penalty', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const filter = new HexPathFilter(grid, {
        customPenalty: (from, to, model) => {
          // Add penalty if target has water terrain
          const tile = model.getTile(to);
          return tile?.terrain === 'water' ? 5 : 0;
        },
      });

      const normalTile = axial(0, 0);
      const waterTile = axial(1, 0);
      grid.updateTile(waterTile, { terrain: 'water' });

      const costToNormal = filter.getTraversalCost(axial(-1, 0), normalTile);
      const costToWater = filter.getTraversalCost(axial(0, 0), waterTile);

      expect(costToWater - costToNormal).toBe(5);
    });

    it('should apply custom block check', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });
      const filter = new HexPathFilter(grid, {
        customBlockCheck: (from, to, model) => {
          // Block diagonal movement (simplistic check)
          const dx = Math.abs(to.q - from.q);
          const dr = Math.abs(to.r - from.r);
          return dx <= 1 && dr <= 1;
        },
      });

      expect(filter.isTraversalAllowed(axial(0, 0), axial(1, 0))).toBe(true);
      expect(filter.isTraversalAllowed(axial(0, 0), axial(5, 5))).toBe(false);
    });
  });

  describe('Full Integration', () => {
    it('should find path on hex grid', () => {
      const grid = new HexGridModel({ rows: 7, columns: 7 });
      const graph = new HexGridGraph(grid);
      const pathfinder = new GraphAStar(graph);
      const filter = new HexPathFilter(grid);

      const start = axial(0, 0);
      const end = axial(2, 2);
      const result = pathfinder.findPath(start, end, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.path.length).toBeGreaterThan(0);

      // Last node should be the destination
      const lastNode = result.path[result.path.length - 1];
      expect(lastNode.q).toBe(end.q);
      expect(lastNode.r).toBe(end.r);

      // Total cost should match path length (assuming uniform cost)
      expect(result.totalCost).toBe(result.path.length);
    });

    it('should find path around obstacles', () => {
      const grid = new HexGridModel({ rows: 7, columns: 7 });

      // Create a wall
      grid.updateTile(axial(1, 0), { terrain: 'blocked' });
      grid.updateTile(axial(1, 1), { terrain: 'blocked' });
      grid.updateTile(axial(1, -1), { terrain: 'blocked' });

      const graph = new HexGridGraph(grid);
      const pathfinder = new GraphAStar(graph);
      const filter = new HexPathFilter(grid);

      const start = axial(0, 0);
      const end = axial(2, 0);
      const result = pathfinder.findPath(start, end, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);

      // Path should not contain blocked tiles
      for (const node of result.path) {
        const tile = grid.getTile(node);
        expect(tile?.terrain).not.toBe('blocked');
      }
    });

    it('should calculate movement range with floodFrom', () => {
      const grid = new HexGridModel({ rows: 9, columns: 9 });
      const graph = new HexGridGraph(grid);
      const pathfinder = new GraphAStar(graph);
      const filter = new HexPathFilter(grid, { costLimit: 3 });

      const start = axial(0, 0);
      const result = pathfinder.floodFrom(start, filter);

      // Check various distances
      expect(result.isReachable(axial(0, 0))).toBe(true);  // Start
      expect(result.isReachable(axial(1, 0))).toBe(true);  // Distance 1
      expect(result.isReachable(axial(2, 0))).toBe(true);  // Distance 2
      expect(result.isReachable(axial(3, 0))).toBe(true);  // Distance 3

      // Cost should match hex distance
      expect(result.getCostTo(axial(0, 0))).toBe(0);
      expect(result.getCostTo(axial(1, 0))).toBe(1);
      expect(result.getCostTo(axial(2, 0))).toBe(2);
      expect(result.getCostTo(axial(3, 0))).toBe(3);
    });

    it('should handle terrain with different move costs', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });

      // Set up terrain costs
      grid.updateTile(axial(1, 0), { moveCost: 2 }); // Difficult terrain
      grid.updateTile(axial(0, 1), { moveCost: 1 }); // Normal terrain

      const graph = new HexGridGraph(grid);
      const pathfinder = new GraphAStar(graph);
      const filter = new HexPathFilter(grid);

      const start = axial(0, 0);
      const flood = pathfinder.floodFrom(start, filter);

      // Going through difficult terrain should cost more
      expect(flood.getCostTo(axial(1, 0))).toBe(2);
      expect(flood.getCostTo(axial(0, 1))).toBe(1);
    });

    it('should handle units blocking path', () => {
      const grid = new HexGridModel({ rows: 5, columns: 5 });

      // Place enemy unit blocking direct path
      grid.placeOccupant(axial(1, 0), { id: 'enemy-1' });

      const graph = new HexGridGraph(grid);
      const pathfinder = new GraphAStar(graph);
      const filter = new HexPathFilter(grid);

      const start = axial(0, 0);
      const end = axial(2, 0);
      const result = pathfinder.findPath(start, end, filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);

      // Path should not go through occupied tile
      for (const node of result.path) {
        expect(node.q !== 1 || node.r !== 0).toBe(true);
      }
    });

    it('should track visited nodes for debugging', () => {
      const grid = new HexGridModel({ rows: 7, columns: 7 });
      const graph = new HexGridGraph(grid);

      const visited: AxialCoord[] = [];
      const pathfinder = new GraphAStar(graph, {
        onNodeVisited: (node) => visited.push(node),
      });

      const filter = new HexPathFilter(grid);
      const result = pathfinder.findPath(axial(0, 0), axial(2, 0), filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(visited.length).toBeGreaterThan(0);

      // Start node should be visited
      expect(visited.some((v) => v.q === 0 && v.r === 0)).toBe(true);
    });

    it('should handle radius-based grid', () => {
      const grid = new HexGridModel({ drawMode: 'baseOnRadius', radius: 3 });
      const graph = new HexGridGraph(grid);
      const pathfinder = new GraphAStar(graph);
      const filter = new HexPathFilter(grid);

      // Path from one edge to another
      const result = pathfinder.findPath(axial(-3, 0), axial(3, 0), filter);

      expect(result.result).toBe(PathfindingResult.SearchSuccess);
      expect(result.totalCost).toBe(6); // Direct line distance
    });
  });
});
