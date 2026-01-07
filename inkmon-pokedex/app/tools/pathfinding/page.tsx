"use client";

import React, { useEffect, useReducer, useCallback, useState } from 'react';
import {
  HexGridModel,
  HexGridGraph,
  GraphAStar,
  HexPathFilter,
  type AxialCoord,
  type HexGridConfig,
  type PixelCoord,
  hexKey,
  hexEquals,
  PathfindingResult,
} from '@lomo/hex-grid';
import dynamic from 'next/dynamic';
import styles from './styles.module.css';
import { HexGrid2D } from './components/HexGrid2D';

// 动态导入 3D 组件，禁用 SSR（Three.js 不支持服务端渲染）
const HexGrid3D = dynamic(
  () => import('./components/HexGrid3D').then(mod => mod.HexGrid3D),
  {
    ssr: false,
    loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>加载 3D 视图...</div>
  }
);

// --- Types ---

interface Metrics {
  timeMs: number;
  nodesSearched: number;
  pathLength: number;
  totalCost: number;
  result: string;
}

interface DemoState {
  // View
  viewMode: '2d' | '3d';

  // Grid Config
  drawMode: 'row-column' | 'radius';
  rows: number;
  columns: number;
  radius: number;
  hexSize: number;
  orientation: 'flat' | 'pointy';
  showCoords: boolean;
  
  // Pathfinding Params
  heuristicScale: number;
  wantsPartialSolution: boolean;
  shouldIgnoreClosedNodes: boolean;
  maxSearchNodes: number;

  // Editor State
  start: AxialCoord | null;
  end: AxialCoord | null;
  walls: Set<string>; // hexKey strings
  hover: AxialCoord | null;
  
  // Results
  path: AxialCoord[];
  pathSet: Set<string>; // hexKey set for O(1) lookup
  visited: Map<string, number>; // hexKey -> order
  metrics: Metrics | null;
}

type Action =
  | { type: 'SET_VIEW_MODE'; payload: '2d' | '3d' }
  | { type: 'SET_CONFIG'; payload: Partial<Pick<DemoState, 'drawMode' | 'rows' | 'columns' | 'radius' | 'hexSize' | 'orientation'>> }
  | { type: 'SET_SHOW_COORDS'; payload: boolean }
  | { type: 'SET_PARAM'; payload: Partial<Pick<DemoState, 'heuristicScale' | 'wantsPartialSolution' | 'shouldIgnoreClosedNodes' | 'maxSearchNodes'>> }
  | { type: 'SET_START'; payload: AxialCoord | null }
  | { type: 'SET_END'; payload: AxialCoord | null }
  | { type: 'TOGGLE_WALL'; payload: AxialCoord }
  | { type: 'CLEAR_WALLS' }
  | { type: 'SET_HOVER'; payload: AxialCoord | null }
  | { type: 'SET_RESULT'; payload: { path: AxialCoord[]; pathSet: Set<string>; visited: Map<string, number>; metrics: Metrics } }
  | { type: 'RESET_RESULT' }
  | { type: 'RESET_ALL' };

const INITIAL_STATE: DemoState = {
  viewMode: '2d',
  drawMode: 'row-column',
  rows: 15,
  columns: 15,
  radius: 7,
  hexSize: 24,
  orientation: 'flat',
  showCoords: true,
  
  heuristicScale: 1.0,
  wantsPartialSolution: false,
  shouldIgnoreClosedNodes: true,
  maxSearchNodes: 5000,

  start: null,
  end: null,
  walls: new Set(),
  hover: null,

  path: [],
  pathSet: new Set(),
  visited: new Map(),
  metrics: null,
};

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_CONFIG':
      return { ...state, ...action.payload, start: null, end: null, walls: new Set(), path: [], pathSet: new Set(), visited: new Map(), metrics: null };
    case 'SET_SHOW_COORDS':
      return { ...state, showCoords: action.payload };
    case 'SET_PARAM':
      return { ...state, ...action.payload };
    case 'SET_START':
      return { ...state, start: action.payload };
    case 'SET_END':
      return { ...state, end: action.payload };
    case 'TOGGLE_WALL': {
      const key = hexKey(action.payload);
      const newWalls = new Set(state.walls);
      if (newWalls.has(key)) {
        newWalls.delete(key);
        return { ...state, walls: newWalls };
      } else {
        newWalls.add(key);
        // If start/end is wall, clear them (immutable update)
        const newStart = (state.start && hexEquals(state.start, action.payload)) ? null : state.start;
        const newEnd = (state.end && hexEquals(state.end, action.payload)) ? null : state.end;
        return { ...state, walls: newWalls, start: newStart, end: newEnd };
      }
    }
    case 'CLEAR_WALLS':
      return { ...state, walls: new Set() };
    case 'SET_HOVER':
      // Avoid re-render if hover coord hasn't changed (compare strings)
      if (
        (state.hover === null && action.payload === null) ||
        (state.hover && action.payload && hexEquals(state.hover, action.payload))
      ) {
        return state;
      }
      return { ...state, hover: action.payload };
    case 'SET_RESULT':
      return { ...state, ...action.payload };
    case 'RESET_RESULT':
      return { ...state, path: [], pathSet: new Set(), visited: new Map(), metrics: null };
    case 'RESET_ALL':
      return { ...INITIAL_STATE, viewMode: state.viewMode };
    default:
      return state;
  }
}

export default function PathfindingDemo() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [model, setModel] = useState<HexGridModel | null>(null);

  // 隐藏 Footer（此页面不需要）
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }
    return () => {
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  // 1. Init/Recreate Model on Config Change
  useEffect(() => {
    const config: HexGridConfig = state.drawMode === 'row-column'
      ? {
          drawMode: 'baseOnRowColumn',
          rows: state.rows,
          columns: state.columns,
          hexSize: state.hexSize,
          orientation: state.orientation,
          mapCenter: { x: 0, y: 0 },
          defaultTerrain: 'normal'
        }
      : {
          drawMode: 'baseOnRadius',
          radius: state.radius,
          hexSize: state.hexSize,
          orientation: state.orientation,
          mapCenter: { x: 0, y: 0 },
          defaultTerrain: 'normal'
        };
    const newModel = new HexGridModel(config);
    // Sync walls from state to new model if needed, 
    // BUT since walls are stored as coords, we can re-apply them.
    // However, if we change grid size, some walls might be out of bounds.
    // Ideally we filter them. For now, just apply.
    state.walls.forEach(key => {
        const [q, r] = key.split(',').map(Number);
        // Only if within bounds? Model handles it gracefully usually or ignores.
        newModel.updateTile({ q, r }, { terrain: 'blocked' });
    });
    
    setModel(newModel);
  }, [state.drawMode, state.rows, state.columns, state.radius, state.hexSize, state.orientation]);

  // 2. Sync Walls to Model (when walls change)
  useEffect(() => {
    if (!model) return;
    // Iterate all tiles to ensure consistency
    for (const tile of model.getAllTiles()) {
        const isWall = state.walls.has(hexKey(tile.coord));
        if (isWall && tile.terrain !== 'blocked') {
            model.updateTile(tile.coord, { terrain: 'blocked' });
        } else if (!isWall && tile.terrain === 'blocked') {
            model.updateTile(tile.coord, { terrain: 'normal' });
        }
    }
  }, [model, state.walls]); 

  // Handlers

  const handleRun = () => {
    if (!model || !state.start || !state.end) return;
    
    const graph = new HexGridGraph(model);
    const visited = new Map<string, number>();
    let visitCount = 0;

    const filter = new HexPathFilter(model, {
        heuristicScale: state.heuristicScale,
        wantsPartialSolution: state.wantsPartialSolution,
        maxSearchNodes: state.maxSearchNodes,
        shouldIgnoreClosedNodes: state.shouldIgnoreClosedNodes
    });

    const options = {
        onNodeVisited: (node: AxialCoord) => {
            visited.set(hexKey(node), ++visitCount);
        }
    };

    const pathfinder = new GraphAStar(graph, options);
    
    const startTime = performance.now();
    const result = pathfinder.findPath(state.start, state.end, filter);
    const endTime = performance.now();

    const metrics: Metrics = {
        timeMs: endTime - startTime,
        nodesSearched: result.nodesSearched || visitCount,
        pathLength: 0,
        totalCost: 0,
        result: 'Unknown'
    };

    let path: AxialCoord[] = [];

    // Map Result Enum to Friendly Text
    const ResultMap: Record<string, string> = {
        [PathfindingResult.SearchSuccess]: '成功 (Success)',
        [PathfindingResult.SearchFail]: '失败 (Fail)',
        [PathfindingResult.GoalUnreachable]: '不可达 (Unreachable)',
        [PathfindingResult.InfiniteLoop]: '超时/步数限制 (Limit)'
    };

    metrics.result = ResultMap[result.result] || result.result;
    metrics.pathLength = result.path.length;
    metrics.totalCost = result.totalCost;
    path = result.path;

    if (result.result !== PathfindingResult.SearchSuccess) {
        if (path.length > 0) {
             metrics.result += ' (部分路径)';
        }
    }

    // Create pathSet for O(1) lookup in render
    const pathSet = new Set(path.map(hexKey));

    dispatch({
        type: 'SET_RESULT',
        payload: { path, pathSet, visited, metrics }
    });
  };

  const handleTileClick = useCallback((coord: AxialCoord, isRightClick: boolean) => {
    const key = hexKey(coord);

    if (isRightClick) {
        // 右键：设置起点/终点
        // 不能放在墙体上
        if (state.walls.has(key)) return;

        if (state.start && hexEquals(state.start, coord)) {
             // 点击已有起点，清除它
             dispatch({ type: 'SET_START', payload: null });
        } else if (state.end && hexEquals(state.end, coord)) {
             // 点击已有终点，清除它
             dispatch({ type: 'SET_END', payload: null });
        } else {
             // 设置新的起点/终点，不能与另一个重叠
             if (!state.start) {
                // 设置起点，但不能和终点重叠
                if (state.end && hexEquals(state.end, coord)) return;
                dispatch({ type: 'SET_START', payload: coord });
             } else {
                // 设置终点，但不能和起点重叠
                if (hexEquals(state.start, coord)) return;
                dispatch({ type: 'SET_END', payload: coord });
             }
        }
    } else {
        // 左键：切换墙体
        // 不能在起点或终点上放墙
        if (state.start && hexEquals(state.start, coord)) return;
        if (state.end && hexEquals(state.end, coord)) return;

        dispatch({ type: 'TOGGLE_WALL', payload: coord });
    }
    dispatch({ type: 'RESET_RESULT' });
  }, [state.start, state.end, state.walls]);

  const handleTileHover = useCallback((coord: AxialCoord | null) => {
    dispatch({ type: 'SET_HOVER', payload: coord });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        {/* 视图切换器 */}
        <div className={styles.viewSwitcher}>
            <button
                className={`${styles.viewButton} ${state.viewMode === '2d' ? styles.viewButtonActive : ''}`}
                onClick={() => dispatch({type: 'SET_VIEW_MODE', payload: '2d'})}
            >
                📐 2D 视图
            </button>
            <button
                className={`${styles.viewButton} ${state.viewMode === '3d' ? styles.viewButtonActive : ''}`}
                onClick={() => dispatch({type: 'SET_VIEW_MODE', payload: '3d'})}
            >
                🎲 3D 视图
            </button>
        </div>

        {/* 网格配置 */}
        <h2 className={styles.sectionTitle}>网格配置</h2>
        <div className={styles.section}>
            <div className={styles.sectionCard}>
                <div className={styles.row}>
                    <label>绘制模式</label>
                    <select className={styles.select} value={state.drawMode} onChange={e => dispatch({type: 'SET_CONFIG', payload: {drawMode: e.target.value as 'row-column' | 'radius'}})}>
                        <option value="row-column">行列模式</option>
                        <option value="radius">半径模式</option>
                    </select>
                </div>
                {state.drawMode === 'row-column' ? (
                    <>
                        <div className={styles.row}>
                            <label>行数</label>
                            <input type="number" className={styles.input} value={state.rows} onChange={e => dispatch({type: 'SET_CONFIG', payload: {rows: Number(e.target.value)}})} />
                        </div>
                        <div className={styles.row}>
                            <label>列数</label>
                            <input type="number" className={styles.input} value={state.columns} onChange={e => dispatch({type: 'SET_CONFIG', payload: {columns: Number(e.target.value)}})} />
                        </div>
                    </>
                ) : (
                    <div className={styles.row}>
                        <label>半径</label>
                        <input type="number" className={styles.input} value={state.radius} min={1} onChange={e => dispatch({type: 'SET_CONFIG', payload: {radius: Number(e.target.value)}})} />
                    </div>
                )}
                <div className={styles.row}>
                    <label title="六边形中心到顶点的距离（像素）">六边形半径</label>
                    <input type="number" className={styles.input} value={state.hexSize} onChange={e => dispatch({type: 'SET_CONFIG', payload: {hexSize: Number(e.target.value)}})} />
                </div>
                <div className={styles.row}>
                    <label>排列方向</label>
                    <select className={styles.select} value={state.orientation} onChange={e => dispatch({type: 'SET_CONFIG', payload: {orientation: e.target.value as 'flat' | 'pointy'}})}>
                        <option value="flat">平顶</option>
                        <option value="pointy">尖顶</option>
                    </select>
                </div>
                <div className={styles.row}>
                    <label>显示坐标</label>
                    <input type="checkbox" className={styles.checkbox} checked={state.showCoords} onChange={e => dispatch({type: 'SET_SHOW_COORDS', payload: e.target.checked})} />
                </div>
            </div>
        </div>

        {/* 寻路参数 */}
        <h2 className={styles.sectionTitle}>寻路参数</h2>
        <div className={styles.section}>
            <div className={styles.sectionCard}>
                <div className={styles.row}>
                    <label title="0=Dijkstra, 1=A*, &gt;1=贪婪">启发权重</label>
                    <input type="number" step="0.1" className={styles.input} value={state.heuristicScale} onChange={e => dispatch({type: 'SET_PARAM', payload: {heuristicScale: Number(e.target.value)}})} />
                </div>
                <div className={styles.row}>
                    <label>最大搜索数</label>
                    <input type="number" className={styles.input} value={state.maxSearchNodes} onChange={e => dispatch({type: 'SET_PARAM', payload: {maxSearchNodes: Number(e.target.value)}})} />
                </div>
                <div className={styles.row}>
                    <label title="无法到达时返回最近路径">部分路径</label>
                    <input type="checkbox" className={styles.checkbox} checked={state.wantsPartialSolution} onChange={e => dispatch({type: 'SET_PARAM', payload: {wantsPartialSolution: e.target.checked}})} />
                </div>
                <div className={styles.row}>
                    <label title="标准A*行为">忽略已访问</label>
                    <input type="checkbox" className={styles.checkbox} checked={state.shouldIgnoreClosedNodes} onChange={e => dispatch({type: 'SET_PARAM', payload: {shouldIgnoreClosedNodes: e.target.checked}})} />
                </div>
            </div>
        </div>

        {/* 操作按钮 */}
        <div className={styles.section}>
            <button className={`${styles.button} ${styles.runButton}`} onClick={handleRun} disabled={!state.start || !state.end}>
                ▶ 开始寻路
            </button>
            <div className={styles.buttonGroup}>
                <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => dispatch({type: 'CLEAR_WALLS'})}>清除墙体</button>
                <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => dispatch({type: 'RESET_ALL'})}>重置全部</button>
            </div>
        </div>

        {/* 结果展示 */}
        {state.metrics && (
            <div className={styles.resultSection}>
                <div className={styles.resultTitle}>✓ 寻路结果</div>
                <div className={styles.metrics}>
                    <div className={styles.metricRow}><span>状态</span> <strong>{state.metrics.result}</strong></div>
                    <div className={styles.metricRow}><span>耗时</span> <span>{state.metrics.timeMs.toFixed(2)} ms</span></div>
                    <div className={styles.metricRow}><span>搜索节点</span> <span>{state.metrics.nodesSearched}</span></div>
                    <div className={styles.metricRow}><span>路径长度</span> <span>{state.metrics.pathLength}</span></div>
                    <div className={styles.metricRow}><span>总代价</span> <span>{state.metrics.totalCost.toFixed(2)}</span></div>
                </div>
            </div>
        )}

        {/* 操作提示 */}
        <div className={styles.hint}>
            <strong>🖱️ 操作说明</strong>
            <ul>
                <li>左键点击：放置/移除墙体</li>
                <li>右键点击：设置起点(绿)/终点(红)</li>
                <li>鼠标悬停：高亮显示坐标</li>
            </ul>
        </div>
    </div>

      <div className={styles.canvasWrapper}>
        {model && state.viewMode === '2d' && (
            <HexGrid2D
                model={model}
                walls={state.walls}
                start={state.start}
                end={state.end}
                path={state.path}
                pathSet={state.pathSet}
                visited={state.visited}
                hover={state.hover}
                showCoords={state.showCoords}
                onTileClick={handleTileClick}
                onTileHover={handleTileHover}
            />
        )}
        {model && state.viewMode === '3d' && (
            <HexGrid3D
                model={model}
                walls={state.walls}
                start={state.start}
                end={state.end}
                path={state.path}
                pathSet={state.pathSet}
                visited={state.visited}
                hover={state.hover}
                showCoords={state.showCoords}
                onTileClick={handleTileClick}
                onTileHover={handleTileHover}
            />
        )}
      </div>
    </div>
  );
}